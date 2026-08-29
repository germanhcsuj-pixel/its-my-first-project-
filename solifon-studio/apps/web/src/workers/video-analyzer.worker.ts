/**
 * video-analyzer.worker.ts — Video analysis in a Web Worker.
 *
 * Runs intensive per-frame analysis off the main thread:
 *   1. Frame difference → Scene detection
 *   2. Motion estimation → Motion score
 *   3. Sharpness (Laplacian variance) → Quality score
 *   4. Face detection (browser FaceDetector API if available)
 *
 * Communication protocol:
 *   IN:  { type: "ANALYZE", videoData: ImageData[], sampleRate: number, duration: number }
 *   OUT: { type: "RESULT", result: VideoAnalysisResult }
 *   OUT: { type: "PROGRESS", progress: number }
 *   OUT: { type: "ERROR", error: string }
 */

export type FrameAnalysis = {
	frameIndex: number;
	time: number;           // seconds into video
	motion: number;         // 0.0 – 1.0
	sharpness: number;      // 0.0 – 1.0
	sceneDelta: number;     // 0.0 – 1.0 frame diff from previous
	isSceneChange: boolean;
	hasFace: boolean;
};

export type VideoAnalysisResult = {
	duration: number;
	frames: FrameAnalysis[];
	sceneChanges: number[]; // timestamps in seconds
	motionProfile: number[]; // per-frame motion, normalized
	averageMotion: number;
	averageSharpness: number;
};

// ---- Worker Message Handling ----

type WorkerInMessage = {
	type: "ANALYZE";
	frames: { data: Uint8ClampedArray; width: number; height: number; time: number }[];
	duration: number;
};

type WorkerOutMessage =
	| { type: "RESULT"; result: VideoAnalysisResult }
	| { type: "PROGRESS"; progress: number }
	| { type: "ERROR"; error: string };

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
	const { type, frames, duration } = event.data;

	if (type !== "ANALYZE") return;

	try {
		const result = analyzeFrames(frames, duration, (progress) => {
			const msg: WorkerOutMessage = { type: "PROGRESS", progress };
			self.postMessage(msg);
		});

		const msg: WorkerOutMessage = { type: "RESULT", result };
		self.postMessage(msg);
	} catch (err) {
		const msg: WorkerOutMessage = {
			type: "ERROR",
			error: err instanceof Error ? err.message : String(err),
		};
		self.postMessage(msg);
	}
};

// ---- Analysis Core ----

function analyzeFrames(
	frames: WorkerInMessage["frames"],
	duration: number,
	onProgress: (p: number) => void,
): VideoAnalysisResult {
	if (frames.length === 0) {
		return {
			duration,
			frames: [],
			sceneChanges: [],
			motionProfile: [],
			averageMotion: 0,
			averageSharpness: 0,
		};
	}

	const analyzed: FrameAnalysis[] = [];
	const sceneChanges: number[] = [];
	const sceneChangeThreshold = 0.35; // frame diff above this = scene change

	let prevLuma: Float32Array | null = null;

	for (let i = 0; i < frames.length; i++) {
		const frame = frames[i];
		const luma = computeLuma(frame.data, frame.width, frame.height);

		const motion = prevLuma ? computeMotion(luma, prevLuma) : 0;
		const sharpness = computeSharpness(frame.data, frame.width, frame.height);
		const sceneDelta = prevLuma ? computeFrameDiff(luma, prevLuma) : 0;
		const isSceneChange = sceneDelta > sceneChangeThreshold;

		if (isSceneChange) {
			sceneChanges.push(frame.time);
		}

		analyzed.push({
			frameIndex: i,
			time: frame.time,
			motion,
			sharpness,
			sceneDelta,
			isSceneChange,
			hasFace: false, // FaceDetector is async, not usable in worker sync loop
		});

		prevLuma = luma;

		if (i % 10 === 0) {
			onProgress(i / frames.length);
		}
	}

	const motionProfile = analyzed.map(f => f.motion);
	const averageMotion = motionProfile.reduce((s, m) => s + m, 0) / motionProfile.length;
	const averageSharpness = analyzed.reduce((s, f) => s + f.sharpness, 0) / analyzed.length;

	return {
		duration,
		frames: analyzed,
		sceneChanges,
		motionProfile,
		averageMotion,
		averageSharpness,
	};
}

// ---- Luma extraction ----

function computeLuma(data: Uint8ClampedArray, width: number, height: number): Float32Array {
	const luma = new Float32Array(width * height);
	for (let i = 0; i < luma.length; i++) {
		const r = data[i * 4];
		const g = data[i * 4 + 1];
		const b = data[i * 4 + 2];
		luma[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	}
	return luma;
}

// ---- Motion: mean absolute difference of luma ----

function computeMotion(current: Float32Array, previous: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < current.length; i++) {
		sum += Math.abs(current[i] - previous[i]);
	}
	return Math.min(1, (sum / current.length) * 10); // scale: typical motion 0.02–0.1 → 0.2–1.0
}

// ---- Frame diff (scene change detection) ----

function computeFrameDiff(current: Float32Array, previous: Float32Array): number {
	return computeMotion(current, previous); // same as motion but unscaled threshold comparison
}

// ---- Sharpness: Laplacian variance ----

function computeSharpness(data: Uint8ClampedArray, width: number, height: number): number {
	if (width < 3 || height < 3) return 0;

	const luma = computeLuma(data, width, height);
	let variance = 0;
	let count = 0;

	// Laplacian kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			const lap =
				luma[idx - width] +
				luma[idx + width] +
				luma[idx - 1] +
				luma[idx + 1] -
				4 * luma[idx];

			variance += lap * lap;
			count++;
		}
	}

	// Normalize: typical sharp image ~0.005, blurry ~0.0001
	const rawVariance = count > 0 ? variance / count : 0;
	return Math.min(1, rawVariance * 200);
}
