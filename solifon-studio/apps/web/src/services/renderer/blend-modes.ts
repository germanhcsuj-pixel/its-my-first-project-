export type BlendMode = "normal" | "screen" | "add" | "multiply" | "overlay";

export function applyBlendMode(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	mode: BlendMode
) {
	switch (mode) {
		case "normal":
			ctx.globalCompositeOperation = "source-over";
			break;
		case "screen":
			ctx.globalCompositeOperation = "screen";
			break;
		case "add":
			ctx.globalCompositeOperation = "lighter";
			break;
		case "multiply":
			ctx.globalCompositeOperation = "multiply";
			break;
		case "overlay":
			ctx.globalCompositeOperation = "overlay";
			break;
		default:
			ctx.globalCompositeOperation = "source-over";
	}
}
