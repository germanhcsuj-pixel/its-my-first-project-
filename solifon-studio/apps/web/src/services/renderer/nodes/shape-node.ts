import { VisualNode, VisualNodeParams } from "./visual-node";
import { PathGeometry, trimPath } from "../geometry/path";
import { interpolate } from "../animation-engine";
import { KeyframeTrack } from "@/types/timeline";

export type StrokeStyle = {
	color: string;
	width: number;
	lineCap?: "butt" | "round" | "square";
	lineJoin?: "miter" | "round" | "bevel";
};

export type FillStyle = {
	color: string;
	opacity?: number;
};

export type ShapeStyle = {
	fill?: FillStyle;
	stroke?: StrokeStyle;
};

export type TrimParams = {
	start: number;
	end: number;
	offset?: number;
};

export type ShapeAnimationParams = {
	trimStart?: KeyframeTrack;
	trimEnd?: KeyframeTrack;
	trimOffset?: KeyframeTrack;
	strokeWidth?: KeyframeTrack;
	fillOpacity?: KeyframeTrack;
};

export interface ShapeNodeParams extends VisualNodeParams {
	geometry: PathGeometry;
	style: ShapeStyle;
	trim?: TrimParams;
	shapeAnimation?: ShapeAnimationParams;
}

export class ShapeNode extends VisualNode<ShapeNodeParams> {
	constructor(params: ShapeNodeParams) {
		super(params);
		this.layerType = "shape";
	}

	async render(args: { target: import("../render-target").RenderTarget; time: number; forceRender?: boolean; scheduler?: any }): Promise<void> {
		await super.render(args);
		
		if (!this.isInRange(args.time, args.forceRender)) {
			return;
		}

		const ctx = args.target.context;
		if (!ctx) return;

		const localTime = this.getLocalTime(args.time);

		// 1. Resolve Animations
		let trimStart = this.params.trim?.start ?? 0;
		let trimEnd = this.params.trim?.end ?? 1;
		let trimOffset = this.params.trim?.offset ?? 0;
		let strokeWidth = this.params.style.stroke?.width ?? 1;
		let fillOpacity = this.params.style.fill?.opacity ?? 1;

		if (this.params.shapeAnimation) {
			trimStart = interpolate(this.params.shapeAnimation.trimStart, localTime, trimStart);
			trimEnd = interpolate(this.params.shapeAnimation.trimEnd, localTime, trimEnd);
			trimOffset = interpolate(this.params.shapeAnimation.trimOffset, localTime, trimOffset);
			strokeWidth = interpolate(this.params.shapeAnimation.strokeWidth, localTime, strokeWidth);
			fillOpacity = interpolate(this.params.shapeAnimation.fillOpacity, localTime, fillOpacity);
		}

		// 2. Resolve Geometry
		let geometry = this.params.geometry;
		if (trimStart > 0 || trimEnd < 1 || trimOffset !== 0) {
			geometry = trimPath(geometry, trimStart, trimEnd, trimOffset);
		}

		if (geometry.commands.length === 0) return;

		// 3. Construct Path2D
		const path2d = new Path2D();
		for (const cmd of geometry.commands) {
			switch (cmd.type) {
				case "moveTo":
					path2d.moveTo(cmd.x, cmd.y);
					break;
				case "lineTo":
					path2d.lineTo(cmd.x, cmd.y);
					break;
				case "quadraticTo":
					path2d.quadraticCurveTo(cmd.cx, cmd.cy, cmd.x, cmd.y);
					break;
				case "cubicTo":
					path2d.bezierCurveTo(cmd.c1x, cmd.c1y, cmd.c2x, cmd.c2y, cmd.x, cmd.y);
					break;
				case "close":
					path2d.closePath();
					break;
			}
		}

		const animState = this.getAnimationState(args.time);
		this.applyTransform(ctx, animState);
		
		// 4. Render
		// Fill
		if (this.params.style.fill) {
			ctx.fillStyle = this.params.style.fill.color;
			ctx.globalAlpha = fillOpacity * animState.opacity;
			ctx.fill(path2d);
		}

		// Stroke
		if (this.params.style.stroke) {
			ctx.globalAlpha = animState.opacity;
			ctx.strokeStyle = this.params.style.stroke.color;
			ctx.lineWidth = strokeWidth;
			ctx.lineCap = this.params.style.stroke.lineCap ?? "butt";
			ctx.lineJoin = this.params.style.stroke.lineJoin ?? "miter";
			ctx.stroke(path2d);
		}

		ctx.restore();
	}
}
