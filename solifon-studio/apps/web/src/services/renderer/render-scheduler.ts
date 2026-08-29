import type { BaseNode } from "./nodes/base-node";
import { RenderTarget } from "./render-target";
import { VisualNode } from "./nodes/visual-node";
import { evaluateAnimation } from "./animation-engine";
import { MotionBlurEffect } from "./effects/motion-blur-effect";

export type SchedulerMetrics = {
	staticHits: number;
	frameHits: number;
	misses: number;
	evictions: number;
	temporalReused: number;
	renderedSamples: number;
	cacheMemoryBytes: number;
	peakMemoryBytes: number;
};

type CacheEntry = {
	hash: string;
	target: RenderTarget;
	lastUsedTime: number;
	sizeBytes: number;
};

export class RenderScheduler {
	private maxCacheBytes: number;
	private maxCacheEntries: number;
	private currentBytes: number = 0;
	private peakBytes: number = 0;
	private cache: Map<string, CacheEntry> = new Map();
	// nodeId -> Set of cache hashes
	private cacheIndex: Map<string, Set<string>> = new Map();
	
	public metrics: SchedulerMetrics = {
		staticHits: 0,
		frameHits: 0,
		misses: 0,
		evictions: 0,
		temporalReused: 0,
		renderedSamples: 0,
		cacheMemoryBytes: 0,
		peakMemoryBytes: 0,
	};

	constructor(maxCacheBytes: number = 512 * 1024 * 1024, maxCacheEntries: number = 1000) { // Default 512MB, 1000 entries
		this.maxCacheBytes = maxCacheBytes;
		this.maxCacheEntries = maxCacheEntries;
	}

	private updateMemoryMetrics() {
		this.metrics.cacheMemoryBytes = this.currentBytes;
		if (this.currentBytes > this.peakBytes) {
			this.peakBytes = this.currentBytes;
			this.metrics.peakMemoryBytes = this.peakBytes;
		}
	}

	private evictIfNeeded(neededBytes: number) {
		if (this.currentBytes + neededBytes <= this.maxCacheBytes && this.cache.size < this.maxCacheEntries) return;

		// Sort by LRU
		const entries = Array.from(this.cache.entries())
			.sort((a, b) => a[1].lastUsedTime - b[1].lastUsedTime);

		for (const [key, entry] of entries) {
			if (this.currentBytes + neededBytes <= this.maxCacheBytes && this.cache.size < this.maxCacheEntries) break;
			
			this.currentBytes -= entry.sizeBytes;
			entry.target.dispose();
			this.cache.delete(key);
			this.removeFromIndex(key);
			this.metrics.evictions++;
		}
		this.updateMemoryMetrics();
	}

	private addToIndex(hash: string) {
		// Extract nodeId from hash, format is [nodeId]_rev:...
		const match = hash.match(/^\[(.*?)\]_/);
		if (match) {
			const nodeId = match[1];
			let set = this.cacheIndex.get(nodeId);
			if (!set) {
				set = new Set();
				this.cacheIndex.set(nodeId, set);
			}
			set.add(hash);
		}
	}

	private removeFromIndex(hash: string) {
		const match = hash.match(/^\[(.*?)\]_/);
		if (match) {
			const nodeId = match[1];
			const set = this.cacheIndex.get(nodeId);
			if (set) {
				set.delete(hash);
				if (set.size === 0) {
					this.cacheIndex.delete(nodeId);
				}
			}
		}
	}

	private storeInCache(hash: string, target: RenderTarget, transferOwnership: boolean = false) {
		if (typeof window !== "undefined" && (window as any).__DISABLE_CACHE) {
			if (transferOwnership) target.dispose();
			return;
		}

		if (this.cache.has(hash)) {
			if (transferOwnership) target.dispose();
			return;
		}
		
		const sizeBytes = target.width * target.height * 4;
		
		// If the target is larger than the max cache bytes, don't cache it
		if (sizeBytes > this.maxCacheBytes) {
			if (transferOwnership) target.dispose();
			return;
		}
		
		this.evictIfNeeded(sizeBytes);
		
		let cacheTarget = target;
		if (!transferOwnership) {
			// Create a copy to store in cache
			cacheTarget = new RenderTarget({ width: target.width, height: target.height });
			cacheTarget.context.drawImage(target.canvas, 0, 0);
		}
		
		this.cache.set(hash, {
			hash,
			target: cacheTarget,
			lastUsedTime: performance.now(),
			sizeBytes
		});
		this.addToIndex(hash);
		
		this.currentBytes += sizeBytes;
		this.updateMemoryMetrics();
	}

	private getFromCache(hash: string): RenderTarget | null {
		if (typeof window !== "undefined" && (window as any).__DISABLE_CACHE) return null;

		const entry = this.cache.get(hash);
		if (entry) {
			entry.lastUsedTime = performance.now();
			return entry.target;
		}
		return null;
	}

	public invalidateNode(nodeId: string) {
		const keysToDelete = this.cacheIndex.get(nodeId);
		if (!keysToDelete) return;
		
		const keysArray = Array.from(keysToDelete);
		for (const key of keysArray) {
			const entry = this.cache.get(key);
			if (entry) {
				this.currentBytes -= entry.sizeBytes;
				entry.target.dispose();
				this.cache.delete(key);
			}
			this.removeFromIndex(key);
		}
		this.updateMemoryMetrics();
	}

	public clearCache() {
		for (const entry of this.cache.values()) {
			entry.target.dispose();
		}
		this.cache.clear();
		this.cacheIndex.clear();
		this.currentBytes = 0;
		this.updateMemoryMetrics();
	}

	private isVisualNode(node: BaseNode): boolean {
		const name = node.constructor.name;
		return name !== "SceneNode" && name !== "RootNode" && name !== "LayerCompositorNode";
	}

	private isStaticNode(node: BaseNode): boolean {
		if (!this.isVisualNode(node)) {
			// e.g. SceneNode, LayerCompositorNode, TransitionNode
			return false;
		}
		
		const params = node.params as any;
		
		// Animated Transform?
		if (params.transform?.transformKeyframes?.scale?.length > 1) return false;
		if (params.transform?.transformKeyframes?.position?.length > 1) return false;
		if (params.transform?.transformKeyframes?.rotate?.length > 1) return false;
		
		// Animated properties?
		if (params.transform?.propertyKeyframes && Object.keys(params.transform.propertyKeyframes).length > 0) return false;
		
		if (node.layerType === "shape" && (params as any).shapeAnimation) {
			const anim = (params as any).shapeAnimation;
			if (anim.trimStart || anim.trimEnd || anim.trimOffset || anim.strokeWidth || anim.fillOpacity) return false;
		}

		if (node.layerType === "text" && (params as any).kinetic) {
			return false; // Kinetic text is always dynamic
		}
		
		// Time-dependent effects?
		if (node.effects.some(e => e.type === "motion-blur")) return false; // Motion blur is always dynamic
		
		const webglEffects = ["3d-melt", "liquid-warp", "fractal-noise", "cyber-glitch"];
		if (params.effect && webglEffects.includes(params.effect)) return false;

		// Video nodes are dynamic by default since their frame changes over time
		if (node.layerType === "video" && (node as any).params?.url?.endsWith(".mp4")) return false; // Heuristic

		return true;
	}

	private hashEffect(obj: any): string {
		if (obj === null || obj === undefined) return String(obj);
		if (typeof obj !== 'object') return JSON.stringify(obj);
		if (Array.isArray(obj)) return `[${obj.map(v => this.hashEffect(v)).join(',')}]`;
		
		// Recursive stable serialization
		const keys = Object.keys(obj).sort();
		return `{${keys.map(k => `${k}:${this.hashEffect(obj[k])}`).join(",")}}`;
	}

	private computeNodeHash(node: BaseNode, time: number, targetInfo: string, forceStatic: boolean = false, skipEffects?: Set<string>): string {
		let animStateStr = "static";
		let effectParamsStr = "";

		const isVisual = this.isVisualNode(node);
		if (isVisual) {
			const params = (node as any).params;
			const isStatic = forceStatic || this.isStaticNode(node);

			if (!isStatic) {
				// Evaluate actual visual state at this exact time
				const localTime = (node as any).getLocalTime?.(time) || time;
				const animState = evaluateAnimation(
					params.transform?.transformKeyframes,
					params.transform?.propertyKeyframes,
					localTime,
					{ x: params.transform?.position?.x || 0, y: params.transform?.position?.y || 0, scale: params.transform?.scale || 1, rotate: params.transform?.rotate || 0 },
					params.opacity || 1
				);
				animStateStr = JSON.stringify(animState) + `_localTime:${localTime.toFixed(4)}`;
			}

			effectParamsStr = (node as any).effects
				.filter((e: any) => !skipEffects?.has(e.type))
				.map((e: any) => this.hashEffect(e))
				.join("|");
				
			if (node.layerType === "shape") {
				const trim = params.trim ? `_trim:${params.trim.start},${params.trim.end},${params.trim.offset}` : "";
				const fill = params.style?.fill ? `_fill:${params.style.fill.color},${params.style.fill.opacity}` : "";
				const stroke = params.style?.stroke ? `_stroke:${params.style.stroke.color},${params.style.stroke.width},${params.style.stroke.lineCap},${params.style.stroke.lineJoin}` : "";
				const geomHash = params.geometry ? this.hashEffect(params.geometry.commands) : "";
				effectParamsStr += `_shape:${geomHash}${trim}${fill}${stroke}`;
			}

			if (node.layerType === "text") {
				const fontKey = `${params.fontFamily}:${params.fontWeight || "normal"}:${params.fontStyle || "normal"}`;
				const textProps = {
					content: params.content,
					fontKey,
					fontSize: params.fontSize,
					letterSpacing: params.letterSpacing ?? 0,
					lineHeight: params.lineHeight ?? 1.2,
					textAlign: params.textAlign,
					color: params.color,
					bg: params.backgroundColor,
					stroke: params.stroke,
					shadow: params.shadow,
					boxWidth: params.boxWidth,
					direction: params.direction,
					kinetic: params.kinetic,
				};
				effectParamsStr += `_text:${this.hashEffect(textProps)}`;
			}
		} else {
			// For CompositionNode/SceneNode, we MUST include children hashes
			// otherwise the composition cache key will not change over time!
			const children = (node as any).children;
			if (Array.isArray(children)) {
				const childrenHashes = children.map((c: BaseNode) => this.computeNodeHash(c, time, targetInfo, forceStatic, skipEffects)).join(",");
				effectParamsStr = `_children:[${childrenHashes}]`;
			}
		}

		const mediaRev = (node as any).params?.mediaRevision || "0";
		const blendMode = node.blendMode || "normal";
		const opacity = (node as any).params?.opacity ?? 1;
		
		// Check for Camera State (Virtual Camera usually lives in params.camera or at root layer)
		const cameraStateStr = (node as any).params?.camera ? this.hashEffect((node as any).params.camera) : "none";
		
		// Deterministic serialization of all affecting attributes
		return `[${node.id}]_rev:${mediaRev}_state:${animStateStr}_blend:${blendMode}_op:${opacity}_fx:${effectParamsStr}_cam:${cameraStateStr}_tgt:${targetInfo}`;
	}

	async renderNode({
		node,
		target,
		time,
		forceRender,
		skipEffects
	}: {
		node: BaseNode;
		target: RenderTarget;
		time: number;
		forceRender?: boolean;
		skipEffects?: Set<string>;
	}): Promise<void> {
		const targetInfo = `${target.width}x${target.height}_${(target as any).pixelRatio || 1}`;
		const isStatic = this.isStaticNode(node);
		const hash = this.computeNodeHash(node, isStatic ? 0 : time, targetInfo, isStatic, skipEffects);

		// 1. Static Cache Check
		if (isStatic) {
			const staticCached = this.getFromCache(hash);
			if (staticCached) {
				target.context.drawImage(staticCached.canvas, 0, 0);
				this.metrics.staticHits++;
				return;
			}
		}

		// 2. Frame Cache Check
		const frameCached = this.getFromCache(hash);
		if (frameCached) {
			target.context.drawImage(frameCached.canvas, 0, 0);
			this.metrics.frameHits++;
			return;
		}

		// 3. Render
		this.metrics.misses++;
		
		// Temporal Sampling Optimization (Motion Blur)
		const motionBlurFx = node.effects.find(e => e instanceof MotionBlurEffect) as MotionBlurEffect;
		if (motionBlurFx && node.layerType !== "composition" && (!skipEffects || !skipEffects.has(motionBlurFx.type))) {
			// Deduplicate temporal samples using the cache!
			await this.renderWithTemporalSampling(node, target, time, forceRender, motionBlurFx, targetInfo, skipEffects);
			return; // Temporal sampling renders directly to target
		} 
		
		// Normal render
		const tempTarget = new RenderTarget({ width: target.width, height: target.height });
		await (node as any).render({ target: tempTarget, time, forceRender, skipEffects, scheduler: this });
		
		// Draw to actual target FIRST
		target.context.drawImage(tempTarget.canvas, 0, 0);
		
		// Cache the result, transferring ownership so tempTarget is NOT disposed if cached
		this.storeInCache(hash, tempTarget, true);
	}

	private async renderWithTemporalSampling(
		node: BaseNode, 
		target: RenderTarget, 
		time: number, 
		forceRender: boolean | undefined,
		motionBlur: MotionBlurEffect,
		targetInfo: string,
		parentSkipEffects?: Set<string>
	) {
		const samples = motionBlur.samples;
		const shutterAngle = motionBlur.shutterAngle;
		const frameDuration = 1 / 30; // Assuming 30fps base
		const blurDuration = (shutterAngle / 360) * frameDuration;
		
		// Skip motion blur in child renders to get clean frames
		const skipEffects = new Set(parentSkipEffects);
		skipEffects.add(motionBlur.type);
		
		// We use an accumulation buffer to ensure correct normalized average math
		const accumulationTarget = new RenderTarget({ width: target.width, height: target.height });
		accumulationTarget.context.save();
		accumulationTarget.context.globalCompositeOperation = "lighter"; // Additive blending for pure sum
		accumulationTarget.context.globalAlpha = 1 / samples; // Normalize by N

		for (let i = 0; i < samples; i++) {
			const t = time - (blurDuration * i) / Math.max(1, samples - 1);
			const sampleHash = this.computeNodeHash(node, t, targetInfo, false, skipEffects);
			
			let sampleTarget = this.getFromCache(sampleHash);
			let isCached = true;
			
			if (sampleTarget) {
				this.metrics.temporalReused++;
			} else {
				sampleTarget = new RenderTarget({ width: target.width, height: target.height });
				await (node as any).render({ target: sampleTarget, time: t, forceRender, skipEffects, scheduler: this });
				this.metrics.renderedSamples++;
				isCached = false;
			}
			
			accumulationTarget.context.drawImage(sampleTarget.canvas, 0, 0);
			
			if (!isCached) {
				// Transfer ownership to cache (will dispose if rejected)
				this.storeInCache(sampleHash, sampleTarget, true);
			}
		}
		
		accumulationTarget.context.restore();
		
		// Now draw the accumulated result onto the actual target using standard source-over
		target.context.drawImage(accumulationTarget.canvas, 0, 0);
		accumulationTarget.dispose();
	}
}

export const defaultRenderScheduler = new RenderScheduler();
