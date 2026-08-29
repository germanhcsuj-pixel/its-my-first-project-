import type { RenderEffect, EffectContext } from "./render-effect";
import type { RenderTarget } from "../render-target";
import { getSharedTargets } from "../shared-targets";

export class GlowEffect implements RenderEffect {
	public type = "glow";

	constructor(
		public radius: number = 0,
		public intensity: number = 0,
		public threshold: number = 0.7,
		public blendMode: "add" | "screen" = "add"
	) {}

	apply(input: RenderTarget, output: RenderTarget, context: EffectContext): void {
		if (this.intensity <= 0 || this.radius <= 0) {
			output.context.drawImage(input.canvas, 0, 0);
			return;
		}

		output.context.save();
		
		// 1. Draw original sharp layer
		output.context.globalCompositeOperation = "source-over";
		output.context.globalAlpha = 1.0;
		output.context.drawImage(input.canvas, 0, 0);

		// 2. Extract brightness into targetC
		const { targetC } = getSharedTargets(context.width, context.height);
		if (!targetC) {
			output.context.restore();
			return;
		}

		targetC.clear();
		targetC.context.drawImage(input.canvas, 0, 0);
		
		const imgData = targetC.context.getImageData(0, 0, context.width, context.height);
		const data = imgData.data;
		
		for (let i = 0; i < data.length; i += 4) {
			const a = data[i + 3];
			if (a === 0) continue;
			
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];
			
			const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
			if (luminance < this.threshold) {
				// zero out alpha to isolate only bright areas
				data[i + 3] = 0;
			}
		}
		
		targetC.context.putImageData(imgData, 0, 0);

		// 3. Composite blurred brightness onto the output
		output.context.globalCompositeOperation = this.blendMode === "screen" ? "screen" : "lighter";
		output.context.globalAlpha = Math.min(1, Math.max(0, this.intensity));
		output.context.filter = `blur(${this.radius}px)`;
		
		output.context.drawImage(targetC.canvas, 0, 0);
		
		output.context.restore();
	}
}
