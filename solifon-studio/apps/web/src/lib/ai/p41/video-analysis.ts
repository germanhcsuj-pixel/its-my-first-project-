/**
 * video-analysis.ts — Extended video analysis types for P4.1.
 *
 * Provides deterministic structured video analysis including:
 * - scenes, shots, shot boundaries
 * - motion intensity, visual energy, brightness
 * - saliency scores
 *
 * All scores are normalized to [0, 1].
 * No browser APIs — pure data structures for testability.
 */

// ---- Shot / Scene ----

export interface ShotBoundary {
	time: number;           // seconds
	confidence: number;     // 0..1
	type: "cut" | "dissolve" | "fade" | "unknown";
}

export interface Shot {
	id: string;
	startTime: number;
	endTime: number;
	duration: number;
	motionIntensity: number;    // 0..1 average motion within the shot
	visualEnergy: number;       // 0..1 visual complexity/activity
	brightness: number;         // 0..1 average brightness
	saliency: number;           // 0..1 how visually interesting
	hasFaces: boolean;
	hasText: boolean;
}

export interface SceneBoundary {
	time: number;
	confidence: number;     // 0..1
}

export interface Scene {
	id: string;
	startTime: number;
	endTime: number;
	shots: Shot[];
	dominantMood: "calm" | "active" | "intense" | "neutral";
}

// ---- Full Video Analysis ----

export interface VideoAnalysis {
	duration: number;
	fps: number;
	width: number;
	height: number;
	scenes: Scene[];
	shots: Shot[];
	shotBoundaries: ShotBoundary[];
	sceneBoundaries: SceneBoundary[];
	averageMotion: number;      // 0..1
	averageBrightness: number;  // 0..1
	averageSaliency: number;    // 0..1
}

// ---- Builder (from raw frame data) ----

export interface RawFrameScore {
	time: number;
	motion: number;         // 0..1
	brightness: number;     // 0..1
	saliency: number;       // 0..1
	isSceneChange: boolean;
	hasFaces: boolean;
	hasText: boolean;
}

/**
 * Build a VideoAnalysis from raw per-frame scores.
 * This is deterministic: same input → same output.
 */
export function buildVideoAnalysis(
	frames: readonly RawFrameScore[],
	duration: number,
	fps: number,
	width: number,
	height: number,
): VideoAnalysis {
	if (frames.length === 0) {
		return {
			duration, fps, width, height,
			scenes: [], shots: [], shotBoundaries: [], sceneBoundaries: [],
			averageMotion: 0, averageBrightness: 0, averageSaliency: 0,
		};
	}

	// 1. Detect shot boundaries from scene changes
	const shotBoundaries: ShotBoundary[] = [];
	for (const frame of frames) {
		if (frame.isSceneChange) {
			shotBoundaries.push({
				time: frame.time,
				confidence: Math.min(1, frame.motion + 0.3),
				type: frame.motion > 0.5 ? "cut" : "dissolve",
			});
		}
	}

	// 2. Build shots from boundaries
	const shots: Shot[] = [];
	const boundaries = [0, ...shotBoundaries.map(b => b.time), duration];
	for (let i = 0; i < boundaries.length - 1; i++) {
		const startTime = boundaries[i];
		const endTime = boundaries[i + 1];
		const shotFrames = frames.filter(f => f.time >= startTime && f.time < endTime);
		if (shotFrames.length === 0) continue;

		const avgMotion = shotFrames.reduce((s, f) => s + f.motion, 0) / shotFrames.length;
		const avgBrightness = shotFrames.reduce((s, f) => s + f.brightness, 0) / shotFrames.length;
		const avgSaliency = shotFrames.reduce((s, f) => s + f.saliency, 0) / shotFrames.length;
		const visualEnergy = Math.min(1, avgMotion * 0.6 + avgSaliency * 0.4);

		shots.push({
			id: `shot-${i}`,
			startTime,
			endTime,
			duration: endTime - startTime,
			motionIntensity: clamp01(avgMotion),
			visualEnergy: clamp01(visualEnergy),
			brightness: clamp01(avgBrightness),
			saliency: clamp01(avgSaliency),
			hasFaces: shotFrames.some(f => f.hasFaces),
			hasText: shotFrames.some(f => f.hasText),
		});
	}

	// 3. Group shots into scenes (consecutive shots with similar properties)
	const scenes: Scene[] = [];
	const sceneBoundaries: SceneBoundary[] = [];
	let currentSceneShots: Shot[] = [];
	let sceneIdx = 0;

	for (let i = 0; i < shots.length; i++) {
		currentSceneShots.push(shots[i]);
		const isLast = i === shots.length - 1;
		const nextShot = isLast ? null : shots[i + 1];

		// Scene boundary: large visual difference or gap between shots
		const shouldBreak = isLast || (nextShot && (
			Math.abs(shots[i].brightness - nextShot.brightness) > 0.3 ||
			Math.abs(shots[i].motionIntensity - nextShot.motionIntensity) > 0.4
		));

		if (shouldBreak && currentSceneShots.length > 0) {
			const sceneStart = currentSceneShots[0].startTime;
			const sceneEnd = currentSceneShots[currentSceneShots.length - 1].endTime;
			const avgMotion = currentSceneShots.reduce((s, sh) => s + sh.motionIntensity, 0) / currentSceneShots.length;

			scenes.push({
				id: `scene-${sceneIdx}`,
				startTime: sceneStart,
				endTime: sceneEnd,
				shots: [...currentSceneShots],
				dominantMood: avgMotion > 0.7 ? "intense" : avgMotion > 0.4 ? "active" : avgMotion > 0.15 ? "neutral" : "calm",
			});

			if (!isLast && nextShot) {
				sceneBoundaries.push({
					time: nextShot.startTime,
					confidence: 0.7,
				});
			}

			sceneIdx++;
			currentSceneShots = [];
		}
	}

	// 4. Global averages
	const averageMotion = clamp01(frames.reduce((s, f) => s + f.motion, 0) / frames.length);
	const averageBrightness = clamp01(frames.reduce((s, f) => s + f.brightness, 0) / frames.length);
	const averageSaliency = clamp01(frames.reduce((s, f) => s + f.saliency, 0) / frames.length);

	return {
		duration, fps, width, height,
		scenes, shots, shotBoundaries, sceneBoundaries,
		averageMotion, averageBrightness, averageSaliency,
	};
}

function clamp01(v: number): number {
	return Math.max(0, Math.min(1, v));
}
