import { EffectDefinition, EvaluatedEffect, RGBA, AnimatedNumber, AnimatedRGBA, EvaluatedParameterValue, EffectEvaluationInput } from "@/types/timeline";
import { EffectEvaluationContext } from "./effect-types";
import { EffectValidator } from "./effect-validator";
import { evaluateAnimation } from "../animation-engine";
import { EffectParameterGraph } from "./effect-parameter-graph";
import { EffectTemporalValidator } from "./effect-temporal-validator";
import { EffectTemporalEvaluator } from "./effect-temporal-evaluator";

export const EFFECT_SEMANTICS_VERSION = "p3.11-v1";

export class EffectEvaluator {
	public static evaluate(
		effect: EffectDefinition,
		context: EffectEvaluationContext,
		orderIndex: number
	): EvaluatedEffect {
		// 1. Structural validation on definition
		EffectValidator.validate(effect);

		// Validate TemporalEvaluationContext
		if (
			typeof context.fps !== "number" || isNaN(context.fps) || !isFinite(context.fps) || context.fps <= 0 ||
			typeof context.time !== "number" || isNaN(context.time) || !isFinite(context.time) || context.time < 0 ||
			typeof context.frameIndex !== "number" || isNaN(context.frameIndex) || !isFinite(context.frameIndex) || context.frameIndex < 0
		) {
			throw new Error("Invalid TemporalEvaluationContext values");
		}

		// 2. Perform graph resolution of all active parameters (cross-effect/intra-effect)
		let evaluatedMap = context.evaluatedParameters;
		if (!evaluatedMap) {
			evaluatedMap = new Map<string, number | RGBA>();
		}

		if (evaluatedMap.size === 0) {
			const peerEffects = context.allEffects || [effect];
			const graph = new EffectParameterGraph();
			graph.buildGraph(peerEffects);

			// Validate parameters
			for (const peer of peerEffects) {
				this.validateTemporalParams(peer);
			}

			// Topological sorting
			const order = graph.getTopologicalOrder();

			// Evaluate parameters in topological order
			for (const key of order) {
				const node = graph.getNode(key);
				if (!node) continue;
				if (node.type === "number") {
					const val = EffectTemporalEvaluator.evaluateNumber(node.definition as AnimatedNumber, context.time, evaluatedMap);
					this.validateResolvedNumberBounds(node.effectId, node.paramName, val);
					evaluatedMap.set(key, val);
				} else {
					const val = EffectTemporalEvaluator.evaluateRGBA(node.definition as AnimatedRGBA, context.time, evaluatedMap);
					this.validateResolvedRGBABounds(node.effectId, node.paramName, val);
					evaluatedMap.set(key, val);
				}
			}
		}

		// 3. Prepare explicit dependency values for the current effect
		const dependencyValues: EvaluatedParameterValue[] = [];
		const paramNames = this.getParamNamesForEffectType(effect.type);
		if (effect.parameters.opacity) {
			paramNames.push("opacity");
		}

		for (const paramName of paramNames) {
			const key = `${effect.id}.${paramName}`;
			const val = evaluatedMap.get(key);
			if (val !== undefined) {
				dependencyValues.push({
					parameterKey: key,
					type: paramName === "color" ? "color" : "number",
					value: val
				});
			}
		}

		// Prepare EffectEvaluationInput
		const input: EffectEvaluationInput = {
			effect,
			target: context.target,
			time: context.time,
			frameIndex: context.frameIndex,
			dependencyValues
		};

		return this.evaluateWithInput(input, orderIndex);
	}

	public static evaluateWithInput(
		input: EffectEvaluationInput,
		orderIndex: number
	): EvaluatedEffect {
		const effect = input.effect;

		// 1. Evaluate animated opacity if transform property keyframes exist
		let opacity = effect.opacity;
		let transformStr = "";

		if (effect.transform) {
			const anim = evaluateAnimation(
				effect.transform.transformKeyframes,
				effect.transform.propertyKeyframes,
				input.time,
				{
					x: effect.transform.position.x,
					y: effect.transform.position.y,
					scale: effect.transform.scale,
					rotate: effect.transform.rotate
				},
				effect.opacity
			);
			opacity = anim.opacity;
			transformStr = `x:${anim.x}_y:${anim.y}_s:${anim.scale}_r:${anim.rotation}`;
		}

		// Overwrite opacity if explicitly present as a parameter
		const paramOpacity = input.dependencyValues.find(d => d.parameterKey === `${effect.id}.opacity`)?.value;
		if (paramOpacity !== undefined && typeof paramOpacity === "number") {
			opacity = paramOpacity;
		}

		// Validate evaluated opacity
		if (typeof opacity !== "number" || isNaN(opacity) || !isFinite(opacity) || opacity < 0 || opacity > 1) {
			throw new Error(`Evaluated opacity out of bounds: ${opacity}`);
		}

		// 2. Build evaluated parameters
		const getVal = (paramName: string): number | RGBA => {
			const key = `${effect.id}.${paramName}`;
			const found = input.dependencyValues.find(d => d.parameterKey === key);
			if (!found) {
				throw new Error(`Missing evaluated value for parameter: ${key}`);
			}
			return found.value;
		};

		const semanticHash = this.buildHash(input, opacity, orderIndex, transformStr);

		if (effect.type === "blur") {
			const radius = getVal("radius") as number;
			const quality = effect.parameters.quality;
			return {
				id: effect.id,
				type: "blur",
				enabled: effect.enabled,
				opacity,
				parameters: { radius, quality, opacity: paramOpacity !== undefined ? (paramOpacity as number) : undefined },
				target: input.target,
				semanticHash
			};
		} else if (effect.type === "glow") {
			const radius = getVal("radius") as number;
			const intensity = getVal("intensity") as number;
			const color = getVal("color") as RGBA;
			return {
				id: effect.id,
				type: "glow",
				enabled: effect.enabled,
				opacity,
				parameters: { radius, intensity, color, opacity: paramOpacity !== undefined ? (paramOpacity as number) : undefined },
				target: input.target,
				semanticHash
			};
		} else if (effect.type === "color") {
			const brightness = getVal("brightness") as number;
			const contrast = getVal("contrast") as number;
			const saturation = getVal("saturation") as number;
			const hueVal = getVal("hue") as number;
			const hue = ((hueVal % 360) + 360) % 360;
			return {
				id: effect.id,
				type: "color",
				enabled: effect.enabled,
				opacity,
				parameters: { brightness, contrast, saturation, hue, opacity: paramOpacity !== undefined ? (paramOpacity as number) : undefined },
				target: input.target,
				semanticHash
			};
		} else if (effect.type === "displacement") {
			const strength = getVal("strength") as number;
			const scale = getVal("scale") as number;
			const angle = getVal("angle") as number;
			return {
				id: effect.id,
				type: "displacement",
				enabled: effect.enabled,
				opacity,
				parameters: { strength, scale, angle, opacity: paramOpacity !== undefined ? (paramOpacity as number) : undefined },
				target: input.target,
				semanticHash
			};
		} else if (effect.type === "wave") {
			const amplitude = getVal("amplitude") as number;
			const frequency = getVal("frequency") as number;
			const phase = getVal("phase") as number;
			const direction = getVal("direction") as number;
			return {
				id: effect.id,
				type: "wave",
				enabled: effect.enabled,
				opacity,
				parameters: { amplitude, frequency, phase, direction, opacity: paramOpacity !== undefined ? (paramOpacity as number) : undefined },
				target: input.target,
				semanticHash
			};
		} else {
			const strength = getVal("strength") as number;
			const radius = getVal("radius") as number;
			const centerX = getVal("centerX") as number;
			const centerY = getVal("centerY") as number;
			return {
				id: effect.id,
				type: "lens",
				enabled: effect.enabled,
				opacity,
				parameters: { strength, radius, centerX, centerY, opacity: paramOpacity !== undefined ? (paramOpacity as number) : undefined },
				target: input.target,
				semanticHash
			};
		}
	}

	private static buildHash(
		input: EffectEvaluationInput,
		opacity: number,
		orderIndex: number,
		transformStr: string
	): string {
		const effect = input.effect;
		const target = input.target;

		// Deterministically sort and format dependencyValues
		const sortedDeps = [...input.dependencyValues]
			.sort((a, b) => a.parameterKey.localeCompare(b.parameterKey));

		const depValuesStr = sortedDeps.map(d => {
			if (d.type === "color") {
				const c = d.value as RGBA;
				return `${d.parameterKey}:r${c.r}g${c.g}b${c.b}a${c.a}`;
			} else {
				return `${d.parameterKey}:${d.value}`;
			}
		}).join("_");

		const targetId = target.type === "layer" ? "" : effect.id;
		const targetIdentity = `target:${target.type}_id:${targetId}_identity:${target.contentIdentity}`;
		const targetFrame = target.type === "track" ? `_frame:${target.frameIndex}` : "";

		return [
			EFFECT_SEMANTICS_VERSION,
			effect.type,
			effect.id,
			effect.enabled ? "enabled" : "disabled",
			`op:${opacity}`,
			`order:${orderIndex}`,
			depValuesStr,
			targetIdentity + targetFrame,
			transformStr
		].filter(Boolean).join("_");
	}

	private static getParamNamesForEffectType(type: string): string[] {
		if (type === "blur") return ["radius"];
		if (type === "glow") return ["radius", "intensity", "color"];
		if (type === "color") return ["brightness", "contrast", "saturation", "hue"];
		if (type === "displacement") return ["strength", "scale", "angle"];
		if (type === "wave") return ["amplitude", "frequency", "phase", "direction"];
		if (type === "lens") return ["strength", "radius", "centerX", "centerY"];
		return [];
	}

	private static validateTemporalParams(peer: EffectDefinition): void {
		if (peer.type === "blur") {
			EffectTemporalValidator.validateNumber(peer.id, "radius", peer.parameters.radius, 0);
			if (peer.parameters.opacity) {
				EffectTemporalValidator.validateNumber(peer.id, "opacity", peer.parameters.opacity, 0, 1);
			}
		} else if (peer.type === "glow") {
			EffectTemporalValidator.validateNumber(peer.id, "radius", peer.parameters.radius, 0);
			EffectTemporalValidator.validateNumber(peer.id, "intensity", peer.parameters.intensity, 0);
			EffectTemporalValidator.validateRGBA(peer.id, "color", peer.parameters.color);
			if (peer.parameters.opacity) {
				EffectTemporalValidator.validateNumber(peer.id, "opacity", peer.parameters.opacity, 0, 1);
			}
		} else if (peer.type === "color") {
			EffectTemporalValidator.validateNumber(peer.id, "brightness", peer.parameters.brightness, 0);
			EffectTemporalValidator.validateNumber(peer.id, "contrast", peer.parameters.contrast, 0);
			EffectTemporalValidator.validateNumber(peer.id, "saturation", peer.parameters.saturation, 0);
			EffectTemporalValidator.validateNumber(peer.id, "hue", peer.parameters.hue);
			if (peer.parameters.opacity) {
				EffectTemporalValidator.validateNumber(peer.id, "opacity", peer.parameters.opacity, 0, 1);
			}
		} else if (peer.type === "displacement") {
			EffectTemporalValidator.validateNumber(peer.id, "strength", peer.parameters.strength, -1000, 1000);
			EffectTemporalValidator.validateNumber(peer.id, "scale", peer.parameters.scale, 0, 1000, true);
			EffectTemporalValidator.validateNumber(peer.id, "angle", peer.parameters.angle, 0, 360);
			if (peer.parameters.opacity) {
				EffectTemporalValidator.validateNumber(peer.id, "opacity", peer.parameters.opacity, 0, 1);
			}
		} else if (peer.type === "wave") {
			EffectTemporalValidator.validateNumber(peer.id, "amplitude", peer.parameters.amplitude, 0, 1000);
			EffectTemporalValidator.validateNumber(peer.id, "frequency", peer.parameters.frequency, 0, 1000, true);
			EffectTemporalValidator.validateNumber(peer.id, "phase", peer.parameters.phase, -1000, 1000);
			EffectTemporalValidator.validateNumber(peer.id, "direction", peer.parameters.direction, 0, 360);
			if (peer.parameters.opacity) {
				EffectTemporalValidator.validateNumber(peer.id, "opacity", peer.parameters.opacity, 0, 1);
			}
		} else if (peer.type === "lens") {
			EffectTemporalValidator.validateNumber(peer.id, "strength", peer.parameters.strength, -10, 10);
			EffectTemporalValidator.validateNumber(peer.id, "radius", peer.parameters.radius, 0, 10000, true);
			EffectTemporalValidator.validateNumber(peer.id, "centerX", peer.parameters.centerX, -10000, 10000);
			EffectTemporalValidator.validateNumber(peer.id, "centerY", peer.parameters.centerY, -10000, 10000);
			if (peer.parameters.opacity) {
				EffectTemporalValidator.validateNumber(peer.id, "opacity", peer.parameters.opacity, 0, 1);
			}
		}
	}

	private static validateResolvedNumberBounds(effectId: string, paramName: string, val: number): void {
		if (paramName === "opacity") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0, 1);
			return;
		}
		// Blur
		if (paramName === "radius") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0);
		}
		// Glow
		if (paramName === "intensity") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0);
		}
		// Color
		if (paramName === "brightness" || paramName === "contrast" || paramName === "saturation") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0);
		}
		// Displacement
		if (paramName === "strength") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, -1000, 1000);
		} else if (paramName === "scale") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0, 1000, true);
		} else if (paramName === "angle") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0, 360);
		}
		// Wave
		if (paramName === "amplitude") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0, 1000);
		} else if (paramName === "frequency") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0, 1000, true);
		} else if (paramName === "phase") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, -1000, 1000);
		} else if (paramName === "direction") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0, 360);
		}
		// Lens
		if (paramName === "strength") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, -10, 10);
		} else if (paramName === "radius") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, 0, 10000, true);
		} else if (paramName === "centerX" || paramName === "centerY") {
			EffectTemporalValidator.validateResolvedBounds(effectId, paramName, val, -10000, 10000);
		}
	}

	private static validateResolvedRGBABounds(effectId: string, paramName: string, val: RGBA): void {
		if (paramName === "color") {
			EffectTemporalValidator.validateColor(effectId, paramName, -1, val);
		}
	}
}
