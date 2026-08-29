import { EffectDefinition, ParameterKey, AnimatedNumber, AnimatedRGBA, TemporalParameter } from "../../../types/timeline";
import { EffectTemporalValidator } from "./effect-temporal-validator";

export interface GraphNode {
	key: ParameterKey; // effectId.parameterName
	effectId: string;
	paramName: string;
	type: "number" | "color";
	definition: AnimatedNumber | AnimatedRGBA;
	dependencies: ParameterKey[];
}

export interface GraphSnapshot {
	nodes: ParameterKey[];
	edges: { from: ParameterKey; to: ParameterKey }[];
	topologicalOrder: ParameterKey[];
}

export class EffectParameterGraph {
	private nodes: Map<ParameterKey, GraphNode> = new Map();

	public buildGraph(effects: readonly EffectDefinition[]): void {
		this.nodes.clear();

		// 1. Discover all nodes and register them
		for (const effect of effects) {
			if (!effect.id) continue;

			if (effect.type === "blur") {
				const params = effect.parameters;
				this.registerNode(effect.id, "radius", "number", params.radius);
				if (params.opacity) {
					this.registerNode(effect.id, "opacity", "number", params.opacity);
				}
			} else if (effect.type === "glow") {
				const params = effect.parameters;
				this.registerNode(effect.id, "radius", "number", params.radius);
				this.registerNode(effect.id, "intensity", "number", params.intensity);
				this.registerNode(effect.id, "color", "color", params.color);
				if (params.opacity) {
					this.registerNode(effect.id, "opacity", "number", params.opacity);
				}
			} else if (effect.type === "color") {
				const params = effect.parameters;
				this.registerNode(effect.id, "brightness", "number", params.brightness);
				this.registerNode(effect.id, "contrast", "number", params.contrast);
				this.registerNode(effect.id, "saturation", "number", params.saturation);
				this.registerNode(effect.id, "hue", "number", params.hue);
				if (params.opacity) {
					this.registerNode(effect.id, "opacity", "number", params.opacity);
				}
			} else if (effect.type === "displacement") {
				const params = effect.parameters;
				this.registerNode(effect.id, "strength", "number", params.strength);
				this.registerNode(effect.id, "scale", "number", params.scale);
				this.registerNode(effect.id, "angle", "number", params.angle);
				if (params.opacity) {
					this.registerNode(effect.id, "opacity", "number", params.opacity);
				}
			} else if (effect.type === "wave") {
				const params = effect.parameters;
				this.registerNode(effect.id, "amplitude", "number", params.amplitude);
				this.registerNode(effect.id, "frequency", "number", params.frequency);
				this.registerNode(effect.id, "phase", "number", params.phase);
				this.registerNode(effect.id, "direction", "number", params.direction);
				if (params.opacity) {
					this.registerNode(effect.id, "opacity", "number", params.opacity);
				}
			} else if (effect.type === "lens") {
				const params = effect.parameters;
				this.registerNode(effect.id, "strength", "number", params.strength);
				this.registerNode(effect.id, "radius", "number", params.radius);
				this.registerNode(effect.id, "centerX", "number", params.centerX);
				this.registerNode(effect.id, "centerY", "number", params.centerY);
				if (params.opacity) {
					this.registerNode(effect.id, "opacity", "number", params.opacity);
				}
			}
		}

		// 2. Lexicographically sort node keys
		const sortedKeys = Array.from(this.nodes.keys()).sort();

		// 3. Build edges and check references / type compatibility
		for (const key of sortedKeys) {
			const node = this.nodes.get(key);
			if (!node) continue;

			const def = node.definition;
			if (def && def.mode === "reference") {
				const refKey = def.parameterId;
				EffectTemporalValidator.validateParameterKey(refKey);

				const refNode = this.nodes.get(refKey);
				if (!refNode) {
					throw new Error(`[${node.effectId}] Parameter '${node.paramName}' references unknown parameter '${refKey}'`);
				}

				// Check type compatibility
				if (node.type !== refNode.type) {
					throw new Error(`[${node.effectId}] Parameter '${node.paramName}' (type: ${node.type}) is incompatible with referenced parameter '${refKey}' (type: ${refNode.type})`);
				}

				node.dependencies.push(refKey);
			}
		}

		// 4. Perform cycle detection and topological sorting
		this.detectCyclesAndSort();
	}

	private registerNode(effectId: string, paramName: string, type: "number" | "color", definition: AnimatedNumber | AnimatedRGBA): void {
		const key = `${effectId}.${paramName}`;
		if (this.nodes.has(key)) {
			throw new Error(`Duplicate parameter canonical identity: ${key}`);
		}
		this.nodes.set(key, {
			key,
			effectId,
			paramName,
			type,
			definition,
			dependencies: []
		});
	}

	private detectCyclesAndSort(): void {
		const keys = Array.from(this.nodes.keys()).sort();
		const visited = new Set<ParameterKey>();
		const recStack: ParameterKey[] = [];
		let cyclePath: ParameterKey[] = [];

		const dfs = (key: ParameterKey): boolean => {
			visited.add(key);
			recStack.push(key);

			const node = this.nodes.get(key);
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
	}

	public getTopologicalOrder(): ParameterKey[] {
		// Implement stable Kahn's algorithm
		const keys = Array.from(this.nodes.keys()).sort();
		const inDegrees = new Map<ParameterKey, number>();
		const dependents = new Map<ParameterKey, ParameterKey[]>();

		for (const key of keys) {
			inDegrees.set(key, 0);
			dependents.set(key, []);
		}

		for (const key of keys) {
			const node = this.nodes.get(key);
			if (!node) continue;
			for (const dep of node.dependencies) {
				inDegrees.set(key, (inDegrees.get(key) || 0) + 1);
				const depsOfDep = dependents.get(dep) || [];
				depsOfDep.push(key);
				dependents.set(dep, depsOfDep);
			}
		}

		// Find initial in-degree 0 nodes, sort alphabetically
		const queue = keys.filter(k => (inDegrees.get(k) || 0) === 0).sort();
		const topologicalOrder: ParameterKey[] = [];

		while (queue.length > 0) {
			// Ensure stable choices by re-sorting the queue after any insertion, or simply choosing the lexicographically smallest
			queue.sort();
			const u = queue.shift();
			if (!u) break;
			topologicalOrder.push(u);

			const neighbors = dependents.get(u) || [];
			for (const v of neighbors) {
				const newInDegree = (inDegrees.get(v) || 0) - 1;
				inDegrees.set(v, newInDegree);
				if (newInDegree === 0) {
					queue.push(v);
				}
			}
		}

		return topologicalOrder;
	}

	public getSnapshot(): GraphSnapshot {
		const sortedNodes = Array.from(this.nodes.keys()).sort();
		const edges: { from: ParameterKey; to: ParameterKey }[] = [];

		for (const key of sortedNodes) {
			const node = this.nodes.get(key);
			if (!node) continue;
			// Sort dependencies to ensure deterministic edge order
			const sortedDeps = [...node.dependencies].sort();
			for (const dep of sortedDeps) {
				edges.push({ from: dep, to: key });
			}
		}

		return {
			nodes: sortedNodes,
			edges,
			topologicalOrder: this.getTopologicalOrder()
		};
	}

	public getNode(key: ParameterKey): GraphNode | undefined {
		return this.nodes.get(key);
	}
}
