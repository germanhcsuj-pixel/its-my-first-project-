import { ResolvedEffectTarget, EffectDefinition, RGBA } from "@/types/timeline";

export interface EffectEvaluationContext {
	time: number;
	frameIndex: number;
	fps: number;
	target: ResolvedEffectTarget;
	allEffects?: readonly EffectDefinition[];
	evaluatedParameters?: Map<string, number | RGBA>;
}
