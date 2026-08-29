import { PathGeometry } from "./path";

export function createLine(x1: number, y1: number, x2: number, y2: number): PathGeometry {
	return {
		commands: [
			{ type: "moveTo", x: x1, y: y1 },
			{ type: "lineTo", x: x2, y: y2 }
		]
	};
}

export function createRect(x: number, y: number, width: number, height: number): PathGeometry {
	return {
		commands: [
			{ type: "moveTo", x, y },
			{ type: "lineTo", x: x + width, y },
			{ type: "lineTo", x: x + width, y: y + height },
			{ type: "lineTo", x, y: y + height },
			{ type: "close" }
		]
	};
}

export function createEllipse(x: number, y: number, radiusX: number, radiusY: number): PathGeometry {
	// Approximate ellipse with 4 cubic bezier curves
	const kappa = 0.5522848;
	const ox = radiusX * kappa;
	const oy = radiusY * kappa;
	
	const left = x - radiusX;
	const right = x + radiusX;
	const top = y - radiusY;
	const bottom = y + radiusY;

	return {
		commands: [
			{ type: "moveTo", x: x, y: top },
			// Top to Right
			{ type: "cubicTo", c1x: x + ox, c1y: top, c2x: right, c2y: y - oy, x: right, y: y },
			// Right to Bottom
			{ type: "cubicTo", c1x: right, c1y: y + oy, c2x: x + ox, c2y: bottom, x: x, y: bottom },
			// Bottom to Left
			{ type: "cubicTo", c1x: x - ox, c1y: bottom, c2x: left, c2y: y + oy, x: left, y: y },
			// Left to Top
			{ type: "cubicTo", c1x: left, c1y: y - oy, c2x: x - ox, c2y: top, x: x, y: top },
			{ type: "close" }
		]
	};
}

export function createPolygon(points: { x: number, y: number }[], close: boolean = true): PathGeometry {
	if (points.length === 0) return { commands: [] };
	
	const commands: any[] = points.map((p, i) => {
		if (i === 0) return { type: "moveTo" as const, x: p.x, y: p.y };
		return { type: "lineTo" as const, x: p.x, y: p.y };
	});
	
	if (close && points.length > 2) {
		commands.push({ type: "close" });
	}
	
	return { commands };
}
