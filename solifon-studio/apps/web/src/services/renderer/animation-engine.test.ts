import { describe, it, expect } from "bun:test";
import { interpolate, evaluateAnimation, DEFAULT_ANIMATION_STATE } from "./animation-engine";
import type { KeyframeTrack, TransformKeyframes, PropertyKeyframes } from "@/types/timeline";

describe("interpolate()", () => {
	it("empty track", () => {
		const track: KeyframeTrack = [];
		expect(interpolate(track, 0, 5)).toBe(5);
		expect(interpolate(track, 10, 5)).toBe(5);
	});

	it("one keyframe", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10 }];
		expect(interpolate(track, 0, 5)).toBe(10);
		expect(interpolate(track, 2, 5)).toBe(10);
	});

	it("before first", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10 }, { time: 2, value: 20 }];
		expect(interpolate(track, 0, 5)).toBe(10);
	});

	it("after last", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10 }, { time: 2, value: 20 }];
		expect(interpolate(track, 3, 5)).toBe(20);
	});

	it("between keyframes (linear)", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10, easing: { type: "linear" } }, { time: 2, value: 20 }];
		expect(interpolate(track, 1.5, 5)).toBe(15);
	});

	it("between keyframes (ease-in)", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10, easing: { type: "ease-in" } }, { time: 2, value: 20 }];
		// progress 0.5 -> 0.25
		expect(interpolate(track, 1.5, 5)).toBe(12.5);
	});

	it("between keyframes (ease-out)", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10, easing: { type: "ease-out" } }, { time: 2, value: 20 }];
		// progress 0.5 -> 0.75
		expect(interpolate(track, 1.5, 5)).toBe(17.5);
	});

	it("between keyframes (ease-in-out)", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10, easing: { type: "ease-in-out" } }, { time: 2, value: 20 }];
		// progress 0.5 -> 0.5
		expect(interpolate(track, 1.5, 5)).toBe(15);
		// progress 0.25 -> 2 * 0.25^2 = 0.125
		expect(interpolate(track, 1.25, 5)).toBe(11.25);
	});

	it("between keyframes (bezier)", () => {
		const track: KeyframeTrack = [{ time: 1, value: 10, easing: { type: "bezier", p1: [0, 0], p2: [1, 1] } }, { time: 2, value: 20 }];
		// linear fallback equivalent for bezier in our simplified engine for these params
		expect(interpolate(track, 1.5, 5)).toBe(15);
	});
});

describe("evaluateAnimation()", () => {
	it("no keyframes -> DEFAULT_ANIMATION_STATE (with overrides)", () => {
		const state = evaluateAnimation(undefined, undefined, 0, { x: 100, y: 200, scale: 2, rotate: 45 }, 0.5);
		expect(state).toEqual({
			x: 100,
			y: 200,
			scale: 2,
			rotation: 45,
			opacity: 0.5,
			blur: 0
		});
	});

	it("no keyframes -> pure DEFAULT_ANIMATION_STATE", () => {
		const state = evaluateAnimation(undefined, undefined, 0);
		expect(state).toEqual(DEFAULT_ANIMATION_STATE);
	});

	it("partial keyframes -> defaults + animated values", () => {
		const transformKeyframes: TransformKeyframes = {
			x: [{ time: 0, value: 0 }, { time: 1, value: 100 }]
		};
		const state = evaluateAnimation(transformKeyframes, undefined, 0.5);
		expect(state).toEqual({
			...DEFAULT_ANIMATION_STATE,
			x: 50
		});
	});

	it("all keyframes -> correct complete state", () => {
		const transformKeyframes: TransformKeyframes = {
			x: [{ time: 0, value: 0 }, { time: 1, value: 100 }],
			y: [{ time: 0, value: 0 }, { time: 1, value: 200 }],
			scale: [{ time: 0, value: 1 }, { time: 1, value: 2 }],
			rotation: [{ time: 0, value: 0 }, { time: 1, value: 90 }]
		};
		const propertyKeyframes: PropertyKeyframes = {
			opacity: [{ time: 0, value: 0 }, { time: 1, value: 1 }],
			blur: [{ time: 0, value: 0 }, { time: 1, value: 10 }]
		};
		const state = evaluateAnimation(transformKeyframes, propertyKeyframes, 0.5);
		expect(state).toEqual({
			x: 50,
			y: 100,
			scale: 1.5,
			rotation: 45,
			opacity: 0.5,
			blur: 5
		});
	});
});
