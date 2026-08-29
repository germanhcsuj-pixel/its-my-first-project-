/**
 * video-analyzer-client.ts — Main-thread client for the VideoAnalyzer worker.
 *
 * Samples video frames using an HTMLVideoElement + OffscreenCanvas
 * and sends them to the worker for analysis.
 */

import type { VideoAnalysisResult } from "@/workers/video-analyzer.worker";

export type VideoAnalyzerOptions = {
	framesPerSecond?: number; // how many frames to sample per second of video (default: 4)
	onProgress?: (progress: number) => void;
};

export async function analyzeVideo(
	videoElement: HTMLVideoElement,
	options: VideoAnalyzerOptions = {},
): Promise<VideoAnalysisResult> {
	const { framesPerSecond = 4, onProgress } = options;
	const duration = videoElement.duration;

	if (!isFinite(duration) || duration <= 0) {
		throw new Error("Video has no valid duration");
	}

	// 1. Sample frames
	const frames = await sampleFrames(videoElement, duration, framesPerSecond, onProgress);

	// 2. Send to worker
	return runInWorker(frames, duration, onProgress);
}

// ---- Frame Sampling ----

async function sampleFrames(
	video: HTMLVideoElement,
	duration: number,
	fps: number,
	onProgress?: (p: number) => void,
): Promise<{ data: Uint8ClampedArray; width: number; height: number; time: number }[]> {
	const totalFrames = Math.floor(duration * fps);
	const interval = duration / totalFrames;
	const width = Math.min(video.videoWidth, 320); // downsample for performance
	const height = Math.round(width * (video.videoHeight / video.videoWidth));

	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
	if (!ctx) throw new Error("OffscreenCanvas 2d context unavailable");

	const frames: { data: Uint8ClampedArray; width: number; height: number; time: number }[] = [];

	for (let i = 0; i < totalFrames; i++) {
		const time = i * interval;
		await seekTo(video, time);

		ctx.drawImage(video, 0, 0, width, height);
		const imageData = ctx.getImageData(0, 0, width, height);

		frames.push({ data: imageData.data, width, height, time });

		if (onProgress) {
			onProgress((i / totalFrames) * 0.5); // first 50% = frame sampling
		}
	}

	return frames;
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const onSeeked = () => {
			video.removeEventListener("seeked", onSeeked);
			video.removeEventListener("error", onError);
			resolve();
		};
		const onError = () => {
			video.removeEventListener("seeked", onSeeked);
			video.removeEventListener("error", onError);
			reject(new Error(`Failed to seek to ${time}s`));
		};

		video.addEventListener("seeked", onSeeked);
		video.addEventListener("error", onError);
		video.currentTime = time;
	});
}

// ---- Worker Bridge ----

function runInWorker(
	frames: { data: Uint8ClampedArray; width: number; height: number; time: number }[],
	duration: number,
	onProgress?: (p: number) => void,
): Promise<VideoAnalysisResult> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(
			new URL("@/workers/video-analyzer.worker.ts", import.meta.url),
			{ type: "module" },
		);

		worker.onmessage = (event: MessageEvent) => {
			const msg = event.data;
			if (msg.type === "PROGRESS" && onProgress) {
				onProgress(0.5 + msg.progress * 0.5); // second 50% = analysis
			} else if (msg.type === "RESULT") {
				worker.terminate();
				resolve(msg.result);
			} else if (msg.type === "ERROR") {
				worker.terminate();
				reject(new Error(msg.error));
			}
		};

		worker.onerror = (err) => {
			worker.terminate();
			reject(new Error(`Worker error: ${err.message}`));
		};

		worker.postMessage({ type: "ANALYZE", frames, duration });
	});
}
