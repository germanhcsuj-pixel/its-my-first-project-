/**
 * beat-sync.ts — Deterministic beat-aware editing for P4.1.
 *
 * Supports:
 * - nearest beat selection
 * - strongest nearby beat
 * - downbeat preference
 * - beat strength filtering
 * - section-aware beat selection
 *
 * RULE: Given identical input analysis and intent,
 * beat selection MUST always produce identical results.
 */

import type { ExtendedBeat, AudioAnalysis, MusicSectionType } from "./audio-analysis";

// ---- Beat Selection Options ----

export interface BeatSelectionOptions {
	minStrength: number;           // 0..1 minimum beat strength
	preferDownbeats: boolean;
	sectionFilter: MusicSectionType | null;  // only select beats in this section
	maxResults: number | null;     // limit number of selected beats
	minInterval: number;           // minimum time between selected beats (seconds)
}

// ---- Beat Sync Result ----

export interface SelectedBeat {
	time: number;
	strength: number;
	isDownbeat: boolean;
	section: MusicSectionType;
	score: number;                 // composite selection score 0..1
}

// ---- Core Functions ----

/**
 * Select beats for cut points based on analysis and options.
 * Deterministic: same input → same output.
 */
export function selectBeatsForCuts(
	audio: AudioAnalysis,
	options: BeatSelectionOptions,
): SelectedBeat[] {
	if (audio.beats.length === 0) return [];

	// 1. Filter by strength
	let candidates = audio.beats.filter(b => b.strength >= options.minStrength);

	// 2. Filter by section if specified
	if (options.sectionFilter) {
		const sectionBeats = getBeatsInSection(candidates, audio, options.sectionFilter);
		candidates = sectionBeats;
	}

	// 3. Score each candidate
	const scored: SelectedBeat[] = candidates.map(beat => ({
		time: beat.time,
		strength: beat.strength,
		isDownbeat: beat.isDownbeat,
		section: getSectionAtTime(audio, beat.time),
		score: computeBeatScore(beat, options),
	}));

	// 4. Sort by score descending (deterministic tie-breaking by time)
	scored.sort((a, b) => {
		const scoreDiff = b.score - a.score;
		if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
		return a.time - b.time; // deterministic tie-break
	});

	// 5. Select with minimum interval constraint
	const selected: SelectedBeat[] = [];
	for (const beat of scored) {
		if (options.maxResults !== null && selected.length >= options.maxResults) break;

		const tooClose = selected.some(
			s => Math.abs(s.time - beat.time) < options.minInterval
		);
		if (tooClose) continue;

		selected.push(beat);
	}

	// 6. Sort selected by time for chronological output
	selected.sort((a, b) => a.time - b.time);

	return selected;
}

/**
 * Find the nearest beat to a given time.
 */
export function findNearestBeat(
	audio: AudioAnalysis,
	time: number,
	options: { minStrength?: number; preferDownbeat?: boolean } = {},
): SelectedBeat | null {
	const minStrength = options.minStrength ?? 0;
	const candidates = audio.beats.filter(b => b.strength >= minStrength);
	if (candidates.length === 0) return null;

	let best: ExtendedBeat | null = null;
	let bestDist = Infinity;

	for (const beat of candidates) {
		const dist = Math.abs(beat.time - time);
		const bonus = (options.preferDownbeat && beat.isDownbeat) ? 0.1 : 0;
		const effectiveDist = dist - bonus;

		if (effectiveDist < bestDist) {
			bestDist = effectiveDist;
			best = beat;
		}
	}

	if (!best) return null;

	return {
		time: best.time,
		strength: best.strength,
		isDownbeat: best.isDownbeat,
		section: getSectionAtTime(audio, best.time),
		score: computeBeatScore(best, {
			minStrength,
			preferDownbeats: options.preferDownbeat ?? false,
			sectionFilter: null,
			maxResults: null,
			minInterval: 0,
		}),
	};
}

/**
 * Find the strongest beat within a time window.
 */
export function findStrongestBeat(
	audio: AudioAnalysis,
	windowStart: number,
	windowEnd: number,
): SelectedBeat | null {
	const candidates = audio.beats.filter(
		b => b.time >= windowStart && b.time <= windowEnd
	);
	if (candidates.length === 0) return null;

	// Sort by strength descending, tie-break by time
	candidates.sort((a, b) => {
		const strengthDiff = b.strength - a.strength;
		if (Math.abs(strengthDiff) > 0.0001) return strengthDiff;
		return a.time - b.time;
	});

	const best = candidates[0];
	return {
		time: best.time,
		strength: best.strength,
		isDownbeat: best.isDownbeat,
		section: getSectionAtTime(audio, best.time),
		score: best.strength,
	};
}

// ---- Internal ----

function computeBeatScore(beat: ExtendedBeat, options: BeatSelectionOptions): number {
	let score = beat.strength;

	// Bonus for downbeats when preferred
	if (options.preferDownbeats && beat.isDownbeat) {
		score += 0.2;
	}

	// Bonus for major beats
	if (beat.isMajor) {
		score += 0.1;
	}

	return Math.min(1, score);
}

function getBeatsInSection(
	beats: ExtendedBeat[],
	audio: AudioAnalysis,
	sectionType: MusicSectionType,
): ExtendedBeat[] {
	const matchingSections = audio.sections.filter(s => s.type === sectionType);
	return beats.filter(b =>
		matchingSections.some(s => b.time >= s.startTime && b.time <= s.endTime)
	);
}

function getSectionAtTime(audio: AudioAnalysis, time: number): MusicSectionType {
	for (const section of audio.sections) {
		if (time >= section.startTime && time <= section.endTime) {
			return section.type;
		}
	}
	return "unknown";
}
