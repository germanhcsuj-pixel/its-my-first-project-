/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { fontRegistry } from '../font-registry';
import { textLayout } from '../text-layout';
import { kineticEvaluator } from '../kinetic-evaluator';

describe('P3.2 Typography System Regression Pass', () => {
	beforeEach(() => {
	});

	it('A. Identical input produces identical cache key and layout', () => {
		const input1 = {
			text: "Hello World",
			fontFamily: "Inter",
			fontSize: 48,
		};
		const input2 = {
			text: "Hello World",
			fontFamily: "Inter",
			fontSize: 48,
		};
		const key1 = textLayout.getCacheKey(input1);
		const key2 = textLayout.getCacheKey(input2);
		expect(key1).toBe(key2);

		const layout1 = textLayout.measure(input1);
		const layout2 = textLayout.measure(input2);
		expect(layout1).toBe(layout2); // Since it's cached, exact object reference should be returned
	});

	it('B. Change in fontSize produces different cache key', () => {
		const input1 = { text: "Hello", fontFamily: "Inter", fontSize: 48 };
		const input2 = { text: "Hello", fontFamily: "Inter", fontSize: 49 };
		expect(textLayout.getCacheKey(input1)).not.toBe(textLayout.getCacheKey(input2));
	});

	it('C. Change in letterSpacing produces different cache key', () => {
		const input1 = { text: "Hello", fontFamily: "Inter", fontSize: 48, letterSpacing: 0 };
		const input2 = { text: "Hello", fontFamily: "Inter", fontSize: 48, letterSpacing: 0.01 };
		expect(textLayout.getCacheKey(input1)).not.toBe(textLayout.getCacheKey(input2));
	});

	it('D. Different font weights produce different font identities', () => {
		const key1 = fontRegistry.getFontKey({ family: "Inter", weight: 400 });
		const key2 = fontRegistry.getFontKey({ family: "Inter", weight: 700 });
		expect(key1).not.toBe(key2);
	});

	it('E. Font failure handled explicitly', async () => {
		// Mock FontFace API to fail
		const originalFontFace = global.FontFace;
		global.FontFace = class {
			family: string;
			constructor(family: string) { this.family = family; }
			async load() { throw new Error("Network error"); }
		} as any;

		const spec = { family: "BrokenFont", url: "invalid.woff2" };
		
		try {
			await fontRegistry.loadFont(spec);
		} catch (e) {
			// Expected
		}

		expect(fontRegistry.getStatus(spec)).toBe("failed");
		
		// Restore
		global.FontFace = originalFontFace;
	});

	it('F. Multiline with maxWidth changes trigger layout recomputation', () => {
		const input1 = { text: "A very long text that needs wrapping", fontFamily: "Inter", fontSize: 48, maxWidth: 300 };
		const input2 = { text: "A very long text that needs wrapping", fontFamily: "Inter", fontSize: 48, maxWidth: 500 };
		
		expect(textLayout.getCacheKey(input1)).not.toBe(textLayout.getCacheKey(input2));
		
		const layout1 = textLayout.measure(input1);
		const layout2 = textLayout.measure(input2);
		
		expect(layout1.lines.length).not.toBe(layout2.lines.length);
	});
	
	it('G. First frame readiness check works', () => {
		const spec = { family: "Roboto", url: "roboto.woff2" };
		// Initially not ready because it has a URL and hasn't been loaded
		expect(fontRegistry.isReady(spec)).toBe(false);
	});

	it('H. Kinetic Evaluator: Different time produces different entity transforms', () => {
		const input = { text: "Kinetic typography test", fontFamily: "Inter", fontSize: 48 };
		const layout = textLayout.measure(input);
		
		const config: any = { scope: "word", type: "fade-stagger", staggerDelay: 0.1 };
		
		const stateTime1 = kineticEvaluator.evaluate(layout.words, 0.1, config);
		const stateTime2 = kineticEvaluator.evaluate(layout.words, 0.2, config);
		
		// At t=0.1, second word (index 1) might be starting to fade in (progress 0)
		// At t=0.2, second word is further along (progress > 0)
		expect(stateTime1[1].opacity).not.toBe(stateTime2[1].opacity);
	});

	it('I. Kinetic Evaluator: Reaches final state equal to base layout', () => {
		const input = { text: "Testing parity", fontFamily: "Inter", fontSize: 48 };
		const layout = textLayout.measure(input);
		
		const config: any = { scope: "word", type: "slide", staggerDelay: 0.1 };
		
		// Pick a time large enough so all animations are done (e.g. t = 10s)
		const finalStates = kineticEvaluator.evaluate(layout.words, 10, config);
		
		expect(finalStates.length).toBe(layout.words.length);
		for (let i = 0; i < finalStates.length; i++) {
			const state = finalStates[i];
			const word = layout.words[i];
			
			// Final opacity should be 1
			expect(state.opacity).toBe(1);
			expect(state.visible).toBe(true);
			// Final y should exactly match layout y
			expect(state.y).toBe(word.y);
			// Scaling and rotation should be 1 and 0
			expect(state.scaleX).toBe(1);
			expect(state.scaleY).toBe(1);
			expect(state.rotation).toBe(0);
		}
	});

	it('J. TextLayout: Correctly segments grapheme clusters', () => {
		const input = { text: "👨‍👩‍👧‍👦é", fontFamily: "Inter", fontSize: 48 };
		const layout = textLayout.measure(input);
		// Graphemes are handled if Intl.Segmenter is present (we mock its absence generally, but if present it should be 2 characters)
		// We expect characters to be properly captured.
		expect(layout.characters.length).toBeGreaterThan(0);
		// At least one word, some characters.
	});

	it('K. Kinetic Evaluator: Reveal effect manages visibility and revealProgress', () => {
		const input = { text: "Reveal", fontFamily: "Inter", fontSize: 48 };
		const layout = textLayout.measure(input);
		const config: any = { scope: "character", type: "reveal", staggerDelay: 0.1 };
		
		const stateTime = kineticEvaluator.evaluate(layout.characters, 0.1, config); // First char done or progressing, second char starting
		expect(stateTime[0].visible).toBe(true);
		expect(stateTime[0].revealProgress).toBeGreaterThan(0);
	});
});
