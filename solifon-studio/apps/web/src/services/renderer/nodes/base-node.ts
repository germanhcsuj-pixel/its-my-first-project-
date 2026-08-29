import { RenderEffect } from "../effects/render-effect";

export type BaseNodeParams = object | undefined;

export class BaseNode<Params extends BaseNodeParams = BaseNodeParams> {
	params: Params;

	constructor(params?: Params) {
		this.params = params ?? ({} as Params);
	}

	id: string = "";
	layerType: string = "composition";
	zIndex: number = 0;
	blendMode: import("../blend-modes").BlendMode = "normal";
	effects: RenderEffect[] = [];

	children: BaseNode[] = [];

	add(child: BaseNode) {
		this.children.push(child);
		return this;
	}

	remove(child: BaseNode) {
		this.children = this.children.filter((c) => c !== child);
		return this;
	}

	async render(args: {
		target: import("../render-target").RenderTarget;
		time: number;
		forceRender?: boolean;
		scheduler?: any;
	}): Promise<void> {
		for (const child of this.children) {
			if (args.scheduler) {
				await args.scheduler.renderNode({ node: child, target: args.target, time: args.time, forceRender: args.forceRender });
			} else {
				await child.render(args);
			}
		}
	}
}
