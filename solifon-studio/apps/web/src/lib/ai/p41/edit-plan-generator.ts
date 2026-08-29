/**
 * edit-plan-generator.ts — P4.1 Edit Plan Generator.
 *
 * Combines all P4.1 modules to produce a deterministic AIEditPlan:
 *   EditIntent + VideoAnalysis + AudioAnalysis → AIEditPlan
 *
 * Generated effects use:
 *   P3.10: keyframes, linear/step interpolation
 *   P3.11: parameter references, dependency graph
 *
 * GOLDEN RULE: This module NEVER mutates the Timeline.
 * It only produces an AIEditPlan.
 */

import type { AIEditPlan, Cut, Transition, TrackEffect, EditDecision, SourceClip } from "../edit-plan";
import type { EditStyleId } from "../style-presets";
import type { VideoAnalysis, Shot } from "./video-analysis";
import type { AudioAnalysis } from "./audio-analysis";
import type { EditIntent, EffectHint } from "./edit-intent";
import type { EffectDefinition, AnimatedNumber, AnimatedRGBA } from "@/types/timeline";
import { selectBeatsForCuts, type SelectedBeat } from "./beat-sync";
import { selectShots, type ScoredShot } from "./shot-selector";
import { buildIntensityCurve, evaluateIntensity, intensityToEditParams, type IntensityCurve } from "./intensity-curve";
import { computeAnalysisSeed, createSeededRNG, deterministicUUID, resetDeterministicUUID, type SeededRNG } from "./deterministic";
import { computePlanHashAsync } from "../edit-plan-validator";

// ---- Decision Trace ----

export interface DecisionTrace {
	cutDecisions: TracedCutDecision[];
	effectDecisions: TracedEffectDecision[];
	shotDecisions: TracedShotDecision[];
}

export interface TracedCutDecision {
	time: number;
	reason: string;
	confidence: number;
	beatStrength: number | null;
	sectionType: string;
	intensityAtTime: number;
}

export interface TracedEffectDecision {
	effectId: string;
	effectType: string;
	reason: string;
	sectionType: string;
	intensityAtTime: number;
}

export interface TracedShotDecision {
	shotId: string;
	score: number;
	reason: string;
}

// ---- Generator Result ----

export interface GeneratorResult {
	plan: AIEditPlan;
	trace: DecisionTrace;
	intensityCurve: IntensityCurve;
}

// ---- Edit Plan Generator ----

export class EditPlanGenerator {
	/**
	 * Generate a complete edit plan from intent, analysis, and source clips.
	 * Deterministic: same inputs → same plan.
	 */
	async generate(
		intent: EditIntent,
		video: VideoAnalysis | null,
		audio: AudioAnalysis | null,
		sourceClips: SourceClip[],
		timelineRevision: number,
	): Promise<GeneratorResult> {
		// Reset deterministic UUID counter for reproducibility
		const seed = computeAnalysisSeed(
			video?.duration ?? 0,
			audio?.duration ?? 0,
			audio?.beats.length ?? 0,
			video?.shots.length ?? 0,
		);
		resetDeterministicUUID(seed);
		const rng = createSeededRNG(seed);

		const decisions: EditDecision[] = [];
		const trace: DecisionTrace = {
			cutDecisions: [],
			effectDecisions: [],
			shotDecisions: [],
		};

		// 1. Build intensity curve from audio
		const intensityCurve = audio
			? buildIntensityCurve(audio, intent)
			: { keypoints: [{ time: 0, intensity: 0.5, section: "unknown" as const }], duration: video?.duration ?? 0 };

		// 2. Generate cuts
		const cuts = this.generateCuts(intent, audio, video, intensityCurve, decisions, trace, rng);

		// 3. Select shots
		const shotSelection = this.generateShotSelection(video, audio, intent, trace);

		// 4. Generate transitions
		const transitions = this.generateTransitions(cuts, intent, intensityCurve, rng);

		// 5. Generate effects with P3.10/P3.11 integration
		const effects = this.generateEffects(intent, audio, intensityCurve, sourceClips, trace, rng);

		// 6. Assemble plan
		const plan: AIEditPlan = {
			id: deterministicUUID("plan"),
			version: 2, // P4.1
			hash: "",
			baseTimelineRevision: timelineRevision,
			intent: {
				prompt: intent.prompt,
				style: intent.style,
				pacing: intent.pacing,
				targetDuration: intent.targetDuration ?? undefined,
				aspectRatio: intent.aspectRatio,
			},
			sourceClips,
			decisions,
			cuts,
			transitions,
			effects,
			musicSync: audio ? { enabled: true, targetBpm: audio.bpm ?? undefined } : undefined,
			confidence: this.computeConfidence(cuts, audio, video, shotSelection),
		};

		// 7. Compute deterministic hash
		plan.hash = await computePlanHashAsync(plan);

		return { plan, trace, intensityCurve };
	}

	// ---- Cut Generation ----

	private generateCuts(
		intent: EditIntent,
		audio: AudioAnalysis | null,
		video: VideoAnalysis | null,
		curve: IntensityCurve,
		decisions: EditDecision[],
		trace: DecisionTrace,
		rng: SeededRNG,
	): Cut[] {
		const cuts: Cut[] = [];

		if (intent.cutOnBeats && audio && audio.beats.length > 0) {
			// Beat-synchronized cuts
			const selectedBeats = selectBeatsForCuts(audio, {
				minStrength: intent.beatStrengthThreshold,
				preferDownbeats: intent.preferDownbeats,
				sectionFilter: null,
				maxResults: intent.targetDuration ? Math.floor(intent.targetDuration * 2) : null,
				minInterval: this.getMinInterval(intent.pacing),
			});

			for (const beat of selectedBeats) {
				const intensity = evaluateIntensity(curve, beat.time);
				const editParams = intensityToEditParams(intensity, intent.pacing);

				// Skip if intensity-based cut frequency would skip this beat
				const cutProbability = Math.min(1, editParams.cutFrequency * this.getMinInterval(intent.pacing));
				if (cutProbability < 0.3 && beat.strength < 0.7) continue;

				cuts.push({ time: beat.time, type: "hard" });

				const decision: EditDecision = {
					id: deterministicUUID("dec"),
					type: "cut",
					time: beat.time,
					reason: `${beat.isDownbeat ? "Downbeat" : "Beat"} (strength=${beat.strength.toFixed(2)}) in ${beat.section} section`,
					confidence: beat.score,
					sources: [`beat_at_${beat.time.toFixed(2)}`, `section_${beat.section}`],
				};
				decisions.push(decision);

				trace.cutDecisions.push({
					time: beat.time,
					reason: decision.reason,
					confidence: beat.score,
					beatStrength: beat.strength,
					sectionType: beat.section,
					intensityAtTime: intensity,
				});
			}
		} else if (video && video.shotBoundaries.length > 0) {
			// Visual-based cuts at shot boundaries
			for (const boundary of video.shotBoundaries) {
				if (intent.targetDuration && boundary.time > intent.targetDuration) break;

				cuts.push({ time: boundary.time, type: boundary.type === "cut" ? "hard" : "match" });

				decisions.push({
					id: deterministicUUID("dec"),
					type: "cut",
					time: boundary.time,
					reason: `Shot boundary (${boundary.type}, confidence=${boundary.confidence.toFixed(2)})`,
					confidence: boundary.confidence,
					sources: ["shot_boundary"],
				});
			}
		}

		return cuts;
	}

	// ---- Shot Selection ----

	private generateShotSelection(
		video: VideoAnalysis | null,
		audio: AudioAnalysis | null,
		intent: EditIntent,
		trace: DecisionTrace,
	): ScoredShot[] {
		if (!video) return [];

		const targetClipDuration = intent.pacing === "fast" ? 1.0 :
			intent.pacing === "slow" ? 3.0 : 1.5;

		const result = selectShots(
			video, audio ?? null, intent,
			Math.min(50, video.shots.length),
			targetClipDuration,
		);

		for (const scored of result.selectedShots) {
			trace.shotDecisions.push({
				shotId: scored.shot.id,
				score: scored.score,
				reason: `Score: motion=${scored.breakdown.motionScore.toFixed(2)}, saliency=${scored.breakdown.saliencyScore.toFixed(2)}, section=${scored.breakdown.sectionMatchScore.toFixed(2)}`,
			});
		}

		return result.selectedShots;
	}

	// ---- Transition Generation ----

	private generateTransitions(
		cuts: Cut[],
		intent: EditIntent,
		curve: IntensityCurve,
		_rng: SeededRNG,
	): Transition[] {
		const transitions: Transition[] = [];

		for (const cut of cuts) {
			const intensity = evaluateIntensity(curve, cut.time);
			const editParams = intensityToEditParams(intensity, intent.pacing);

			// Only add transition if density threshold met
			if (editParams.transitionDensity < 0.3) continue;

			const type = this.selectTransitionType(intent.style, intensity);
			const duration = this.computeTransitionDuration(intent.pacing, intensity);

			transitions.push({ atTime: cut.time, type, duration });
		}

		return transitions;
	}

	// ---- Effect Generation with P3.10/P3.11 ----

	private generateEffects(
		intent: EditIntent,
		audio: AudioAnalysis | null,
		curve: IntensityCurve,
		sourceClips: SourceClip[],
		trace: DecisionTrace,
		_rng: SeededRNG,
	): TrackEffect[] {
		if (sourceClips.length === 0) return [];

		const effects: TrackEffect[] = [];

		for (const clip of sourceClips) {
			const trackEffects: EffectDefinition[] = [];

			// Generate effects based on intent and intensity curve
			for (const hint of intent.requestedEffects) {
				const effectDefs = this.buildEffectFromHint(
					hint, clip.mediaId, audio, curve, trace,
				);
				trackEffects.push(...effectDefs);
			}

			// If no explicit effects requested, use style defaults
			if (intent.requestedEffects.length === 0 && audio) {
				const defaultEffects = this.buildDefaultStyleEffects(
					intent.style, clip.mediaId, audio, curve, trace,
				);
				trackEffects.push(...defaultEffects);
			}

			if (trackEffects.length > 0) {
				effects.push({
					trackId: clip.mediaId,
					effects: trackEffects as unknown as TrackEffect["effects"],
				});
			}
		}

		return effects;
	}

	private buildEffectFromHint(
		hint: EffectHint,
		_mediaId: string,
		audio: AudioAnalysis | null,
		curve: IntensityCurve,
		trace: DecisionTrace,
	): EffectDefinition[] {
		const defs: EffectDefinition[] = [];

		// Find the highest-intensity section for dramatic effect placement
		const dropSection = audio?.sections.find(s => s.type === "drop");
		const dropTime = dropSection?.startTime ?? curve.keypoints[0]?.time ?? 0;
		const dropIntensity = evaluateIntensity(curve, dropTime);

		switch (hint) {
			case "glow": {
				const effectId = deterministicUUID("fx-glow");
				const radiusParam: AnimatedNumber = dropSection
					? {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: Math.max(0, dropTime - 0.4), value: 0 },
							{ time: dropTime + 0.2, value: 15 * dropIntensity },
						],
					}
					: { mode: "static", value: 8 };

				const intensityParam: AnimatedNumber = dropSection
					? {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: Math.max(0, dropTime - 0.4), value: 0 },
							{ time: dropTime + 0.2, value: 2.0 * dropIntensity },
						],
					}
					: { mode: "static", value: 1.0 };

				defs.push({
					id: effectId,
					type: "glow",
					enabled: true,
					opacity: 1.0,
					parameters: {
						radius: radiusParam,
						intensity: intensityParam,
						color: { mode: "static", value: { r: 255, g: 200, b: 100, a: 0.8 } } as AnimatedRGBA,
					},
				});

				trace.effectDecisions.push({
					effectId,
					effectType: "glow",
					reason: dropSection
						? `Glow keyframed around drop at ${dropTime.toFixed(1)}s`
						: "Static glow effect",
					sectionType: dropSection?.type ?? "unknown",
					intensityAtTime: dropIntensity,
				});
				break;
			}

			case "blur": {
				const effectId = deterministicUUID("fx-blur");
				defs.push({
					id: effectId,
					type: "blur",
					enabled: true,
					opacity: 1.0,
					parameters: {
						radius: { mode: "static", value: 4 } as AnimatedNumber,
					},
				});
				trace.effectDecisions.push({
					effectId, effectType: "blur",
					reason: "Blur effect from intent", sectionType: "unknown",
					intensityAtTime: 0.5,
				});
				break;
			}

			case "wave": {
				const effectId = deterministicUUID("fx-wave");
				defs.push({
					id: effectId,
					type: "wave",
					enabled: true,
					opacity: 1.0,
					parameters: {
						amplitude: { mode: "static", value: 5 } as AnimatedNumber,
						frequency: { mode: "static", value: 0.1 } as AnimatedNumber,
						phase: { mode: "static", value: 0 } as AnimatedNumber,
						direction: { mode: "static", value: 0 } as AnimatedNumber,
					},
				});
				trace.effectDecisions.push({
					effectId, effectType: "wave",
					reason: "Wave effect from intent", sectionType: "unknown",
					intensityAtTime: 0.5,
				});
				break;
			}

			case "displacement": {
				const effectId = deterministicUUID("fx-disp");
				defs.push({
					id: effectId,
					type: "displacement",
					enabled: true,
					opacity: 1.0,
					parameters: {
						strength: { mode: "static", value: 10 } as AnimatedNumber,
						scale: { mode: "static", value: 20 } as AnimatedNumber,
						angle: { mode: "static", value: 45 } as AnimatedNumber,
					},
				});
				trace.effectDecisions.push({
					effectId, effectType: "displacement",
					reason: "Displacement effect from intent", sectionType: "unknown",
					intensityAtTime: 0.5,
				});
				break;
			}

			case "lens": {
				const effectId = deterministicUUID("fx-lens");
				defs.push({
					id: effectId,
					type: "lens",
					enabled: true,
					opacity: 1.0,
					parameters: {
						strength: { mode: "static", value: 0.5 } as AnimatedNumber,
						radius: { mode: "static", value: 100 } as AnimatedNumber,
						centerX: { mode: "static", value: 0.5 } as AnimatedNumber,
						centerY: { mode: "static", value: 0.5 } as AnimatedNumber,
					},
				});
				trace.effectDecisions.push({
					effectId, effectType: "lens",
					reason: "Lens effect from intent", sectionType: "unknown",
					intensityAtTime: 0.5,
				});
				break;
			}

			case "color": {
				const effectId = deterministicUUID("fx-color");
				defs.push({
					id: effectId,
					type: "color",
					enabled: true,
					opacity: 1.0,
					parameters: {
						brightness: { mode: "static", value: 105 } as AnimatedNumber,
						contrast: { mode: "static", value: 110 } as AnimatedNumber,
						saturation: { mode: "static", value: 120 } as AnimatedNumber,
						hue: { mode: "static", value: 0 } as AnimatedNumber,
					},
				});
				trace.effectDecisions.push({
					effectId, effectType: "color",
					reason: "Color grading from intent", sectionType: "unknown",
					intensityAtTime: 0.5,
				});
				break;
			}

			// zoom and shake are handled via motion recipes, not P3.10 effects
			case "zoom":
			case "shake":
				break;
		}

		return defs;
	}

	private buildDefaultStyleEffects(
		style: EditStyleId,
		_mediaId: string,
		audio: AudioAnalysis,
		curve: IntensityCurve,
		trace: DecisionTrace,
	): EffectDefinition[] {
		const dropSection = audio.sections.find(s => s.type === "drop");

		if (style === "anime_amv" && dropSection) {
			// AMV: glow at drop with keyframed intensity
			const effectId = deterministicUUID("fx-glow-amv");
			const dropTime = dropSection.startTime;

			trace.effectDecisions.push({
				effectId,
				effectType: "glow",
				reason: `AMV style glow at drop (${dropTime.toFixed(1)}s)`,
				sectionType: "drop",
				intensityAtTime: evaluateIntensity(curve, dropTime),
			});

			return [{
				id: effectId,
				type: "glow",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: Math.max(0, dropTime - 0.3), value: 0 },
							{ time: dropTime, value: 12 },
							{ time: dropTime + 1.0, value: 6 },
						],
					} as AnimatedNumber,
					intensity: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: Math.max(0, dropTime - 0.3), value: 0 },
							{ time: dropTime, value: 2.0 },
							{ time: dropTime + 1.0, value: 1.0 },
						],
					} as AnimatedNumber,
					color: { mode: "static", value: { r: 255, g: 100, b: 200, a: 0.9 } } as AnimatedRGBA,
				},
			}];
		}

		return [];
	}

	// ---- Helpers ----

	private getMinInterval(pacing: "slow" | "medium" | "fast"): number {
		switch (pacing) {
			case "fast": return 0.25;
			case "slow": return 1.5;
			case "medium": return 0.5;
		}
	}

	private selectTransitionType(style: EditStyleId, intensity: number): string {
		if (intensity > 0.8) return "flash";
		if (style === "cinematic") return "dissolve";
		if (style === "anime_amv") return "zoom-in";
		return "fade";
	}

	private computeTransitionDuration(pacing: "slow" | "medium" | "fast", intensity: number): number {
		const base = pacing === "fast" ? 0.1 : pacing === "slow" ? 0.8 : 0.3;
		return Math.max(0.05, base * (1 - intensity * 0.5));
	}

	private computeConfidence(
		cuts: Cut[],
		audio: AudioAnalysis | null,
		video: VideoAnalysis | null,
		shots: ScoredShot[],
	): number {
		let c = 0.5;
		if (audio && audio.bpm) c += 0.15;
		if (audio && audio.beats.length > 4) c += 0.1;
		if (audio && audio.sections.length > 2) c += 0.1;
		if (video && video.shots.length > 2) c += 0.1;
		if (cuts.length > 2) c += 0.05;
		if (shots.length > 0) c += 0.05;
		return Math.min(1, c);
	}
}
