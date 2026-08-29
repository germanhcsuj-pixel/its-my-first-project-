import { MaskSource } from "@/types/timeline";
import { SegmentationResult, SegmentationInstance } from "./segmentation-types";

export class SegmentationNormalizer {
	/**
	 * Validates the structure and data of a SegmentationResult.
	 * Throws an Error if anything is malformed.
	 */
	public static validate(result: SegmentationResult): void {
		if (!result) {
			throw new Error("Segmentation result is null or undefined");
		}
		if (result.width <= 0 || result.height <= 0) {
			throw new Error(`Invalid dimensions: width=${result.width}, height=${result.height}`);
		}
		if (result.confidence < 0 || result.confidence > 1) {
			throw new Error(`Invalid overall confidence: ${result.confidence}. Must be in [0, 1]`);
		}
		if (!Array.isArray(result.instances)) {
			throw new Error("instances must be an array");
		}

		for (const instance of result.instances) {
			this.validateInstance(instance);
		}
	}

	private static validateInstance(instance: SegmentationInstance): void {
		if (!instance.id) {
			throw new Error("Instance id is missing");
		}
		if (instance.confidence < 0 || instance.confidence > 1) {
			throw new Error(`Instance ${instance.id} confidence ${instance.confidence} is out of bounds [0, 1]`);
		}
		if (!instance.bounds || 
			instance.bounds.width <= 0 || 
			instance.bounds.height <= 0) {
			throw new Error(`Instance ${instance.id} has invalid bounds`);
		}
		
		const mask = instance.mask;
		if (!mask) {
			throw new Error(`Instance ${instance.id} has no mask`);
		}
		if (mask.width <= 0 || mask.height <= 0) {
			throw new Error(`Instance ${instance.id} mask has invalid dimensions: ${mask.width}x${mask.height}`);
		}
		if (!(mask.data instanceof Uint8ClampedArray)) {
			throw new Error(`Instance ${instance.id} mask data is not a Uint8ClampedArray`);
		}
		if (mask.data.length !== mask.width * mask.height) {
			throw new Error(`Instance ${instance.id} mask data length ${mask.data.length} does not match expected length ${mask.width * mask.height}`);
		}

		// Strictly validate alpha values [0, 255] and reject if any floats are mixed (in Uint8ClampedArray they are auto-coerced, 
		// but we still want to make sure it's constructed correctly and there is exactly one storage representation).
		for (let i = 0; i < mask.data.length; i++) {
			const val = mask.data[i];
			if (val < 0 || val > 255 || !Number.isInteger(val)) {
				throw new Error(`Instance ${instance.id} mask contains invalid alpha value: ${val}`);
			}
		}

		if (!mask.sourceId) {
			throw new Error(`Instance ${instance.id} mask is missing sourceId`);
		}
		if (!mask.contentHash) {
			throw new Error(`Instance ${instance.id} mask is missing contentHash`);
		}
	}

	/**
	 * Normalizes a validated SegmentationInstance into a MaskSource.
	 */
	public static normalizeToMaskSource(instance: SegmentationInstance): MaskSource {
		// Verify structural integrity first
		this.validateInstance(instance);
		
		return {
			type: "alpha",
			mask: instance.mask
		};
	}
}
