/**
 * intensity-curve.ts — Section-aware editing intensity for P4.1.
 *
 * Maps music sections to editing intensity:
 *   intro  → low
 *   build  → increasing
 *   drop   → high
 *   break  → low
 *   outro  → decreasing
 *
 * Intensity influences: cut frequency, effect intensity, transition density.
 * Uses P3.10 keyframes for temporal animation.
 */

import type { MusicSectionType, AudioAnalysis, MusicSection } from "./audio-analysis";
import type { EditIntent, SectionOverride } from "./edit-intent";

// ---- Intensity Keypoint ----

export interface IntensityKeypoint {
	time: number;
	intensity: number;     // 0..1
	section: MusicSectionType;
}

// ---- Intensity Curve ----

export interface IntensityCurve {
	keypoints: IntensityKeypoint[];
	duration: number;
}

// ---- Section Intensity Defaults ----

const SECTION_INTENSITY: Record<MusicSectionType, number> = {
	intro: 0.2,
	verse: 0.4,
	build: 0.6,
	drop: 0.95,
	chorus: 0.85,
	break: 0.25,
	outro: 0.15,
	unknown: 0.5,
};

// ---- Build Intensity Curve ----

/**
 * Build an intensity curve from audio analysis and intent.
 * Deterministic: same input → same output.
 */
export function buildIntensityCurve(
	audio: AudioAnalysis,
	intent: EditIntent,
): IntensityCurve {
	if (audio.sections.length === 0) {
		// No sections detected — use flat intensity based on pacing
		const flatIntensity = intent.pacing === "fast" ? 0.7 :
			intent.pacing === "slow" ? 0.3 : 0.5;
		return {
			keypoints: [
				{ time: 0, intensity: flatIntensity, section: "unknown" },
				{ time: audio.duration, intensity: flatIntensity, section: "unknown" },
			],
			duration: audio.duration,
		};
	}

	const keypoints: IntensityKeypoint[] = [];

	for (const section of audio.sections) {
		const baseIntensity = getSectionIntensity(section.type, intent.sectionOverrides);

		// Add keypoint at section start
		keypoints.push({
			time: section.startTime,
			intensity: baseIntensity,
			section: section.type,
		});

		// For "build" sections, add a ramp from low to high
		if (section.type === "build") {
			const rampStart = baseIntensity * 0.5;
			const rampEnd = baseIntensity;
			// Override start keypoint
			keypoints[keypoints.length - 1].intensity = rampStart;
			// Add end ramp keypoint
			keypoints.push({
				time: section.endTime,
				intensity: rampEnd,
				section: section.type,
			});
		}

		// For "outro" sections, add a declining ramp
		if (section.type === "outro") {
			keypoints.push({
				time: section.endTime,
				intensity: 0.05,
				section: section.type,
			});
		}
	}

	// Sort by time
	keypoints.sort((a, b) => a.time - b.time);

	return { keypoints, duration: audio.duration };
}

/**
 * Evaluate the intensity at a given time by linear interpolation.
 */
export function evaluateIntensity(curve: IntensityCurve, time: number): number {
	if (curve.keypoints.length === 0) return 0.5;
	if (curve.keypoints.length === 1) return curve.keypoints[0].intensity;

	// Before first keypoint
	if (time <= curve.keypoints[0].time) return curve.keypoints[0].intensity;

	// After last keypoint
	const last = curve.keypoints[curve.keypoints.length - 1];
	if (time >= last.time) return last.intensity;

	// Find surrounding keypoints and interpolate
	for (let i = 0; i < curve.keypoints.length - 1; i++) {
		const a = curve.keypoints[i];
		const b = curve.keypoints[i + 1];
		if (time >= a.time && time <= b.time) {
			const t = (time - a.time) / (b.time - a.time);
			return a.intensity + t * (b.intensity - a.intensity);
		}
	}

	return 0.5;
}

// ---- Intensity to Edit Parameters ----

export interface EditParameters {
	cutFrequency: number;    // cuts per second
	effectIntensity: number; // 0..1 effect parameter multiplier
	transitionDensity: number; // 0..1 probability of transition at cut
	zoomIntensity: number;   // 0..1
	shakeIntensity: number;  // 0..1
	glowIntensity: number;   // 0..1
}

/**
 * Convert intensity value to concrete editing parameters.
 */
export function intensityToEditParams(
	intensity: number,
	pacing: "slow" | "medium" | "fast",
): EditParameters {
	// Base cut frequency depends on pacing
	const baseCutFreq = pacing === "fast" ? 2.0 :
		pacing === "slow" ? 0.4 : 1.0;

	return {
		cutFrequency: baseCutFreq * (0.5 + intensity * 1.0),
		effectIntensity: intensity,
		transitionDensity: Math.min(1, intensity * 0.8),
		zoomIntensity: intensity > 0.5 ? (intensity - 0.5) * 2 : 0,
		shakeIntensity: intensity > 0.7 ? (intensity - 0.7) * 3.3 : 0,
		glowIntensity: intensity > 0.6 ? (intensity - 0.6) * 2.5 : 0,
	};
}

// ---- Internal ----

function getSectionIntensity(
	section: MusicSectionType,
	overrides: SectionOverride[],
): number {
	// Check for user overrides
	const override = overrides.find(o => o.section === section);
	if (override) {
		switch (override.intensity) {
			case "low": return 0.2;
			case "medium": return 0.5;
			case "high": return 0.8;
			case "extreme": return 1.0;
		}
	}

	return SECTION_INTENSITY[section];
}
