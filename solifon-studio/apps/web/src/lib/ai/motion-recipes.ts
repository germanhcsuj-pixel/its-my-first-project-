import type { TransformKeyframes, PropertyKeyframes, Keyframe, Easing, EffectSpec } from "@/types/timeline";
import type { ProceduralShake } from "@/types/project";

export type MotionRecipeId = 
	| "NONE"
	| "IMPACT_ZOOM"
	| "BEAT_SHAKE"
	| "SMOOTH_PUSH"
	| "FAST_PAN_LEFT"
	| "FAST_PAN_RIGHT"
	| "FLASH_IMPACT"
	| "IMPACT_GLOW";

export interface ResolvedRecipe {
	transformKeyframes?: TransformKeyframes;
	propertyKeyframes?: PropertyKeyframes;
	cameraShake?: ProceduralShake;
	effects?: EffectSpec[];
}

export function resolveMotionRecipe(recipeId: MotionRecipeId, duration: number = 1.0, seed: number = 12345): ResolvedRecipe {
	switch (recipeId) {
		case "IMPACT_ZOOM":
			return {
				transformKeyframes: {
					scale: [
						{ time: 0, value: 1.0, easing: { type: "ease-out" } },
						{ time: 0.1, value: 1.25, easing: { type: "ease-in-out" } },
						{ time: Math.min(0.5, duration), value: 1.05, easing: { type: "linear" } },
						{ time: duration, value: 1.0, easing: { type: "ease-out" } }
					]
				}
			};

		case "IMPACT_GLOW":
			return {
				transformKeyframes: {
					scale: [
						{ time: 0, value: 1.0, easing: { type: "ease-out" } },
						{ time: 0.1, value: 1.25, easing: { type: "ease-in-out" } },
						{ time: Math.min(0.5, duration), value: 1.05, easing: { type: "linear" } },
						{ time: duration, value: 1.0, easing: { type: "ease-out" } }
					]
				},
				effects: [
					{ type: "motion-blur", samples: 4, shutterAngle: 180 },
					{ type: "glow", radius: 20, intensity: 1.5, threshold: 0.5, blendMode: "add" }
				]
			};

		case "BEAT_SHAKE":
			return {
				cameraShake: {
					intensity: 15,
					frequency: 4, // 4 shakes per second
					seed: seed, // Deterministic seed passed from applyPlan
					decay: 0.85
				}
			};

		case "SMOOTH_PUSH":
			return {
				transformKeyframes: {
					scale: [
						{ time: 0, value: 1.0, easing: { type: "linear" } },
						{ time: duration, value: 1.15, easing: { type: "linear" } }
					]
				}
			};

		case "FAST_PAN_LEFT":
			return {
				transformKeyframes: {
					x: [
						{ time: 0, value: 0, easing: { type: "ease-in" } },
						{ time: Math.min(0.3, duration), value: -100, easing: { type: "ease-out" } },
						{ time: duration, value: -100, easing: { type: "linear" } }
					]
				}
			};

		case "FAST_PAN_RIGHT":
			return {
				transformKeyframes: {
					x: [
						{ time: 0, value: 0, easing: { type: "ease-in" } },
						{ time: Math.min(0.3, duration), value: 100, easing: { type: "ease-out" } },
						{ time: duration, value: 100, easing: { type: "linear" } }
					]
				}
			};

		case "FLASH_IMPACT":
			return {
				propertyKeyframes: {
					opacity: [
						{ time: 0, value: 1.0, easing: { type: "linear" } },
						{ time: 0.05, value: 2.0, easing: { type: "ease-out" } }, // Assuming opacity > 1 acts as flash/brightness in renderer if handled, but since globalAlpha clamps to 1, we might need a brightness track. For now, we drop opacity to 0 and back to simulate a strobe if needed, or 0.5. Let's do a strobe:
						{ time: 0.1, value: 0.5, easing: { type: "linear" } },
						{ time: 0.2, value: 1.0, easing: { type: "linear" } }
					]
				}
			};

		case "NONE":
		default:
			return {};
	}
}
