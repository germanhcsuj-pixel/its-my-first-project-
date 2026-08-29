import { describe, expect, test, beforeEach } from "bun:test";
import { RenderScheduler } from "./render-scheduler";
import { ColorNode } from "./nodes/color-node";
import { RenderTarget } from "./render-target";
import { ImageNode } from "./nodes/image-node";
import { MotionBlurEffect } from "./effects/motion-blur-effect";

// Mock document and Image for RenderTarget
if (typeof globalThis.document === 'undefined') {
	(globalThis as any).document = {
		createElement: () => {
			let _width = 100;
			let _height = 100;
			// Simple pixel array mock for getImageData
			let _pixels = new Uint8ClampedArray(_width * _height * 4);
			
			return {
				getContext: () => ({
					drawImage: () => {}, // basic mock for most tests
					save: () => {},
					restore: () => {},
					fillRect: (x: number, y: number, w: number, h: number) => {
						// Extremely simple mock fillRect to write "red" color
						// so we can test accumulation
						for(let i=0; i<w*h*4; i+=4) {
							_pixels[i] = 255;
							_pixels[i+3] = 255;
						}
					},
					clearRect: () => {
						_pixels.fill(0);
					},
					getImageData: (x: number, y: number, w: number, h: number) => {
						return { data: _pixels, width: w, height: h };
					},
					translate: () => {},
					rotate: () => {},
					scale: () => {},
					measureText: () => ({ width: 10 }),
					fillText: () => {}
				}),
				get width() { return _width; },
				set width(w) { _width = w; _pixels = new Uint8ClampedArray(_width * _height * 4); },
				get height() { return _height; },
				set height(h) { _height = h; _pixels = new Uint8ClampedArray(_width * _height * 4); }
			};
		}
	};
}
if (typeof globalThis.Image === 'undefined') {
	(globalThis as any).Image = class {
		onload: () => void = () => {};
		onerror: () => void = () => {};
		src: string = "";
		constructor() {
			setTimeout(() => this.onload(), 0);
		}
	};
}

describe("RenderScheduler", () => {
	let scheduler: RenderScheduler;
	let target: RenderTarget;

	beforeEach(() => {
		scheduler = new RenderScheduler(1024 * 1024 * 10, 100); 
		target = new RenderTarget({ width: 10, height: 10 });
	});

	test("Static layer should hit static cache and ignore time", async () => {
		const node = new ColorNode({ color: "red" });
		node.id = "static-color";
		
		await scheduler.renderNode({ node, target, time: 0 });
		expect(scheduler.metrics.misses).toBe(1);
		expect(scheduler.metrics.staticHits).toBe(0);

		await scheduler.renderNode({ node, target, time: 1.5 });
		expect(scheduler.metrics.misses).toBe(1);
		expect(scheduler.metrics.staticHits).toBe(1);
	});

	test("Animated layer should hit frame cache for same time, but miss for different time", async () => {
		const node = new ImageNode({ 
			url: "test.png",
			startTime: 0,
			duration: 5,
			timeOffset: 0,
			trimStart: 0,
			trimEnd: 5,
			opacity: 1,
			transform: {
				position: { x: 0, y: 0 },
				scale: 1,
				rotate: 0,
				transformKeyframes: {
					scale: [
						{ time: 0, value: 1 },
						{ time: 5, value: 2 }
					]
				}
			}
		});
		node.id = "animated-img";
		
		await scheduler.renderNode({ node, target, time: 0 });
		expect(scheduler.metrics.misses).toBe(1);

		await scheduler.renderNode({ node, target, time: 0 });
		expect(scheduler.metrics.misses).toBe(1);
		expect(scheduler.metrics.frameHits).toBe(1);

		await scheduler.renderNode({ node, target, time: 1 });
		expect(scheduler.metrics.misses).toBe(2);
		expect(scheduler.metrics.frameHits).toBe(1);
	});

	test("Motion Blur deduplicates temporal samples", async () => {
		const node = new ImageNode({ 
			url: "test.png",
			startTime: 0,
			duration: 5,
			timeOffset: 0,
			trimStart: 0,
			trimEnd: 5,
			opacity: 1,
			transform: {
				position: { x: 0, y: 0 },
				scale: 1,
				rotate: 0,
				transformKeyframes: {
					scale: [
						{ time: 0, value: 1 },
						{ time: 5, value: 2 }
					]
				}
			}
		});
		node.id = "mb-img";
		node.effects.push(new MotionBlurEffect(8, 180));
		
		await scheduler.renderNode({ node, target, time: 1.0 });
		
		expect(scheduler.metrics.misses).toBe(1);
		expect(scheduler.metrics.renderedSamples).toBe(8);
		expect(scheduler.metrics.temporalReused).toBe(0);

		await scheduler.renderNode({ node, target, time: 1.0 });
		
		expect(scheduler.metrics.misses).toBe(2); 
		expect(scheduler.metrics.renderedSamples).toBe(8); 
		expect(scheduler.metrics.temporalReused).toBe(8); 
	});

	test("Invalidation works correctly via cacheIndex", async () => {
		const node = new ColorNode({ color: "blue" });
		node.id = "invalid-test";
		
		await scheduler.renderNode({ node, target, time: 0 });
		expect(scheduler.metrics.misses).toBe(1);
		
		scheduler.invalidateNode("invalid-test");
		
		await scheduler.renderNode({ node, target, time: 0 });
		expect(scheduler.metrics.misses).toBe(2);
	});

	test("LRU Eviction works when max memory is reached", async () => {
		// target is 100x100 = 40,000 bytes. (Using target size from test setup, actually we made it 10x10 = 400 bytes!)
		// Let's set limit to 1000 bytes (~2 entries)
		scheduler = new RenderScheduler(1000);
		
		const node1 = new ColorNode({ color: "red" }); node1.id = "n1";
		const node2 = new ColorNode({ color: "blue" }); node2.id = "n2";
		const node3 = new ColorNode({ color: "green" }); node3.id = "n3";
		
		await scheduler.renderNode({ node: node1, target, time: 0 });
		await scheduler.renderNode({ node: node2, target, time: 0 });
		await scheduler.renderNode({ node: node3, target, time: 0 });
		
		expect(scheduler.metrics.evictions).toBeGreaterThan(0);
		
		await scheduler.renderNode({ node: node1, target, time: 0 });
		expect(scheduler.metrics.misses).toBe(4);
	});
	
	test("Deterministic Cache Key for Effects", async () => {
		// Test that JSON serialization order doesn't break cache
		const node1 = new ColorNode({ color: "red" });
		node1.id = "eff";
		// Different object key insertion order, same data
		node1.effects = [{ type: "glow", radius: 5, intensity: 1 }];
		
		await scheduler.renderNode({ node: node1, target, time: 0 });
		
		const node2 = new ColorNode({ color: "red" });
		node2.id = "eff";
		node2.effects = [{ type: "glow", intensity: 1, radius: 5 }];
		
		await scheduler.renderNode({ node: node2, target, time: 0 });
		
		expect(scheduler.metrics.staticHits).toBe(1); // Keys should match deterministically
	});
});
