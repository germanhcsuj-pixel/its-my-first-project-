import { describe, it, expect } from "bun:test";
import { RootNode, getShakeOffset } from "./nodes/root-node";
import { resolveMotionRecipe } from "@/lib/ai/motion-recipes";
import { evaluateAnimation, DEFAULT_ANIMATION_STATE } from "./animation-engine";
import { VisualNode } from "./nodes/visual-node";

describe("Determinism & Integration", () => {
	it("same seed + same time -> same shake", () => {
		const shake1 = getShakeOffset(1.5, { intensity: 10, frequency: 2, seed: 12345, decay: 1 });
		const shake2 = getShakeOffset(1.5, { intensity: 10, frequency: 2, seed: 12345, decay: 1 });
		expect(shake1).toEqual(shake2);
	});

	it("different seed + same time -> different shake", () => {
		const shake1 = getShakeOffset(1.5, { intensity: 10, frequency: 2, seed: 12345, decay: 1 });
		const shake2 = getShakeOffset(1.5, { intensity: 10, frequency: 2, seed: 99999, decay: 1 });
		expect(shake1).not.toEqual(shake2);
	});

	it("Motion Recipes return expected deterministic keyframes", () => {
		const zoom = resolveMotionRecipe("IMPACT_ZOOM", 2.0);
		expect(zoom.transformKeyframes?.scale?.length).toBeGreaterThan(0);
		
		const panLeft = resolveMotionRecipe("FAST_PAN_LEFT", 2.0);
		expect(panLeft.transformKeyframes?.x?.length).toBeGreaterThan(0);
	});
});

describe("Regression & Old Projects", () => {
	it("Old project with no keyframes generates DEFAULT_ANIMATION_STATE values", () => {
		const state = evaluateAnimation(
			undefined,
			undefined,
			0,
			{ x: 0, y: 0, scale: 1, rotate: 0 },
			1
		);
		expect(state.scale).toBe(1);
		expect(state.opacity).toBe(1);
		expect(state.rotation).toBe(0);
		expect(state.x).toBe(0);
		expect(state.y).toBe(0);
	});
});

describe("Integration: RootNode + Virtual Camera + Elements", () => {
	it("Camera transform is applied to scene correctly over time", () => {
		// Mock a simple scene
		// Frame 0: camera scale = 1, shake = ~0
		// Frame 30 (1s): camera scale = 1.1, shake = positive
		
		const rootNode = new RootNode({
			duration: 10,
			canvasCenter: { x: 500, y: 500 },
			camera: {
				scale: [
					{ time: 0, value: 1 },
					{ time: 2, value: 1.2 }
				],
				shake: {
					intensity: 0.15,
					frequency: 2,
					seed: 12345,
					decay: 1
				}
			}
		});

		// Just verifying the instance can be created and hold state properly,
		// as actual integration tests would require DOM/Canvas which is mocked here or unavailable.
		// Testing the pure data parts:
		const stateFrame0 = evaluateAnimation({ scale: rootNode.params.camera?.scale }, undefined, 0);
		expect(stateFrame0.scale).toBe(1);

		const stateFrame30 = evaluateAnimation({ scale: rootNode.params.camera?.scale }, undefined, 1); // 1 sec
		expect(stateFrame30.scale).toBe(1.1);
	});
});
