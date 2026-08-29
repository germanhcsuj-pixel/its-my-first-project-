import { TrackingResult, TrackingParameters } from "./tracking-types";

export class TrackingCache {
	private static cache = new Map<string, TrackingResult>();

	public static canonicalizeParams(params?: TrackingParameters): string {
		if (!params) return "";
		const keys = Object.keys(params).sort();
		const parts = keys.map(key => {
			const val = params[key];
			if (val === null) return `${key}:null`;
			return `${key}:${val.toString()}`;
		});
		return parts.join("|");
	}

	public static generateKey(
		inputHash: string,
		modelId: string,
		modelVersion: string,
		parameters?: TrackingParameters
	): string {
		const paramPart = this.canonicalizeParams(parameters);
		return `input:${inputHash}_model:${modelId}_ver:${modelVersion}_params:[${paramPart}]`;
	}

	public static get(
		inputHash: string,
		modelId: string,
		modelVersion: string,
		parameters?: TrackingParameters
	): TrackingResult | null {
		const key = this.generateKey(inputHash, modelId, modelVersion, parameters);
		return this.cache.get(key) || null;
	}

	public static set(
		inputHash: string,
		modelId: string,
		modelVersion: string,
		parameters: TrackingParameters | undefined,
		result: TrackingResult
	): void {
		const key = this.generateKey(inputHash, modelId, modelVersion, parameters);
		this.cache.set(key, result);
	}

	public static clear(): void {
		this.cache.clear();
	}

	public static size(): number {
		return this.cache.size;
	}
}
