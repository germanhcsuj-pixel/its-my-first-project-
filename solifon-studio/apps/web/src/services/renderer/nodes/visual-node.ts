import type { RenderTarget } from "../render-target";
import { BaseNode } from "./base-node";
import type { Transform } from "@/types/timeline";
import { WebGLEffectsRenderer } from "../webgl-effects";
import { MaskEvaluator } from "../masks/mask-evaluator";
import { MaskCompositor, RenderTargetPool } from "../masks/mask-compositor";
import { TrackedMaskResolver } from "../../tracking/tracked-mask-resolver";
import { MaskDefinition, EffectDefinition, EvaluatedEffect, EffectSpec } from "@/types/timeline";
import { EffectTargetResolver } from "../effects/effect-target-resolver";
import { EffectEvaluator } from "../effects/effect-evaluator";
import { EffectCompositor } from "../effects/effect-compositor";

const VISUAL_EPSILON = 1 / 1000;

// CSS filter presets map
const FILTER_CSS_MAP: Record<string, string> = {
	vivid:     "saturate(2) contrast(1.1)",
	cinematic: "sepia(0.3) contrast(1.15) brightness(0.9)",
	warm:      "sepia(0.4) saturate(1.4) brightness(1.05)",
	cool:      "hue-rotate(30deg) saturate(1.2)",
	bw:        "grayscale(1)",
	vintage:   "sepia(0.6) contrast(1.1) brightness(0.95)",
	fade:      "brightness(1.2) saturate(0.7) contrast(0.85)",
	drama:     "contrast(1.4) saturate(1.2) brightness(0.85)",
	neon:      "hue-rotate(270deg) saturate(2) contrast(1.3)",
	golden:    "sepia(0.5) hue-rotate(-15deg) saturate(1.5) brightness(1.1)",
	matte:     "contrast(0.85) brightness(1.1) saturate(0.9)",
	chrome:    "saturate(0.5) contrast(1.3) brightness(1.1)",
	soft:      "brightness(1.15) contrast(0.9) saturate(1.1)",
	invert:    "invert(1)",
};

import { evaluateAnimation, type AnimationState } from "../animation-engine";
export interface VisualNodeParams {
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	transform: Transform;
	opacity: number;
	playbackRate?: number;
	reversed?: boolean;
	effect?: string;
	effectStartTime?: number;
	effectDuration?: number;
	effectSpeed?: number;
	animation?: string;
	animationStartTime?: number;
	animationDuration?: number;
	animationSpeed?: number;
	animationDirection?: number;
	hideRanges?: { start: number; end: number }[];
	startTime: number;
	// Color filter preset
	filter?: string | null;
	blendMode?: string;
	// Manual adjustments
	adjustments?: {
		brightness?: number;
		contrast?: number;
		saturation?: number;
		hueRotate?: number;
		blur?: number;
	} | null;
	// AI Features
	removeBackground?: boolean;
	masks?: MaskDefinition[];
	effects?: (EffectSpec | EffectDefinition)[];
}

export abstract class VisualNode<
	Params extends VisualNodeParams = VisualNodeParams,
> extends BaseNode<Params> {
	protected getLocalTime(time: number, forceRender?: boolean): number {
		const rate = this.params.playbackRate ?? 1;
		let elapsed = time - this.params.timeOffset;
		
		if (forceRender) {
			elapsed = Math.max(0, Math.min(this.params.duration, elapsed));
		}
		
		if (this.params.reversed) {
			return this.params.trimStart + rate * (this.params.duration - elapsed);
		}
		return this.params.trimStart + elapsed * rate;
	}

	protected isInRange(time: number, forceRender?: boolean): boolean {
		if (forceRender) return true;
		
		const localTime = this.getLocalTime(time);
		const rate = this.params.playbackRate ?? 1;
		
		const inBaseRange = (
			localTime >= this.params.trimStart - VISUAL_EPSILON &&
			localTime < this.params.trimStart + this.params.duration * rate
		);

		if (!inBaseRange) return false;

		if (this.params.hideRanges) {
			for (const range of this.params.hideRanges) {
				if (time >= range.start && time < range.end) {
					return false;
				}
			}
		}

		return true;
	}

	public getOpacity(time: number): number {
		const localTime = this.getLocalTime(time);
		const { transform, opacity } = this.params;
		const animState = evaluateAnimation(
			transform.transformKeyframes,
			transform.propertyKeyframes,
			localTime,
			{ x: transform.position.x, y: transform.position.y, scale: transform.scale, rotate: transform.rotate },
			opacity
		);
		return Math.max(0, Math.min(1, animState.opacity));
	}

	protected renderVisual({
		target,
		source,
		sourceWidth,
		sourceHeight,
		time = 0,
		ignoreOpacity = false,
	}: {
		target: RenderTarget;
		source: CanvasImageSource;
		sourceWidth: number;
		sourceHeight: number;
		time?: number;
		ignoreOpacity?: boolean;
	}): void {
		const localTime = this.getLocalTime(time);
		const { transform, opacity, masks } = this.params;

		// 1. Evaluate unified AnimationState
		const animState = evaluateAnimation(
			transform.transformKeyframes,
			transform.propertyKeyframes,
			localTime,
			{ x: transform.position.x, y: transform.position.y, scale: transform.scale, rotate: transform.rotate },
			opacity
		);

		// Divert drawing to a temporary target if we have masks
		const hasMasks = masks && masks.length > 0;
		const drawTarget = hasMasks ? RenderTargetPool.acquire(target.width, target.height) : target;

		drawTarget.context.save();

		// 🔥 Build CSS filter string from filter preset + adjustments
		const filterParts: string[] = [];

		if (this.params.filter && this.params.filter !== "none") {
			const mapped = FILTER_CSS_MAP[this.params.filter];
			if (mapped) filterParts.push(mapped);
		}

		if (this.params.adjustments) {
			const adj = this.params.adjustments;
			if (adj.brightness !== undefined && adj.brightness !== 100)
				filterParts.push(`brightness(${adj.brightness / 100})`);
			if (adj.contrast !== undefined && adj.contrast !== 100)
				filterParts.push(`contrast(${adj.contrast / 100})`);
			if (adj.saturation !== undefined && adj.saturation !== 100)
				filterParts.push(`saturate(${adj.saturation / 100})`);
			if (adj.hueRotate !== undefined && adj.hueRotate !== 0)
				filterParts.push(`hue-rotate(${adj.hueRotate}deg)`);
			if (adj.blur !== undefined && adj.blur > 0)
				filterParts.push(`blur(${adj.blur}px)`);
		}

		// Apply AnimationState blur
		if (animState.blur > 0) {
			filterParts.push(`blur(${animState.blur}px)`);
		}

		if (filterParts.length > 0) {
			drawTarget.context.filter = filterParts.join(" ");
		}

		const containScale = Math.min(
			drawTarget.width / sourceWidth,
			drawTarget.height / sourceHeight,
		);
		const scaledWidth = sourceWidth * containScale * animState.scale;
		const scaledHeight = sourceHeight * containScale * animState.scale;
		const x = drawTarget.width / 2 + animState.x - scaledWidth / 2;
		const y = drawTarget.height / 2 + animState.y - scaledHeight / 2;

		if (!ignoreOpacity) {
			drawTarget.context.globalAlpha = Math.max(0, Math.min(1, animState.opacity));
		}
		
		if (this.params.blendMode) {
			drawTarget.context.globalCompositeOperation = this.params.blendMode as GlobalCompositeOperation;
		}

		const centerX = x + scaledWidth / 2;
		const centerY = y + scaledHeight / 2;

		const needsFlip = this.params.transform.flipX || this.params.transform.flipY;
		const needsRotate = animState.rotation !== 0;

		if (needsRotate || needsFlip) {
			drawTarget.context.translate(centerX, centerY);
			if (needsRotate) {
				drawTarget.context.rotate((animState.rotation * Math.PI) / 180);
			}
			if (needsFlip) {
				drawTarget.context.scale(
					this.params.transform.flipX ? -1 : 1,
					this.params.transform.flipY ? -1 : 1,
				);
			}
			drawTarget.context.translate(-centerX, -centerY);
		}

		let finalSource = source;
		
		const webglEffects = [
			"3d-melt", "3d-shatter", "liquid-warp", "cyber-glitch", "text-shatter", "pixelate", 
			"3d-liquid-glass", "3d-hologram-voxels", "3d-black-hole",
			"3d-parallax-extrusion", "3d-god-rays", "3d-mercury-fluid",
			"pixel-dissolve", "fractal-noise", "vhs", "chroma-key"
		];
		if (this.params.effect && webglEffects.includes(this.params.effect)) {
			try {
				const webglRenderer = WebGLEffectsRenderer.getInstance();
				finalSource = webglRenderer.process(
					source,
					sourceWidth,
					sourceHeight,
					this.params.effect,
					localTime
				);
			} catch (e) {
				console.error("WebGL effect rendering failed:", e);
			}
		}

		drawTarget.context.drawImage(finalSource, x, y, scaledWidth, scaledHeight);
		drawTarget.context.restore();

		// Apply masks if necessary
		if (hasMasks) {
			let maskedTarget: RenderTarget | null = null;
			try {
				const resolvedMasks = masks.map((m: import("@/types/timeline").MaskDefinition) => {
					if (m.source && m.source.type === "tracked") {
						const resolvedSource = TrackedMaskResolver.resolve(
							undefined,
							m.source.trackId,
							m.source.frameIndex,
							m.gapPolicy
						);
						if (!resolvedSource) return null;
						return {
							...m,
							source: resolvedSource
						};
					}
					return m;
				}).filter(Boolean) as MaskDefinition[];

				const evaluatedMasks = resolvedMasks.map((m) => MaskEvaluator.evaluate(m, localTime));
				maskedTarget = MaskCompositor.applyMasks(drawTarget, evaluatedMasks);

				// Apply new P3.8 effects if present
				const frameIndex = Math.floor(time * 30);
				const newEffects = (this.params.effects || [])
					.filter((e): e is EffectDefinition => "id" in e && "parameters" in e);

				if (newEffects.length > 0) {
					const sharedEvaluatedMap = new Map<string, number | import("../../../types/timeline").RGBA>();
					const resolvedEffects = newEffects.map((effect, index) => {
						const resolvedTarget = EffectTargetResolver.resolve(
							effect.target || { type: "layer", elementId: this.id },
							frameIndex,
							this.params.masks || [],
							undefined
						);
						if (!resolvedTarget) {
							return null;
						}
						const context = {
							time: localTime,
							frameIndex,
							fps: 30,
							target: resolvedTarget,
							allEffects: newEffects,
							evaluatedParameters: sharedEvaluatedMap
						};
						return EffectEvaluator.evaluate(effect, context, index);
					}).filter(Boolean) as EvaluatedEffect[];

					if (resolvedEffects.length > 0) {
						EffectCompositor.applyEffects(maskedTarget, resolvedEffects);
					}
				}
				
				// Draw masked result to final target
				target.context.drawImage(maskedTarget.canvas, 0, 0);
			} finally {
				// Release temp targets
				RenderTargetPool.release(drawTarget);
				if (maskedTarget) {
					RenderTargetPool.release(maskedTarget);
				}
			}
		} else {
			// Apply new P3.8 effects if present on non-masked target
			const frameIndex = Math.floor(time * 30);
			const newEffects = (this.params.effects || [])
				.filter((e): e is EffectDefinition => "id" in e && "parameters" in e);

			if (newEffects.length > 0) {
				const sharedEvaluatedMap = new Map<string, number | import("../../../types/timeline").RGBA>();
				const resolvedEffects = newEffects.map((effect, index) => {
					const resolvedTarget = EffectTargetResolver.resolve(
						effect.target || { type: "layer", elementId: this.id },
						frameIndex,
						this.params.masks || [],
						undefined
					);
					if (!resolvedTarget) {
						return null;
					}
					const context = {
						time: localTime,
						frameIndex,
						fps: 30,
						target: resolvedTarget,
						allEffects: newEffects,
						evaluatedParameters: sharedEvaluatedMap
					};
					return EffectEvaluator.evaluate(effect, context, index);
				}).filter(Boolean) as EvaluatedEffect[];

				if (resolvedEffects.length > 0) {
					EffectCompositor.applyEffects(target, resolvedEffects);
				}
			}
		}
	}

	public getAnimationState(time: number): AnimationState {
		const localTime = this.getLocalTime(time);
		const { transform, opacity } = this.params;
		return evaluateAnimation(
			transform.transformKeyframes,
			transform.propertyKeyframes,
			localTime,
			{ x: transform.position.x, y: transform.position.y, scale: transform.scale, rotate: transform.rotate },
			opacity
		);
	}

	public applyTransform(
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		animState: AnimationState
	): void {
		ctx.save();
		ctx.translate(animState.x, animState.y);
		if (animState.rotation !== 0) {
			ctx.rotate((animState.rotation * Math.PI) / 180);
		}
		if (this.params.transform.flipX || this.params.transform.flipY) {
			ctx.scale(
				this.params.transform.flipX ? -1 : 1,
				this.params.transform.flipY ? -1 : 1,
			);
		}
		if (animState.scale !== 1) {
			ctx.scale(animState.scale, animState.scale);
		}
	}
}
