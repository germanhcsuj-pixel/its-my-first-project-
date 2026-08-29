export type PathCommand =
	| { type: "moveTo"; x: number; y: number }
	| { type: "lineTo"; x: number; y: number }
	| { type: "quadraticTo"; cx: number; cy: number; x: number; y: number }
	| { type: "cubicTo"; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }
	| { type: "close" };

export interface PathGeometry {
	commands: PathCommand[];
}

export type Trim = {
	start: number; // 0..1
	end: number;   // 0..1
	offset?: number;
};

// Vector math helpers
const distance = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Bezier Evaluators
function evalQuad(p0: number, p1: number, p2: number, t: number): number {
	const mt = 1 - t;
	return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

function evalCubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
	const mt = 1 - t;
	return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// Split Bezier using De Casteljau
function splitQuad(
	x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, t: number
) {
	const x01 = lerp(x0, cx, t), y01 = lerp(y0, cy, t);
	const x12 = lerp(cx, x1, t), y12 = lerp(cy, y1, t);
	const bx = lerp(x01, x12, t), by = lerp(y01, y12, t);
	return {
		left: [{ type: "quadraticTo", cx: x01, cy: y01, x: bx, y: by } as Extract<PathCommand, {type: "quadraticTo"}>],
		right: [{ type: "quadraticTo", cx: x12, cy: y12, x: x1, y: y1 } as Extract<PathCommand, {type: "quadraticTo"}>],
		point: { x: bx, y: by }
	};
}

function splitCubic(
	x0: number, y0: number, c1x: number, c1y: number, c2x: number, c2y: number, x1: number, y1: number, t: number
) {
	const x01 = lerp(x0, c1x, t), y01 = lerp(y0, c1y, t);
	const x12 = lerp(c1x, c2x, t), y12 = lerp(c1y, c2y, t);
	const x23 = lerp(c2x, x1, t), y23 = lerp(c2y, y1, t);

	const x012 = lerp(x01, x12, t), y012 = lerp(y01, y12, t);
	const x123 = lerp(x12, x23, t), y123 = lerp(y12, y23, t);

	const bx = lerp(x012, x123, t), by = lerp(y012, y123, t);

	return {
		left: [{ type: "cubicTo", c1x: x01, c1y: y01, c2x: x012, c2y: y012, x: bx, y: by } as Extract<PathCommand, {type: "cubicTo"}>],
		right: [{ type: "cubicTo", c1x: x123, c1y: y123, c2x: x23, c2y: y23, x: x1, y: y1 } as Extract<PathCommand, {type: "cubicTo"}>],
		point: { x: bx, y: by }
	};
}

interface SegmentMeta {
	cmdIndex: number;
	len: number;
	accum: number;
	tMap: { dist: number, t: number }[];
	startPoint: { x: number, y: number };
}

// Approximates length and creates a dist->t map for constant velocity
function measureSegment(cmd: PathCommand, start: { x: number, y: number }): Omit<SegmentMeta, 'cmdIndex' | 'accum'> {
	if (cmd.type === "moveTo") return { len: 0, tMap: [{ dist: 0, t: 1 }], startPoint: start };
	if (cmd.type === "close") return { len: 0, tMap: [{ dist: 0, t: 1 }], startPoint: start };

	if (cmd.type === "lineTo") {
		const len = distance(start.x, start.y, cmd.x, cmd.y);
		return { len, tMap: [{ dist: 0, t: 0 }, { dist: len, t: 1 }], startPoint: start };
	}

	const samples = 30; // Approximation steps
	const tMap = [{ dist: 0, t: 0 }];
	let len = 0;
	let prevX = start.x, prevY = start.y;

	for (let i = 1; i <= samples; i++) {
		const t = i / samples;
		let x = 0, y = 0;
		if (cmd.type === "quadraticTo") {
			x = evalQuad(start.x, cmd.cx, cmd.x, t);
			y = evalQuad(start.y, cmd.cy, cmd.y, t);
		} else if (cmd.type === "cubicTo") {
			x = evalCubic(start.x, cmd.c1x, cmd.c2x, cmd.x, t);
			y = evalCubic(start.y, cmd.c1y, cmd.c2y, cmd.y, t);
		}
		len += distance(prevX, prevY, x, y);
		tMap.push({ dist: len, t });
		prevX = x;
		prevY = y;
	}

	return { len, tMap, startPoint: start };
}

function findTForDistance(dist: number, tMap: { dist: number, t: number }[]): number {
	if (dist <= 0) return 0;
	if (dist >= tMap[tMap.length - 1].dist) return 1;

	for (let i = 0; i < tMap.length - 1; i++) {
		const p1 = tMap[i];
		const p2 = tMap[i + 1];
		if (dist >= p1.dist && dist <= p2.dist) {
			const ratio = (dist - p1.dist) / (p2.dist - p1.dist);
			return lerp(p1.t, p2.t, ratio);
		}
	}
	return 1;
}

export function trimPath(geometry: PathGeometry, start: number, end: number, offset: number = 0): PathGeometry {
	// Clamp limits
	start = Math.max(0, Math.min(1, start));
	end = Math.max(0, Math.min(1, end));
	
	if (start === 0 && end === 1 && offset === 0) return { commands: [...geometry.commands] };
	if (start === end) return { commands: [] };

	// Normalize offset (wrap around 0..1)
	let normalizedOffset = offset % 1;
	if (normalizedOffset < 0) normalizedOffset += 1;

	// Resolve "close" commands to explicit lines to support trimming across them
	const resolvedCommands: PathCommand[] = [];
	let subpathStart = { x: 0, y: 0 };
	
	for (const cmd of geometry.commands) {
		if (cmd.type === "moveTo") {
			subpathStart = { x: cmd.x, y: cmd.y };
			resolvedCommands.push(cmd);
		} else if (cmd.type === "close") {
			resolvedCommands.push({ type: "lineTo", x: subpathStart.x, y: subpathStart.y });
		} else {
			resolvedCommands.push(cmd);
		}
	}

	// 1. Measure total length and segments
	let totalLength = 0;
	const segments: SegmentMeta[] = [];
	let currentPoint = { x: 0, y: 0 };

	for (let i = 0; i < resolvedCommands.length; i++) {
		const cmd = resolvedCommands[i];
		const measure = measureSegment(cmd, currentPoint);
		if (measure.len > 0) {
			segments.push({
				cmdIndex: i,
				len: measure.len,
				accum: totalLength,
				tMap: measure.tMap,
				startPoint: measure.startPoint
			});
			totalLength += measure.len;
		}
		if (cmd.type !== "close") {
			currentPoint = { x: (cmd as any).x, y: (cmd as any).y };
		}
	}

	if (totalLength === 0) return { commands: [] };

	// 2. Compute absolute trim targets based on offset
	let absoluteStart = (start + normalizedOffset) * totalLength;
	let absoluteEnd = (end + normalizedOffset) * totalLength;

	// Helper to extract a continuous slice
	const sliceGeometry = (targetStart: number, targetEnd: number): PathCommand[] => {
		const out: PathCommand[] = [];
		let isDrawing = false;
		
		for (const seg of segments) {
			const segStart = seg.accum;
			const segEnd = seg.accum + seg.len;

			// If segment is completely before target, skip
			if (segEnd <= targetStart) continue;
			// If segment is completely after target, stop
			if (segStart >= targetEnd) break;

			const cmd = resolvedCommands[seg.cmdIndex];
			
			// Needs partial start?
			const startT = segStart < targetStart ? findTForDistance(targetStart - segStart, seg.tMap) : 0;
			// Needs partial end?
			const endT = segEnd > targetEnd ? findTForDistance(targetEnd - segStart, seg.tMap) : 1;

			// Perform split
			let finalCmds: PathCommand[] = [];
			let startPt = seg.startPoint;

			if (startT === 0 && endT === 1) {
				finalCmds = [cmd];
			} else if (cmd.type === "lineTo") {
				const pt1x = lerp(seg.startPoint.x, cmd.x, startT);
				const pt1y = lerp(seg.startPoint.y, cmd.y, startT);
				startPt = { x: pt1x, y: pt1y };
				const pt2x = lerp(seg.startPoint.x, cmd.x, endT);
				const pt2y = lerp(seg.startPoint.y, cmd.y, endT);
				finalCmds = [{ type: "lineTo", x: pt2x, y: pt2y }];
			} else if (cmd.type === "quadraticTo") {
				let rightQuad = cmd as Extract<PathCommand, {type:"quadraticTo"}>;
				let pt = seg.startPoint;
				if (startT > 0) {
					const s = splitQuad(seg.startPoint.x, seg.startPoint.y, rightQuad.cx, rightQuad.cy, rightQuad.x, rightQuad.y, startT);
					rightQuad = s.right[0];
					pt = s.point;
				}
				startPt = pt;
				
				if (endT < 1) {
					const remappedEnd = (endT - startT) / (1 - startT);
					const s = splitQuad(pt.x, pt.y, rightQuad.cx, rightQuad.cy, rightQuad.x, rightQuad.y, remappedEnd);
					finalCmds = s.left;
				} else {
					finalCmds = [rightQuad];
				}
			} else if (cmd.type === "cubicTo") {
				let rightCubic = cmd as Extract<PathCommand, {type:"cubicTo"}>;
				let pt = seg.startPoint;
				if (startT > 0) {
					const s = splitCubic(seg.startPoint.x, seg.startPoint.y, rightCubic.c1x, rightCubic.c1y, rightCubic.c2x, rightCubic.c2y, rightCubic.x, rightCubic.y, startT);
					rightCubic = s.right[0];
					pt = s.point;
				}
				startPt = pt;

				if (endT < 1) {
					const remappedEnd = (endT - startT) / (1 - startT);
					const s = splitCubic(pt.x, pt.y, rightCubic.c1x, rightCubic.c1y, rightCubic.c2x, rightCubic.c2y, rightCubic.x, rightCubic.y, remappedEnd);
					finalCmds = s.left;
				} else {
					finalCmds = [rightCubic];
				}
			}

			// Add moveTo if this is the first command in the output slice
			if (!isDrawing) {
				out.push({ type: "moveTo", x: startPt.x, y: startPt.y });
				isDrawing = true;
			}

			out.push(...finalCmds);
		}

		return out;
	};

	let finalCommands: PathCommand[] = [];

	if (absoluteStart >= totalLength) {
		absoluteStart -= totalLength;
		absoluteEnd -= totalLength;
	}

	if (absoluteEnd <= totalLength) {
		// Single continuous slice
		finalCommands = sliceGeometry(absoluteStart, absoluteEnd);
	} else {
		// Wraps around the end
		const part1 = sliceGeometry(absoluteStart, totalLength);
		const part2 = sliceGeometry(0, absoluteEnd - totalLength);
		
		finalCommands.push(...part1);
		finalCommands.push(...part2);
	}

	return { commands: finalCommands };
}
