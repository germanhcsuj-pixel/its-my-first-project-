import type { KeyframeTrack, Easing, TransformKeyframes, PropertyKeyframes } from "@/types/timeline";

// Easing functions based on standard mathematical easing equations
const EasingFunctions = {
	linear: (t: number) => t,
	"ease-in": (t: number) => t * t,
	"ease-out": (t: number) => t * (2 - t),
	"ease-in-out": (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	
	// Cubic Bezier approximation for standard CSS-like cubic-bezier(x1, y1, x2, y2)
	bezier: (t: number, p1: [number, number], p2: [number, number]) => {
		// Simplification for MVP: We approximate using a polynomial or just return t if complex.
		// A real cubic bezier solver requires a Newton-Raphson method or binary search.
		// For MVP, we'll implement a basic approximation or fallback to ease-in-out if it's too complex.
		// Actually, let's just use a simple bezier formula for the Y axis given a linear X (t).
		const u = 1 - t;
		const tt = t * t;
		const uu = u * u;
		const uuu = uu * u;
		const ttt = tt * t;
		
		// p0 = (0,0), p3 = (1,1)
		const y = uuu * 0 + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * 1;
		return y;
	},
	
	elastic: (t: number, amplitude: number = 1, period: number = 0.3) => {
		if (t === 0 || t === 1) return t;
		const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
		return -(amplitude * Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1) - s) * (2 * Math.PI) / period));
	}
};

function applyEasing(progress: number, easing?: Easing): number {
	if (!easing) return progress;

	switch (easing.type) {
		case "linear":
		case "ease-in":
		case "ease-out":
		case "ease-in-out":
			return EasingFunctions[easing.type](progress);
		case "bezier":
			return EasingFunctions.bezier(progress, easing.p1, easing.p2);
		case "elastic":
			return EasingFunctions.elastic(progress, easing.amplitude, easing.period);
		default:
			return progress;
	}
}

/**
 * Interpolates a value from a keyframe track for a given time.
 * If the time is before the first keyframe, returns the first keyframe's value.
 * If the time is after the last keyframe, returns the last keyframe's value.
 * Otherwise, interpolates between the two surrounding keyframes.
 * 
 * @param track The array of keyframes, must be sorted by time ascending
 * @param localTime The local time to evaluate at (relative to element start)
 * @param defaultValue Value to return if track is empty or undefined
 */
export function interpolate(track: KeyframeTrack | undefined, localTime: number, defaultValue: number): number {
	if (!track || track.length === 0) return defaultValue;
	if (track.length === 1) return track[0].value;

	if (localTime <= track[0].time) return track[0].value;
	if (localTime >= track[track.length - 1].time) return track[track.length - 1].value;

	// Find the surrounding keyframes
	let startIndex = 0;
	for (let i = 0; i < track.length - 1; i++) {
		if (localTime >= track[i].time && localTime < track[i + 1].time) {
			startIndex = i;
			break;
		}
	}

	const startKf = track[startIndex];
	const endKf = track[startIndex + 1];

	const duration = endKf.time - startKf.time;
	const progress = (localTime - startKf.time) / duration;

	const easedProgress = applyEasing(progress, startKf.easing);

	return startKf.value + (endKf.value - startKf.value) * easedProgress;
}

export type AnimationState = {
	x: number;
	y: number;
	scale: number;
	rotation: number;
	opacity: number;
	blur: number;
	fontSize?: number;
	letterSpacing?: number;
	lineHeight?: number;
};

export const DEFAULT_ANIMATION_STATE: AnimationState = {
	x: 0,
	y: 0,
	scale: 1,
	rotation: 0,
	opacity: 1,
	blur: 0,
};

/**
 * Evaluates the full AnimationState for a given localTime by interpolating all keyframe tracks.
 */
export function evaluateAnimation(
	transformKeyframes: TransformKeyframes | undefined,
	propertyKeyframes: PropertyKeyframes | undefined,
	localTime: number,
	baseTransform?: { x: number; y: number; scale: number; rotate: number },
	baseOpacity?: number
): AnimationState {
	
	// Start with default values + any base scalar properties from the element
	const state: AnimationState = {
		x: baseTransform?.x ?? DEFAULT_ANIMATION_STATE.x,
		y: baseTransform?.y ?? DEFAULT_ANIMATION_STATE.y,
		scale: baseTransform?.scale ?? DEFAULT_ANIMATION_STATE.scale,
		rotation: baseTransform?.rotate ?? DEFAULT_ANIMATION_STATE.rotation,
		opacity: baseOpacity ?? DEFAULT_ANIMATION_STATE.opacity,
		blur: DEFAULT_ANIMATION_STATE.blur,
	};

	if (transformKeyframes) {
		if (transformKeyframes.x) state.x = interpolate(transformKeyframes.x, localTime, state.x);
		if (transformKeyframes.y) state.y = interpolate(transformKeyframes.y, localTime, state.y);
		if (transformKeyframes.scale) state.scale = interpolate(transformKeyframes.scale, localTime, state.scale);
		if (transformKeyframes.rotation) state.rotation = interpolate(transformKeyframes.rotation, localTime, state.rotation);
	}

	if (propertyKeyframes) {
		if (propertyKeyframes.opacity) state.opacity = interpolate(propertyKeyframes.opacity, localTime, state.opacity);
		if (propertyKeyframes.blur) state.blur = interpolate(propertyKeyframes.blur, localTime, state.blur);
		if (propertyKeyframes.fontSize) state.fontSize = interpolate(propertyKeyframes.fontSize, localTime, state.fontSize ?? 16);
		if (propertyKeyframes.letterSpacing) state.letterSpacing = interpolate(propertyKeyframes.letterSpacing, localTime, state.letterSpacing ?? 0);
		if (propertyKeyframes.lineHeight) state.lineHeight = interpolate(propertyKeyframes.lineHeight, localTime, state.lineHeight ?? 1.2);
	}

	return state;
}
