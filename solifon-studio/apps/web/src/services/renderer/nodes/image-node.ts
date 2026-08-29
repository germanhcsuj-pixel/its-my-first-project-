import type { RenderTarget } from "../render-target";
import { VisualNode, type VisualNodeParams } from "./visual-node";
import { removeBackground } from "@imgly/background-removal";

export interface ImageNodeParams extends VisualNodeParams {
	url: string;
}

export class ImageNode extends VisualNode<ImageNodeParams> {
	private image?: HTMLImageElement;
	private readyPromise: Promise<void>;

	constructor(params: ImageNodeParams) {
		super(params);
		this.readyPromise = this.load();
	}

	private async load() {
		let finalUrl = this.params.url;
		
		if (this.params.removeBackground) {
			try {
				console.log("Removing background for", finalUrl);
				const imageBlob = await removeBackground(finalUrl);
				finalUrl = URL.createObjectURL(imageBlob);
			} catch (err) {
				console.error("Failed to remove background:", err);
			}
		}

		const image = new Image();
		image.crossOrigin = "anonymous";
		this.image = image;

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Image load failed"));
			image.src = finalUrl;
		});
	}

	async render(args: { target: RenderTarget; time: number; forceRender?: boolean }) {
		await super.render(args);

		if (!this.isInRange(args.time, args.forceRender)) {
			return;
		}

		await this.readyPromise;

		if (!this.image) {
			return;
		}

		const mediaW = this.image.naturalWidth || args.target.width;
		const mediaH = this.image.naturalHeight || args.target.height;

		this.renderVisual({
			target: args.target,
			source: this.image,
			sourceWidth: mediaW,
			sourceHeight: mediaH,
			time: args.time,
		});
	}
}
