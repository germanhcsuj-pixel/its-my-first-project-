'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { EditorCore } from '@/core';
import { applyPlan } from '@/lib/ai/apply-plan';
import { buildScene } from '@/services/renderer/scene-builder';
import { CanvasRenderer } from '@/services/renderer/canvas-renderer';
import { EditPlanValidator } from '@/lib/ai/edit-plan-validator';

import { defaultRenderScheduler } from '@/services/renderer/render-scheduler';
import { VideoTrack, VideoElement, ImageElement, TextElement } from '@/types/timeline';
import type { AIEditPlan } from '@/lib/ai/edit-plan';

export default function BenchmarkPage() {
	const [status, setStatus] = useState<string>("Ready");
	const [progress, setProgress] = useState(0);
	const [metrics, setMetrics] = useState<any>(null);
	const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
	const ffmpegRef = useRef<any>(null);
	const previewRef = useRef<HTMLCanvasElement>(null);
	const videoUrlRef = useRef<string | null>(null);

	useEffect(() => {
		const loadFFmpeg = async () => {
			ffmpegRef.current = new FFmpeg();
			const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
			await ffmpegRef.current.load({
				coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
				wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
			});
			setFfmpegLoaded(true);
			setStatus("Ready. Click Start to run benchmark.");
		};
		loadFFmpeg();
	}, []);

	const generateDummyAssets = () => {
		// Создадим фиктивные media assets, так как нам важен процесс рендера, а не сами видеофайлы.
		// В идеале сюда нужно подставить настоящие File Blob URL. 
		// Для P2 benchmark-теста мы сгенерируем цветные квадраты на лету или используем fallback.
		const whitePixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
		return [
			{ id: "vid1", type: "image" as const, url: whitePixel, file: new File([], "vid1.jpg"), name: "vid1" },
			{ id: "vid2", type: "image" as const, url: whitePixel, file: new File([], "vid2.jpg"), name: "vid2" },
			{ id: "photo1", type: "image" as const, url: whitePixel, file: new File([], "p1.jpg"), name: "photo1" },
			{ id: "photo2", type: "image" as const, url: whitePixel, file: new File([], "p2.jpg"), name: "photo2" },
			{ id: "photo3", type: "image" as const, url: whitePixel, file: new File([], "p3.jpg"), name: "photo3" },
			{ id: "photo4", type: "image" as const, url: whitePixel, file: new File([], "p4.jpg"), name: "photo4" },
			{ id: "line_img", type: "image" as const, url: whitePixel, file: new File([], "white.png"), name: "line_img" },
		];
	};

	const runBenchmark = async (samplesOverride?: number) => {
		if (!ffmpegLoaded) return;
		
		const urlParams = new URLSearchParams(window.location.search);
		const parsedSamples = parseInt(urlParams.get("samples") || "8", 10);
		const samples = typeof samplesOverride === 'number' ? samplesOverride : parsedSamples;
		const shutterAngle = parseInt(urlParams.get("shutterAngle") || "180", 10);
		const charsCount = parseInt(urlParams.get("chars") || "50", 10);
		const kineticType = urlParams.get("kinetic") || "character-reveal";
		const dummyText = "A".repeat(charsCount);
		
		if (urlParams.get("cache") === "0") {
			(window as any).__DISABLE_CACHE = true;
		} else {
			(window as any).__DISABLE_CACHE = false;
		}
		
		setStatus(`Building Pipeline (${samples} samples)...`);
		const startTime = performance.now();
		
		// Clear cache and metrics before run
		defaultRenderScheduler.clearCache();
		if (typeof window !== "undefined") {
			(window as any).__PERF_METRICS = { TextLayout: 0, KineticEvaluator: 0, TextNode: 0, fillText: 0, RenderCompositing: 0, CanvasToBlob: 0, BlobToFFmpeg: 0, FFmpegEncode: 0 };
		}
		defaultRenderScheduler.metrics = {
			staticHits: 0,
			frameHits: 0,
			misses: 0,
			evictions: 0,
			temporalReused: 0,
			renderedSamples: 0,
			cacheMemoryBytes: 0,
			peakMemoryBytes: 0,
		};
		
		const assets = generateDummyAssets();
		
		// 1. Initial Timeline Setup
		const editor = EditorCore.getInstance();
		await editor.project.createNewProject({ name: "Benchmark" });
		// Имитируем первоначальное добавление медиа на таймлайн
		const mainTrack: VideoTrack = {
			id: "track_main",
			name: "Main Track",
			type: "video",
			index: 0,
			isMain: true,
			muted: false,
			hidden: false,
			elements: [
				{ id: "el_p1", type: "image", mediaId: "photo1", startTime: 0, duration: 2, transform: { scale: 1, position: {x:0, y:0}, rotate: 0 } },
				{ id: "el_v1", type: "image", mediaId: "vid1", startTime: 2, duration: 1, trimStart: 0, trimEnd: 1, transform: { scale: 1, position: {x:0, y:0}, rotate: 0 } },
				{ id: "el_p2", type: "image", mediaId: "photo2", startTime: 3, duration: 1, transform: { scale: 1, position: {x:0, y:0}, rotate: 0 } },
				{ id: "vid1", type: "image", name: "Main Media", src: "https://picsum.photos/1080/1920", startTime: 1.2, duration: 3.5, transform: { scale: 1.2, position: {x:0, y:0}, rotate: 0, transformKeyframes: {
					scale: [{time: 0, value: 1.2, easing: "linear"}, {time: 3.5, value: 1.5, easing: "linear"}],
					position: [{time: 0, value: {x:0, y:0}, easing: "linear"}],
					rotate: [{time: 0, value: 0, easing: "linear"}]
				} } } as unknown as ImageElement,
				{ id: "el_p3", type: "image", mediaId: "photo3", startTime: 4, duration: 1, transform: { scale: 1, position: {x:0, y:0}, rotate: 0 } },
				{ id: "el_p4", type: "image", mediaId: "photo4", startTime: 5, duration: 1, transform: { scale: 1, position: {x:0, y:0}, rotate: 0 } },
				{ id: "el_v1_2", type: "image", mediaId: "vid1", startTime: 6, duration: 1, trimStart: 1, trimEnd: 2, transform: { scale: 1, position: {x:0, y:0}, rotate: 0 } },
				{ id: "el_line", type: "shape", geometry: { type: "line", x1: -300, y1: 0, x2: 300, y2: 0 }, stroke: { color: "#ffffff", width: 8 }, startTime: 7, duration: 1, transform: { scale: 1, position: {x:540, y:960}, rotate: -45 } }, // P3 Benchmark Shape
				{ id: "el_v2", type: "image", mediaId: "vid2", startTime: 8, duration: 2, trimStart: 0, trimEnd: 2, transform: { scale: 1, position: {x:0, y:0}, rotate: 0 } },
			] as any[]
		};

		const textTrack: VideoTrack = {
			id: "track_text",
			name: "Text Track",
			type: "video",
			index: 1,
			isMain: false,
			muted: false,
			hidden: false,
			elements: [
				{ 
					id: "el_text1", type: "text", name: "Text 1", content: "P3.4 Word Scope", startTime: 0.5, duration: 1, 
					transform: { scale: 1, position: {x:0, y:-100}, rotate: 0 }, 
					fontSize: 60, fontFamily: "Inter", color: "white", backgroundColor: "rgba(0,0,0,0.5)", 
					textAlign: "center", fontWeight: "bold", fontStyle: "normal", 
					textDecoration: "none", opacity: 1, 
					lineHeight: 1.5, letterSpacing: 0, boxWidth: 800,
					kinetic: kineticType.startsWith('word') ? { scope: "word", type: kineticType.split('-')[1] || "fade-stagger", staggerDelay: 0.1 } : undefined
				} as TextElement,
				{ 
					id: "el_text2", type: "text", name: "Text 2", content: dummyText, startTime: 0.5, duration: 1, 
					transform: { scale: 1, position: {x:0, y:100}, rotate: 0 }, 
					fontSize: 60, fontFamily: "Inter", color: "yellow", backgroundColor: "transparent", 
					textAlign: "center", fontWeight: "bold", fontStyle: "normal", 
					textDecoration: "none", opacity: 1,
					lineHeight: 1.2, letterSpacing: 0, boxWidth: 600,
					kinetic: kineticType.startsWith('character') ? { scope: "character", type: kineticType.split('-')[1] || "reveal", staggerDelay: 0.05 } : undefined
				} as TextElement,
			] as any[]
		};

		const overlayTrack: VideoTrack = {
			id: "track_overlay",
			name: "Overlay Track",
			type: "video",
			index: 2,
			isMain: false,
			muted: false,
			hidden: false,
			elements: [
				{ id: "el_over1", type: "image", mediaId: "photo1", startTime: 6, duration: 1, blendMode: "screen", opacity: 0.5, transform: { scale: 1.5, position: {x:0, y:0}, rotate: 0 } } as ImageElement
			] as any[]
		};

		editor.scenes.getActiveScene()!.tracks = [mainTrack, textTrack, overlayTrack];

		// 2. AI Edit Plan
		const plan: AIEditPlan = {
			id: "plan-1",
			version: 1,
			hash: "abc",
			baseTimelineRevision: 0,
			intent: { prompt: "P2 Benchmark", style: "tiktok", pacing: "fast" },
			sourceClips: [],
			confidence: 1.0,
			decisions: [],
			cuts: [],
			transitions: [],
			effects: [
				// 0-2s: PHOTO + IMPACT_ZOOM + GLOW
				{ trackId: "el_p1", motion: "IMPACT_GLOW" },
				// 2-3s: VIDEO 1 + CAMERA PUSH + MOTION BLUR
				{
					type: "update_element",
					trackId: "track_text",
					elementId: "el_text1",
					parameters: {
						effects: [{ type: "motion-blur", samples: samples, shutterAngle }]
					}
				},
				// 3-6s: PHOTOS + FLASH + BEAT SHAKE + GLOW
				{ trackId: "el_p2", motion: "IMPACT_GLOW" },
				{ trackId: "el_p3", motion: "IMPACT_GLOW" },
				{ trackId: "el_p4", motion: "IMPACT_GLOW" },
				// 7-8s: COLOR LINE (TEMPORARY_P2_BENCHMARK_SHAPE)
				{ 
					trackId: "el_line", 
					effects: [{ type: "glow", radius: 20, intensity: 1, threshold: 0.5, blendMode: "add" }] 
				}
			] as any[]
		};

		setStatus("Validating and Applying Plan...");
		// const validator = new EditPlanValidator();
		// validator.validate(plan);
		
		const mediaLibrary = new Map<string, { duration: number }>();
		const ctx = {
			mediaLibrary,
			currentTimelineRevision: 0,
		};
		// @ts-ignore
		applyPlan(plan, ctx);

		// P3 BENCHMARK SHAPE ANIMATION (trim 0 -> 1)
		const modifiedTracks = editor.timeline.getTracks();
		const lineEl = modifiedTracks[0].elements.find(e => e.id === "el_line") as any;
		if (lineEl) {
			lineEl.shapeAnimation = {
				trimEnd: [
					{ time: 0, value: 0, easing: { type: "ease-in-out" } },
					{ time: 1, value: 1 }
				]
			};
		}
		
		// Add motion blur to el_text1
		const textEl = modifiedTracks[1].elements.find(e => e.id === "el_text1") as any;
		if (textEl) {
			textEl.effects = [{ type: "motion-blur", samples: samples, shutterAngle }];
		}

		// Add animation to el_text2
		const textEl2 = modifiedTracks[1].elements.find(e => e.id === "el_text2") as any;
		if (textEl2) {
			textEl2.transform.propertyKeyframes = {
				...textEl2.transform.propertyKeyframes,
				letterSpacing: [
					{ time: 7.2, value: 0, easing: "ease-in-out" },
					{ time: 10.0, value: 30 }
				],
				fontSize: [
					{ time: 7.2, value: 60, easing: "ease-in-out" },
					{ time: 10.0, value: 100 }
				]
			};
		}

		// 3. Build Scene
		setStatus("Building Scene Graph...");
		const scene = await buildScene({
			canvasSize: { width: 1080, height: 1920 },
			duration: 10,
			mediaAssets: assets,
			tracks: editor.timeline.getTracks(),
			background: { type: "color", color: "#000" },
			// Apply beat shake at 3.0, 4.0, 5.0
			camera: {
				zoom: 1,
				position: { x: 0, y: 0 },
				shake: { intensity: 15, duration: 0.5, decay: true },
				shakeKeyframes: [
					{ time: 3.0, value: 1 },
					{ time: 4.0, value: 1 },
					{ time: 5.0, value: 1 }
				]
			} as any
		});

		// 4. Render and Export Loop
		setStatus("Rendering Frames (0/300)...");
		const renderer = new CanvasRenderer({ width: 1080, height: 1920, fps: 30 });
		
		// Setup FFmpeg
		const ffmpeg = ffmpegRef.current;
		// For the sake of standard in-browser FFmpeg pipe, we write to a file or pipe.
		// Actually, FFmpeg WASM piping is tricky. The standard way is to write frames as image001.png, then run ffmpeg.
		// Let's use FS.
		
		let frameTimes = [];
		const totalFrames = 300; // 10s * 30fps

		for (let i = 0; i < totalFrames; i++) {
			const time = i / 30;
			const frameStart = performance.now();
			
			const tRenderStart = performance.now();
			await renderer.render({ node: scene, time });
			const tRenderEnd = performance.now();
			if (typeof window !== "undefined") {
				(window as any).__PERF_METRICS.RenderCompositing += (tRenderEnd - tRenderStart);
			}
			
			// Draw to preview
			if (previewRef.current) {
				const ctx = previewRef.current.getContext("2d");
				ctx?.drawImage(renderer.mainTarget.canvas, 0, 0, previewRef.current.width, previewRef.current.height);
			}

			// Extract blob
			const tBlobStart = performance.now();
			const blob = renderer.mainTarget.canvas instanceof OffscreenCanvas 
				? await renderer.mainTarget.canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 })
				: await new Promise<Blob>((resolve) => (renderer.mainTarget.canvas as HTMLCanvasElement).toBlob(b => resolve(b!), "image/jpeg", 0.9));
			const tBlobEnd = performance.now();
			if (typeof window !== "undefined") {
				(window as any).__PERF_METRICS.CanvasToBlob += (tBlobEnd - tBlobStart);
			}

			const tFFmpegWriteStart = performance.now();
			const arrayBuffer = await blob.arrayBuffer();
			const uint8 = new Uint8Array(arrayBuffer);
			
			const num = i.toString().padStart(3, '0');
			await ffmpeg.writeFile(`frame${num}.jpg`, uint8);
			const tFFmpegWriteEnd = performance.now();
			if (typeof window !== "undefined") {
				(window as any).__PERF_METRICS.BlobToFFmpeg += (tFFmpegWriteEnd - tFFmpegWriteStart);
			}
			
			frameTimes.push(performance.now() - frameStart);
			
			setProgress(Math.round((i / totalFrames) * 100));
			setStatus(`Rendering Frames (${i}/${totalFrames})...`);
		}

		setStatus("Encoding MP4...");
		// Create dummy image blobs instead of video to prevent decode errors in mediabunny
		const dummyBuffer = new Uint8Array([0]);
		const dummyBlob = new Blob([dummyBuffer], { type: "image/jpeg" });
		const dummyUrl = URL.createObjectURL(dummyBlob);

		const tEncodeStart = performance.now();
		await ffmpeg.exec(['-framerate', '30', '-i', 'frame%03d.jpg', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-fflags', '+bitexact', '-map_metadata', '-1', 'out.mp4']);
		const tEncodeEnd = performance.now();
		if (typeof window !== "undefined") {
			(window as any).__PERF_METRICS.FFmpegEncode = (tEncodeEnd - tEncodeStart);
		}
		
		const data = await ffmpeg.readFile('out.mp4');
		const videoBlob = new Blob([data], { type: 'video/mp4' });
		videoUrlRef.current = URL.createObjectURL(videoBlob);
		
		// Determinism check (Hash of MP4)
		const hashBuffer = await crypto.subtle.digest('SHA-256', await videoBlob.arrayBuffer());
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		
		const endTime = performance.now();
		const totalRenderTime = endTime - startTime;
		const avgFrameTime = frameTimes.reduce((a,b)=>a+b,0) / frameTimes.length;
		const maxFrameTime = Math.max(...frameTimes);

		setMetrics({
			totalRenderTimeMs: totalRenderTime.toFixed(2),
			avgFrameTimeMs: avgFrameTime.toFixed(2),
			maxFrameTimeMs: maxFrameTime.toFixed(2),
			fps: (1000 / avgFrameTime).toFixed(2),
			motionBlurSamples: samples,
			totalFrames,
			outputHash: hashHex,
			scheduler: { ...defaultRenderScheduler.metrics },
			perfBreakdown: typeof window !== "undefined" ? (window as any).__PERF_METRICS : null
		});

		setStatus("Done!");
	};

	return (
		<div className="p-8 font-sans text-white bg-zinc-950 min-h-screen">
			<h1 className="text-2xl font-bold mb-4">P2 Visual Benchmark</h1>
			<p className="mb-4 text-zinc-400">Verifying P2 Compositing Engine: Zoom, Shake, Glow, Motion Blur, Blend Modes, Overlays.</p>
			
			<div className="mb-4">
				<button 
					id="start-bench"
					onClick={() => runBenchmark(undefined)} 
					disabled={!ffmpegLoaded || status.includes("Rendering") || status.includes("Encoding")}
					className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-50"
				>
					{status === "Ready" ? "Start Benchmark" : status}
				</button>
			</div>

			{progress > 0 && progress < 100 && (
				<div className="w-full bg-zinc-800 rounded-full h-2.5 mb-4 max-w-md">
					<div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
				</div>
			)}

			<div className="flex gap-8">
				<div className="flex-1 max-w-[300px]">
					<h3 className="text-lg mb-2">Live Preview</h3>
					<canvas 
						ref={previewRef} 
						width={540} 
						height={960} 
						className="w-full h-auto bg-black border border-zinc-800 rounded"
					/>
				</div>

				<div className="flex-1">
					{metrics && (
						<div className="bg-zinc-900 p-4 rounded-lg mb-4 flex gap-4">
							<div className="flex-1" id="metrics-results">
								<h3 className="text-lg font-semibold mb-2">Metrics</h3>
								<ul className="space-y-1 text-sm text-zinc-300">
									<li id="metric-samples">Samples: {metrics.motionBlurSamples}</li>
									<li id="metric-total">Total Time: {metrics.totalRenderTimeMs} ms</li>
									<li id="metric-avg">Avg Frame Time: {metrics.avgFrameTimeMs} ms</li>
									<li id="metric-max">Max Frame Time: {metrics.maxFrameTimeMs} ms</li>
								</ul>
								{metrics.perfBreakdown && (
									<div className="mt-4" id="perf-breakdown">
										<h3 className="text-lg font-semibold mb-2">Performance Profile (ms)</h3>
										<ul className="space-y-1 text-sm text-zinc-300">
											<li>TextLayout (Total): {metrics.perfBreakdown.TextLayout.toFixed(2)}</li>
											<li>KineticEvaluator (Total): {metrics.perfBreakdown.KineticEvaluator.toFixed(2)}</li>
											<li>TextNode fillText (Total): {metrics.perfBreakdown.fillText.toFixed(2)}</li>
											<li>Render Compositing (Total): {metrics.perfBreakdown.RenderCompositing.toFixed(2)}</li>
											<li>CanvasToBlob (Total): {metrics.perfBreakdown.CanvasToBlob.toFixed(2)}</li>
											<li>BlobToFFmpeg (Total): {metrics.perfBreakdown.BlobToFFmpeg.toFixed(2)}</li>
											<li>FFmpeg Encoding (Total): {metrics.perfBreakdown.FFmpegEncode.toFixed(2)}</li>
										</ul>
									</div>
								)}
							</div>
							<div className="flex-1 text-sm text-zinc-300">
								<ul>
                                    <li id="metric-fps">Effective FPS: {metrics.fps}</li>
									<li id="metric-frames">Frames Generated: {metrics.totalFrames}</li>
									<li id="metric-hash" className="text-green-400 font-mono text-xs break-all mt-2">SHA-256: {metrics.outputHash}</li>
								</ul>
							</div>
							<div className="flex-1 border-l border-zinc-700 pl-4" id="scheduler-results">
								<h3 className="text-lg font-semibold mb-2 text-indigo-300">Scheduler</h3>
								<ul className="space-y-1 text-sm text-zinc-300 font-mono">
									<li id="sch-static">static hits:   {metrics.scheduler.staticHits}</li>
									<li id="sch-frame">frame hits:    {metrics.scheduler.frameHits}</li>
									<li id="sch-misses">misses:        {metrics.scheduler.misses}</li>
									<li id="sch-evictions">evictions:     {metrics.scheduler.evictions}</li>
									<li id="sch-temporal">temporal reused: {metrics.scheduler.temporalReused}</li>
									<li id="sch-rendered">render samples:  {metrics.scheduler.renderedSamples}</li>
									<li id="sch-memory">peak memory:   {Math.round(metrics.scheduler.peakMemoryBytes / 1024 / 1024)} MB</li>
								</ul>
							</div>
						</div>
					)}

					{videoUrlRef.current && (
						<div className="bg-zinc-900 p-4 rounded-lg">
							<h3 className="text-lg font-semibold mb-2">Result</h3>
							<video src={videoUrlRef.current} controls className="w-full max-w-sm rounded" />
							<a 
								href={videoUrlRef.current} 
								download="benchmark.mp4"
								className="block mt-4 text-indigo-400 hover:text-indigo-300"
							>
								Download benchmark.mp4
							</a>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
