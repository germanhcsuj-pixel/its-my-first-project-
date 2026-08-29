/**
 * smart-edit-core.ts — The AI Edit Engine's strategic core.
 *
 * Two-level structure:
 *   Strategy: WHAT to do (depends on intent + analysis results)
 *   Executor:  HOW to do it (builds AIEditPlan deterministically)
 *
 * Flow:
 *   (AudioAnalysis + VideoAnalysis + Intent) → Strategy → Cut Planner
 *     → Transition Planner → Effect Planner → AIEditPlan → Validator → applyPlan()
 *
 * GOLDEN RULE: This module NEVER touches the timeline directly.
 * It only builds an AIEditPlan. applyPlan() handles the actual mutations.
 */

import type { AIEditPlan, Cut, Transition, TrackEffect, EditDecision, SourceClip } from "./edit-plan";
import type { AudioAnalysisResult, Beat } from "./audio-analyzer";
import type { VideoAnalysisResult } from "@/workers/video-analyzer.worker";
import type { EditStyleId } from "./style-presets";
import { computePlanHashAsync } from "./edit-plan-validator";
import { getCurrentTimelineRevision } from "./apply-plan";


// ---- Intent ----

export type EditIntent = {
	prompt: string;
	style: EditStyleId;
	pacing: "slow" | "medium" | "fast";
	targetDuration?: number;
	aspectRatio?: "16:9" | "9:16" | "1:1";
};

export type EditMode =
	| "beat_cut"       // cuts aligned to music beats
	| "remove_silence" // removes silent/boring segments
	| "jump_cut"       // rapid talking-head cuts
	| "highlight_reel" // best moments by interest score
	| "social_short";  // 9:16, short, hook at start

// ---- Interest Score ----

export type InterestScore = {
	total: number;
	motion: number;
	sharpness: number;
	audioEnergy: number;
	sceneChange: number;
};

// ---- Smart Edit Core ----

export class SmartEditCore {
	async buildPlan(
		sourceClips: SourceClip[],
		intent: EditIntent,
		audio: AudioAnalysisResult | null,
		video: VideoAnalysisResult | null,
	): Promise<AIEditPlan> {
		const mode = this.selectMode(intent, audio, video);
		const decisions: EditDecision[] = [];

		// 1. Build cuts based on mode
		const cuts = this.planCuts(mode, intent, audio, video, decisions);

		// 2. Build transitions
		const transitions = this.planTransitions(mode, cuts, intent);

		// 3. Build effects per style
		const effects = this.planEffects(intent, sourceClips);

		// 4. Assemble plan (without hash first)
		const plan: AIEditPlan = {
			id: crypto.randomUUID(),
			version: 1,
			hash: "",
			baseTimelineRevision: getCurrentTimelineRevision(),
			intent,
			sourceClips,
			decisions,
			cuts,
			transitions,
			effects,
			captions: (intent.style as string) === "social_short" ? { enabled: true, style: "tiktok" as const, position: "bottom" as const } : undefined,
			musicSync: audio ? { enabled: true, targetBpm: audio.bpm ?? undefined } : undefined,
			confidence: this.computeConfidence(cuts, audio, video),
		};

		// 5. Compute canonical hash
		plan.hash = await computePlanHashAsync(plan);

		return plan;
	}

	// ---- Mode Selection ----

	private selectMode(
		intent: EditIntent,
		audio: AudioAnalysisResult | null,
		_video: VideoAnalysisResult | null,
	): EditMode {
		const style = intent.style as string;
		if (style === "social_short") return "social_short";
		if (style === "anime_amv" && audio) return "beat_cut";
		if (audio && audio.beats.length > 0) return "beat_cut";
		return "highlight_reel";
	}

	// ---- Cut Planner ----

	private planCuts(
		mode: EditMode,
		intent: EditIntent,
		audio: AudioAnalysisResult | null,
		video: VideoAnalysisResult | null,
		decisions: EditDecision[],
	): Cut[] {
		switch (mode) {
			case "beat_cut":
				return this.beatCuts(audio, intent, decisions);
			case "highlight_reel":
				return this.highlightCuts(video, intent, decisions);
			case "remove_silence":
				return this.silenceCuts(audio, intent, decisions);
			case "social_short":
				return this.socialShortCuts(audio, video, intent, decisions);
			default:
				return this.beatCuts(audio, intent, decisions);
		}
	}

	private beatCuts(
		audio: AudioAnalysisResult | null,
		intent: EditIntent,
		decisions: EditDecision[],
	): Cut[] {
		if (!audio || audio.beats.length === 0) return [];

		const constraints = this.getConstraints(intent.pacing);
		const cuts: Cut[] = [];
		let lastCutTime = -constraints.minClipDuration;

		// Select major beats first, then fill with minor beats if needed
		const candidateBeats = [
			...audio.beats.filter(b => b.isMajor && b.strength > 0.4),
			...audio.beats.filter(b => !b.isMajor && b.strength > 0.6),
		].sort((a, b) => a.time - b.time);

		for (const beat of candidateBeats) {
			if (beat.time - lastCutTime < constraints.minClipDuration) continue;
			if (intent.targetDuration && beat.time > intent.targetDuration) break;

			cuts.push({ time: beat.time, type: "hard" });

			const decision: EditDecision = {
				id: crypto.randomUUID(),
				type: "cut",
				time: beat.time,
				reason: beat.isMajor ? "Major beat onset detected" : "Minor beat onset",
				confidence: beat.strength,
				sources: [`beat_at_${beat.time.toFixed(2)}`],
			};
			decisions.push(decision);
			lastCutTime = beat.time;
		}

		return cuts;
	}

	private highlightCuts(
		video: VideoAnalysisResult | null,
		intent: EditIntent,
		decisions: EditDecision[],
	): Cut[] {
		if (!video || video.frames.length === 0) return [];

		const constraints = this.getConstraints(intent.pacing);
		const cuts: Cut[] = [];
		let lastCutTime = -constraints.minClipDuration;

		// Cut at scene changes with high motion
		const sceneChanges = video.frames.filter(
			f => f.isSceneChange && f.motion > 0.3
		);

		for (const frame of sceneChanges) {
			if (frame.time - lastCutTime < constraints.minClipDuration) continue;
			if (intent.targetDuration && frame.time > intent.targetDuration) break;

			cuts.push({ time: frame.time, type: "match" });

			decisions.push({
				id: crypto.randomUUID(),
				type: "cut",
				time: frame.time,
				reason: "Scene change with high motion",
				confidence: frame.motion,
				sources: ["scene_change", "high_motion"],
			});

			lastCutTime = frame.time;
		}

		return cuts;
	}

	private silenceCuts(
		audio: AudioAnalysisResult | null,
		intent: EditIntent,
		decisions: EditDecision[],
	): Cut[] {
		if (!audio) return [];

		const cuts: Cut[] = [];
		let inSilence = false;
		let silenceStart = 0;

		for (const segment of audio.segments) {
			if (segment.isSilence && !inSilence) {
				inSilence = true;
				silenceStart = segment.startTime;
			} else if (!segment.isSilence && inSilence) {
				// End of silence — cut here (resume point)
				cuts.push({ time: segment.startTime, type: "jump" });
				decisions.push({
					id: crypto.randomUUID(),
					type: "cut",
					time: segment.startTime,
					reason: `End of silence block (${(segment.startTime - silenceStart).toFixed(1)}s removed)`,
					confidence: 0.9,
					sources: ["silence_detection"],
				});
				inSilence = false;
			}
		}

		return cuts;
	}

	private socialShortCuts(
		audio: AudioAnalysisResult | null,
		video: VideoAnalysisResult | null,
		intent: EditIntent,
		decisions: EditDecision[],
	): Cut[] {
		// Social short = fast beat cuts + hook at start
		const fastIntent = { ...intent, pacing: "fast" as const, targetDuration: intent.targetDuration ?? 30 };
		return this.beatCuts(audio, fastIntent, decisions);
	}

	// ---- Transition Planner ----

	private planTransitions(mode: EditMode, cuts: Cut[], intent: EditIntent): Transition[] {
		const transitions: Transition[] = [];
		const transitionType = this.getDefaultTransitionType(intent.style, mode);
		const transitionDuration = this.getTransitionDuration(intent.pacing);

		for (const cut of cuts) {
			transitions.push({
				atTime: cut.time,
				type: transitionType,
				duration: transitionDuration,
			});
		}

		return transitions;
	}

	private getDefaultTransitionType(style: EditStyleId, mode: EditMode): string {
		if (mode === "beat_cut") return "flash";
		if (style === "cinematic") return "dissolve";
		if (style === "anime_amv") return "zoom-in";
		return "fade";
	}

	private getTransitionDuration(pacing: "slow" | "medium" | "fast"): number {
		switch (pacing) {
			case "slow": return 0.8;
			case "medium": return 0.3;
			case "fast": return 0.1;
		}
	}

	// ---- Effect Planner ----

	private planEffects(intent: EditIntent, sourceClips: SourceClip[]): TrackEffect[] {
		const filterMap: Partial<Record<string, TrackEffect["filters"]>> = {
			anime_amv: [{ id: "glitch", intensity: 0.3 }, { id: "color_grade", intensity: 0.7 }],
			cyberpunk: [{ id: "cyberpunk", intensity: 0.8 }, { id: "vhs", intensity: 0.3 }],
			cinematic: [{ id: "cinematic", intensity: 0.7 }],
			tiktok: [{ id: "color_grade", intensity: 0.5 }],
			social_short: [{ id: "color_grade", intensity: 0.5 }],
			custom: [],
		};

		const filters = filterMap[intent.style] ?? [];
		if (filters.length === 0) return [];

		// Apply effects to all source clips (simplified — full version maps to specific track IDs)
		return sourceClips.map(clip => ({
			trackId: clip.mediaId, // will be resolved to actual trackId at apply time
			filters,
		}));
	}

	// ---- Helpers ----

	private getConstraints(pacing: "slow" | "medium" | "fast") {
		switch (pacing) {
			case "slow": return { minClipDuration: 1.5, maxCutsPerSecond: 0.5 };
			case "medium": return { minClipDuration: 0.4, maxCutsPerSecond: 1.5 };
			case "fast": return { minClipDuration: 0.25, maxCutsPerSecond: 4.0 };
		}
	}

	private computeConfidence(
		cuts: Cut[],
		audio: AudioAnalysisResult | null,
		video: VideoAnalysisResult | null,
	): number {
		let confidence = 0.5;
		if (audio && audio.bpm) confidence += 0.2;
		if (audio && audio.beats.length > 4) confidence += 0.15;
		if (video && video.averageSharpness > 0.3) confidence += 0.1;
		if (cuts.length > 2) confidence += 0.05;
		return Math.min(1, confidence);
	}
}
