import type { RenderTarget } from "../render-target";
import { VisualNode, type VisualNodeParams } from "./visual-node";
import { WebGLEffectsRenderer } from "../webgl-effects";
import type { TextElement } from "@/types/timeline";
import { FONT_SIZE_SCALE_REFERENCE } from "@/constants/text-constants";
import { fontRegistry } from "../typography/font-registry";
import { textLayout, TextLayoutInput, TextLayoutResult } from "../typography/text-layout";
import { kineticEvaluator } from "../typography/kinetic-evaluator";
import { evaluateAnimation } from "../animation-engine";

export function scaleFontSize({
	fontSize,
	canvasHeight,
}: {
	fontSize: number;
	canvasHeight: number;
}): number {
	return fontSize * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
}

export function scaleBoxWidth({
	boxWidth,
	canvasHeight,
}: {
	boxWidth: number;
	canvasHeight: number;
}): number {
	return boxWidth * (canvasHeight / FONT_SIZE_SCALE_REFERENCE);
}

export type TextNodeParams = TextElement & VisualNodeParams & {
	canvasCenter: { x: number; y: number };
	canvasHeight: number;
};

export class TextNode extends VisualNode<TextNodeParams> {
	private effectCanvas?: HTMLCanvasElement;
	private effectCtx?: CanvasRenderingContext2D;

	constructor(params: TextNodeParams) {
		super(params);
		this.layerType = "text";
	}

	async render(args: { target: RenderTarget; time: number; forceRender?: boolean; scheduler?: any }) {
		await super.render(args);

		if (!this.isInRange(args.time, args.forceRender)) {
			return;
		}

		// Verify font readiness
		const fontSpec = {
			family: this.params.fontFamily,
			weight: this.params.fontWeight,
			style: this.params.fontStyle
		};
		if (!fontRegistry.isReady(fontSpec)) {
			console.warn(`TextNode: Font ${fontRegistry.getFontKey(fontSpec)} is not ready. Skipping render to prevent FOUT and cache poisoning.`);
			return;
		}

		const time = args.time;
		const localTime = this.getLocalTime(time);
		const animState = evaluateAnimation(
			this.params.transform.transformKeyframes,
			this.params.transform.propertyKeyframes,
			localTime,
			{ x: this.params.transform.position.x, y: this.params.transform.position.y, scale: this.params.transform.scale, rotate: this.params.transform.rotate },
			this.params.opacity
		);

		// Typography property evaluation
		const currentFontSize = animState.fontSize ?? this.params.fontSize;
		const currentLetterSpacing = animState.letterSpacing ?? this.params.letterSpacing ?? 0;
		const currentLineHeight = animState.lineHeight ?? this.params.lineHeight ?? 1.2;

		const scaledFontSize = scaleFontSize({
			fontSize: currentFontSize,
			canvasHeight: this.params.canvasHeight,
		});

		const boxWidth = this.params.boxWidth;
		const hasBoxWidth = boxWidth !== undefined && boxWidth > 0;
		const scaledBoxWidth = hasBoxWidth
			? scaleBoxWidth({
					boxWidth,
					canvasHeight: this.params.canvasHeight,
				})
			: -1;

		let finalContent = this.params.content;
		if (this.params.animation === "typewriter") {
			const charsPerSecond = 20;
			const visibleChars = Math.floor(localTime * charsPerSecond);
			if (visibleChars < finalContent.length) {
				finalContent = finalContent.substring(0, visibleChars);
			}
		}

		const layoutInput: TextLayoutInput = {
			text: finalContent,
			fontFamily: this.params.fontFamily,
			fontSize: scaledFontSize,
			fontWeight: this.params.fontWeight,
			fontStyle: this.params.fontStyle,
			letterSpacing: currentLetterSpacing,
			lineHeight: currentLineHeight,
			textAlign: this.params.textAlign,
			maxWidth: scaledBoxWidth
		};

		const t0 = performance.now();
		const layoutResult = textLayout.measure(layoutInput);
		const t1 = performance.now();
		
		if (typeof window !== "undefined") {
			(window as any).__PERF_METRICS = (window as any).__PERF_METRICS || { TextLayout: 0, KineticEvaluator: 0, TextNode: 0, fillText: 0 };
			(window as any).__PERF_METRICS.TextLayout += (t1 - t0);
		}

		if (layoutResult.width === 0 || layoutResult.height === 0) return;

		const webglEffects = [
			"3d-melt", "3d-shatter", "liquid-warp", "cyber-glitch", "text-shatter", "pixelate", 
			"3d-liquid-glass", "3d-hologram-voxels", "3d-black-hole",
			"pixel-dissolve", "fractal-noise"
		];
		const useWebGL = this.params.effect && webglEffects.includes(this.params.effect);
		
		let ctx = args.target.context;
		if (useWebGL) {
			if (!this.effectCanvas) {
				this.effectCanvas = document.createElement("canvas");
				this.effectCtx = this.effectCanvas.getContext("2d")!;
			}
			if (this.effectCanvas.width !== args.target.width || this.effectCanvas.height !== args.target.height) {
				this.effectCanvas.width = args.target.width;
				this.effectCanvas.height = args.target.height;
			}
			this.effectCtx!.clearRect(0, 0, args.target.width, args.target.height);
			ctx = this.effectCtx!;
		}

		ctx.save();
		// VisualNode handles basic transform but TextNode is currently centered manually 
		// via this.params.canvasCenter. Let's combine them:
		// Base transforms handled by VisualNode applyTransform, but we need to ensure anchor points are correct.
		const cx = animState.x + this.params.canvasCenter.x;
		const cy = animState.y + this.params.canvasCenter.y;
		ctx.translate(cx, cy);

		ctx.globalAlpha = Math.max(0, Math.min(1, animState.opacity));

		if (animState.rotation) {
			ctx.rotate((animState.rotation * Math.PI) / 180);
		}
		if (animState.scale !== 1) {
			ctx.scale(animState.scale, animState.scale);
		}

		// Filter processing
		this.applyFilters(ctx as any, animState);

		const prevAlpha = ctx.globalAlpha;
		const baseOpacity = typeof this.params.opacity === 'number' ? this.params.opacity : 1;
		ctx.globalAlpha = prevAlpha * baseOpacity;

		const renderTextContent = (color: string, offsetX = 0, offsetY = 0) => {
			ctx.save();
			ctx.translate(offsetX, offsetY);
			
			// Background rendering
			if (this.params.backgroundColor && this.params.backgroundColor !== "transparent") {
				const padX = this.params.backgroundPaddingX ?? 8;
				const padY = this.params.backgroundPaddingY ?? 4;
				const borderRadius = this.params.backgroundBorderRadius ?? 0;

				const bgAlpha = ctx.globalAlpha;
				const bgOpacity = this.params.backgroundOpacity ?? 1;
				ctx.globalAlpha = bgAlpha * bgOpacity;
				ctx.fillStyle = this.params.backgroundColor;

				let bgLeft = -layoutResult.width / 2;
				if (this.params.textAlign === "left") bgLeft = 0;
				if (this.params.textAlign === "right") bgLeft = -layoutResult.width;

				const bgX = bgLeft - padX;
				const bgY = -layoutResult.height / 2 - padY;
				const bgW = layoutResult.width + padX * 2;
				const bgH = layoutResult.height + padY * 2;

				if (borderRadius > 0 && ctx.roundRect) {
					ctx.beginPath();
					ctx.roundRect(bgX, bgY, bgW, bgH, borderRadius);
					ctx.fill();
				} else {
					ctx.fillRect(bgX, bgY, bgW, bgH);
				}

				ctx.globalAlpha = bgAlpha;
			}

			// Render lines
			ctx.fillStyle = color;
			const fontWeightStr = this.params.fontWeight ?? "normal";
			const fontStyleStr = this.params.fontStyle ?? "normal";
			ctx.font = `${fontStyleStr} ${fontWeightStr} ${scaledFontSize}px "${this.params.fontFamily}"`;
			ctx.textAlign = this.params.textAlign;
			ctx.textBaseline = "alphabetic"; // Because textLayout returns the baseline position

			let textX = 0;
			if (this.params.textAlign === "left") {
				textX = hasBoxWidth ? -scaledBoxWidth / 2 : 0;
			} else if (this.params.textAlign === "right") {
				textX = hasBoxWidth ? scaledBoxWidth / 2 : 0;
			}

			if (this.params.kinetic) {
				const scope = this.params.kinetic.scope;
				let entities: any[] = [];
				if (scope === "character") entities = layoutResult.characters || [];
				else if (scope === "word") entities = layoutResult.words || [];
				else entities = layoutResult.lines || [];

				const t2 = performance.now();
				const renderStates = kineticEvaluator.evaluate(entities, localTime, this.params.kinetic);
				const t3 = performance.now();
				if (typeof window !== "undefined") {
					(window as any).__PERF_METRICS.KineticEvaluator += (t3 - t2);
				}
				
				const t4 = performance.now();
				for (const state of renderStates) {
					if (!state.visible || state.opacity <= 0) continue;
					
					ctx.save();
					ctx.globalAlpha = ctx.globalAlpha * state.opacity;
					
					const wordX = textX + state.x + state.width / 2;
					const wordY = state.y;
					
					ctx.translate(wordX, wordY);
					if (state.rotation !== 0) ctx.rotate((state.rotation * Math.PI) / 180);
					if (state.scaleX !== 1 || state.scaleY !== 1) ctx.scale(state.scaleX, state.scaleY);
					
					const drawX = -state.width / 2;
					const drawY = 0;

					if (state.revealProgress < 1) {
						// Clip for reveal
						ctx.beginPath();
						ctx.rect(drawX, drawY - state.height, state.width * state.revealProgress, state.height * 1.5); // * 1.5 for descenders
						ctx.clip();
					}

					if (this.params.shadow) {
						ctx.shadowColor = this.params.shadow.color;
						ctx.shadowOffsetX = this.params.shadow.offsetX;
						ctx.shadowOffsetY = this.params.shadow.offsetY;
						ctx.shadowBlur = this.params.shadow.blur;
					}

					if (this.params.stroke && this.params.stroke.width > 0) {
						ctx.strokeStyle = this.params.stroke.color;
						ctx.lineWidth = this.params.stroke.width * 2;
						ctx.lineJoin = "round";
						ctx.strokeText(state.text, drawX, drawY);
					}

					if (this.params.shadow) {
						ctx.shadowColor = "transparent";
						ctx.shadowBlur = 0;
						ctx.shadowOffsetX = 0;
						ctx.shadowOffsetY = 0;
					}

					ctx.fillText(state.text, drawX, drawY);
					ctx.restore();
				}
				const t5 = performance.now();
				if (typeof window !== "undefined") {
					(window as any).__PERF_METRICS.fillText += (t5 - t4);
				}
			} else {
				for (const line of layoutResult.lines) {
					const lineY = line.baseline;

					if (this.params.shadow) {
						ctx.shadowColor = this.params.shadow.color;
						ctx.shadowOffsetX = this.params.shadow.offsetX;
						ctx.shadowOffsetY = this.params.shadow.offsetY;
						ctx.shadowBlur = this.params.shadow.blur;
					}

					if (this.params.stroke && this.params.stroke.width > 0) {
						ctx.strokeStyle = this.params.stroke.color;
						ctx.lineWidth = this.params.stroke.width * 2;
						ctx.lineJoin = "round";
						ctx.strokeText(line.text, textX, lineY);
					}

					if (this.params.shadow) {
						ctx.shadowColor = "transparent";
						ctx.shadowBlur = 0;
						ctx.shadowOffsetX = 0;
						ctx.shadowOffsetY = 0;
					}

					if (currentLetterSpacing !== 0 && 'letterSpacing' in ctx) {
						(ctx as any).letterSpacing = `${currentLetterSpacing}px`;
					}

					ctx.fillText(line.text, textX, lineY);
					
					if ('letterSpacing' in ctx) {
						(ctx as any).letterSpacing = "0px";
					}
				}
			}

			ctx.restore();
		};

		if (this.params.effect === "rgb-glitch") {
			const jitter1 = (Math.random() - 0.5) * 10;
			const jitter2 = (Math.random() - 0.5) * 10;
			ctx.globalCompositeOperation = "screen";
			renderTextContent("red", jitter1, 0);
			renderTextContent("blue", jitter2, 0);
			renderTextContent("lime", 0, 0);
			ctx.globalCompositeOperation = "source-over";
		} else if (this.params.effect === "text-shatter") {
			const jitterY = (Math.random() - 0.5) * 5;
			renderTextContent(this.params.color, 0, jitterY);
		} else {
			renderTextContent(this.params.color);
		}

		ctx.globalAlpha = prevAlpha;
		ctx.restore();

		if (useWebGL && this.effectCanvas) {
			try {
				const webglRenderer = WebGLEffectsRenderer.getInstance();
				const processedCanvas = webglRenderer.process(
					this.effectCanvas,
					this.effectCanvas.width,
					this.effectCanvas.height,
					this.params.effect!,
					localTime
				);
				args.target.context.save();
				args.target.context.drawImage(processedCanvas, 0, 0);
				args.target.context.restore();
			} catch (e) {
				console.error("WebGL effect rendering failed for TextNode:", e);
				args.target.context.drawImage(this.effectCanvas, 0, 0);
			}
		}
	}
	
	// Refactored common visual node logic to applyFilters
	private applyFilters(ctx: CanvasRenderingContext2D, animState: any) {
		const filterParts: string[] = [];
		if (this.params.filter && this.params.filter !== 'none') {
			const FILTER_MAP: Record<string, string> = {
				'vivid':    'saturate(2) contrast(1.1)',
				'cinematic':'sepia(0.3) contrast(1.15) brightness(0.9)',
				'warm':     'sepia(0.4) saturate(1.4) brightness(1.05)',
				'cool':     'hue-rotate(30deg) saturate(1.2)',
				'bw':       'grayscale(1)',
				'vintage':  'sepia(0.6) contrast(1.1) brightness(0.95)',
				'fade':     'brightness(1.2) saturate(0.7) contrast(0.85)',
				'drama':    'contrast(1.4) saturate(1.2) brightness(0.85)',
				'neon':     'hue-rotate(270deg) saturate(2) contrast(1.3)',
				'golden':   'sepia(0.5) hue-rotate(-15deg) saturate(1.5) brightness(1.1)',
				'matte':    'contrast(0.85) brightness(1.1) saturate(0.9)',
				'chrome':   'saturate(0.5) contrast(1.3) brightness(1.1)',
				'soft':     'brightness(1.15) contrast(0.9) saturate(1.1)',
				'invert':   'invert(1)',
			};
			const mapped = FILTER_MAP[this.params.filter];
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

		if (animState.blur > 0) {
			filterParts.push(`blur(${animState.blur}px)`);
		}

		if (filterParts.length > 0) {
			ctx.filter = filterParts.join(' ');
		}
	}
}
