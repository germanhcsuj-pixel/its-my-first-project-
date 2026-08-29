import { drawCssBackground } from "@/lib/gradients";
import type { RenderTarget } from "../render-target";
import { BaseNode } from "./base-node";

export type ColorNodeParams = {
	color: string;
};

export class ColorNode extends BaseNode<ColorNodeParams> {
	private color: string;

	constructor(params: ColorNodeParams) {
		super(params);
		this.color = params.color;
	}

	async render({ target }: { target: RenderTarget }) {
		if (/gradient\(/i.test(this.color)) {
			drawCssBackground({
				ctx: target.context,
				width: target.width,
				height: target.height,
				css: this.color,
			});
			return;
		}

		target.context.fillStyle = this.color;
		target.context.fillRect(0, 0, target.width, target.height);
	}
}
