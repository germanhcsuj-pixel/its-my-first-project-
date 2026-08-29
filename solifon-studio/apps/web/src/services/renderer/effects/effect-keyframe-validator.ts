import { AnimatedNumber, AnimatedRGBA } from "../../../types/timeline";
import { EffectTemporalValidator } from "./effect-temporal-validator";

export class EffectKeyframeValidator {
	public static validateNumber(
		effectId: string,
		paramName: string,
		param: AnimatedNumber,
		min?: number,
		max?: number,
		strictlyPositive?: boolean
	): void {
		EffectTemporalValidator.validateNumber(effectId, paramName, param, min, max, strictlyPositive);
	}

	public static validateRGBA(
		effectId: string,
		paramName: string,
		param: AnimatedRGBA
	): void {
		EffectTemporalValidator.validateRGBA(effectId, paramName, param);
	}
}
