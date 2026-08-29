/**
 * audio-analyzer.ts — Beat detection and audio energy analysis via Web Audio API.
 *
 * This module runs in the MAIN thread and provides:
 *   1. Beat detection (onset + BPM estimation)
 *   2. Per-frame energy scoring for interest scoring
 *   3. Silence detection for jump-cut mode
 *
 * Heavy FFT-based analysis is done synchronously on an OfflineAudioContext
 * (not UI-blocking since it's offline) and returns structured results.
 */

export type Beat = {
	time: number;       // seconds
	strength: number;   // 0.0 – 1.0
	isMajor: boolean;   // major vs minor beat (e.g. downbeat vs upbeat)
};

export type AudioSegment = {
	startTime: number;
	endTime: number;
	energy: number;     // 0.0 – 1.0 RMS energy
	isSilence: boolean;
};

export type AudioAnalysisResult = {
	duration: number;
	sampleRate: number;
	bpm: number | null;
	beats: Beat[];
	segments: AudioSegment[];  // segmented by energy level
	totalEnergy: number;
	peakEnergy: number;
};

// ---- Main Analyzer ----

export async function analyzeAudio(
	audioBuffer: AudioBuffer,
	segmentDurationSec = 0.1,   // 100ms energy segments
	silenceThreshold = 0.02,    // RMS below this = silence
): Promise<AudioAnalysisResult> {
	const channelData = mixToMono(audioBuffer);
	const sampleRate = audioBuffer.sampleRate;
	const duration = audioBuffer.duration;

	// 1. Energy segments
	const segments = computeEnergySegments(channelData, sampleRate, segmentDurationSec, silenceThreshold);

	// 2. Beat detection
	const { beats, bpm } = detectBeats(channelData, sampleRate, segments);

	// 3. Overall stats
	const totalEnergy = segments.reduce((sum, s) => sum + s.energy, 0) / segments.length;
	const peakEnergy = Math.max(...segments.map(s => s.energy));

	return {
		duration,
		sampleRate,
		bpm,
		beats,
		segments,
		totalEnergy,
		peakEnergy,
	};
}

/**
 * Load an audio file from a URL or MediaFile into an AudioBuffer.
 * Uses OfflineAudioContext to avoid requiring a live audio device.
 */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
	const arrayBuffer = await file.arrayBuffer();
	const ctx = new OfflineAudioContext(2, 44100, 44100);
	return ctx.decodeAudioData(arrayBuffer);
}

export async function decodeAudioFromUrl(url: string): Promise<AudioBuffer> {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const ctx = new OfflineAudioContext(2, 44100, 44100);
	return ctx.decodeAudioData(arrayBuffer);
}

// ---- Internal: Mono Mix ----

function mixToMono(buffer: AudioBuffer): Float32Array {
	const length = buffer.length;
	const mono = new Float32Array(length);

	for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
		const channelData = buffer.getChannelData(ch);
		for (let i = 0; i < length; i++) {
			mono[i] += channelData[i];
		}
	}

	const channels = buffer.numberOfChannels;
	for (let i = 0; i < length; i++) {
		mono[i] /= channels;
	}

	return mono;
}

// ---- Internal: Energy Segments ----

function computeEnergySegments(
	mono: Float32Array,
	sampleRate: number,
	segmentDurationSec: number,
	silenceThreshold: number,
): AudioSegment[] {
	const samplesPerSegment = Math.floor(sampleRate * segmentDurationSec);
	const segments: AudioSegment[] = [];

	for (let offset = 0; offset < mono.length; offset += samplesPerSegment) {
		const end = Math.min(offset + samplesPerSegment, mono.length);
		let sumSquares = 0;

		for (let i = offset; i < end; i++) {
			sumSquares += mono[i] * mono[i];
		}

		const rms = Math.sqrt(sumSquares / (end - offset));
		const startTime = offset / sampleRate;
		const endTime = end / sampleRate;

		segments.push({
			startTime,
			endTime,
			energy: Math.min(1, rms * 4), // normalize to 0-1 (typical speech ~0.1-0.3 RMS)
			isSilence: rms < silenceThreshold,
		});
	}

	return segments;
}

// ---- Internal: Beat Detection ----

function detectBeats(
	mono: Float32Array,
	sampleRate: number,
	segments: AudioSegment[],
): { beats: Beat[]; bpm: number | null } {
	if (segments.length < 4) return { beats: [], bpm: null };

	// Onset detection: find energy spikes relative to local average
	const beats: Beat[] = [];
	const windowSize = 10; // segments for local average (1 second at 100ms segments)

	for (let i = windowSize; i < segments.length; i++) {
		const localAvg = segments
			.slice(i - windowSize, i)
			.reduce((s, seg) => s + seg.energy, 0) / windowSize;

		const current = segments[i].energy;
		const ratio = localAvg > 0.001 ? current / localAvg : 0;

		// Onset threshold: current energy is significantly higher than local average
		if (ratio > 1.5 && current > 0.05) {
			const strength = Math.min(1, (ratio - 1.5) / 2);
			beats.push({
				time: segments[i].startTime,
				strength,
				isMajor: strength > 0.5,
			});
		}
	}

	// Estimate BPM from inter-beat intervals
	const bpm = estimateBpm(beats);

	return { beats, bpm };
}

function estimateBpm(beats: Beat[]): number | null {
	if (beats.length < 8) return null;

	// Get intervals between consecutive beats
	const intervals: number[] = [];
	for (let i = 1; i < beats.length; i++) {
		const interval = beats[i].time - beats[i - 1].time;
		// Ignore very short (<0.2s ~300bpm) or long (>2s ~30bpm) intervals
		if (interval >= 0.2 && interval <= 2.0) {
			intervals.push(interval);
		}
	}

	if (intervals.length < 4) return null;

	// Histogram: find the most common interval bin (50ms bins)
	const binSize = 0.05;
	const histogram: Map<number, number> = new Map();

	for (const interval of intervals) {
		const bin = Math.round(interval / binSize) * binSize;
		histogram.set(bin, (histogram.get(bin) ?? 0) + 1);
	}

	let bestBin = 0;
	let bestCount = 0;
	for (const [bin, count] of histogram.entries()) {
		if (count > bestCount) {
			bestCount = count;
			bestBin = bin;
		}
	}

	if (bestBin === 0) return null;

	const rawBpm = 60 / bestBin;

	// Normalize to common BPM range 60-180
	let bpm = rawBpm;
	while (bpm < 60) bpm *= 2;
	while (bpm > 180) bpm /= 2;

	return Math.round(bpm);
}
