import { MaskDefinition, MaskMode } from "@/types/timeline";
import { evaluateAnimation, type AnimationState } from "../animation-engine";
import { PathGeometry } from "../geometry/path";

export interface EvaluatedMask {
	id: string;
	mode: MaskMode;
	inverted: boolean;
	feather: number;
	opacity: number;
	geometryHash: string; // Used generally as content identity here
	animState: AnimationState;
	semanticHash: string;
	original: MaskDefinition;
}

export class MaskEvaluator {
	/**
	 * Computes the semantic state of the mask for a given time t.
	 */
	public static evaluate(mask: MaskDefinition, time: number): EvaluatedMask {
		const animState = evaluateAnimation(
			mask.transform?.transformKeyframes,
			mask.transform?.propertyKeyframes,
			time,
			{
				x: mask.transform?.position?.x ?? 0,
				y: mask.transform?.position?.y ?? 0,
				scale: mask.transform?.scale ?? 1,
				rotate: mask.transform?.rotate ?? 0
			},
			mask.opacity ?? 1
		);

		// Normalize feather
		const feather = Math.max(0, mask.feather || 0);

		// Evaluate source content identity & dimensions
		let typeStr = "";
		let contentHash = "";
		let width = 0;
		let height = 0;

		if (mask.source.type === "path") {
			typeStr = "path";
			contentHash = JSON.stringify(mask.source.geometry);
		} else if (mask.source.type === "alpha") {
			typeStr = "alpha";
			contentHash = mask.source.mask.contentHash;
			width = mask.source.mask.width;
			height = mask.source.mask.height;
		} else {
			throw new Error("Tracked mask must be resolved before evaluation");
		}

		// REQUIRED CHANGE 6: Semantic identity must strictly include:
		// source.type, contentHash, width, height, evaluated transform, feather, opacity, inverted
		const semanticHash = `type:${typeStr}_hash:${contentHash}_w:${width}_h:${height}_x:${animState.x}_y:${animState.y}_s:${animState.scale}_r:${animState.rotation}_f:${feather}_op:${animState.opacity}_inv:${mask.inverted}`;

		return {
			id: mask.id,
			mode: mask.mode,
			inverted: mask.inverted,
			feather,
			opacity: animState.opacity,
			geometryHash: contentHash,
			animState,
			semanticHash,
			original: mask
		};
	}

	/**
	 * Check if mask is static (no keyframes).
	 */
	public static isStatic(mask: MaskDefinition): boolean {
		if (mask.transform?.transformKeyframes) {
			const tf = mask.transform.transformKeyframes;
			if (tf.x && tf.x.length > 1) return false;
			if (tf.y && tf.y.length > 1) return false;
			if (tf.scale && tf.scale.length > 1) return false;
			if (tf.rotation && tf.rotation.length > 1) return false;
		}
		if (mask.transform?.propertyKeyframes) {
			const pk = mask.transform.propertyKeyframes;
			if (pk.opacity && pk.opacity.length > 1) return false;
		}
		return true;
	}
}
