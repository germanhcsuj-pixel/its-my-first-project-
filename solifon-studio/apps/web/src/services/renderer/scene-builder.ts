import { RootNode } from "./nodes/root-node";
import { VideoNode } from "./nodes/video-node";
import { ShapeNode } from "./nodes/shape-node";
import { createLine, createRect, createEllipse, createPolygon } from "./geometry/generators";
import { fontRegistry } from "./typography/font-registry";
import { ImageNode } from "./nodes/image-node";
import { TextNode } from "./nodes/text-node";
import { StickerNode } from "./nodes/sticker-node";
import { ColorNode } from "./nodes/color-node";
import { BlurBackgroundNode } from "./nodes/blur-background-node";
import { TransitionNode } from "./nodes/transition-node";
import { LayerCompositorNode } from "./nodes/layer-compositor-node";
import { BlurEffect } from "./effects/blur-effect";
import { MotionBlurEffect } from "./effects/motion-blur-effect";
import { GlowEffect } from "./effects/glow-effect";
import type { BaseNode } from "./nodes/base-node";
import type { TBackground, TCanvasSize } from "@/types/project";
import { DEFAULT_BLUR_INTENSITY } from "@/constants/project-constants";
import { isMainTrack } from "@/lib/timeline";
import { isBottomAlignedSubtitleText } from "@/lib/timeline/text-utils";
import type { 
	TimelineTrack, 
	VideoElement, 
	ImageElement, 
	TextElement, 
	StickerElement,
	AudioElement,
	ShapeElement,
	TimelineElement
} from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";

// --- Расширенные типы для избежания `any` ---
export type BuildSceneParams = {
	canvasSize: TCanvasSize;
	tracks: TimelineTrack[];
	mediaAssets: MediaAsset[];
	duration: number;
	background: TBackground;
	camera?: import("@/types/project").VirtualCamera;
};

export type TrackTransition = {
	fromElementId: string;
	toElementId: string;
	type: string;
	duration: number;
};

type HideRange = { start: number; end: number };

interface LegacyAdjustments {
	brightness?: number;
	contrast?: number;
	saturation?: number;
	hueRotate?: number;
	blur?: number;
}

interface TranslatingElement {
	id: string;
	effects?: import("@/types/timeline").EffectDefinition[];
	adjustments?: LegacyAdjustments | null;
}

function translateElementEffects(element: TranslatingElement): {
	effects: import("@/types/timeline").EffectDefinition[];
	adjustments: LegacyAdjustments | null;
} {
	const elementEffects = element.effects || [];
	const effects: import("@/types/timeline").EffectDefinition[] = [];
	for (const e of elementEffects) {
		if (e && typeof e === "object" && "id" in e && "parameters" in e) {
			effects.push(e as import("@/types/timeline").EffectDefinition);
		}
	}

	let adjustments: LegacyAdjustments | null = element.adjustments ? { ...element.adjustments } : null;

	if (adjustments) {
		const hasExplicitColor = effects.some((e) => e.type === "color" && "parameters" in e);
		const hasExplicitBlur = effects.some((e) => e.type === "blur" && "parameters" in e);

		let needsColorTranslation = false;
		const colorParams: Record<string, import("@/types/timeline").AnimatedNumber> = {};

		if (!hasExplicitColor) {
			if (adjustments.brightness !== undefined && adjustments.brightness !== 100) {
				colorParams.brightness = { mode: "static", value: adjustments.brightness };
				needsColorTranslation = true;
			}
			if (adjustments.contrast !== undefined && adjustments.contrast !== 100) {
				colorParams.contrast = { mode: "static", value: adjustments.contrast };
				needsColorTranslation = true;
			}
			if (adjustments.saturation !== undefined && adjustments.saturation !== 100) {
				colorParams.saturation = { mode: "static", value: adjustments.saturation };
				needsColorTranslation = true;
			}
			if (adjustments.hueRotate !== undefined && adjustments.hueRotate !== 0) {
				colorParams.hue = { mode: "static", value: adjustments.hueRotate };
				needsColorTranslation = true;
			}
		}

		if (needsColorTranslation) {
			if (colorParams.brightness === undefined) colorParams.brightness = { mode: "static", value: 100 };
			if (colorParams.contrast === undefined) colorParams.contrast = { mode: "static", value: 100 };
			if (colorParams.saturation === undefined) colorParams.saturation = { mode: "static", value: 100 };
			if (colorParams.hue === undefined) colorParams.hue = { mode: "static", value: 0 };

			effects.push({
				id: `adj-color-${element.id}`,
				type: "color",
				enabled: true,
				opacity: 1.0,
				parameters: colorParams as unknown as import("@/types/timeline").ColorEffectParams
			});
		}

		let needsBlurTranslation = false;
		const blurParams: Record<string, import("@/types/timeline").AnimatedNumber> = {};

		if (!hasExplicitBlur) {
			if (adjustments.blur !== undefined && adjustments.blur > 0) {
				blurParams.radius = { mode: "static", value: adjustments.blur };
				needsBlurTranslation = true;
			}
		}

		if (needsBlurTranslation) {
			effects.push({
				id: `adj-blur-${element.id}`,
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: blurParams.radius
				} as unknown as import("@/types/timeline").BlurEffectParams
			});
		}

		if (needsColorTranslation || needsBlurTranslation) {
			adjustments = null;
		}
	}

	return { effects, adjustments };
}

function buildRenderNode({
	element,
	mediaMap,
	canvasSize,
	hideRanges,
}: {
	element: TimelineElement;
	mediaMap: Map<string, MediaAsset>;
	canvasSize: TCanvasSize;
	hideRanges?: HideRange[];
}): BaseNode | null {
	const { effects, adjustments } = translateElementEffects(element as unknown as TranslatingElement);

	const elType = (element as unknown as { type: string }).type;

	if (elType === "text") {
		const textEl = element as TextElement;
		const textBaseline = isBottomAlignedSubtitleText({ element: textEl }) ? "bottom" : "middle";
		return new TextNode({
			...textEl,
			timeOffset: textEl.startTime,
			trimStart: 0,
			trimEnd: 1,
			duration: textEl.duration,
			canvasCenter: { x: canvasSize.width / 2, y: canvasSize.height / 2 },
			canvasHeight: canvasSize.height,
			hideRanges,
			adjustments,
			effects,
		});
	}

	if (elType === "color") {
		const colorEl = element as unknown as { color?: string; duration: number; startTime: number; transform: import("@/types/timeline").Transform; opacity?: number; effect?: string; animation?: string };
		return new ColorNode({
			color: colorEl.color || "white",
			canvasWidth: canvasSize.width,
			canvasHeight: canvasSize.height,
			duration: colorEl.duration,
			timeOffset: colorEl.startTime,
			transform: colorEl.transform,
			opacity: colorEl.opacity ?? 1.0,
			effect: colorEl.effect,
			animation: colorEl.animation,
			startTime: colorEl.startTime,
			hideRanges,
			adjustments,
			effects,
		} as any);
	}

	if (elType === "sticker") {
		const stickerEl = element as StickerElement;
		const opacity = "opacity" in stickerEl ? (stickerEl as unknown as { opacity: number }).opacity : 1.0;
		const effect = "effect" in stickerEl ? (stickerEl as unknown as { effect: string }).effect : undefined;
		const animation = "animation" in stickerEl ? (stickerEl as unknown as { animation: string }).animation : undefined;
		return new StickerNode({
			iconName: stickerEl.iconName,
			duration: stickerEl.duration,
			timeOffset: stickerEl.startTime,
			trimStart: stickerEl.trimStart,
			trimEnd: stickerEl.trimEnd,
			transform: stickerEl.transform,
			opacity,
			color: stickerEl.color,
			effect,
			animation,
			startTime: stickerEl.startTime,
			hideRanges,
			adjustments,
			effects,
		});
	}

	if (elType === "shape") {
		const shapeEl = element as ShapeElement;
		const opacity = "opacity" in shapeEl ? (shapeEl as unknown as { opacity: number }).opacity : 1.0;
		const effect = "effect" in shapeEl ? (shapeEl as unknown as { effect: string }).effect : undefined;
		
		let geometry;
		switch (shapeEl.geometry.type) {
			case "line":
				geometry = createLine(shapeEl.geometry.x1, shapeEl.geometry.y1, shapeEl.geometry.x2, shapeEl.geometry.y2);
				break;
			case "rect":
				geometry = createRect(0, 0, shapeEl.geometry.width, shapeEl.geometry.height);
				break;
			case "ellipse":
				geometry = createEllipse(0, 0, shapeEl.geometry.radiusX, shapeEl.geometry.radiusY);
				break;
			case "polygon":
				geometry = createPolygon(shapeEl.geometry.points, true);
				break;
		}

		return new ShapeNode({
			geometry,
			style: {
				fill: shapeEl.fill,
				stroke: shapeEl.stroke
			},
			trim: shapeEl.trim,
			shapeAnimation: shapeEl.shapeAnimation,
			transform: shapeEl.transform,
			opacity,
			effect,
			startTime: shapeEl.startTime,
			duration: shapeEl.duration,
			hideRanges,
			adjustments,
			effects,
		} as any);
	}

	if (!("mediaId" in element)) return null;
	const mediaAsset = mediaMap.get(element.mediaId);
	if (!mediaAsset?.file || !mediaAsset?.url) {
		return null;
	}

	// Выносим общие медиа-параметры (DRY)
	const el = element as any;
	const commonMediaProps = {
		duration: el.duration,
		timeOffset: el.startTime,
		trimStart: el.trimStart,
		trimEnd: el.trimEnd,
		transform: el.transform,
		opacity: el.opacity,
		animation: el.animation,
		animationStartTime: el.animationStartTime,
		animationDuration: el.animationDuration,
		animationSpeed: el.animationSpeed,
		animationDirection: el.animationDirection,
		effect: el.effect,
		effectStartTime: el.effectStartTime,
		effectDuration: el.effectDuration,
		effectSpeed: el.effectSpeed,
		filter: el.filter,
		adjustments,
		effects,
		startTime: el.startTime,
		hideRanges,
	};

	if (mediaAsset.type === "video") {
		const videoElement = element as VideoElement;
		return new VideoNode({
			...commonMediaProps,
			mediaId: mediaAsset.id,
			url: mediaAsset.url,
			file: mediaAsset.file,
			playbackRate: videoElement.playbackRate,
			reversed: videoElement.reversed,
			removeBackground: videoElement.removeBackground,
		});
	}

	if (mediaAsset.type === "image") {
		return new ImageNode({
			...commonMediaProps,
			url: mediaAsset.url,
			removeBackground: el.removeBackground,
		});
	}

	return null;
}

function getElementEndTime({ element }: { element: { startTime: number; duration: number } }): number {
	return element.startTime + element.duration;
}

export async function buildScene(params: BuildSceneParams) {
	const { tracks, mediaAssets, duration, canvasSize, background, camera } = params;

	const rootNode = new RootNode({ 
		duration, 
		camera,
		canvasCenter: { x: canvasSize.width / 2, y: canvasSize.height / 2 }
	});
	const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]));

	const visibleTracks = tracks.filter((track) => !("hidden" in track && track.hidden));

	const mainTracks = visibleTracks.filter(isMainTrack);
	const overlayTracks = visibleTracks.filter((track) => !isMainTrack(track));

	// Pre-load fonts for all text elements to prevent FOUT and cache poisoning
	const fontSpecsToLoad: { family: string; weight: string | number; style: string; url?: string }[] = [];
	for (const track of visibleTracks) {
		for (const element of track.elements) {
			if (element.type === "text" && !("hidden" in element && element.hidden)) {
				const textEl = element as TextElement;
				fontSpecsToLoad.push({
					family: textEl.fontFamily,
					weight: textEl.fontWeight ?? "normal",
					style: textEl.fontStyle ?? "normal"
				});
			}
		}
	}
	
	await Promise.all(
		fontSpecsToLoad.map(spec => fontRegistry.awaitReady(spec).catch(e => {
			console.error(`buildScene: Failed to load font ${spec.family}`, e);
		}))
	);
	
	// We no longer need to strictly sort tracks here for rendering order, 
	// because LayerCompositorNode will sort by zIndex.
	// But we keep it to assign zIndex correctly if not present.
	const orderedTracksTopToBottom = [
		...overlayTracks.sort((a, b) => (b.index ?? 0) - (a.index ?? 0)),
		...mainTracks.sort((a, b) => (b.index ?? 0) - (a.index ?? 0)),
	];
	const orderedTracksBottomToTop = orderedTracksTopToBottom.slice().reverse();

	const contentNodes: BaseNode[] = [];

	for (const track of orderedTracksBottomToTop) {
		const elements = track.elements
			.filter((element: any) => !("hidden" in element && element.hidden))
			.slice()
			.sort((a: any, b: any) => {
				if (a.startTime !== b.startTime) return a.startTime - b.startTime;
				return a.id.localeCompare(b.id);
			});

		const trackTransitions: TrackTransition[] = (track as any).transitions ?? [];
		const transitionLookup = new Map<string, TrackTransition>();
		for (const transition of trackTransitions) {
			const key = `${transition.fromElementId}:${transition.toElementId}`;
			transitionLookup.set(key, transition);
		}

		const hideRangesMap = new Map<string, HideRange[]>();

		// 1. Предрасчёт hideRanges ДО создания нод
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			const nextElement = elements[i + 1];

			if (nextElement) {
				const pairKey = `${element.id}:${nextElement.id}`;
				const transition = transitionLookup.get(pairKey);
				if (transition) {
					const junctionTime = nextElement.startTime;
					const start = junctionTime - transition.duration / 2;
					const end = start + transition.duration;

					if (!hideRangesMap.has(element.id)) hideRangesMap.set(element.id, []);
					if (!hideRangesMap.has(nextElement.id)) hideRangesMap.set(nextElement.id, []);

					hideRangesMap.get(element.id)!.push({ start, end });
					hideRangesMap.get(nextElement.id)!.push({ start, end });
				}
			}

			const singleTransition = (element as any).transition;
			const singleTransitionDuration = (element as any).transitionDuration ?? 0.5;
			if (singleTransition && singleTransition !== "none") {
				const junctionTime = getElementEndTime({ element: element as any });
				const start = junctionTime - singleTransitionDuration;
				const end = junctionTime;

				if (!hideRangesMap.has(element.id)) hideRangesMap.set(element.id, []);
				hideRangesMap.get(element.id)!.push({ start, end });
			}
		}

		// 2. Создаем ноды ЕДИНОЖДЫ и сохраняем ссылки для переиспользования
		const nodeMap = new Map<string, BaseNode>();

		for (const element of elements) {
			const hideRanges = hideRangesMap.get(element.id);
			const node = buildRenderNode({ element, mediaMap, canvasSize, hideRanges });
			if (node) {
				node.id = element.id;
				node.zIndex = (track.index ?? 0) * 10;
				node.layerType = isMainTrack(track) ? "video" : "overlay"; // simplify
				node.blendMode = (element as unknown as { blendMode?: import("./blend-modes").BlendMode }).blendMode || "normal";
				
				const specs = ("effects" in element ? element.effects : []) || [];
				for (const spec of specs) {
					if (spec && typeof spec === "object" && "parameters" in spec) {
						continue; // Skip new P3.10/P3.11 effect definitions
					}
					if (spec.type === "blur") {
						node.effects.push(new BlurEffect(spec.radius));
					} else if (spec.type === "motion-blur") {
						node.effects.push(new MotionBlurEffect(spec.samples ?? 8, spec.shutterAngle ?? 180));
					} else if (spec.type === "glow") {
						node.effects.push(new GlowEffect(spec.radius, spec.intensity, spec.threshold, spec.blendMode));
					}
				}
				
				nodeMap.set(element.id, node);
				contentNodes.push(node);
			}
		}

		// 3. Создаем TransitionNode, переиспользуя УЖЕ СОЗДАННЫЕ ноды из nodeMap
		for (let i = 0; i < elements.length - 1; i++) {
			const element = elements[i];
			const nextElement = elements[i + 1];
			const pairKey = `${element.id}:${nextElement.id}`;
			const transition = transitionLookup.get(pairKey);

			if (transition) {
				const outgoingNode = nodeMap.get(element.id);
				const incomingNode = nodeMap.get(nextElement.id);

				if (outgoingNode && incomingNode) {
					const junctionTime = nextElement.startTime;
					const tNode = new TransitionNode({
						type: transition.type,
						duration: transition.duration,
						transitionStart: junctionTime - transition.duration / 2,
						outgoingNode,
						incomingNode,
						outgoingEndTime: getElementEndTime({ element: element as any }),
						incomingStartTime: nextElement.startTime,
					});
					tNode.id = `transition-${element.id}-${nextElement.id}`;
					tNode.zIndex = ((track.index ?? 0) * 10) + 1; // above the clips
					contentNodes.push(tNode);
				}
			}
		}

		// 4. Одиночные переходы (Fade out в прозрачность)
		for (const element of elements) {
			const singleTransition = (element as any).transition;
			const singleTransitionDuration = (element as any).transitionDuration ?? 0.5;

			if (singleTransition && singleTransition !== "none") {
				const outgoingNode = nodeMap.get(element.id);
				const incomingNode = new ColorNode({ color: "transparent" });

				if (outgoingNode) {
					const junctionTime = getElementEndTime({ element: element as any });
					const tNode = new TransitionNode({
						type: singleTransition,
						duration: singleTransitionDuration,
						transitionStart: junctionTime - singleTransitionDuration,
						outgoingNode,
						incomingNode,
						outgoingEndTime: junctionTime,
						incomingStartTime: junctionTime,
					});
					tNode.id = `single-transition-${element.id}`;
					tNode.zIndex = ((track.index ?? 0) * 10) + 1;
					contentNodes.push(tNode);
				}
			}
		}
	}

	const layerCompositor = new LayerCompositorNode();

	// Формирование итогового дерева сцены
	if (background.type === "blur") {
		const blurBgNode = new BlurBackgroundNode({
			blurIntensity: background.blurIntensity ?? DEFAULT_BLUR_INTENSITY,
			contentNodes, // Note: This will still render the content nodes twice for the blur effect
		});
		blurBgNode.id = "background-blur";
		blurBgNode.zIndex = -100;
		layerCompositor.add(blurBgNode);
	} else if (background.type === "color" && background.color !== "transparent") {
		const colorNode = new ColorNode({ color: background.color });
		colorNode.id = "background-color";
		colorNode.zIndex = -100;
		layerCompositor.add(colorNode);
	}

	for (const node of contentNodes) {
		layerCompositor.add(node);
	}

	rootNode.add(layerCompositor);

	return rootNode;
}
