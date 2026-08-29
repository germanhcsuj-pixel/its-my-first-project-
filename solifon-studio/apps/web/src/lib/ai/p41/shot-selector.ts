/**
 * shot-selector.ts — Deterministic shot selection and scoring for P4.1.
 *
 * Scores candidate shots based on:
 * - motion intensity
 * - visual saliency
 * - beat compatibility
 * - music section compatibility
 * - duration compatibility
 * - shot uniqueness (anti-repeat)
 *
 * Uses explicit, documented weight constants.
 */

import type { Shot, VideoAnalysis } from "./video-analysis";
import type { AudioAnalysis, MusicSectionType } from "./audio-analysis";
import type { EditIntent } from "./edit-intent";

// ---- Scoring Weights ----

export interface ShotScoringWeights {
	motion: number;
	saliency: number;
	brightness: number;
	faceBonus: number;
	uniqueness: number;
	durationFit: number;
	sectionMatch: number;
}

export const DEFAULT_SCORING_WEIGHTS: Readonly<ShotScoringWeights> = {
	motion: 0.25,
	saliency: 0.20,
	brightness: 0.05,
	faceBonus: 0.10,
	uniqueness: 0.15,
	durationFit: 0.15,
	sectionMatch: 0.10,
};

// ---- Scored Shot ----

export interface ScoredShot {
	shot: Shot;
	score: number;              // 0..1 composite score
	breakdown: {
		motionScore: number;
		saliencyScore: number;
		brightnessScore: number;
		faceScore: number;
		uniquenessScore: number;
		durationFitScore: number;
		sectionMatchScore: number;
	};
}

// ---- Selection Result ----

export interface ShotSelectionResult {
	selectedShots: ScoredShot[];
	totalCandidates: number;
	averageScore: number;
}

// ---- Core Function ----

/**
 * Select shots deterministically from video analysis.
 *
 * Prevents:
 * - repeated identical shots
 * - impossible clip durations
 * - invalid source ranges
 */
export function selectShots(
	video: VideoAnalysis,
	audio: AudioAnalysis | null,
	intent: EditIntent,
	maxShots: number,
	targetClipDuration: number,
	weights: ShotScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ShotSelectionResult {
	if (video.shots.length === 0) {
		return { selectedShots: [], totalCandidates: 0, averageScore: 0 };
	}

	// 1. Score all shots
	const scored = video.shots.map((shot, index) =>
		scoreShot(shot, index, video, audio, intent, targetClipDuration, weights)
	);

	// 2. Sort by score descending (deterministic tie-break by startTime)
	scored.sort((a, b) => {
		const diff = b.score - a.score;
		if (Math.abs(diff) > 0.0001) return diff;
		return a.shot.startTime - b.shot.startTime;
	});

	// 3. Select top shots with uniqueness constraint
	const selected: ScoredShot[] = [];
	const usedRanges: { start: number; end: number }[] = [];

	for (const candidate of scored) {
		if (selected.length >= maxShots) break;

		// Check: no timeline overlap with already selected shots
		const overlaps = usedRanges.some(r =>
			candidate.shot.startTime < r.end && candidate.shot.endTime > r.start
		);
		if (overlaps) continue;

		// Check: valid duration
		if (candidate.shot.duration < 0.1) continue;

		selected.push(candidate);
		usedRanges.push({
			start: candidate.shot.startTime,
			end: candidate.shot.endTime,
		});
	}

	// 4. Sort selected chronologically
	selected.sort((a, b) => a.shot.startTime - b.shot.startTime);

	const averageScore = selected.length > 0
		? selected.reduce((s, sh) => s + sh.score, 0) / selected.length
		: 0;

	return {
		selectedShots: selected,
		totalCandidates: scored.length,
		averageScore,
	};
}

// ---- Internal Scoring ----

function scoreShot(
	shot: Shot,
	index: number,
	video: VideoAnalysis,
	audio: AudioAnalysis | null,
	intent: EditIntent,
	targetClipDuration: number,
	weights: ShotScoringWeights,
): ScoredShot {
	// Motion score: high motion for fast pacing, moderate for slow
	const motionTarget = intent.pacing === "fast" ? 0.7 : intent.pacing === "slow" ? 0.3 : 0.5;
	const motionScore = 1 - Math.abs(shot.motionIntensity - motionTarget);

	// Saliency: higher is better
	const saliencyScore = shot.saliency;

	// Brightness: prefer shots not too dark or too bright
	const brightnessScore = 1 - Math.abs(shot.brightness - 0.5) * 2;

	// Face bonus
	const faceScore = shot.hasFaces ? 1 : 0;

	// Uniqueness: penalize shots that are very similar to their neighbors
	const prevShot = index > 0 ? video.shots[index - 1] : null;
	const nextShot = index < video.shots.length - 1 ? video.shots[index + 1] : null;
	let uniquenessScore = 1;
	if (prevShot) {
		const similarity = computeShotSimilarity(shot, prevShot);
		uniquenessScore = Math.min(uniquenessScore, 1 - similarity);
	}
	if (nextShot) {
		const similarity = computeShotSimilarity(shot, nextShot);
		uniquenessScore = Math.min(uniquenessScore, 1 - similarity);
	}

	// Duration fit: how close to target clip duration
	const durationRatio = shot.duration / targetClipDuration;
	const durationFitScore = durationRatio >= 0.5 && durationRatio <= 3.0
		? 1 - Math.abs(1 - durationRatio) * 0.5
		: 0.2;

	// Section match: bonus for shots that match the current music section's energy
	let sectionMatchScore = 0.5;
	if (audio) {
		const section = audio.sections.find(
			s => shot.startTime >= s.startTime && shot.startTime < s.endTime
		);
		if (section) {
			sectionMatchScore = computeSectionShotMatch(section.type, shot);
		}
	}

	// Composite score
	const score =
		motionScore * weights.motion +
		saliencyScore * weights.saliency +
		brightnessScore * weights.brightness +
		faceScore * weights.faceBonus +
		uniquenessScore * weights.uniqueness +
		durationFitScore * weights.durationFit +
		sectionMatchScore * weights.sectionMatch;

	return {
		shot,
		score: Math.max(0, Math.min(1, score)),
		breakdown: {
			motionScore,
			saliencyScore,
			brightnessScore,
			faceScore,
			uniquenessScore,
			durationFitScore,
			sectionMatchScore,
		},
	};
}

function computeShotSimilarity(a: Shot, b: Shot): number {
	const motionDiff = Math.abs(a.motionIntensity - b.motionIntensity);
	const brightDiff = Math.abs(a.brightness - b.brightness);
	const saliencyDiff = Math.abs(a.saliency - b.saliency);
	return 1 - (motionDiff + brightDiff + saliencyDiff) / 3;
}

function computeSectionShotMatch(section: MusicSectionType, shot: Shot): number {
	// High-energy sections prefer high-motion shots
	switch (section) {
		case "drop":
		case "chorus":
			return shot.motionIntensity > 0.5 ? 0.9 : 0.3;
		case "build":
			return shot.motionIntensity > 0.3 && shot.motionIntensity < 0.7 ? 0.8 : 0.4;
		case "intro":
		case "outro":
		case "break":
			return shot.motionIntensity < 0.4 ? 0.8 : 0.3;
		case "verse":
			return 0.6;
		default:
			return 0.5;
	}
}
