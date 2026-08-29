import { BaseNode } from "./base-node";
import type { RenderTarget } from "../render-target";
import { applyBlendMode } from "../blend-modes";
import { getSharedTargets } from "../shared-targets";

export class LayerCompositorNode extends BaseNode {
	async render(args: { target: RenderTarget; time: number; forceRender?: boolean; skipEffects?: Set<string> }) {
		// 1. Sort layers by zIndex, then by id as tie-breaker
		const sortedChildren = [...this.children].sort((a, b) => {
			if (a.zIndex !== b.zIndex) {
				return a.zIndex - b.zIndex;
			}
			return a.id.localeCompare(b.id);
		});

		// Obtain shared temporary buffers for rendering and ping-ponging effects
		const { tempTarget, targetB } = getSharedTargets(args.target.width, args.target.height);

		// 2. Render each layer to the composition buffer with effects, opacity, and blend modes
		for (const child of sortedChildren) {
			// Clear the temp buffer before rendering the layer
			tempTarget.clear();
			
			// Render the layer fully opaque into the temp buffer
			if ((args as any).scheduler) {
				await (args as any).scheduler.renderNode({ node: child, target: tempTarget, time: args.time, forceRender: args.forceRender });
			} else {
				await child.render({ ...args, target: tempTarget, ignoreOpacity: true } as any);
			}

			// 3. Ping-pong Effect Pipeline
			let currentTarget = tempTarget;
			const effectsToApply = child.effects?.filter(e => !args.skipEffects?.has(e.type)) || [];
			
			if (effectsToApply.length > 0) {
				const context = {
					time: args.time,
					width: args.target.width,
					height: args.target.height,
					deltaTime: 0, // Not passed yet, can be added later if engine tracks dt
					fps: (args.target as any).fps ?? 30,
					renderNodeAtTime: async (t: number, target: RenderTarget) => {
						target.clear();
						if ((args as any).scheduler) {
							await (args as any).scheduler.renderNode({ node: child, target, time: t, forceRender: args.forceRender });
						} else {
							await child.render({ ...args, time: t, target, ignoreOpacity: true } as any);
						}
					}
				};
				
				let nextTarget = targetB;
				for (const effect of effectsToApply) {
					nextTarget.clear();
					
					// Ensure async apply handles promise if needed
					const result = effect.apply(currentTarget, nextTarget, context);
					if (result instanceof Promise) {
						await result;
					}
					
					// Swap buffers
					const t = currentTarget;
					currentTarget = nextTarget;
					nextTarget = t;
				}
			}
			
			const opacity = typeof (child as any).getOpacity === 'function' ? (child as any).getOpacity(args.time) : 1;
			const blendMode = child.blendMode || "normal";
			
			// 4. Composite to Composition Buffer
			args.target.context.save();
			args.target.context.globalAlpha = opacity;
			applyBlendMode(args.target.context, blendMode);
			args.target.context.drawImage(currentTarget.canvas, 0, 0);
			args.target.context.restore();
		}
	}
}
