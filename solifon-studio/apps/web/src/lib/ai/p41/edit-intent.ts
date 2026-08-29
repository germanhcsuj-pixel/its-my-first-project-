/**
 * edit-intent.ts — Strongly typed EditIntent representation for P4.1.
 *
 * Represents structured user intent for automatic editing.
 * Intent is parsed from natural language, but once parsed,
 * all downstream processing uses this structured type.
 */

import type { EditStyleId } from "../style-presets";
import type { MusicSectionType } from "./audio-analysis";

// ---- Intent Effect Hints ----

export type EffectHint =
	| "zoom"
	| "shake"
	| "glow"
	| "blur"
	| "color"
	| "wave"
	| "displacement"
	| "lens";

export type IntensityHint = "low" | "medium" | "high" | "extreme";

// ---- Section Override ----

export interface SectionOverride {
	section: MusicSectionType;
	intensity: IntensityHint;
	effects: EffectHint[];
	cutFrequency: "sparse" | "normal" | "dense";
}

// ---- Edit Intent ----

export interface EditIntent {
	prompt: string;                              // original user text
	style: EditStyleId;
	pacing: "slow" | "medium" | "fast";
	targetDuration: number | null;               // seconds, or null for "use full source"
	aspectRatio: "16:9" | "9:16" | "1:1";

	// Structured flags derived from prompt
	cutOnBeats: boolean;
	beatStrengthThreshold: number;               // 0..1 minimum beat strength for cuts
	preferDownbeats: boolean;
	sectionOverrides: SectionOverride[];          // e.g. "make the drop aggressive"
	requestedEffects: EffectHint[];               // e.g. "use zoom, shake and glow"
	energyMapping: "match_music" | "constant" | "custom";
}

// ---- Intent Parser ----

/**
 * Parse a natural language prompt into structured EditIntent.
 * Deterministic: same prompt → same intent.
 */
export function parseEditIntent(prompt: string): EditIntent {
	const lower = prompt.toLowerCase().trim();

	// Detect style
	const style = detectStyle(lower);

	// Detect pacing
	const pacing = detectPacing(lower);

	// Detect target duration
	const targetDuration = detectTargetDuration(lower);

	// Detect aspect ratio
	const aspectRatio = detectAspectRatio(lower);

	// Detect beat-related flags
	const cutOnBeats = /\b(beats?|rhythm|sync|bpm)\b/i.test(lower);
	const preferDownbeats = /\b(downbeat|strong beat|bass)\b/i.test(lower);
	const beatStrengthThreshold = cutOnBeats ? 0.3 : 0.5;

	// Detect effects
	const requestedEffects = detectEffects(lower);

	// Detect section overrides
	const sectionOverrides = detectSectionOverrides(lower);

	// Detect energy mapping
	const energyMapping = cutOnBeats ? "match_music" as const : "constant" as const;

	return {
		prompt,
		style,
		pacing,
		targetDuration,
		aspectRatio,
		cutOnBeats,
		beatStrengthThreshold,
		preferDownbeats,
		sectionOverrides,
		requestedEffects,
		energyMapping,
	};
}

// ---- Internal Detectors ----

function detectStyle(lower: string): EditStyleId {
	if (/\b(amv|anime)\b/.test(lower)) return "anime_amv";
	if (/\b(cyber|neon|punk)\b/.test(lower)) return "cyberpunk";
	if (/\b(cine(?:matic)?|film|movie)\b/.test(lower)) return "cinematic";
	if (/\b(tiktok|reels?|shorts?)\b/.test(lower)) return "tiktok";
	if (/\b(social|clip)\b/.test(lower)) return "social_short";
	return "custom";
}

function detectPacing(lower: string): "slow" | "medium" | "fast" {
	if (/\b(fast|rapid|energetic|aggressive|intense|hype)\b/.test(lower)) return "fast";
	if (/\b(slow|calm|smooth|chill|relaxed|gentle)\b/.test(lower)) return "slow";
	return "medium";
}

function detectTargetDuration(lower: string): number | null {
	const match = lower.match(/(\d+)\s*(?:sec(?:ond)?s?|s\b)/);
	if (match) return parseInt(match[1], 10);
	const minMatch = lower.match(/(\d+)\s*min(?:ute)?s?/);
	if (minMatch) return parseInt(minMatch[1], 10) * 60;
	return null;
}

function detectAspectRatio(lower: string): "16:9" | "9:16" | "1:1" {
	if (/\b(9:16|vertical|portrait|tiktok|reels?|shorts?)\b/.test(lower)) return "9:16";
	if (/\b(1:1|square)\b/.test(lower)) return "1:1";
	return "16:9";
}

function detectEffects(lower: string): EffectHint[] {
	const effects: EffectHint[] = [];
	if (/\b(zoom)\b/.test(lower)) effects.push("zoom");
	if (/\b(shake|shaky|camera\s*shake)\b/.test(lower)) effects.push("shake");
	if (/\b(glow|bloom)\b/.test(lower)) effects.push("glow");
	if (/\b(blur)\b/.test(lower)) effects.push("blur");
	if (/\b(color|colour|grade|grading)\b/.test(lower)) effects.push("color");
	if (/\b(wave|waves?|distort)\b/.test(lower)) effects.push("wave");
	if (/\b(displace|displacement)\b/.test(lower)) effects.push("displacement");
	if (/\b(lens|fisheye)\b/.test(lower)) effects.push("lens");
	return effects;
}

function detectSectionOverrides(lower: string): SectionOverride[] {
	const overrides: SectionOverride[] = [];

	// "make the drop aggressive"
	if (/\b(drop|climax)\b.*\b(aggressive|hard|intense|heavy)\b/.test(lower)) {
		overrides.push({
			section: "drop",
			intensity: "extreme",
			effects: ["shake", "glow", "zoom"],
			cutFrequency: "dense",
		});
	}

	// "slow buildup before the drop"
	if (/\b(build|buildup|crescendo)\b.*\b(slow|gradual)\b/.test(lower) ||
		/\b(slow|gradual)\b.*\b(build|buildup)\b/.test(lower)) {
		overrides.push({
			section: "build",
			intensity: "medium",
			effects: ["blur", "glow"],
			cutFrequency: "sparse",
		});
	}

	// "calm intro"
	if (/\b(intro|beginning|start)\b.*\b(calm|slow|gentle)\b/.test(lower)) {
		overrides.push({
			section: "intro",
			intensity: "low",
			effects: [],
			cutFrequency: "sparse",
		});
	}

	return overrides;
}
