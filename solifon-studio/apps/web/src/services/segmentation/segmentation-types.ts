import { AlphaMask } from "@/types/timeline";

export type SegmentationParameters = Record<string, string | number | boolean | null>;

export interface SegmentationInput {
	inputHash: string;
	parameters?: SegmentationParameters;
}

export interface SegmentationInstance {
	id: string;
	label: string;
	confidence: number; // in [0, 1]
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	mask: AlphaMask;
}

export interface SegmentationResult {
	width: number;
	height: number;
	instances: SegmentationInstance[];
	modelId: string;
	modelVersion: string;
	confidence: number;
}
