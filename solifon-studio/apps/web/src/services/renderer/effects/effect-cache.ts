import { EvaluatedEffect } from "@/types/timeline";
import { EFFECT_SEMANTICS_VERSION } from "./effect-evaluator";

export class EffectCache {
	private static cache = new Map<string, EvaluatedEffect>();

	public static get(semanticHash: string): EvaluatedEffect | null {
		const key = EFFECT_SEMANTICS_VERSION + "_" + semanticHash;
		return this.cache.get(key) || null;
	}

	public static set(semanticHash: string, evaluated: EvaluatedEffect): void {
		const key = EFFECT_SEMANTICS_VERSION + "_" + semanticHash;
		this.cache.set(key, evaluated);
	}

	public static clear(): void {
		this.cache.clear();
	}
}
