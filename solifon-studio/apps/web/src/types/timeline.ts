export type MarkerType = "beat" | "scene" | "highlight" | "speech" | "face" | "action" | "transition";

export type Marker = {
	id: string;
	time: number;
	type: MarkerType;
	data?: Record<string, unknown>;
};

export interface TScene {
	id: string;
	name: string;
	isMain: boolean;
	tracks: TimelineTrack[];
	bookmarks: number[];
	markers?: Marker[];
	createdAt: Date;
	updatedAt: Date;
}

export type TrackType = "video" | "text" | "audio" | "sticker";

interface BaseTrack {
	id: string;
	name: string;
	index?: number;
	transitions?: TrackTransition[];
}

export interface VideoTrack extends BaseTrack {
	type: "video";
	elements: (VideoElement | ImageElement | ShapeElement)[];
	isMain: boolean;
	muted: boolean;
	hidden: boolean;
}

export interface TextTrack extends BaseTrack {
	type: "text";
	elements: TextElement[];
	hidden: boolean;
}

export interface AudioTrack extends BaseTrack {
	type: "audio";
	elements: AudioElement[];
	muted: boolean;
}

export interface StickerTrack extends BaseTrack {
	type: "sticker";
	elements: StickerElement[];
	hidden: boolean;
}

export type TimelineTrack = VideoTrack | TextTrack | AudioTrack | StickerTrack;

export type Easing = 
	| { type: "linear" | "ease-in" | "ease-out" | "ease-in-out" }
	| { type: "bezier"; p1: [number, number]; p2: [number, number] }
	| { type: "elastic"; amplitude?: number; period?: number };

export interface Keyframe {
	time: number; // Local time within the clip in seconds
	value: number;
	easing?: Easing;
}

export type KeyframeTrack = Keyframe[];

export interface TransformKeyframes {
	x?: KeyframeTrack;
	y?: KeyframeTrack;
	scale?: KeyframeTrack;
	rotation?: KeyframeTrack;
}

export interface PropertyKeyframes {
	opacity?: KeyframeTrack;
	blur?: KeyframeTrack;
	fontSize?: KeyframeTrack;
	letterSpacing?: KeyframeTrack;
	lineHeight?: KeyframeTrack;
}

export interface Transform {
	scale: number;
	position: {
		x: number;
		y: number;
	};
	rotate: number;
	flipX?: boolean;
	flipY?: boolean;
	transformKeyframes?: TransformKeyframes;
	propertyKeyframes?: PropertyKeyframes;
}

// ---- Transitions ----

export type TransitionType =
	| "fade"
	| "dissolve"
	| "wipe-left"
	| "wipe-right"
	| "wipe-up"
	| "wipe-down"
	| "slide-left"
	| "slide-right"
	| "slide-up"
	| "slide-down"
	| "zoom-in"
	| "zoom-out";

export type VideoFilterId = "vhs" | "cinematic" | "glitch" | "bw_contrast" | "cyberpunk" | "neon" | "color_grade";

export type VideoFilter = {
	id: VideoFilterId;
	intensity: number;
	parameters?: {
		noise?: number;
		distortion?: number;
		scanlines?: number;
		brightness?: number;
		contrast?: number;
		saturation?: number;
		chromaticAberration?: number;
	};
};

export interface TrackTransition {
	id: string;
	type: TransitionType;
	duration: number;
	fromElementId: string;
	toElementId: string;
}

interface BaseAudioElement extends BaseTimelineElement {
	type: "audio";
	volume: number;
	muted?: boolean;
	buffer?: AudioBuffer;
	playbackRate?: number;
}

export interface UploadAudioElement extends BaseAudioElement {
	sourceType: "upload";
	mediaId: string;
}

export interface LibraryAudioElement extends BaseAudioElement {
	sourceType: "library";
	sourceUrl: string;
}

export type AudioElement = UploadAudioElement | LibraryAudioElement;

export type EffectSpec =
	| { type: "blur"; radius: number }
	| { type: "motion-blur"; samples: number; shutterAngle: number }
	| { type: "glow"; radius: number; intensity: number; threshold?: number; blendMode?: "add" | "screen" };

export type EffectTarget =
	| { type: "layer"; elementId: string }
	| { type: "mask"; maskId: string }
	| { type: "track"; trackId: string };

export interface RGBA {
	r: number;
	g: number;
	b: number;
	a: number;
}

export type ParameterKey = string;

export interface EffectKeyframe<T> {
	time: number;
	value: T;
}

export type TemporalParameter<T> =
	| {
			mode: "static";
			value: T;
	  }
	| {
			mode: "keyframes";
			interpolation: "step" | "linear";
			keyframes: EffectKeyframe<T>[];
	  }
	| {
			mode: "reference";
			parameterId: ParameterKey;
			scale?: number;
			offset?: number;
	  };

export type AnimatedNumber = TemporalParameter<number>;
export type AnimatedRGBA = TemporalParameter<RGBA>;

export interface EvaluatedParameterValue {
	parameterKey: string;
	type: "number" | "color";
	value: number | RGBA;
}

export interface EffectEvaluationInput {
	effect: EffectDefinition;
	target: ResolvedEffectTarget;
	time: number;
	frameIndex: number;
	dependencyValues: readonly EvaluatedParameterValue[];
}

export interface BlurEffectParams {
	radius: AnimatedNumber;
	opacity?: AnimatedNumber;
	quality?: number;
}

export interface GlowEffectParams {
	radius: AnimatedNumber;
	intensity: AnimatedNumber;
	color: AnimatedRGBA;
	opacity?: AnimatedNumber;
}

export interface ColorEffectParams {
	brightness: AnimatedNumber;
	contrast: AnimatedNumber;
	saturation: AnimatedNumber;
	hue: AnimatedNumber;
	opacity?: AnimatedNumber;
}

export interface DisplacementEffectParams {
	strength: AnimatedNumber;
	scale: AnimatedNumber;
	angle: AnimatedNumber;
	opacity?: AnimatedNumber;
}

export interface WaveEffectParams {
	amplitude: AnimatedNumber;
	frequency: AnimatedNumber;
	phase: AnimatedNumber;
	direction: AnimatedNumber;
	opacity?: AnimatedNumber;
}

export interface LensEffectParams {
	strength: AnimatedNumber;
	radius: AnimatedNumber;
	centerX: AnimatedNumber;
	centerY: AnimatedNumber;
	opacity?: AnimatedNumber;
}

export interface EvaluatedBlurEffectParams {
	radius: number;
	opacity?: number;
	quality?: number;
}

export interface EvaluatedGlowEffectParams {
	radius: number;
	intensity: number;
	color: RGBA;
	opacity?: number;
}

export interface EvaluatedColorEffectParams {
	brightness: number;
	contrast: number;
	saturation: number;
	hue: number;
	opacity?: number;
}

export interface EvaluatedDisplacementEffectParams {
	strength: number;
	scale: number;
	angle: number;
	opacity?: number;
}

export interface EvaluatedWaveEffectParams {
	amplitude: number;
	frequency: number;
	phase: number;
	direction: number;
	opacity?: number;
}

export interface EvaluatedLensEffectParams {
	strength: number;
	radius: number;
	centerX: number;
	centerY: number;
	opacity?: number;
}

export interface TemporalEvaluationContext {
	time: number;
	frameIndex: number;
	fps: number;
	target: ResolvedEffectTarget;
	allEffects?: readonly EffectDefinition[];
	evaluatedParameters?: Map<string, number | RGBA>;
}

export type EffectDefinition =
	| {
			id: string;
			type: "blur";
			enabled: boolean;
			opacity: number;
			target?: EffectTarget;
			parameters: BlurEffectParams;
			transform?: Transform;
	  }
	| {
			id: string;
			type: "glow";
			enabled: boolean;
			opacity: number;
			target?: EffectTarget;
			parameters: GlowEffectParams;
			transform?: Transform;
	  }
	| {
			id: string;
			type: "color";
			enabled: boolean;
			opacity: number;
			target?: EffectTarget;
			parameters: ColorEffectParams;
			transform?: Transform;
	  }
	| {
			id: string;
			type: "displacement";
			enabled: boolean;
			opacity: number;
			target?: EffectTarget;
			parameters: DisplacementEffectParams;
			transform?: Transform;
	  }
	| {
			id: string;
			type: "wave";
			enabled: boolean;
			opacity: number;
			target?: EffectTarget;
			parameters: WaveEffectParams;
			transform?: Transform;
	  }
	| {
			id: string;
			type: "lens";
			enabled: boolean;
			opacity: number;
			target?: EffectTarget;
			parameters: LensEffectParams;
			transform?: Transform;
	  };

export type ResolvedEffectTarget =
	| {
			type: "layer";
			elementId: string;
			contentIdentity: string;
	  }
	| {
			type: "mask";
			maskId: string;
			source: MaskSource;
			contentIdentity: string;
	  }
	| {
			type: "track";
			trackId: string;
			frameIndex: number;
			source: MaskSource;
			contentIdentity: string;
	  };

export type EvaluatedEffect =
	| {
			id: string;
			type: "blur";
			enabled: boolean;
			opacity: number;
			parameters: EvaluatedBlurEffectParams;
			target: ResolvedEffectTarget;
			semanticHash: string;
	  }
	| {
			id: string;
			type: "glow";
			enabled: boolean;
			opacity: number;
			parameters: EvaluatedGlowEffectParams;
			target: ResolvedEffectTarget;
			semanticHash: string;
	  }
	| {
			id: string;
			type: "color";
			enabled: boolean;
			opacity: number;
			parameters: EvaluatedColorEffectParams;
			target: ResolvedEffectTarget;
			semanticHash: string;
	  }
	| {
			id: string;
			type: "displacement";
			enabled: boolean;
			opacity: number;
			parameters: EvaluatedDisplacementEffectParams;
			target: ResolvedEffectTarget;
			semanticHash: string;
	  }
	| {
			id: string;
			type: "wave";
			enabled: boolean;
			opacity: number;
			parameters: EvaluatedWaveEffectParams;
			target: ResolvedEffectTarget;
			semanticHash: string;
	  }
	| {
			id: string;
			type: "lens";
			enabled: boolean;
			opacity: number;
			parameters: EvaluatedLensEffectParams;
			target: ResolvedEffectTarget;
			semanticHash: string;
	  };

import { PathGeometry } from "../services/renderer/geometry/path";

export type PathGeometryJSON = PathGeometry;

export interface AlphaMask {
	width: number;
	height: number;
	data: Uint8ClampedArray;
	sourceId: string;
	contentHash: string;
}

export type MaskSource =
	| { type: "path"; geometry: PathGeometryJSON }
	| { type: "alpha"; mask: AlphaMask }
	| { type: "tracked"; trackId: string; frameIndex: number };

export type MaskMode = "add" | "subtract" | "intersect" | "exclude";

export interface MaskDefinition {
	id: string;
	source: MaskSource;
	mode: MaskMode;
	inverted: boolean;
	feather: number;
	opacity: number;
	transform?: Transform;
	gapPolicy?: "none" | "hold-last";
}

interface BaseTimelineElement {
	id: string;
	name: string;
	duration: number;
	startTime: number;
	trimStart: number;
	trimEnd: number;
	effect?: string;
	effectStartTime?: number; // In seconds relative to element start
	effectDuration?: number;  // In seconds
	effectSpeed?: number;     // Multiplier (e.g. 1.0)
	animation?: string;
	animationStartTime?: number; // In seconds relative to element start
	animationDuration?: number;  // In seconds
	animationSpeed?: number;     // Multiplier
	animationDirection?: number; // 0: up, 1: down, 2: left, 3: right
	filter?: string | null;
	blendMode?: string;
	adjustments?: {
		brightness?: number;
		contrast?: number;
		saturation?: number;
		hueRotate?: number;
		blur?: number;
		opacity?: number;
	} | null;
	masks?: MaskDefinition[];
	filters?: VideoFilter[];
	effects?: (EffectSpec | EffectDefinition)[];
}

export interface VideoElement extends BaseTimelineElement {
	type: "video";
	mediaId: string;
	muted?: boolean;
	hidden?: boolean;
	transform: Transform;
	opacity: number;
	playbackRate?: number;
	reversed?: boolean;
	removeBackground?: boolean;
}

export interface ImageElement extends BaseTimelineElement {
	type: "image";
	mediaId: string;
	hidden?: boolean;
	transform: Transform;
	opacity: number;
	removeBackground?: boolean;
}

export interface TextStroke {
	color: string;
	width: number;
}

export interface TextShadow {
	color: string;
	offsetX: number;
	offsetY: number;
	blur: number;
}

export interface TextElement extends BaseTimelineElement {
	type: "text";
	content: string;
	fontSize: number;
	fontFamily: string;
	fontWeight?: "normal" | "bold" | string | number;
	fontStyle?: "normal" | "italic" | string;
	letterSpacing?: number;
	lineHeight?: number;
	kinetic?: {
		scope: "line" | "word" | "character";
		type: "fade-stagger" | "slide" | "scale" | "reveal" | "bounce";
		staggerDelay: number;
	};
	direction?: "ltr" | "rtl" | "auto";
	color: string;
	backgroundColor: string;
	textAlign: "left" | "center" | "right";
	textDecoration?: "none" | "underline" | "line-through";
	hidden?: boolean;
	transform: Transform;
	opacity: number;
	stroke?: TextStroke;
	shadow?: TextShadow;
	boxWidth?: number;
	backgroundBorderRadius?: number;
	backgroundOpacity?: number;
	backgroundPaddingX?: number;
	backgroundPaddingY?: number;
}

export interface StickerElement extends BaseTimelineElement {
	type: "sticker";
	iconName: string;
	hidden?: boolean;
	transform: Transform;
	color?: string;
}

export type ShapeGeometrySpec = 
	| { type: "line"; x1: number; y1: number; x2: number; y2: number }
	| { type: "rect"; width: number; height: number }
	| { type: "ellipse"; radiusX: number; radiusY: number }
	| { type: "polygon"; points: {x: number, y: number}[] };

export interface ShapeElement extends BaseTimelineElement {
	type: "shape";
	hidden?: boolean;
	transform: Transform;
	opacity: number;
	geometry: ShapeGeometrySpec;
	fill?: { color: string; opacity?: number };
	stroke?: { color: string; width: number; lineCap?: "butt" | "round" | "square"; lineJoin?: "miter" | "round" | "bevel" };
	trim?: { start: number; end: number; offset?: number };
	shapeAnimation?: {
		trimStart?: KeyframeTrack;
		trimEnd?: KeyframeTrack;
		trimOffset?: KeyframeTrack;
		strokeWidth?: KeyframeTrack;
		fillOpacity?: KeyframeTrack;
	};
}

export type TimelineElement =
	| AudioElement
	| VideoElement
	| ImageElement
	| TextElement
	| StickerElement
	| ShapeElement;

export type ElementType = TimelineElement["type"];

export type CreateUploadAudioElement = Omit<UploadAudioElement, "id">;
export type CreateLibraryAudioElement = Omit<LibraryAudioElement, "id">;
export type CreateAudioElement =
	| CreateUploadAudioElement
	| CreateLibraryAudioElement;
export type CreateVideoElement = Omit<VideoElement, "id">;
export type CreateImageElement = Omit<ImageElement, "id">;
export type CreateTextElement = Omit<TextElement, "id">;
export type CreateStickerElement = Omit<StickerElement, "id">;
export type CreateShapeElement = Omit<ShapeElement, "id">;
export type CreateTimelineElement =
	| CreateAudioElement
	| CreateVideoElement
	| CreateImageElement
	| CreateTextElement
	| CreateStickerElement
	| CreateShapeElement;

// ---- Drag State ----

export interface ElementDragState {
	isDragging: boolean;
	elementId: string | null;
	trackId: string | null;
	startMouseX: number;
	startMouseY: number;
	startElementTime: number;
	clickOffsetTime: number;
	currentTime: number;
	currentMouseY: number;
}

export interface DropTarget {
	trackIndex: number;
	isNewTrack: boolean;
	insertPosition: "above" | "below" | null;
	xPosition: number;
}

export interface ComputeDropTargetParams {
	elementType: ElementType;
	mouseX: number;
	mouseY: number;
	tracks: TimelineTrack[];
	playheadTime: number;
	isExternalDrop: boolean;
	elementDuration: number;
	pixelsPerSecond: number;
	zoomLevel: number;
	verticalDragDirection?: "up" | "down" | null;
	startTimeOverride?: number;
	excludeElementId?: string;
}

export interface ClipboardItem {
	trackId: string;
	trackType: TrackType;
	element: CreateTimelineElement;
}
