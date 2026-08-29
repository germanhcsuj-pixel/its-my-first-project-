import { RGBA } from "../../../types/timeline";

export interface RefKeyframe<T> {
	time: number;
	value: T;
}

export type RefParameter<T> =
	| { mode: "static"; value: T }
	| { mode: "keyframes"; interpolation: "step" | "linear"; keyframes: RefKeyframe<T>[] }
	| { mode: "reference"; parameterId: string; scale?: number; offset?: number };

export interface RefNode {
	key: string;
	type: "number" | "color";
	definition: RefParameter<number> | RefParameter<RGBA>;
	dependencies: string[];
}

export class EffectTemporalReference {
	public static evaluateNumber(param: RefParameter<number>, t: number, resolved: Map<string, number | RGBA>): number {
		if (param.mode === "static") {
			return param.value;
		}
		if (param.mode === "keyframes") {
			const kfs = param.keyframes;
			if (!kfs || kfs.length === 0) throw new Error("empty keyframes");
			if (t <= kfs[0].time) return kfs[0].value;
			if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
			let k0 = kfs[0];
			let k1 = kfs[1];
			for (let i = 0; i < kfs.length - 1; i++) {
				if (t >= kfs[i].time && t <= kfs[i + 1].time) {
					k0 = kfs[i];
					k1 = kfs[i + 1];
					break;
				}
			}
			if (param.interpolation === "step") return k0.value;
			const den = k1.time - k0.time;
			if (den === 0) return k0.value;
			const u = (t - k0.time) / den;
			return k0.value + (k1.value - k0.value) * u;
		}
		if (param.mode === "reference") {
			const val = resolved.get(param.parameterId);
			if (val === undefined) throw new Error(`dep not found: ${param.parameterId}`);
			if (typeof val !== "number") throw new Error(`type mismatch`);
			const scale = param.scale !== undefined ? param.scale : 1;
			const offset = param.offset !== undefined ? param.offset : 0;
			return val * scale + offset;
		}
		throw new Error("unknown mode");
	}

	public static evaluateRGBA(param: RefParameter<RGBA>, t: number, resolved: Map<string, number | RGBA>): RGBA {
		if (param.mode === "static") {
			return { ...param.value };
		}
		if (param.mode === "keyframes") {
			const kfs = param.keyframes;
			if (!kfs || kfs.length === 0) throw new Error("empty keyframes");
			if (t <= kfs[0].time) return { ...kfs[0].value };
			if (t >= kfs[kfs.length - 1].time) return { ...kfs[kfs.length - 1].value };
			let k0 = kfs[0];
			let k1 = kfs[1];
			for (let i = 0; i < kfs.length - 1; i++) {
				if (t >= kfs[i].time && t <= kfs[i + 1].time) {
					k0 = kfs[i];
					k1 = kfs[i + 1];
					break;
				}
			}
			if (param.interpolation === "step") return { ...k0.value };
			const den = k1.time - k0.time;
			if (den === 0) return { ...k0.value };
			const u = (t - k0.time) / den;
			return {
				r: k0.value.r + (k1.value.r - k0.value.r) * u,
				g: k0.value.g + (k1.value.g - k0.value.g) * u,
				b: k0.value.b + (k1.value.b - k0.value.b) * u,
				a: k0.value.a + (k1.value.a - k0.value.a) * u
			};
		}
		if (param.mode === "reference") {
			const val = resolved.get(param.parameterId);
			if (val === undefined) throw new Error(`dep not found: ${param.parameterId}`);
			if (typeof val === "number") throw new Error(`type mismatch`);
			return { ...val };
		}
		throw new Error("unknown mode");
	}

	public static resolveAll(
		nodes: Map<string, RefNode>,
		t: number
	): Map<string, number | RGBA> {
		const keys = Array.from(nodes.keys()).sort();
		const visited = new Set<string>();
		const recStack: string[] = [];
		let cyclePath: string[] = [];

		const dfs = (key: string): boolean => {
			visited.add(key);
			recStack.push(key);

			const node = nodes.get(key);
			if (node) {
				const sortedDeps = [...node.dependencies].sort();
				for (const dep of sortedDeps) {
					if (!visited.has(dep)) {
						if (dfs(dep)) return true;
					} else if (recStack.includes(dep)) {
						const idx = recStack.indexOf(dep);
						cyclePath = recStack.slice(idx);
						cyclePath.push(dep);
						return true;
					}
				}
			}

			recStack.pop();
			return false;
		};

		for (const key of keys) {
			if (!visited.has(key)) {
				if (dfs(key)) {
					const pathStr = cyclePath.join(" -> ");
					throw new Error(`P3.11_PARAMETER_CYCLE: ${pathStr}`);
				}
			}
		}

		const inDegrees = new Map<string, number>();
		const dependents = new Map<string, string[]>();

		for (const key of keys) {
			inDegrees.set(key, 0);
			dependents.set(key, []);
		}

		for (const key of keys) {
			const node = nodes.get(key);
			if (!node) continue;
			for (const dep of node.dependencies) {
				inDegrees.set(key, (inDegrees.get(key) || 0) + 1);
				const list = dependents.get(dep) || [];
				list.push(key);
				dependents.set(dep, list);
			}
		}

		const queue = keys.filter(k => (inDegrees.get(k) || 0) === 0).sort();
		const order: string[] = [];

		while (queue.length > 0) {
			queue.sort();
			const u = queue.shift();
			if (!u) break;
			order.push(u);

			const neighbors = dependents.get(u) || [];
			for (const v of neighbors) {
				const newDeg = (inDegrees.get(v) || 0) - 1;
				inDegrees.set(v, newDeg);
				if (newDeg === 0) {
					queue.push(v);
				}
			}
		}

		const resolved = new Map<string, number | RGBA>();
		for (const key of order) {
			const node = nodes.get(key);
			if (!node) continue;
			if (node.type === "number") {
				const val = this.evaluateNumber(node.definition as RefParameter<number>, t, resolved);
				resolved.set(key, val);
			} else {
				const val = this.evaluateRGBA(node.definition as RefParameter<RGBA>, t, resolved);
				resolved.set(key, val);
			}
		}

		return resolved;
	}
}
