/**
 * audio-analysis.ts — Extended audio analysis types for P4.1.
 *
 * Extends the existing AudioAnalysisResult with:
 * - downbeats
 * - music sections (intro, verse, build, drop, chorus, break, outro)
 * - section-level confidence
 * - beat strength normalization
 *
 * All scores normalized to [0, 1].
 * Pure data — no browser APIs.
 */

// ---- Music Section ----

export type MusicSectionType =
	| "intro"
	| "verse"
	| "build"
	| "drop"
	| "chorus"
	| "break"
	| "outro"
	| "unknown";

export interface MusicSection {
	type: MusicSectionType;
	startTime: number;
	endTime: number;
	confidence: number;      // 0..1 — how certain we are about this classification
	averageEnergy: number;   // 0..1
}

// ---- Extended Beat ----

export interface ExtendedBeat {
	time: number;           // seconds
	strength: number;       // 0..1
	isDownbeat: boolean;    // first beat of a bar
	isMajor: boolean;       // strong beat
	barIndex: number;       // which bar this beat belongs to (0-based)
	beatInBar: number;      // position within bar (0-based)
}

// ---- Full Audio Analysis ----

export interface AudioAnalysis {
	duration: number;
	sampleRate: number;
	bpm: number | null;
	beats: ExtendedBeat[];
	downbeats: ExtendedBeat[];   // subset of beats where isDownbeat=true
	sections: MusicSection[];
	energySegments: EnergySegment[];
	totalEnergy: number;     // 0..1 average
	peakEnergy: number;      // 0..1 max
}

export interface EnergySegment {
	startTime: number;
	endTime: number;
	energy: number;         // 0..1
	isSilence: boolean;
}

// ---- Builder (from existing AudioAnalysisResult) ----

import type { AudioAnalysisResult, Beat, AudioSegment } from "../audio-analyzer";

/**
 * Build an extended AudioAnalysis from the existing AudioAnalysisResult.
 * Adds downbeat detection, section classification, and bar indexing.
 *
 * Deterministic: same input → same output.
 */
export function buildAudioAnalysis(raw: AudioAnalysisResult): AudioAnalysis {
	// 1. Convert beats to extended beats with bar/downbeat info
	const extBeats = assignBarsAndDownbeats(raw.beats, raw.bpm);

	// 2. Convert segments
	const energySegments: EnergySegment[] = raw.segments.map(s => ({
		startTime: s.startTime,
		endTime: s.endTime,
		energy: s.energy,
		isSilence: s.isSilence,
	}));

	// 3. Detect music sections from energy contour
	const sections = detectMusicSections(energySegments, raw.duration);

	// 4. Extract downbeats
	const downbeats = extBeats.filter(b => b.isDownbeat);

	return {
		duration: raw.duration,
		sampleRate: raw.sampleRate,
		bpm: raw.bpm,
		beats: extBeats,
		downbeats,
		sections,
		energySegments,
		totalEnergy: raw.totalEnergy,
		peakEnergy: raw.peakEnergy,
	};
}

// ---- Internal: Bar Assignment ----

function assignBarsAndDownbeats(
	rawBeats: Beat[],
	bpm: number | null,
): ExtendedBeat[] {
	if (rawBeats.length === 0) return [];

	// Estimate beats per bar (default 4/4 time)
	const beatsPerBar = 4;
	let barIndex = 0;
	let beatInBar = 0;

	return rawBeats.map((beat, _i) => {
		const isDownbeat = beatInBar === 0;
		const ext: ExtendedBeat = {
			time: beat.time,
			strength: beat.strength,
			isDownbeat,
			isMajor: beat.isMajor,
			barIndex,
			beatInBar,
		};

		beatInBar++;
		if (beatInBar >= beatsPerBar) {
			beatInBar = 0;
			barIndex++;
		}

		return ext;
	});
}

// ---- Internal: Section Detection ----

/**
 * Classify music sections based on energy contour.
 * Uses a simple energy-level approach:
 * - Low energy at start → intro
 * - Rising energy → build
 * - High energy → drop/chorus
 * - Low energy in middle → break/verse
 * - Declining energy at end → outro
 */
function detectMusicSections(
	segments: EnergySegment[],
	duration: number,
): MusicSection[] {
	if (segments.length === 0 || duration <= 0) return [];

	const WINDOW_SIZE = 20; // segments per analysis window (~2s at 100ms segments)
	const sections: MusicSection[] = [];

	// Compute windowed energy averages
	const windowedEnergy: { time: number; energy: number }[] = [];
	for (let i = 0; i < segments.length; i += WINDOW_SIZE) {
		const window = segments.slice(i, i + WINDOW_SIZE);
		const avgEnergy = window.reduce((s, seg) => s + seg.energy, 0) / window.length;
		windowedEnergy.push({
			time: window[0].startTime,
			energy: avgEnergy,
		});
	}

	if (windowedEnergy.length === 0) return [];

	// Find global energy statistics
	const allEnergies = windowedEnergy.map(w => w.energy);
	const maxEnergy = Math.max(...allEnergies);
	const avgEnergy = allEnergies.reduce((s, e) => s + e, 0) / allEnergies.length;

	// Classify each window
	const HIGH_THRESHOLD = avgEnergy + (maxEnergy - avgEnergy) * 0.5;
	const LOW_THRESHOLD = avgEnergy * 0.5;

	type RawLabel = MusicSectionType;
	const labels: { type: RawLabel; startTime: number; endTime: number; energy: number }[] = [];

	for (let i = 0; i < windowedEnergy.length; i++) {
		const w = windowedEnergy[i];
		const progress = w.time / duration; // 0..1 position in track
		const nextW = i < windowedEnergy.length - 1 ? windowedEnergy[i + 1] : null;
		const isRising = nextW ? nextW.energy > w.energy + 0.05 : false;

		let type: RawLabel;
		if (progress < 0.08 && w.energy < HIGH_THRESHOLD) {
			type = "intro";
		} else if (progress > 0.9 && w.energy < HIGH_THRESHOLD) {
			type = "outro";
		} else if (w.energy >= HIGH_THRESHOLD) {
			type = "drop";
		} else if (isRising && w.energy > LOW_THRESHOLD) {
			type = "build";
		} else if (w.energy <= LOW_THRESHOLD) {
			type = "break";
		} else {
			type = "verse";
		}

		const windowEnd = nextW ? nextW.time : duration;
		labels.push({ type, startTime: w.time, endTime: windowEnd, energy: w.energy });
	}

	// Merge consecutive windows with same label
	let current = labels[0];
	for (let i = 1; i < labels.length; i++) {
		if (labels[i].type === current.type) {
			current = {
				...current,
				endTime: labels[i].endTime,
				energy: (current.energy + labels[i].energy) / 2,
			};
		} else {
			sections.push({
				type: current.type,
				startTime: current.startTime,
				endTime: current.endTime,
				confidence: computeSectionConfidence(current.type, current.energy, HIGH_THRESHOLD, LOW_THRESHOLD),
				averageEnergy: current.energy,
			});
			current = labels[i];
		}
	}
	// Push last section
	sections.push({
		type: current.type,
		startTime: current.startTime,
		endTime: current.endTime,
		confidence: computeSectionConfidence(current.type, current.energy, HIGH_THRESHOLD, LOW_THRESHOLD),
		averageEnergy: current.energy,
	});

	return sections;
}

function computeSectionConfidence(
	type: MusicSectionType,
	energy: number,
	highThreshold: number,
	lowThreshold: number,
): number {
	// Confidence is higher when energy clearly matches the expected profile
	switch (type) {
		case "drop":
		case "chorus":
			return Math.min(1, energy / highThreshold);
		case "break":
		case "intro":
		case "outro":
			return Math.min(1, (1 - energy) / (1 - lowThreshold + 0.001));
		case "build":
			return 0.6; // builds are less certain
		default:
			return 0.5;
	}
}
