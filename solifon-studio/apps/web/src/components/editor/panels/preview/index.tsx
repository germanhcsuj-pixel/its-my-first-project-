"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import { useRafLoop } from "@/hooks/use-raf-loop";
import { useContainerSize } from "@/hooks/use-container-size";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import type { RootNode } from "@/services/renderer/nodes/root-node";
import { buildScene } from "@/services/renderer/scene-builder";
import { formatTimeCode, getLastFrameTime } from "@/lib/time";
import { PreviewInteractionOverlay } from "./preview-interaction-overlay";
import { EditableTimecode } from "@/components/editable-timecode";
import { invokeAction } from "@/lib/actions";
import { getDragData, hasDragData } from "@/lib/drag-data";
import {
	buildVideoElement,
	buildImageElement,
	buildUploadAudioElement,
	buildTextElement,
	buildStickerElement,
} from "@/lib/timeline/element-utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	FullScreenIcon,
	MoreVerticalIcon,
	MusicNote03Icon,
	PauseIcon,
	PlayIcon,
	Alert01Icon,
	Image01Icon,
	Video01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMediaPreviewStore } from "@/stores/media-preview-store";
import type { MediaAsset } from "@/types/assets";
import { cn } from "@/utils/ui";
import { useTranslation } from "@i18next-toolkit/nextjs-approuter";

function usePreviewSize() {
	const editor = useEditor();
	const activeProject = editor.project.getActive();

	return {
		width: activeProject?.settings.canvasSize.width ?? 1920,
		height: activeProject?.settings.canvasSize.height ?? 1080,
	};
}

function RenderTreeController() {
	const editor = useEditor();
	const tracks = editor.timeline.getTracks();
	const mediaAssets = editor.media.getAssets();
	const activeProject = editor.project.getActive();

	const { width, height } = usePreviewSize();

	// Сериализуем transitions чтобы React заметил изменения внутри объектов трека
	const transitionsKey = JSON.stringify(
		tracks.map((t) => (t as any).transitions ?? [])
	);

	useEffect(() => {
		if (!activeProject) return;

		const updateScene = async () => {
			const duration = editor.timeline.getTotalDuration();
			const renderTree = await buildScene({
				tracks,
				mediaAssets,
				duration,
				canvasSize: { width, height },
				background: activeProject.settings.background,
			});

			editor.renderer.setRenderTree({ renderTree });
		};
		updateScene();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tracks, mediaAssets, activeProject?.settings.background, width, height, editor.timeline, editor.renderer, transitionsKey]);

	return null;
}

export function PreviewPanel() {
	const containerRef = useRef<HTMLDivElement>(null);
	const { isFullscreen, toggleFullscreen } = useFullscreen({ containerRef });
	const editor = useEditor();
	const selectedMediaId = useMediaPreviewStore(
		(state) => state.selectedMediaId,
	);
	const clearSelection = useMediaPreviewStore((state) => state.clearSelection);

	const selectedAsset = useMemo(() => {
		if (!selectedMediaId) return null;
		return (
			editor.media.getAssets().find((asset) => asset.id === selectedMediaId) ??
			null
		);
	}, [selectedMediaId, editor.media]);

	const [isDragOver, setIsDragOver] = useState(false);

	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		if (hasDragData({ dataTransfer: e.dataTransfer })) {
			setIsDragOver(true);
		}
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		if (hasDragData({ dataTransfer: e.dataTransfer })) {
			e.dataTransfer.dropEffect = "copy";
		}
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const rect = containerRef.current?.getBoundingClientRect();
		if (rect) {
			const { clientX, clientY } = e;
			if (
				clientX < rect.left ||
				clientX > rect.right ||
				clientY < rect.top ||
				clientY > rect.bottom
			) {
				setIsDragOver(false);
			}
		}
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragOver(false);

			const dragData = getDragData({ dataTransfer: e.dataTransfer });
			if (!dragData) return;

			const currentTime = editor.playback.getCurrentTime();
			let dropX = 0;
			let dropY = 0;

			const canvas = document.getElementById("preview-canvas") as HTMLCanvasElement;
			if (canvas) {
				const rect = canvas.getBoundingClientRect();
				const activeProject = editor.project.getActive();
				const canvasW = activeProject?.settings.canvasSize.width ?? 1920;
				const canvasH = activeProject?.settings.canvasSize.height ?? 1080;
				
				const scaleX = canvasW / rect.width;
				const scaleY = canvasH / rect.height;
				
				const canvasX = (e.clientX - rect.left) * scaleX;
				const canvasY = (e.clientY - rect.top) * scaleY;
				
				dropX = canvasX - canvasW / 2;
				dropY = canvasY - canvasH / 2;
			}

			if (dragData.type === "media") {
				const mediaAsset = editor.media
					.getAssets()
					.find((m) => m.id === dragData.id);
				if (!mediaAsset) return;

				const duration =
					mediaAsset.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION;

				if (dragData.mediaType === "audio") {
					editor.timeline.insertElement({
						placement: { mode: "auto" },
						element: buildUploadAudioElement({
							mediaId: mediaAsset.id,
							name: mediaAsset.name,
							duration,
							startTime: currentTime,
						}),
					});
				} else if (dragData.mediaType === "video") {
					const el = buildVideoElement({
						mediaId: mediaAsset.id,
						name: mediaAsset.name,
						duration,
						startTime: currentTime,
					});
					el.transform.position = { x: dropX, y: dropY };
					editor.timeline.insertElement({
						placement: { mode: "auto" },
						element: el,
					});
				} else {
					const el = buildImageElement({
						mediaId: mediaAsset.id,
						name: mediaAsset.name,
						duration,
						startTime: currentTime,
					});
					el.transform.position = { x: dropX, y: dropY };
					editor.timeline.insertElement({
						placement: { mode: "auto" },
						element: el,
					});
				}
			} else if (dragData.type === "text") {
				const el = buildTextElement({
					raw: {
						name: dragData.name ?? "",
						content: dragData.content ?? "",
					},
					startTime: currentTime,
				});
				if ('transform' in el && el.transform) {
					el.transform.position = { x: dropX, y: dropY };
				}
				editor.timeline.insertElement({
					placement: { mode: "auto" },
					element: el,
				});
			} else if (dragData.type === "sticker") {
				const el = buildStickerElement({
					iconName: dragData.iconName,
					startTime: currentTime,
				});
				el.transform.position = { x: dropX, y: dropY };
				editor.timeline.insertElement({
					placement: { mode: "auto" },
					element: el,
				});
			}
		},
		[editor],
	);

	return (
		<div
			ref={containerRef}
			className={cn(
				"panel bg-background relative flex h-full min-h-0 w-full min-w-0 flex-col rounded-sm border transition-colors",
				isFullscreen && "bg-background",
				isDragOver && "ring-2 ring-primary ring-inset bg-accent/20",
			)}
			onDragEnter={handleDragEnter}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{selectedAsset ? (
				<>
					<PreviewHeader
						assetName={selectedAsset.name}
						onClose={clearSelection}
					/>
					<div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-2">
						<AssetPreviewPlayer asset={selectedAsset} />
					</div>
				</>
			) : (
				<>
					<div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center p-2 group">
						<PreviewCanvas />
						<RenderTreeController />
						<div className="absolute bottom-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-50 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
							<PreviewToolbar
								isFullscreen={isFullscreen}
								onToggleFullscreen={toggleFullscreen}
							/>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function PreviewHeader({
	assetName,
	onClose,
}: {
	assetName: string;
	onClose: () => void;
}) {
	return (
		<div className="flex h-9 items-center justify-between border-b px-3">
			<span className="text-muted-foreground truncate text-xs">
				Превью: {assetName}
			</span>
			<Button
				variant="ghost"
				size="icon"
				type="button"
				className="size-6"
				onClick={onClose}
				title="Close preview"
			>
				<X className="size-3.5" />
			</Button>
		</div>
	);
}

function AssetPreviewPlayer({ asset }: { asset: MediaAsset }) {
	const url = asset.url ?? "";
	const [isError, setIsError] = useState(false);

	if (isError) {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-4 text-destructive">
				<HugeiconsIcon icon={Alert01Icon} className="size-16 opacity-50" />
				<span className="text-sm font-medium">Failed to load media</span>
			</div>
		);
	}

	if (asset.type === "video") {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<video key={asset.id} src={url} controls autoPlay className="max-h-full max-w-full rounded" onError={() => setIsError(true)} />
			</div>
		);
	}

	if (asset.type === "image") {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<img src={url} alt={asset.name} className="max-h-full max-w-full rounded object-contain" onError={() => setIsError(true)} />
			</div>
		);
	}

	if (asset.type === "audio") {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-4">
				<HugeiconsIcon icon={MusicNote03Icon} className="text-muted-foreground size-16" />
				<span className="text-muted-foreground text-sm">{asset.name}</span>
				<audio key={asset.id} src={url} controls autoPlay className="w-64" onError={() => setIsError(true)} />
			</div>
		);
	}

	return null;
}

function exportCurrentFrame({ editor }: { editor: ReturnType<typeof useEditor> }) {
	const renderTree = editor.renderer.getRenderTree();
	if (!renderTree) return;

	const activeProject = editor.project.getActive();
	if (!activeProject) return;

	const { width, height } = activeProject.settings.canvasSize;
	const fps = activeProject.settings.fps;
	const currentTime = editor.playback.getCurrentTime();

	const renderer = new CanvasRenderer({ width, height, fps });
	const tempCanvas = document.createElement("canvas");
	tempCanvas.width = width;
	tempCanvas.height = height;

	const exportPromise = new Promise<void>((resolve, reject) => {
		renderer.renderToCanvas({ node: renderTree, time: currentTime, targetCanvas: tempCanvas }).then(() => {
			tempCanvas.toBlob((blob) => {
				if (!blob) {
					reject(new Error("Failed to create blob"));
					return;
				}
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${activeProject.metadata.name}-frame.png`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				resolve();
			}, "image/png");
		}).catch(reject);
	});

	toast.promise(exportPromise, {
		loading: "Exporting frame...",
		success: "Frame exported successfully",
		error: "Failed to export frame",
	});
}

function PreviewToolbar({ isFullscreen, onToggleFullscreen }: { isFullscreen: boolean; onToggleFullscreen: () => void }) {
	const { t } = useTranslation();
	const editor = useEditor();

	return (
		<div className="flex items-center gap-1 justify-end p-2 px-3">
				<Button
					variant="text"
					size="icon"
					type="button"
					onMouseDown={(event) => event.preventDefault()}
					onClick={onToggleFullscreen}
					title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
				>
					<HugeiconsIcon icon={FullScreenIcon} />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="text" size="icon" type="button" onMouseDown={(event) => event.preventDefault()} title={t("More options")}>
							<HugeiconsIcon icon={MoreVerticalIcon} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" side="top">
						<DropdownMenuItem onClick={() => exportCurrentFrame({ editor })}>
							{t("Export current frame")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
		</div>
	);
}

// ============================================================
// 🔥 ДВИЖОК GSAP КРИВЫХ (для чистой математики без DOM)
// ============================================================
const easeElastic = gsap.parseEase("elastic.out(1, 0.5)");
const easeBounce = gsap.parseEase("bounce.out");
const easeBack = gsap.parseEase("back.out(1.7)");
const easePower3 = gsap.parseEase("power3.out");
const easeExpo = gsap.parseEase("expo.out");
const easeSine = gsap.parseEase("sine.inOut");
const easeElasticIn = gsap.parseEase("elastic.in(1, 0.3)");

// ============================================================
// 🔥 ГЛОБАЛЬНЫЙ ХОЛСТ (Оптимизация сборщика мусора)
// ============================================================
let sharedEffectCanvas: HTMLCanvasElement | null = null;

function getEffectCanvas(width: number, height: number) {
	if (!sharedEffectCanvas) {
		sharedEffectCanvas = document.createElement("canvas");
	}
	if (sharedEffectCanvas.width !== width || sharedEffectCanvas.height !== height) {
		sharedEffectCanvas.width = width;
		sharedEffectCanvas.height = height;
	}
	const ctx = sharedEffectCanvas.getContext("2d", { willReadFrequently: true });
	ctx?.clearRect(0, 0, width, height);
	return { tempCanvas: sharedEffectCanvas, tempCtx: ctx };
}

// ============================================================
// 🔥 БЕЗОПАСНОЕ КЛОНИРОВАНИЕ (сохраняем <video>, <img> живыми)
// ============================================================
function createMutableClone(obj: any): any {
	if (!obj || typeof obj !== "object") return obj;
	if (
		typeof window !== "undefined" &&
		(obj instanceof Element ||
			obj instanceof HTMLVideoElement ||
			obj instanceof HTMLImageElement ||
			obj instanceof HTMLCanvasElement)
	) {
		return obj;
	}

	const clone = Object.create(Object.getPrototypeOf(obj));
	for (const key of Object.keys(obj)) {
		const val = obj[key];
		if (key === "children" && Array.isArray(val)) {
			clone[key] = val.map(createMutableClone);
		} else if (
			["params", "element", "transform", "position", "raw", "props", "outgoing", "incoming"].includes(key) &&
			val &&
			typeof val === "object"
		) {
			clone[key] = createMutableClone(val);
		} else {
			clone[key] = val;
		}
	}
	return clone;
}

// ============================================================
// 🔥 ГЛАВНЫЙ ДВИЖОК ЭФФЕКТОВ
// Ключевые поля рендерера (из visual-node.ts и text-node.ts):
//   - transform.position.x / .y  → смещение
//   - transform.scale             → масштаб
//   - transform.rotate            → поворот в градусах (НЕ rotation!)
//   - params.opacity              → прозрачность (0–1)
//   - params.content              → текст (для TextNode)
// ============================================================
function applyEffectsToNode(node: any, time: number) {
	if (!node) return;
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			applyEffectsToNode(child, time);
		}
	}
	if (node.outgoing) applyEffectsToNode(node.outgoing, time);
	if (node.incoming) applyEffectsToNode(node.incoming, time);

	// Читаем params — именно так хранится данные в нодах (BaseNode<Params>)
	const params = node.params;
	if (!params) return;

	const animation = params.animation;
	const effect = params.effect;
	if (!animation && !effect) return;

	const start = params.startTime ?? params.timeOffset ?? 0;
	const totalDur = params.duration ?? 1;
	if (time < start || time > start + totalDur) return;

	const animationDur = Math.min(1, totalDur); 

	let t = 0;
	if (animation) {
		if (animation.includes("out") || animation.includes("exit")) {
			const outroStart = start + totalDur - animationDur;
			t = Math.min(Math.max((time - outroStart) / animationDur, 0), 1);
		} else if (["pulse", "shake", "wobble", "float", "neon-flicker", "pendulum", "heartbeat", "spin-slow"].includes(animation)) {
			t = 1; 
		} else {
			t = Math.min(Math.max((time - start) / animationDur, 0), 1);
		}
	} else {
		t = Math.min(Math.max((time - start) / totalDur, 0), 1);
	}

	// --- БЛОК 1: АНИМАЦИИ (меняем transform.position, scale, rotate, opacity) ---
	if (animation) {
		// Инициализируем структуры если их нет
		if (!params.transform) params.transform = { scale: 1, rotate: 0, position: { x: 0, y: 0 } };
		if (!params.transform.position) params.transform.position = { x: 0, y: 0 };

		const canvasH = params.canvasHeight ?? 1080;
		const canvasW = canvasH * (16 / 9);

		switch (animation) {
			// ── ПОЯВЛЕНИЯ (Intro) ──────────────────────────────────
			case "fade-in": {
				params.opacity = (params.opacity ?? 1) * t;
				break;
			}
			case "slide-left": {
				// Скользит слева → на место
				params.transform.position.x -= canvasW * 0.5 * (1 - easeExpo(t));
				break;
			}
			case "slide-right": {
				params.transform.position.x += canvasW * 0.5 * (1 - easeExpo(t));
				break;
			}
			case "slide-up": {
				params.transform.position.y += canvasH * 0.4 * (1 - easeExpo(t));
				break;
			}
			case "slide-down": {
				params.transform.position.y -= canvasH * 0.4 * (1 - easeExpo(t));
				break;
			}
			case "zoom-in": {
				const s = 0.2 + easePower3(t) * 0.8;
				params.transform.scale = (params.transform.scale ?? 1) * s;
				params.opacity = (params.opacity ?? 1) * Math.min(t * 3, 1);
				break;
			}
			case "zoom-out": {
				// Начинает большим, приходит к нормальному
				const s = 1.5 - easePower3(t) * 0.5;
				params.transform.scale = (params.transform.scale ?? 1) * s;
				params.opacity = (params.opacity ?? 1) * Math.min(t * 3, 1);
				break;
			}
			case "apple-smooth": {
				const s = 0.85 + easeExpo(t) * 0.15;
				params.transform.scale = (params.transform.scale ?? 1) * s;
				params.opacity = (params.opacity ?? 1) * Math.min(t * 3, 1);
				break;
			}
			case "elastic-pop": {
				const s = easeElastic(t);
				params.transform.scale = (params.transform.scale ?? 1) * Math.max(0, s);
				break;
			}
			case "bounce-in": {
				params.transform.position.y -= canvasH * 0.5 * (1 - easeBounce(t));
				params.opacity = (params.opacity ?? 1) * Math.min(t * 2, 1);
				break;
			}
			case "roll-in": {
				params.transform.position.x -= canvasW * 0.5 * (1 - easePower3(t));
				params.transform.rotate = (params.transform.rotate ?? 0) + (1 - easePower3(t)) * -360;
				break;
			}
			case "flip-in": {
				// Симуляция flip через scale X (сжатие → восстановление)
				const flip = Math.abs(Math.cos(t * Math.PI));
				params.transform.scale = (params.transform.scale ?? 1) * (0.01 + (1 - flip) * 0.99 + easePower3(t) * flip);
				break;
			}
			case "drop-in": {
				params.transform.position.y -= canvasH * (1 - easeBack(t));
				params.opacity = (params.opacity ?? 1) * Math.min(t * 3, 1);
				break;
			}
			case "swing-in": {
				const swing = Math.sin((1 - easePower3(t)) * Math.PI * 3) * (1 - t);
				params.transform.rotate = (params.transform.rotate ?? 0) + swing * 30;
				params.transform.position.y -= canvasH * 0.2 * (1 - easePower3(t));
				break;
			}
			case "blur-in": {
				// Используем opacity как аппроксимацию (blur — через shader)
				params.opacity = (params.opacity ?? 1) * easeExpo(t);
				params.transform.scale = (params.transform.scale ?? 1) * (0.9 + easePower3(t) * 0.1);
				break;
			}

			// ── ВЫХОДЫ (Outro) ─────────────────────────────────────
			case "fade-out": {
				params.opacity = (params.opacity ?? 1) * (1 - t);
				break;
			}
			case "slide-out-left": {
				params.transform.position.x -= canvasW * 0.6 * t;
				params.opacity = (params.opacity ?? 1) * (1 - t * 0.5);
				break;
			}
			case "slide-out-right": {
				params.transform.position.x += canvasW * 0.6 * t;
				params.opacity = (params.opacity ?? 1) * (1 - t * 0.5);
				break;
			}
			case "zoom-out-exit": {
				params.transform.scale = (params.transform.scale ?? 1) * (1 - t * 0.8);
				params.opacity = (params.opacity ?? 1) * (1 - t);
				break;
			}
			case "spin-out": {
				params.transform.rotate = (params.transform.rotate ?? 0) + t * 360;
				params.transform.scale = (params.transform.scale ?? 1) * (1 - t * 0.8);
				params.opacity = (params.opacity ?? 1) * (1 - t);
				break;
			}

			// ── ЦИКЛИЧЕСКИЕ (Loop) ─────────────────────────────────
			case "pulse": {
				const beat = 1 + Math.sin(time * 8 * Math.PI) * 0.08;
				params.transform.scale = (params.transform.scale ?? 1) * beat;
				break;
			}
			case "shake": {
				params.transform.position.x += Math.sin(time * 60) * 12;
				params.transform.position.y += Math.sin(time * 50 + 1) * 8;
				break;
			}
			case "wobble": {
				params.transform.rotate = (params.transform.rotate ?? 0) + Math.sin(time * 6) * 10;
				params.transform.scale = (params.transform.scale ?? 1) * (1 + Math.sin(time * 8) * 0.05);
				break;
			}
			case "float": {
				params.transform.position.y += Math.sin(time * 2) * 15;
				break;
			}
			case "neon-flicker": {
				const flick = Math.random() > 0.05 ? 1 : 0.2;
				params.opacity = (params.opacity ?? 1) * flick;
				break;
			}
			case "pendulum": {
				params.transform.rotate = (params.transform.rotate ?? 0) + Math.sin(time * 4) * 15;
				break;
			}
			case "heartbeat": {
				const hb = time * 2;
				const beat2 = 1 + (Math.pow(Math.sin(hb * Math.PI), 8)) * 0.2;
				params.transform.scale = (params.transform.scale ?? 1) * beat2;
				break;
			}
			case "spin-slow": {
				params.transform.rotate = (params.transform.rotate ?? 0) + time * 30;
				break;
			}

			// ── ТЕКСТОВЫЕ ─────────────────────────────────────────
			case "typewriter": {
				const fullText = params.content ?? params.raw?.content ?? "";
				if (fullText) {
					const chars = Math.floor(fullText.length * Math.min(t / 0.6, 1));
					const cursor = t < 0.95 && Math.floor(time * 6) % 2 === 0 ? "│" : "";
					params.content = fullText.slice(0, chars) + cursor;
					if (params.raw) params.raw.content = params.content;
				}
				break;
			}
			case "word-reveal": {
				const words = (params.content ?? "").split(" ");
				const visible = Math.floor(words.length * t);
				params.content = words.slice(0, Math.max(1, visible)).join(" ");
				if (params.raw) params.raw.content = params.content;
				break;
			}

			// ── GSAP СПЕЦИАЛЬНЫЕ ──────────────────────────────────
			case "gsap-elastic-pop": {
				params.transform.scale = (params.transform.scale ?? 1) * Math.max(0, easeElastic(t));
				break;
			}
			case "gsap-bounce-drop": {
				params.transform.position.y -= canvasH * 0.5 * (1 - easeBounce(t));
				params.opacity = (params.opacity ?? 1) * Math.min(t * 2, 1);
				break;
			}
			case "gsap-slide-back": {
				params.transform.position.x -= canvasW * 0.5 * (1 - easeBack(t));
				break;
			}
			case "gsap-swing-reveal": {
				const st = easeSine(t);
				params.transform.rotate = (params.transform.rotate ?? 0) + Math.sin(st * Math.PI * 4) * 20 * (1 - st);
				params.transform.position.y -= canvasH * 0.2 * (1 - easePower3(t));
				break;
			}
			case "gsap-cinematic-zoom": {
				params.transform.scale = (params.transform.scale ?? 1) * (0.5 + easePower3(t) * 0.5);
				params.opacity = (params.opacity ?? 1) * Math.min(t * 2, 1);
				break;
			}
			case "gsap-elastic-spin": {
				params.transform.rotate = (params.transform.rotate ?? 0) + (1 - easeElastic(t)) * 360;
				params.transform.scale = (params.transform.scale ?? 1) * Math.max(0, easeElastic(t));
				break;
			}
		}
	}

	// --- БЛОК 2: ВИЗУАЛЬНЫЕ ШЕЙДЕРЫ (перехватываем node.render) ---
	if (effect) {
		const originalRender = node.render?.bind(node);

		node.render = async function (args: any) {
			const target = args.target;
			const origCtx = target.context;

			// Рисуем элемент на ИЗОЛИРОВАННЫЙ холст
			const { tempCanvas, tempCtx } = getEffectCanvas(target.width, target.height);

			if (!tempCtx || !originalRender) {
				if (originalRender) await originalRender(args);
				return;
			}

			target.context = tempCtx as any;
			await originalRender(args);
			target.context = origCtx;

			const ctx = origCtx;
			const w = target.width;
			const h = target.height;
			ctx.save();

			switch (effect) {
				case "cyber-glitch": {
					ctx.drawImage(tempCanvas, 0, 0);
					if (Math.random() > 0.25) {
						// RGB хроматическая аберрация
						ctx.globalCompositeOperation = "screen";
						ctx.globalAlpha = 0.6;
						ctx.drawImage(tempCanvas, 8, 0);
						ctx.drawImage(tempCanvas, -8, 0);
						ctx.globalAlpha = 1;
						ctx.globalCompositeOperation = "source-over";
						// Горизонтальные разрывы
						for (let i = 0; i < 4; i++) {
							const sliceH = Math.random() * 30 + 5;
							const sliceY = Math.random() * (h - sliceH);
							const shift = (Math.random() - 0.5) * 80;
							ctx.drawImage(tempCanvas, 0, sliceY, w, sliceH, shift, sliceY, w, sliceH);
						}
					}
					break;
				}
				case "liquid-warp": {
					for (let y = 0; y < h; y += 2) {
						const shiftX = Math.sin(y / 15 + time * 10) * 25;
						ctx.drawImage(tempCanvas, 0, y, w, 2, shiftX, y, w, 2);
					}
					break;
				}
				case "pixelate": {
					const px = 18;
					const pw = Math.max(1, Math.ceil(w / px));
					const ph = Math.max(1, Math.ceil(h / px));
					const tiny = document.createElement("canvas");
					tiny.width = pw;
					tiny.height = ph;
					tiny.getContext("2d")?.drawImage(tempCanvas, 0, 0, pw, ph);
					ctx.imageSmoothingEnabled = false;
					ctx.drawImage(tiny, 0, 0, pw, ph, 0, 0, w, h);
					ctx.imageSmoothingEnabled = true;
					break;
				}
				case "blur-zoom": {
					ctx.filter = "blur(6px)";
					const zs = 1 + Math.sin(time * 6) * 0.12;
					ctx.translate(w / 2, h / 2);
					ctx.scale(zs, zs);
					ctx.translate(-w / 2, -h / 2);
					ctx.drawImage(tempCanvas, 0, 0);
					break;
				}
				case "text-shatter": {
					if (t > 0.15) {
						const p = (t - 0.15) / 0.85;
						const sz = 45;
						for (let x = 0; x < w; x += sz) {
							for (let y = 0; y < h; y += sz) {
								const offsetX = (Math.random() - 0.5) * p * 500;
								const offsetY = (Math.random() - 0.5) * p * 500;
								ctx.globalAlpha = Math.max(0, 1 - p * 1.2);
								ctx.drawImage(tempCanvas, x, y, sz, sz, x + offsetX, y + offsetY, sz, sz);
							}
						}
					} else {
						ctx.drawImage(tempCanvas, 0, 0);
					}
					break;
				}
				case "vhs-scanlines": {
					ctx.drawImage(tempCanvas, 0, 0);
					// VHS полосы
					ctx.globalAlpha = 0.15;
					ctx.fillStyle = "#000";
					for (let y = 0; y < h; y += 4) {
						ctx.fillRect(0, y, w, 2);
					}
					// Горизонтальный шум
					const noiseY = (time * 200) % h;
					ctx.globalAlpha = 0.3;
					ctx.fillStyle = "#fff";
					ctx.fillRect(0, noiseY, w, 2);
					break;
				}
				case "neon-glow": {
					ctx.drawImage(tempCanvas, 0, 0);
					ctx.globalCompositeOperation = "screen";
					ctx.filter = "blur(12px)";
					ctx.globalAlpha = 0.7;
					ctx.drawImage(tempCanvas, 0, 0);
					break;
				}
				case "earthquake": {
					const sx = (Math.random() - 0.5) * 50;
					const sy = (Math.random() - 0.5) * 40;
					ctx.drawImage(tempCanvas, sx, sy);
					break;
				}
				case "strobe": {
					ctx.drawImage(tempCanvas, 0, 0);
					if (Math.sin(time * 25) > 0.3) {
						ctx.globalCompositeOperation = "source-atop";
						ctx.fillStyle = "rgba(255,255,255,0.85)";
						ctx.fillRect(0, 0, w, h);
					}
					break;
				}
				case "old-film": {
					// Сепия + шум + виньетка
					ctx.drawImage(tempCanvas, 0, 0);
					// Затемнение по краям
					const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
					gradient.addColorStop(0, "rgba(0,0,0,0)");
					gradient.addColorStop(1, "rgba(0,0,0,0.6)");
					ctx.globalAlpha = 0.8;
					ctx.fillStyle = gradient;
					ctx.fillRect(0, 0, w, h);
					// Зернистость
					ctx.globalAlpha = 0.05 + Math.random() * 0.05;
					ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 50%)`;
					for (let i = 0; i < 200; i++) {
						ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
					}
					break;
				}
				default: {
					ctx.drawImage(tempCanvas, 0, 0);
				}
			}

			ctx.restore();
		};
	}
}

// ============================================================
// 🔥 PreviewCanvas компонент
// ============================================================
function PreviewCanvas() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const lastFrameRef = useRef(-1);
	const lastSceneRef = useRef<RootNode | null>(null);
	const renderingRef = useRef(false);
	const { width: nativeWidth, height: nativeHeight } = usePreviewSize();
	const containerSize = useContainerSize({ containerRef });
	const editor = useEditor();
	const activeProject = editor.project.getActive();

	const renderer = useMemo(() => {
		return new CanvasRenderer({
			width: nativeWidth,
			height: nativeHeight,
			fps: activeProject?.settings?.fps ?? 30,
		});
	}, [nativeWidth, nativeHeight, activeProject?.settings?.fps]);

	const displaySize = useMemo(() => {
		if (!nativeWidth || !nativeHeight || containerSize.width === 0 || containerSize.height === 0) {
			return { width: nativeWidth ?? 0, height: nativeHeight ?? 0 };
		}
		const paddingBuffer = 4;
		const availableWidth = containerSize.width - paddingBuffer;
		const availableHeight = containerSize.height - paddingBuffer;
		const aspectRatio = nativeWidth / nativeHeight;
		const containerAspect = availableWidth / availableHeight;
		const displayWidth = containerAspect > aspectRatio ? availableHeight * aspectRatio : availableWidth;
		const displayHeight = containerAspect > aspectRatio ? availableHeight : availableWidth / aspectRatio;
		return { width: displayWidth, height: displayHeight };
	}, [nativeWidth, nativeHeight, containerSize.width, containerSize.height]);

	const render = useCallback(() => {
		const currentRenderTree = editor.renderer.getRenderTree();
		if (canvasRef.current && currentRenderTree && !renderingRef.current) {
			const time = editor.playback.getCurrentTime();
			const lastFrameTime = getLastFrameTime({
				duration: currentRenderTree.duration,
				fps: renderer.fps,
			});
			const renderTime = Math.min(time, lastFrameTime);
			const frame = Math.floor(renderTime * renderer.fps);

			if (frame !== lastFrameRef.current || currentRenderTree !== lastSceneRef.current) {
				renderingRef.current = true;
				lastSceneRef.current = currentRenderTree;
				lastFrameRef.current = frame;

				// 1. Безопасный клон дерева (НЕ ломает Redux, сохраняет <video>)
				const mutableTree = createMutableClone(currentRenderTree);

				// 2. Применяем анимации/эффекты к клону
				applyEffectsToNode(mutableTree, renderTime);

				// 3. Рендерим
				renderer
					.renderToCanvas({
						node: mutableTree,
						time: renderTime,
						targetCanvas: canvasRef.current,
					})
					.finally(() => {
						renderingRef.current = false;
					});
			}
		}
	}, [renderer, editor]);

	useRafLoop(render);

	return (
		<div ref={containerRef} className="relative flex h-full w-full items-center justify-center">
			<div className="relative" style={{ width: displaySize.width, height: displaySize.height }}>
				<canvas
					id="preview-canvas"
					ref={canvasRef}
					width={nativeWidth}
					height={nativeHeight}
					className="block border"
					style={{
						width: displaySize.width,
						height: displaySize.height,
						background:
							activeProject?.settings?.background?.type === "blur"
								? "transparent"
								: activeProject?.settings?.background?.color ?? "#000",
					}}
				/>
				<PreviewInteractionOverlay canvasRef={canvasRef} displaySize={displaySize} />
			</div>
		</div>
	);
}
