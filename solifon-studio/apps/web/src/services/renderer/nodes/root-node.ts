import { BaseNode } from "./base-node";
import type { RenderTarget } from "../render-target";
import type { VirtualCamera, ProceduralShake } from "@/types/project";
import { evaluateAnimation, type AnimationState, DEFAULT_ANIMATION_STATE } from "../animation-engine";

export type RootNodeParams = {
	duration: number;
	camera?: VirtualCamera;
	canvasCenter: { x: number; y: number };
};

// Simple pseudo-random number generator for deterministic shake
function mulberry32(a: number) {
	return function() {
		var t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}

export function getShakeOffset(time: number, shake: ProceduralShake) {
	// A pure deterministic shake function based on time and seed
	// We want smooth shake, so we sample at intervals and interpolate, 
	// or use multiple sine waves with the seed acting as phase offsets.
	const timeHashX = Math.floor(shake.seed * 123.456);
	const timeHashY = Math.floor(shake.seed * 987.654);
	const timeHashR = Math.floor(shake.seed * 456.789);

	// decay: 1 = no decay. If < 1, shake reduces over time
	const decayFactor = shake.decay < 1 ? Math.pow(shake.decay, time) : 1;
	const currentIntensity = shake.intensity * decayFactor;

	if (currentIntensity < 0.001) return { x: 0, y: 0, rotation: 0 };

	const x = Math.sin(time * shake.frequency * Math.PI * 2 + timeHashX) * currentIntensity;
	const y = Math.cos(time * shake.frequency * Math.PI * 2.3 + timeHashY) * currentIntensity;
	const rotation = Math.sin(time * shake.frequency * Math.PI * 1.7 + timeHashR) * (currentIntensity * 0.1);

	return { x, y, rotation };
}

export class RootNode extends BaseNode<RootNodeParams> {
	get duration() {
		return this.params.duration ?? 0;
	}

	async render(args: { target: RenderTarget; time: number; forceRender?: boolean }) {
		if (this.params.camera) {
			const ctx = args.target.context;
			ctx.save();

			const animState = evaluateAnimation(
				{
					x: this.params.camera.x,
					y: this.params.camera.y,
					scale: this.params.camera.scale,
					rotation: this.params.camera.rotation,
				},
				undefined,
				args.time
			);

			let shakeOffsetX = 0;
			let shakeOffsetY = 0;
			let shakeRotation = 0;

			if (this.params.camera.shake) {
				const shakeOffset = getShakeOffset(args.time, this.params.camera.shake);
				shakeOffsetX = shakeOffset.x;
				shakeOffsetY = shakeOffset.y;
				shakeRotation = shakeOffset.rotation;
			}

			const finalX = animState.x + shakeOffsetX;
			const finalY = animState.y + shakeOffsetY;
			const finalRotation = animState.rotation + shakeRotation;

			const cx = this.params.canvasCenter.x;
			const cy = this.params.canvasCenter.y;

			ctx.translate(cx, cy);
			ctx.translate(finalX, finalY);
			
			if (finalRotation !== 0) {
				ctx.rotate(finalRotation * Math.PI / 180);
			}
			
			if (animState.scale !== 1) {
				ctx.scale(animState.scale, animState.scale);
			}
			
			ctx.translate(-cx, -cy);

			// Render children with the global camera transform applied
			await super.render(args);

			ctx.restore();
		} else {
			// No camera, just render normally
			await super.render(args);
		}
	}
}
