import { EvaluatedMask } from "./mask-evaluator";

export class MaskRenderer {
	// A simple LRU cache for rasterized masks could be added here
	private static rasterCache = new Map<string, OffscreenCanvas>();
	private static MAX_CACHE_SIZE = 50; // simple limit

	/**
	 * Renders a single EvaluatedMask to an OffscreenCanvas.
	 * Includes feathering via filter.
	 */
	public static renderToCanvas(mask: EvaluatedMask, width: number, height: number): OffscreenCanvas {
		const cacheKey = `${width}x${height}_${mask.semanticHash}`;
		
		if (this.rasterCache.has(cacheKey)) {
			return this.rasterCache.get(cacheKey)!;
		}

		// 1. Create rawMaskCanvas to render the raw untransformed/transformed source at opacity=1, non-inverted, non-blurred.
		const rawMaskCanvas = new OffscreenCanvas(width, height);
		const rawCtx = rawMaskCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

		rawCtx.save();
		
		// Apply transforms on raw canvas
		rawCtx.translate(mask.animState.x, mask.animState.y);
		rawCtx.rotate(mask.animState.rotation * Math.PI / 180);
		rawCtx.scale(mask.animState.scale, mask.animState.scale);

		const source = mask.original.source;

		if (source.type === "path") {
			let path: Path2D;
			// geometry is PathGeometryJSON DTO
			const geom = source.geometry;
			if (geom && Array.isArray(geom.commands)) {
				path = new Path2D();
				for (const cmd of geom.commands) {
					if (cmd.type === "moveTo") path.moveTo(cmd.x, cmd.y);
					else if (cmd.type === "lineTo") path.lineTo(cmd.x, cmd.y);
					else if (cmd.type === "quadraticTo") path.quadraticCurveTo(cmd.cx, cmd.cy, cmd.x, cmd.y);
					else if (cmd.type === "cubicTo") path.bezierCurveTo(cmd.c1x, cmd.c1y, cmd.c2x, cmd.c2y, cmd.x, cmd.y);
					else if (cmd.type === "close") path.closePath();
				}
			} else {
				path = new Path2D();
				path.rect(0, 0, width, height);
			}
			rawCtx.fillStyle = "black";
			rawCtx.fill(path);
		} else if (source.type === "alpha") {
			// AlphaMask type
			const alphaMask = source.mask;
			const tempCanvas = new OffscreenCanvas(alphaMask.width, alphaMask.height);
			const tempCtx = tempCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
			
			// REQUIRED CHANGE 3 & 5: ImageData -> temporary canvas -> drawImage()
			// Ensure AlphaMask remains immutable
			const rgbaData = new Uint8ClampedArray(alphaMask.width * alphaMask.height * 4);
			for (let i = 0; i < alphaMask.data.length; i++) {
				rgbaData[i * 4] = 0;
				rgbaData[i * 4 + 1] = 0;
				rgbaData[i * 4 + 2] = 0;
				rgbaData[i * 4 + 3] = alphaMask.data[i];
			}
			const imgData = new ImageData(rgbaData, alphaMask.width, alphaMask.height);
			tempCtx.putImageData(imgData, 0, 0);

			// Draw onto rawMaskCanvas
			rawCtx.drawImage(tempCanvas, 0, 0);
		} else {
			throw new Error("Tracked mask must be resolved before rendering");
		}

		rawCtx.restore();

		// 2. Create the final output canvas and apply: feather -> opacity -> inversion
		const canvas = new OffscreenCanvas(width, height);
		const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

		if (mask.inverted) {
			// Fill canvas with solid black (alpha = 1)
			ctx.fillStyle = "black";
			ctx.fillRect(0, 0, width, height);

			ctx.save();
			ctx.globalCompositeOperation = "destination-out";
			ctx.globalAlpha = mask.opacity;
			if (mask.feather > 0) {
				ctx.filter = `blur(${mask.feather}px)`;
			}
			ctx.drawImage(rawMaskCanvas, 0, 0);
			ctx.restore();
		} else {
			ctx.save();
			ctx.globalAlpha = mask.opacity;
			if (mask.feather > 0) {
				ctx.filter = `blur(${mask.feather}px)`;
			}
			ctx.drawImage(rawMaskCanvas, 0, 0);
			ctx.restore();
		}

		this.rasterCache.set(cacheKey, canvas);
		if (this.rasterCache.size > this.MAX_CACHE_SIZE) {
			const firstKey = this.rasterCache.keys().next().value;
			if (firstKey !== undefined) {
				this.rasterCache.delete(firstKey);
			}
		}

		return canvas;
	}

	public static clearCache() {
		this.rasterCache.clear();
	}
}
