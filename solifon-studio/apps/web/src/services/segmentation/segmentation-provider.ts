import { AlphaMask } from "@/types/timeline";
import { SegmentationInput, SegmentationResult, SegmentationInstance } from "./segmentation-types";

export interface SegmentationProvider {
	modelId: string;
	modelVersion: string;
	segment(input: SegmentationInput): Promise<SegmentationResult>;
}

// Simple deterministic hash helper (Fowler-Noll-Vo 1a 32-bit)
function fnv1a(str: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}
	return hash >>> 0;
}

export class MockSegmentationProvider implements SegmentationProvider {
	public modelId = "mock-segmenter";
	public modelVersion = "1.0.0";

	constructor(modelVersion?: string) {
		if (modelVersion) {
			this.modelVersion = modelVersion;
		}
	}

	public async segment(input: SegmentationInput): Promise<SegmentationResult> {
		const width = 100;
		const height = 100;
		
		// Sort parameters canonically to ensure determinism
		const paramStr = input.parameters 
			? Object.keys(input.parameters).sort().map(k => `${k}:${input.parameters![k]}`).join(",")
			: "";
		const combinedKey = `${input.inputHash}_${this.modelId}_${this.modelVersion}_${paramStr}`;
		const hashVal = fnv1a(combinedKey);

		// Determine a deterministic circle center and radius using hashVal
		const cx = Math.round(((hashVal % 40) + 30) / 100 * width); // 30% to 70% range
		const cy = Math.round((((hashVal >> 5) % 40) + 30) / 100 * height);
		const r = Math.round(width * 0.25); // 25px radius

		const data = new Uint8ClampedArray(width * height);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
				if (dist <= r) {
					// Add some fractional values at the edge
					const diff = r - dist;
					if (diff < 3) {
						data[y * width + x] = Math.round((diff / 3) * 255);
					} else {
						data[y * width + x] = 255;
					}
				} else {
					data[y * width + x] = 0;
				}
			}
		}

		// Content hash based on the generated data
		const dataHash = fnv1a(data.join(",")).toString(16);

		const mask: AlphaMask = {
			width,
			height,
			data,
			sourceId: `mock-source-${input.inputHash}`,
			contentHash: `mock-content-${dataHash}`
		};

		const instance: SegmentationInstance = {
			id: "mock-instance-1",
			label: "person",
			confidence: 0.95,
			bounds: { x: cx - r, y: cy - r, width: r * 2, height: r * 2 },
			mask
		};

		return {
			width,
			height,
			instances: [instance],
			modelId: this.modelId,
			modelVersion: this.modelVersion,
			confidence: 0.95
		};
	}
}
