import type { TScene, KeyframeTrack } from "./timeline";
import type { AgentMessage } from "@/lib/ai/agent/types";

export type TBackground =
	| {
			type: "color";
			color: string;
	  }
	| {
			type: "blur";
			blurIntensity: number;
	  };

export interface TCanvasSize {
	width: number;
	height: number;
}

export interface TProjectMetadata {
	id: string;
	name: string;
	thumbnail?: string;
	duration: number;
	createdAt: Date;
	updatedAt: Date;
}

export type ProceduralShake = {
	intensity: number;
	frequency: number;
	seed: number;
	decay: number;
};

export interface VirtualCamera {
	x?: KeyframeTrack;
	y?: KeyframeTrack;
	scale?: KeyframeTrack;
	rotation?: KeyframeTrack;
	shake?: ProceduralShake; // Intensity of beat shake
}

export interface TProjectSettings {
	fps: number;
	canvasSize: TCanvasSize;
	originalCanvasSize?: TCanvasSize | null;
	background: TBackground;
	camera?: VirtualCamera;
}

export interface TTimelineViewState {
	zoomLevel: number;
	scrollLeft: number;
	playheadTime: number;
}

export interface TProject {
	metadata: TProjectMetadata;
	scenes: TScene[];
	currentSceneId: string;
	settings: TProjectSettings;
	version: number;
	timelineViewState?: TTimelineViewState;
	agentMessages?: AgentMessage[];
}

export type TProjectSortKey = "createdAt" | "updatedAt" | "name" | "duration";
export type TSortOrder = "asc" | "desc";
export type TProjectSortOption = `${TProjectSortKey}-${TSortOrder}`;
