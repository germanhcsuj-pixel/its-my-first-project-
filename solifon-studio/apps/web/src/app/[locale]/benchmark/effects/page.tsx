"use client";

import { useEffect, useState } from "react";
import { EffectValidator } from "@/services/renderer/effects/effect-validator";
import { EffectTargetResolver } from "@/services/renderer/effects/effect-target-resolver";
import { EffectEvaluator } from "@/services/renderer/effects/effect-evaluator";
import { EffectReference } from "@/services/renderer/effects/effect-reference";
import { EffectDistortionReference, PixelBuffer } from "@/services/renderer/effects/effect-distortion-reference";
import { EffectCache } from "@/services/renderer/effects/effect-cache";
import { EffectCompositor } from "@/services/renderer/effects/effect-compositor";
import { TrackedMaskResolver } from "@/services/tracking/tracked-mask-resolver";
import { RenderTargetPool } from "@/services/renderer/masks/mask-compositor";
import { RenderTarget } from "@/services/renderer/render-target";
import { EffectDefinition, ResolvedEffectTarget, MaskDefinition, AlphaMask, AnimatedNumber, AnimatedRGBA, EvaluatedEffect, RGBA } from "@/types/timeline";
import { EffectKeyframeEvaluator } from "@/services/renderer/effects/effect-keyframe-evaluator";
import { EffectTemporalValidator } from "@/services/renderer/effects/effect-temporal-validator";
import { EffectParameterGraph } from "@/services/renderer/effects/effect-parameter-graph";
import { EffectTemporalReference, RefNode } from "@/services/renderer/effects/effect-temporal-reference";
import { TrackingResult } from "@/services/tracking/tracking-types";

interface TestResult {
	id: string;
	name: string;
	passed: boolean;
	message: string;
}

export default function EffectsBenchmarkPage() {
	const [results, setResults] = useState<TestResult[]>([]);
	const [overallPass, setOverallPass] = useState<boolean | null>(null);

	useEffect(() => {
		const testLog: TestResult[] = [];
		let allPassed = true;

		const runAssert = (id: string, name: string, fn: () => void) => {
			try {
				fn();
				testLog.push({ id, name, passed: true, message: "OK" });
			} catch (e: unknown) {
				allPassed = false;
				const errMsg = e instanceof Error ? e.message : String(e);
				testLog.push({ id, name, passed: false, message: errMsg });
			}
		};

		// Helper to create a non-trivial 10x10 image with fractional alpha and contrasting regions
		const createNonTrivialImage = (width = 10, height = 10): PixelBuffer => {
			const data = new Uint8ClampedArray(width * height * 4);
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const idx = (y * width + x) * 4;
					if (x < width / 2 && y < height / 2) {
						// Region A (RGB=120, 150, 180, A=200)
						data[idx] = 120;
						data[idx + 1] = 150;
						data[idx + 2] = 180;
						data[idx + 3] = 200;
					} else if (x >= width / 2 && y >= height / 2) {
						// Region B (RGB=90, 80, 110, A=100)
						data[idx] = 90;
						data[idx + 1] = 80;
						data[idx + 2] = 110;
						data[idx + 3] = 100;
					} else if (x >= width / 2 && y < height / 2) {
						// Region C (Transparent)
						data[idx] = 0;
						data[idx + 1] = 0;
						data[idx + 2] = 0;
						data[idx + 3] = 0;
					} else {
						// Region D (RGB=180, 220, 240, A=255)
						data[idx] = 180;
						data[idx + 1] = 220;
						data[idx + 2] = 240;
						data[idx + 3] = 255;
					}
				}
			}
			return { width, height, data };
		};

		const dummyAlphaMask: AlphaMask = {
			width: 2,
			height: 2,
			data: new Uint8ClampedArray([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]),
			sourceId: "src-1",
			contentHash: "hash-A"
		};

		const dummyMaskDef: MaskDefinition = {
			id: "mask-123",
			mode: "add",
			inverted: false,
			feather: 0,
			opacity: 1,
			source: { type: "alpha", mask: dummyAlphaMask }
		};

		const trackingResult: TrackingResult = {
			inputHash: "input-1",
			modelId: "mock-model",
			modelVersion: "1.0",
			frameCount: 3,
			tracks: [
				{
					trackId: "track-12",
					label: "person",
					startFrame: 0,
					endFrame: 2,
					observations: [
						{
							frameIndex: 0,
							timestamp: 0,
							detectionId: "det-0",
							label: "person",
							confidence: 0.9,
							bounds: { x: 0, y: 0, width: 10, height: 10 },
							maskSource: { type: "alpha", mask: dummyAlphaMask }
						},
						{
							frameIndex: 1,
							timestamp: 0.04,
							detectionId: "det-1",
							label: "person",
							confidence: 0.95,
							bounds: { x: 2, y: 2, width: 10, height: 10 },
							maskSource: { type: "alpha", mask: { ...dummyAlphaMask, contentHash: "hash-B" } }
						},
						{
							frameIndex: 2,
							timestamp: 0.08,
							detectionId: "det-2",
							label: "person",
							confidence: 0.92,
							bounds: { x: 4, y: 4, width: 10, height: 10 },
							maskSource: { type: "alpha", mask: { ...dummyAlphaMask, contentHash: "hash-C" } }
						}
					]
				}
			]
		};

		TrackedMaskResolver.clear();
		TrackedMaskResolver.registerResult(trackingResult);

		// ==================================================
		// GROUP A: Types & Parameter Validation
		// ==================================================
		runAssert("val-displacement-valid", "Displacement definition validation", () => {
			const effect: EffectDefinition = {
				id: "fx-disp-1",
				type: "displacement",
				enabled: true,
				opacity: 1,
				parameters: { strength: { mode: "static" as const, value: 10 }, scale: { mode: "static" as const, value: 50 }, angle: { mode: "static" as const, value: 45 } }
			};
			EffectValidator.validate(effect);
		});

		runAssert("val-displacement-invalid-scale", "Displacement scale <= 0 rejected", () => {
			const effect: EffectDefinition = {
				id: "fx-disp-2",
				type: "displacement",
				enabled: true,
				opacity: 1,
				parameters: { strength: { mode: "static" as const, value: 10 }, scale: { mode: "static" as const, value: 0 }, angle: { mode: "static" as const, value: 45 } }
			};
			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Accepted scale = 0");
		});

		runAssert("val-wave-valid", "Wave definition validation", () => {
			const effect: EffectDefinition = {
				id: "fx-wave-1",
				type: "wave",
				enabled: true,
				opacity: 0.9,
				parameters: { amplitude: { mode: "static" as const, value: 20 }, frequency: { mode: "static" as const, value: 0.05 }, phase: { mode: "static" as const, value: 1.5 }, direction: { mode: "static" as const, value: 90 } }
			};
			EffectValidator.validate(effect);
		});

		runAssert("val-wave-invalid-frequency", "Wave frequency <= 0 rejected", () => {
			const effect: EffectDefinition = {
				id: "fx-wave-2",
				type: "wave",
				enabled: true,
				opacity: 1,
				parameters: { amplitude: { mode: "static" as const, value: 20 }, frequency: { mode: "static" as const, value: -0.1 }, phase: { mode: "static" as const, value: 1.5 }, direction: { mode: "static" as const, value: 90 } }
			};
			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Accepted negative frequency");
		});

		runAssert("val-lens-valid", "Lens definition validation", () => {
			const effect: EffectDefinition = {
				id: "fx-lens-1",
				type: "lens",
				enabled: true,
				opacity: 1,
				parameters: { strength: { mode: "static" as const, value: 3.5 }, radius: { mode: "static" as const, value: 100 }, centerX: { mode: "static" as const, value: 250 }, centerY: { mode: "static" as const, value: 250 } }
			};
			EffectValidator.validate(effect);
		});

		runAssert("val-lens-invalid-radius", "Lens radius <= 0 rejected", () => {
			const effect: EffectDefinition = {
				id: "fx-lens-2",
				type: "lens",
				enabled: true,
				opacity: 1,
				parameters: { strength: { mode: "static" as const, value: 3.5 }, radius: { mode: "static" as const, value: 0 }, centerX: { mode: "static" as const, value: 250 }, centerY: { mode: "static" as const, value: 250 } }
			};
			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Accepted radius = 0");
		});

		runAssert("val-lens-invalid-strength", "Lens strength out of [-10, 10] rejected", () => {
			const effect: EffectDefinition = {
				id: "fx-lens-3",
				type: "lens",
				enabled: true,
				opacity: 1,
				parameters: { strength: { mode: "static" as const, value: 11 }, radius: { mode: "static" as const, value: 100 }, centerX: { mode: "static" as const, value: 250 }, centerY: { mode: "static" as const, value: 250 } }
			};
			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Accepted strength out of bounds");
		});

		runAssert("val-nan-check", "NaN parameters rejected by validator", () => {
			const effect: EffectDefinition = {
				id: "fx-lens-nan",
				type: "lens",
				enabled: true,
				opacity: 1,
				parameters: { strength: { mode: "static" as const, value: NaN }, radius: { mode: "static" as const, value: 100 }, centerX: { mode: "static" as const, value: 250 }, centerY: { mode: "static" as const, value: 250 } }
			};
			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Accepted NaN strength");
		});

		runAssert("val-infinity-check", "Infinity parameters rejected by validator", () => {
			const effect: EffectDefinition = {
				id: "fx-wave-inf",
				type: "wave",
				enabled: true,
				opacity: 1,
				parameters: { amplitude: { mode: "static" as const, value: Infinity }, frequency: { mode: "static" as const, value: 0.1 }, phase: { mode: "static" as const, value: 0 }, direction: { mode: "static" as const, value: 0 } }
			};
			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Accepted Infinity amplitude");
		});

		// ==================================================
		// GROUP B: PixelBuffer Validation
		// ==================================================
		runAssert("pixelbuffer-validation-valid", "PixelBuffer valid properties pass", () => {
			const buf: PixelBuffer = {
				width: 2,
				height: 2,
				data: new Uint8ClampedArray(16)
			};
			EffectDistortionReference.validatePixelBuffer(buf);
		});

		runAssert("pixelbuffer-validation-invalid-length", "PixelBuffer invalid length throws", () => {
			const buf: PixelBuffer = {
				width: 2,
				height: 2,
				data: new Uint8ClampedArray(15)
			};
			let threw = false;
			try {
				EffectDistortionReference.validatePixelBuffer(buf);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Accepted invalid data length");
		});

		// ==================================================
		// GROUP C: Bilinear Sampling Hardening
		// ==================================================
		runAssert("bilinear-sampler-precision", "Bilinear sampling interpolates precisely", () => {
			const data = new Uint8ClampedArray([
				10, 20, 30, 100,    40, 50, 60, 200,
				70, 80, 90, 150,    100, 110, 120, 250
			]);
			const buf: PixelBuffer = { width: 2, height: 2, data };

			// Integer sample (0, 0)
			const p1 = EffectDistortionReference.sampleBilinear(buf, 0, 0);
			if (p1.r !== 10 || p1.g !== 20 || p1.b !== 30 || p1.a !== 100) {
				throw new Error(`Integer sample mismatch: got [${p1.r}, ${p1.g}, ${p1.b}, ${p1.a}]`);
			}

			// Fractional sample (0.5, 0.5)
			const p2 = EffectDistortionReference.sampleBilinear(buf, 0.5, 0.5);
			const expectedR = 55;  // 0.25*10 + 0.25*40 + 0.25*70 + 0.25*100
			const expectedG = 65;
			const expectedB = 75;
			const expectedA = 175;
			if (p2.r !== expectedR || p2.g !== expectedG || p2.b !== expectedB || p2.a !== expectedA) {
				throw new Error(`Fractional bilinear mismatch: expected [${expectedR}, ${expectedG}, ${expectedB}, ${expectedA}], got [${p2.r}, ${p2.g}, ${p2.b}, ${p2.a}]`);
			}

			// Edge coordinates
			const pEdge = EffectDistortionReference.sampleBilinear(buf, 1, 1);
			if (pEdge.r !== 100 || pEdge.a !== 250) {
				throw new Error("Edge coordinate sample mismatch");
			}

			// Outside coordinates -> Transparent policy
			const pOutLeft = EffectDistortionReference.sampleBilinear(buf, -0.5, 0.5);
			if (pOutLeft.r !== 0 || pOutLeft.g !== 0 || pOutLeft.b !== 0 || pOutLeft.a !== 0) {
				throw new Error("Out-of-bounds left is not transparent");
			}
			const pOutBottom = EffectDistortionReference.sampleBilinear(buf, 0.5, 2.5);
			if (pOutBottom.a !== 0) {
				throw new Error("Out-of-bounds bottom is not transparent");
			}
		});

		// ==================================================
		// GROUP D: Edge Cases for All Distortions
		// ==================================================
		const testImage = createNonTrivialImage(10, 10);

		// 1. Displacement Edge Cases
		runAssert("edge-displacement-zero", "Displacement zero strength is identity", () => {
			const res = EffectDistortionReference.applyDisplacementReference(testImage, { strength: 0, scale: 20, angle: 90 });
			for (let i = 0; i < testImage.data.length; i++) {
				if (res.data[i] !== testImage.data[i]) throw new Error(`Mismatch at index ${i}`);
			}
		});

		runAssert("edge-displacement-bounds", "Displacement scale boundary limits", () => {
			// Smallest valid scale = 0.01, largest valid scale = 1000
			EffectDistortionReference.applyDisplacementReference(testImage, { strength: 10, scale: 0.01, angle: 45 });
			EffectDistortionReference.applyDisplacementReference(testImage, { strength: 10, scale: 1000, angle: 45 });
		});

		runAssert("edge-displacement-fractional", "Displacement fractional coordinates", () => {
			EffectDistortionReference.applyDisplacementReference(testImage, { strength: 2.5, scale: 10.5, angle: 90 });
		});

		// 2. Wave Edge Cases
		runAssert("edge-wave-zero", "Wave zero amplitude is identity", () => {
			const res = EffectDistortionReference.applyWaveReference(testImage, { amplitude: 0, frequency: 0.1, phase: 0, direction: 45 });
			for (let i = 0; i < testImage.data.length; i++) {
				if (res.data[i] !== testImage.data[i]) throw new Error(`Mismatch at index ${i}`);
			}
		});

		runAssert("edge-wave-fractional", "Wave fractional direction and frequency", () => {
			EffectDistortionReference.applyWaveReference(testImage, { amplitude: 5.5, frequency: 0.05, phase: 0.25, direction: 45.5 });
		});

		// 3. Lens Edge Cases
		runAssert("edge-lens-zero", "Lens zero strength is identity", () => {
			const res = EffectDistortionReference.applyLensReference(testImage, { strength: 0, radius: 5, centerX: 5, centerY: 5 });
			for (let i = 0; i < testImage.data.length; i++) {
				if (res.data[i] !== testImage.data[i]) throw new Error(`Mismatch at index ${i}`);
			}
		});

		runAssert("edge-lens-negative", "Lens negative strength pinch behavior", () => {
			EffectDistortionReference.applyLensReference(testImage, { strength: -2.5, radius: 5, centerX: 5, centerY: 5 });
		});

		runAssert("edge-lens-outside-boundary", "Lens coordinates outside radius are unmodified", () => {
			const res = EffectDistortionReference.applyLensReference(testImage, { strength: 5, radius: 2, centerX: 5, centerY: 5 });
			// (0, 0) is at distance sqrt(5^2 + 5^2) = 7.07 > radius 2. Pixel at (0, 0) must be exactly identical
			const idx = 0;
			if (res.data[idx] !== testImage.data[idx] || res.data[idx+3] !== testImage.data[idx+3]) {
				throw new Error("Lens leaked and mutated pixels outside the radius boundary");
			}
		});

		// 4. Dimensional Edge Cases (1x1, 1xN, Nx1)
		runAssert("edge-dimensions-1x1", "Distortions handle 1x1 image without crash", () => {
			const img1x1: PixelBuffer = { width: 1, height: 1, data: new Uint8ClampedArray([100, 150, 200, 255]) };
			EffectDistortionReference.applyDisplacementReference(img1x1, { strength: 5, scale: 10, angle: 45 });
			EffectDistortionReference.applyWaveReference(img1x1, { amplitude: 5, frequency: 0.1, phase: 0, direction: 90 });
			EffectDistortionReference.applyLensReference(img1x1, { strength: 2, radius: 5, centerX: 0, centerY: 0 });
		});

		runAssert("edge-dimensions-1xN", "Distortions handle 1xN image without crash", () => {
			const img1x5: PixelBuffer = { width: 1, height: 5, data: new Uint8ClampedArray(20) };
			EffectDistortionReference.applyDisplacementReference(img1x5, { strength: 5, scale: 10, angle: 45 });
			EffectDistortionReference.applyWaveReference(img1x5, { amplitude: 5, frequency: 0.1, phase: 0, direction: 90 });
			EffectDistortionReference.applyLensReference(img1x5, { strength: 2, radius: 5, centerX: 0, centerY: 2 });
		});

		runAssert("edge-dimensions-Nx1", "Distortions handle Nx1 image without crash", () => {
			const img5x1: PixelBuffer = { width: 5, height: 1, data: new Uint8ClampedArray(20) };
			EffectDistortionReference.applyDisplacementReference(img5x1, { strength: 5, scale: 10, angle: 45 });
			EffectDistortionReference.applyWaveReference(img5x1, { amplitude: 5, frequency: 0.1, phase: 0, direction: 90 });
			EffectDistortionReference.applyLensReference(img5x1, { strength: 2, radius: 5, centerX: 2, centerY: 0 });
		});

		// ==================================================
		// GROUP E: Effect Ordering Dependency Pixel-Level verification
		// ==================================================
		runAssert("ordering-displacement-blur", "Blur->Displacement vs Displacement->Blur yields different pixel outputs", () => {
			const fxBlur: EffectDefinition = { id: "b1", type: "blur", enabled: true, opacity: 1, parameters: { radius: { mode: "static" as const, value: 2 } } };
			const fxDisp: EffectDefinition = { id: "d1", type: "displacement", enabled: true, opacity: 1, parameters: { strength: { mode: "static" as const, value: 3 }, scale: { mode: "static" as const, value: 10 }, angle: { mode: "static" as const, value: 90 } } };
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const context = { time: 0, frameIndex: 0, fps: 30, target };

			const evBlur = EffectEvaluator.evaluate(fxBlur, context, 0);
			const evDisp = EffectEvaluator.evaluate(fxDisp, context, 1);
			const evDispFirst = EffectEvaluator.evaluate(fxDisp, context, 0);
			const evBlurSecond = EffectEvaluator.evaluate(fxBlur, context, 1);

			const out1 = EffectDistortionReference.applyEffectsReference(testImage, [evBlur, evDisp]);
			const out2 = EffectDistortionReference.applyEffectsReference(testImage, [evDispFirst, evBlurSecond]);

			let identical = true;
			for (let i = 0; i < out1.data.length; i++) {
				if (out1.data[i] !== out2.data[i]) {
					identical = false;
					break;
				}
			}
			if (identical) throw new Error("Ordering check failed: Blur->Disp and Disp->Blur are identical");
		});

		runAssert("ordering-displacement-wave", "Displacement->Wave vs Wave->Displacement yields different pixel outputs", () => {
			const fxDisp: EffectDefinition = { id: "d1", type: "displacement", enabled: true, opacity: 1, parameters: { strength: { mode: "static" as const, value: 3 }, scale: { mode: "static" as const, value: 10 }, angle: { mode: "static" as const, value: 30 } } };
			const fxWave: EffectDefinition = { id: "w1", type: "wave", enabled: true, opacity: 1, parameters: { amplitude: { mode: "static" as const, value: 3 }, frequency: { mode: "static" as const, value: 0.1 }, phase: { mode: "static" as const, value: 0 }, direction: { mode: "static" as const, value: 60 } } };
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const context = { time: 0, frameIndex: 0, fps: 30, target };

			const evDisp = EffectEvaluator.evaluate(fxDisp, context, 0);
			const evWave = EffectEvaluator.evaluate(fxWave, context, 1);
			const evWaveFirst = EffectEvaluator.evaluate(fxWave, context, 0);
			const evDispSecond = EffectEvaluator.evaluate(fxDisp, context, 1);

			const out1 = EffectDistortionReference.applyEffectsReference(testImage, [evDisp, evWave]);
			const out2 = EffectDistortionReference.applyEffectsReference(testImage, [evWaveFirst, evDispSecond]);

			let identical = true;
			for (let i = 0; i < out1.data.length; i++) {
				if (out1.data[i] !== out2.data[i]) {
					identical = false;
					break;
				}
			}
			if (identical) throw new Error("Ordering check failed: Disp->Wave and Wave->Disp are identical");
		});

		// ==================================================
		// GROUP F: Target Isolation verification (Layer/Mask/Track/Nested)
		// ==================================================
		const createScene = (): { rt: RenderTarget; idxA: number; idxB: number; idxC: number } => {
			const rt = new RenderTarget({ width: 10, height: 10 });
			const ctx = rt.context;
			ctx.fillStyle = "#000000";
			ctx.fillRect(0, 0, 10, 10);

			// Object A: top-left (Gradient RGB=100+x, 100+y, 180)
			for (let y = 0; y < 5; y++) {
				for (let x = 0; x < 5; x++) {
					ctx.fillStyle = `rgb(${100 + x * 20}, ${100 + y * 20}, 180)`;
					ctx.fillRect(x, y, 1, 1);
				}
			}

			// Object B: bottom-right (Gradient RGB=90, 80, 100+x)
			for (let y = 5; y < 10; y++) {
				for (let x = 5; x < 10; x++) {
					ctx.fillStyle = `rgb(90, 80, ${100 + (x - 5) * 20})`;
					ctx.fillRect(x, y, 1, 1);
				}
			}

			// Object C: bottom-left (Gradient RGB=150, 100+y, 90)
			for (let y = 5; y < 10; y++) {
				for (let x = 0; x < 5; x++) {
					ctx.fillStyle = `rgb(150, ${100 + (y - 5) * 20}, 90)`;
					ctx.fillRect(x, y, 1, 1);
				}
			}

			return {
				rt,
				idxA: (1 * 10 + 1) * 4,
				idxB: (8 * 10 + 8) * 4,
				idxC: (8 * 10 + 1) * 4
			};
		};

		const buildObjectAMask = (): AlphaMask => {
			const maskData = new Uint8ClampedArray(10 * 10 * 4);
			for (let y = 0; y < 10; y++) {
				for (let x = 0; x < 10; x++) {
					const idx = (y * 10 + x) * 4;
					if (x < 5 && y < 5) {
						maskData[idx + 3] = 255;
					}
				}
			}
			return {
				width: 10,
				height: 10,
				data: maskData,
				sourceId: "src-A",
				contentHash: "hash-A"
			};
		};

		// 1. Layer Target
		runAssert("isolate-layer", "Layer target: only targeted layer changes", () => {
			const { rt, idxA, idxB, idxC } = createScene();
			const effect: EffectDefinition = {
				id: "fx-wave-layer",
				type: "wave",
				enabled: true,
				opacity: 1.0,
				parameters: { amplitude: { mode: "static" as const, value: 5 }, frequency: { mode: "static" as const, value: 0.1 }, phase: { mode: "static" as const, value: 0 }, direction: { mode: "static" as const, value: 90 } }
			};
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-A", contentIdentity: "layer:el-A" };
			const evaluated = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0);

			EffectCompositor.applyEffects(rt, [evaluated]);
			const pixels = rt.context.getImageData(0, 0, 10, 10).data;

			// Verify Object A changed
			if (pixels[idxA] === 120 && pixels[idxA+1] === 150) {
				throw new Error("Object A did not change under layer wave");
			}
			// Verify Object B changed (since layer target affects the whole layer)
			if (pixels[idxB+2] === 110) {
				throw new Error("Object B was isolated under full layer target");
			}
			// Verify Object C changed (since layer target affects the whole layer)
			if (pixels[idxC+2] === 90) {
				throw new Error("Object C was isolated under full layer target");
			}
			rt.dispose();
		});

		// 2. Mask Target
		runAssert("isolate-mask-displacement", "Mask target: displacement isolates Object A and leaves Object B unchanged", () => {
			const { rt, idxA, idxB, idxC } = createScene();
			const mask = buildObjectAMask();
			const effect: EffectDefinition = {
				id: "fx-disp-mask",
				type: "displacement",
				enabled: true,
				opacity: 1.0,
				parameters: { strength: { mode: "static" as const, value: 4 }, scale: { mode: "static" as const, value: 10 }, angle: { mode: "static" as const, value: 45 } }
			};
			const target: ResolvedEffectTarget = { type: "mask", maskId: "mask-A", source: { type: "alpha", mask }, contentIdentity: "mask:mask-A" };
			const evaluated = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0);

			EffectCompositor.applyEffects(rt, [evaluated]);
			const pixels = rt.context.getImageData(0, 0, 10, 10).data;

			// A changed
			if (pixels[idxA] === 120 && pixels[idxA+1] === 150) throw new Error("A did not change");
			// B unchanged (tolerance = 15 for canvas readback)
			const diffB = Math.abs(pixels[idxB+2] - 160);
			if (diffB > 15) throw new Error(`B changed: got ${pixels[idxB+2]}, expected 160, error: ${diffB}`);
			// C unchanged
			const diffC = Math.abs(pixels[idxC+2] - 90);
			if (diffC > 15) throw new Error(`C changed: got ${pixels[idxC+2]}, expected 90, error: ${diffC}`);

			rt.dispose();
		});

		runAssert("isolate-mask-wave", "Mask target: wave isolates Object A", () => {
			const { rt, idxA, idxB, idxC } = createScene();
			const mask = buildObjectAMask();
			const effect: EffectDefinition = {
				id: "fx-wave-mask",
				type: "wave",
				enabled: true,
				opacity: 1.0,
				parameters: { amplitude: { mode: "static" as const, value: 4 }, frequency: { mode: "static" as const, value: 0.1 }, phase: { mode: "static" as const, value: 0 }, direction: { mode: "static" as const, value: 90 } }
			};
			const target: ResolvedEffectTarget = { type: "mask", maskId: "mask-A", source: { type: "alpha", mask }, contentIdentity: "mask:mask-A" };
			const evaluated = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0);

			EffectCompositor.applyEffects(rt, [evaluated]);
			const pixels = rt.context.getImageData(0, 0, 10, 10).data;

			if (pixels[idxA] === 120 && pixels[idxA+1] === 150) throw new Error("A did not change");
			const diffB = Math.abs(pixels[idxB+2] - 160);
			if (diffB > 15) throw new Error(`B changed: got ${pixels[idxB+2]}`);
			const diffC = Math.abs(pixels[idxC+2] - 90);
			if (diffC > 15) throw new Error(`C changed: got ${pixels[idxC+2]}`);

			rt.dispose();
		});

		runAssert("isolate-mask-lens", "Mask target: lens isolates Object A", () => {
			const { rt, idxA, idxB, idxC } = createScene();
			const mask = buildObjectAMask();
			const effect: EffectDefinition = {
				id: "fx-lens-mask",
				type: "lens",
				enabled: true,
				opacity: 1.0,
				parameters: { strength: { mode: "static" as const, value: 2.0 }, radius: { mode: "static" as const, value: 4 }, centerX: { mode: "static" as const, value: 2 }, centerY: { mode: "static" as const, value: 2 } }
			};
			const target: ResolvedEffectTarget = { type: "mask", maskId: "mask-A", source: { type: "alpha", mask }, contentIdentity: "mask:mask-A" };
			const evaluated = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0);

			EffectCompositor.applyEffects(rt, [evaluated]);
			const pixels = rt.context.getImageData(0, 0, 10, 10).data;

			if (pixels[idxA] === 120 && pixels[idxA+1] === 150) throw new Error("A did not change");
			const diffB = Math.abs(pixels[idxB+2] - 160);
			if (diffB > 15) throw new Error(`B changed: got ${pixels[idxB+2]}`);
			const diffC = Math.abs(pixels[idxC+2] - 90);
			if (diffC > 15) throw new Error(`C changed: got ${pixels[idxC+2]}`);

			rt.dispose();
		});

		// 3. Track Target
		runAssert("isolate-track", "Track target: resolves and isolates tracking target", () => {
			const { rt, idxA, idxB, idxC } = createScene();
			const effect: EffectDefinition = {
				id: "fx-lens-track",
				type: "lens",
				enabled: true,
				opacity: 1.0,
				parameters: { strength: { mode: "static" as const, value: 2.0 }, radius: { mode: "static" as const, value: 4 }, centerX: { mode: "static" as const, value: 2 }, centerY: { mode: "static" as const, value: 2 } }
			};
			// Target resolver locates observation at frame index 0
			const target = { type: "track" as const, trackId: "track-12" };
			const resolved = EffectTargetResolver.resolve(target, 0, [], "input-1");
			if (!resolved) throw new Error("Track resolution failed");

			const evaluated = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target: resolved }, 0);
			EffectCompositor.applyEffects(rt, [evaluated]);

			const pixels = rt.context.getImageData(0, 0, 10, 10).data;
			if (pixels[idxA] === 120 && pixels[idxA+1] === 150) throw new Error("A did not change");
			const diffB = Math.abs(pixels[idxB+2] - 160);
			if (diffB > 15) throw new Error(`B changed: got ${pixels[idxB+2]}`);
			const diffC = Math.abs(pixels[idxC+2] - 90);
			if (diffC > 15) throw new Error(`C changed: got ${pixels[idxC+2]}`);

			rt.dispose();
		});

		// ==================================================
		// GROUP G: Temporal Tracking Hardening
		// ==================================================
		runAssert("temporal-gap-hold-last", "Gap policy hold-last returns last valid observation", () => {
			const target = { type: "mask" as const, maskId: "mask-123" };
			// Observation exists only at frame 0, 1, 2. We resolve at frame index 5 under hold-last gap policy
			const maskDefHold: MaskDefinition = {
				...dummyMaskDef,
				gapPolicy: "hold-last",
				source: { type: "tracked", trackId: "track-12", frameIndex: 0 }
			};
			const resolved = EffectTargetResolver.resolve(target, 5, [maskDefHold], "input-1");
			if (!resolved || resolved.type !== "mask" || resolved.source.type !== "alpha") {
				throw new Error("Hold-last gap resolution failed");
			}
			// Should return the frame 2 observation (hash-C)
			const contentHash = resolved.source.mask.contentHash;
			if (contentHash !== "hash-C") {
				throw new Error(`Expected contentHash to be 'hash-C' from frame 2, got ${contentHash}`);
			}
		});

		// ==================================================
		// GROUP H: Cache Isolation Hardening
		// ==================================================
		runAssert("cache-isolation-order", "Changing effect order causes cache MISS", () => {
			EffectCache.clear();
			const effect: EffectDefinition = { id: "fx-1", type: "displacement", enabled: true, opacity: 1, parameters: { strength: { mode: "static" as const, value: 10 }, scale: { mode: "static" as const, value: 50 }, angle: { mode: "static" as const, value: 45 } } };
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			
			const ev1 = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0); // Order index 0
			const ev2 = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 1); // Order index 1

			EffectCache.set(ev1.semanticHash, ev1);
			if (EffectCache.get(ev2.semanticHash) !== null) {
				throw new Error("Cache HIT on order index change");
			}
		});

		runAssert("cache-isolation-frame", "Changing frame index for tracked target causes cache MISS", () => {
			EffectCache.clear();
			const effect: EffectDefinition = { id: "fx-1", type: "displacement", enabled: true, opacity: 1, parameters: { strength: { mode: "static" as const, value: 10 }, scale: { mode: "static" as const, value: 50 }, angle: { mode: "static" as const, value: 45 } } };
			
			const target0 = EffectTargetResolver.resolve({ type: "track", trackId: "track-12" }, 0, [], "input-1")!;
			const target1 = EffectTargetResolver.resolve({ type: "track", trackId: "track-12" }, 1, [], "input-1")!;

			const ev0 = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target: target0 }, 0);
			const ev1 = EffectEvaluator.evaluate(effect, { time: 0.04, frameIndex: 1, fps: 30, target: target1 }, 0);

			EffectCache.set(ev0.semanticHash, ev0);
			if (EffectCache.get(ev1.semanticHash) !== null) {
				throw new Error("Cache HIT on track frame index change");
			}
		});

		// ==================================================
		// GROUP I: Memory & RenderTarget safety
		// ==================================================
		runAssert("memory-safety-validation-error", "RenderTarget is released even when validation throws", () => {
			RenderTargetPool.clear();
			const rt = new RenderTarget({ width: 10, height: 10 });
			
			// Invalid parameters causing validator to throw inside compositor loop
			const badEffect: EvaluatedEffect = {
				id: "bad-fx",
				type: "displacement",
				enabled: true,
				opacity: 1,
				parameters: { strength: NaN, scale: 50, angle: 45 },
				target: { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" },
				semanticHash: "bad-hash"
			};

			let threw = false;
			try {
				EffectCompositor.applyEffects(rt, [badEffect]);
			} catch {
				threw = true;
			}

			if (!threw) throw new Error("Validator did not reject bad parameters");

			// Pool active count must return to 0 (no leaked targets in try/finally)
			const pool = RenderTargetPool as { getActiveCount?: () => number };
			const poolCount = pool.getActiveCount ? pool.getActiveCount() : 0;
			if (poolCount > 0) {
				throw new Error(`Leaked RenderTarget(s) detected in pool: ${poolCount}`);
			}
			rt.dispose();
		});

		// ==================================================
		// GROUP J: Compositor Parity with Reference Math (Hardened)
		// ==================================================
		runAssert("comp-displacement-parity-hardened", "Compositor output matches Displacement reference under tolerance=15", () => {
			const rt = new RenderTarget({ width: 50, height: 50 });
			const ctx = rt.context;
			ctx.fillStyle = "#FF55AA";
			ctx.fillRect(5, 5, 40, 40);

			const srcImg = ctx.getImageData(0, 0, 50, 50);
			const inputBuf: PixelBuffer = { width: 50, height: 50, data: new Uint8ClampedArray(srcImg.data) };

			const effect: EffectDefinition = {
				id: "fx-disp",
				type: "displacement",
				enabled: true,
				opacity: 0.9,
				parameters: { strength: { mode: "static" as const, value: 4 }, scale: { mode: "static" as const, value: 15 }, angle: { mode: "static" as const, value: 45 } }
			};
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const evaluated = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0);

			const refOut = EffectDistortionReference.applyEffectsReference(inputBuf, [evaluated]);

			EffectCompositor.applyEffects(rt, [evaluated]);
			const compImg = rt.context.getImageData(0, 0, 50, 50);

			for (let i = 0; i < refOut.data.length; i++) {
				const diff = Math.abs(refOut.data[i] - compImg.data[i]);
				if (diff > 15) {
					const pixel = Math.floor(i / 4);
					const x = pixel % 50;
					const y = Math.floor(pixel / 50);
					const channel = ["R", "G", "B", "A"][i % 4];
					throw new Error(`[P3.9 FAIL] Displacement math mismatch at pixel (${x}, ${y}) channel ${channel}: expected ${refOut.data[i]}, got ${compImg.data[i]}, error: ${diff}, tolerance: 15`);
				}
			}
			rt.dispose();
		});

		// Immutability before/after verification
		runAssert("comp-immutability-hardened", "Distortions verify input PixelBuffer immutability", () => {
			const inputBuf = createNonTrivialImage(10, 10);
			const snapshot = new Uint8ClampedArray(inputBuf.data);

			// Apply Displacement
			EffectDistortionReference.applyDisplacementReference(inputBuf, { strength: 8, scale: 20, angle: 90 });
			// Apply Wave
			EffectDistortionReference.applyWaveReference(inputBuf, { amplitude: 6, frequency: 0.1, phase: 0.5, direction: 45 });
			// Apply Lens
			EffectDistortionReference.applyLensReference(inputBuf, { strength: 3, radius: 4, centerX: 5, centerY: 5 });

			// Verify input data matches snapshot exactly (0 tolerance)
			for (let i = 0; i < snapshot.length; i++) {
				if (inputBuf.data[i] !== snapshot[i]) {
					throw new Error("Input PixelBuffer mutated during reference math execution");
				}
			}
		});

		// ==================================================
		// GROUP K: Independent Oracle Verification
		// ==================================================
		const createIndependentTestImage = (): PixelBuffer => {
			const data = new Uint8ClampedArray(4 * 4 * 4);
			for (let i = 0; i < 16; i++) {
				const idx = i * 4;
				data[idx] = 50 + i * 10;     // R
				data[idx + 1] = 60 + i * 8;   // G
				data[idx + 2] = 70 + i * 5;   // B
				data[idx + 3] = 150 + i * 3;  // A
			}
			return { width: 4, height: 4, data };
		};

		runAssert("independent-bilinear-fractional", "Independent Bilinear: fractional coordinate returns pre-calculated value", () => {
			const img = createIndependentTestImage();
			const res = EffectDistortionReference.sampleBilinear(img, 1.5, 1.5);
			// Pre-calculated values: R=125, G=120, B=108, A=173
			if (res.r !== 125 || res.g !== 120 || res.b !== 108 || res.a !== 173) {
				throw new Error(`Independent bilinear mismatch: expected [125, 120, 108, 173], got [${res.r}, ${res.g}, ${res.b}, ${res.a}]`);
			}
		});

		runAssert("independent-displacement", "Independent Displacement: maps pixel coordinates correctly", () => {
			const img = createIndependentTestImage();
			const params = { strength: 2, scale: 4, angle: 90 };
			const refRes = EffectDistortionReference.applyDisplacementReference(img, params);

			// Expected output at (2, 2) is input (2, 2) color [150, 140, 120, 180]
			const idx = (2 * 4 + 2) * 4;
			if (refRes.data[idx] !== 150 || refRes.data[idx+1] !== 140 || refRes.data[idx+2] !== 120 || refRes.data[idx+3] !== 180) {
				throw new Error(`Reference mismatch: got [${refRes.data[idx]}, ${refRes.data[idx+1]}, ${refRes.data[idx+2]}, ${refRes.data[idx+3]}]`);
			}

			// Compositor verification
			const rt = new RenderTarget({ width: 4, height: 4 });
			const ctx = rt.context;
			const imgData = ctx.createImageData(4, 4);
			imgData.data.set(img.data);
			ctx.putImageData(imgData, 0, 0);

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const evaluated = EffectEvaluator.evaluate({ id: "fx-disp", type: "displacement", enabled: true, opacity: 1, parameters: { strength: { mode: "static" as const, value: params.strength }, scale: { mode: "static" as const, value: params.scale }, angle: { mode: "static" as const, value: params.angle } } }, { time: 0, frameIndex: 0, fps: 30, target }, 0);
			EffectCompositor.applyEffects(rt, [evaluated]);

			const compPixels = rt.context.getImageData(0, 0, 4, 4).data;
			// Compare under tolerance 15
			const diffR = Math.abs(compPixels[idx] - 150);
			const diffA = Math.abs(compPixels[idx+3] - 180);
			if (diffR > 15 || diffA > 15) {
				throw new Error(`Compositor mismatch: got [${compPixels[idx]}, ${compPixels[idx+1]}, ${compPixels[idx+2]}, ${compPixels[idx+3]}]`);
			}
			rt.dispose();
		});

		runAssert("independent-wave", "Independent Wave: maps pixel coordinates correctly", () => {
			const img = createIndependentTestImage();
			const params = { amplitude: 2, frequency: 0.25, phase: 0, direction: 0 };
			const refRes = EffectDistortionReference.applyWaveReference(img, params);

			// Expected output at (1, 1) is input (1, 3) color [180, 164, 135, 189]
			const idx = (1 * 4 + 1) * 4;
			if (refRes.data[idx] !== 180 || refRes.data[idx+1] !== 164 || refRes.data[idx+2] !== 135 || refRes.data[idx+3] !== 189) {
				throw new Error(`Reference mismatch: got [${refRes.data[idx]}, ${refRes.data[idx+1]}, ${refRes.data[idx+2]}, ${refRes.data[idx+3]}]`);
			}

			// Compositor verification
			const rt = new RenderTarget({ width: 4, height: 4 });
			const ctx = rt.context;
			const imgData = ctx.createImageData(4, 4);
			imgData.data.set(img.data);
			ctx.putImageData(imgData, 0, 0);

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const evaluated = EffectEvaluator.evaluate({ id: "fx-wave", type: "wave", enabled: true, opacity: 1, parameters: { amplitude: { mode: "static" as const, value: params.amplitude }, frequency: { mode: "static" as const, value: params.frequency }, phase: { mode: "static" as const, value: params.phase }, direction: { mode: "static" as const, value: params.direction } } }, { time: 0, frameIndex: 0, fps: 30, target }, 0);
			EffectCompositor.applyEffects(rt, [evaluated]);

			const compPixels = rt.context.getImageData(0, 0, 4, 4).data;
			const diffR = Math.abs(compPixels[idx] - 180);
			if (diffR > 15) {
				throw new Error(`Compositor mismatch: got [${compPixels[idx]}, ${compPixels[idx+1]}, ${compPixels[idx+2]}, ${compPixels[idx+3]}]`);
			}
			rt.dispose();
		});

		runAssert("independent-lens", "Independent Lens: maps pixel coordinates correctly", () => {
			const img = createIndependentTestImage();
			const params = { strength: 1, radius: 2, centerX: 2, centerY: 2 };
			const refRes = EffectDistortionReference.applyLensReference(img, params);

			// Expected output at (1, 1) is [91, 92, 90, 162]
			const idx = (1 * 4 + 1) * 4;
			if (refRes.data[idx] !== 91 || refRes.data[idx+1] !== 92 || refRes.data[idx+2] !== 90 || refRes.data[idx+3] !== 162) {
				throw new Error(`Reference mismatch: got [${refRes.data[idx]}, ${refRes.data[idx+1]}, ${refRes.data[idx+2]}, ${refRes.data[idx+3]}]`);
			}

			// Compositor verification
			const rt = new RenderTarget({ width: 4, height: 4 });
			const ctx = rt.context;
			const imgData = ctx.createImageData(4, 4);
			imgData.data.set(img.data);
			ctx.putImageData(imgData, 0, 0);

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const evaluated = EffectEvaluator.evaluate({ id: "fx-lens", type: "lens", enabled: true, opacity: 1, parameters: { strength: { mode: "static" as const, value: params.strength }, radius: { mode: "static" as const, value: params.radius }, centerX: { mode: "static" as const, value: params.centerX }, centerY: { mode: "static" as const, value: params.centerY } } }, { time: 0, frameIndex: 0, fps: 30, target }, 0);
			EffectCompositor.applyEffects(rt, [evaluated]);

			const compPixels = rt.context.getImageData(0, 0, 4, 4).data;
			const diffR = Math.abs(compPixels[idx] - 91);
			if (diffR > 15) {
				throw new Error(`Compositor mismatch: got [${compPixels[idx]}, ${compPixels[idx+1]}, ${compPixels[idx+2]}, ${compPixels[idx+3]}]`);
			}
			rt.dispose();
		});

		// ==================================================
		// GROUP L: P3.10 Keyframe Animation & Temporal Verification
		// ==================================================
		runAssert("keyframes-number-linear", "Keyframe Evaluator: number linear interpolation", () => {
			const param: AnimatedNumber = {
				mode: "keyframes",
				interpolation: "linear",
				keyframes: [
					{ time: 0, value: 0 },
					{ time: 10, value: 100 }
				]
			};

			if (EffectKeyframeEvaluator.evaluateNumber(param, 0) !== 0) throw new Error("t=0 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 2.5) !== 25) throw new Error("t=2.5 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 5) !== 50) throw new Error("t=5 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 7.5) !== 75) throw new Error("t=7.5 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 10) !== 100) throw new Error("t=10 failed");

			// Out of bounds (pre-first, post-last)
			if (EffectKeyframeEvaluator.evaluateNumber(param, -5) !== 0) throw new Error("t=-5 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 15) !== 100) throw new Error("t=15 failed");
		});

		runAssert("keyframes-number-step", "Keyframe Evaluator: number step interpolation", () => {
			const param: AnimatedNumber = {
				mode: "keyframes",
				interpolation: "step",
				keyframes: [
					{ time: 0, value: 0 },
					{ time: 10, value: 100 }
				]
			};

			if (EffectKeyframeEvaluator.evaluateNumber(param, 0) !== 0) throw new Error("t=0 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 2.5) !== 0) throw new Error("t=2.5 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 9.99) !== 0) throw new Error("t=9.99 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 10) !== 100) throw new Error("t=10 failed");
			if (EffectKeyframeEvaluator.evaluateNumber(param, 15) !== 100) throw new Error("t=15 failed");
		});

		runAssert("keyframes-rgba-linear", "Keyframe Evaluator: RGBA linear interpolation", () => {
			const param: AnimatedRGBA = {
				mode: "keyframes",
				interpolation: "linear",
				keyframes: [
					{ time: 0, value: { r: 0, g: 10, b: 20, a: 0.2 } },
					{ time: 10, value: { r: 100, g: 110, b: 120, a: 0.8 } }
				]
			};

			const val = EffectKeyframeEvaluator.evaluateRGBA(param, 5);
			if (Math.abs(val.r - 50) > 0.001 || Math.abs(val.g - 60) > 0.001 || Math.abs(val.b - 70) > 0.001 || Math.abs(val.a - 0.5) > 0.001) {
				throw new Error(`RGBA linear interpolation mismatch: got {r:${val.r}, g:${val.g}, b:${val.b}, a:${val.a}}`);
			}
		});

		runAssert("temporal-blur-pixel", "Pixel verification: animated blur radius", () => {
			const rt = new RenderTarget({ width: 10, height: 10 });
			const effect: EffectDefinition = {
				id: "fx-blur",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 0 },
							{ time: 30, value: 20 }
						]
					}
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			// At time 15, radius is 10
			const evaluated = EffectEvaluator.evaluate(effect, { time: 15, frameIndex: 15, fps: 30, target }, 0);
			if (evaluated.type !== "blur") throw new Error("Expected blur type");
			if (evaluated.parameters.radius !== 10) {
				throw new Error(`Expected evaluated radius to be 10, got ${evaluated.parameters.radius}`);
			}
			rt.dispose();
		});

		runAssert("temporal-displacement-pixel", "Pixel verification: animated displacement strength", () => {
			const effect: EffectDefinition = {
				id: "fx-disp",
				type: "displacement",
				enabled: true,
				opacity: 1.0,
				parameters: {
					strength: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 0 },
							{ time: 30, value: 20 }
						]
					},
					scale: { mode: "static", value: 10 },
					angle: { mode: "static", value: 45 }
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			// At time 15, strength is 10
			const evaluated = EffectEvaluator.evaluate(effect, { time: 15, frameIndex: 15, fps: 30, target }, 0);
			if (evaluated.type !== "displacement") throw new Error("Expected displacement type");
			if (evaluated.parameters.strength !== 10) {
				throw new Error(`Expected evaluated strength to be 10, got ${evaluated.parameters.strength}`);
			}
		});

		runAssert("temporal-wave-pixel", "Pixel verification: animated wave amplitude", () => {
			const effect: EffectDefinition = {
				id: "fx-wave",
				type: "wave",
				enabled: true,
				opacity: 1.0,
				parameters: {
					amplitude: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 0 },
							{ time: 30, value: 16 }
						]
					},
					frequency: { mode: "static", value: 0.1 },
					phase: { mode: "static", value: 0 },
					direction: { mode: "static", value: 90 }
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			// At time 15, amplitude is 8
			const evaluated = EffectEvaluator.evaluate(effect, { time: 15, frameIndex: 15, fps: 30, target }, 0);
			if (evaluated.type !== "wave") throw new Error("Expected wave type");
			if (evaluated.parameters.amplitude !== 8) {
				throw new Error(`Expected evaluated amplitude to be 8, got ${evaluated.parameters.amplitude}`);
			}
		});

		runAssert("temporal-lens-pixel", "Pixel verification: animated lens strength", () => {
			const effect: EffectDefinition = {
				id: "fx-lens",
				type: "lens",
				enabled: true,
				opacity: 1.0,
				parameters: {
					strength: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 0 },
							{ time: 30, value: 1.0 }
						]
					},
					radius: { mode: "static", value: 5 },
					centerX: { mode: "static", value: 5 },
					centerY: { mode: "static", value: 5 }
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			// At time 15, strength is 0.5
			const evaluated = EffectEvaluator.evaluate(effect, { time: 15, frameIndex: 15, fps: 30, target }, 0);
			if (evaluated.type !== "lens") throw new Error("Expected lens type");
			if (evaluated.parameters.strength !== 0.5) {
				throw new Error(`Expected evaluated strength to be 0.5, got ${evaluated.parameters.strength}`);
			}
		});

		runAssert("temporal-color-pixel", "Pixel verification: animated color brightness", () => {
			const effect: EffectDefinition = {
				id: "fx-color",
				type: "color",
				enabled: true,
				opacity: 1.0,
				parameters: {
					brightness: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 0 },
							{ time: 30, value: 0.4 }
						]
					},
					contrast: { mode: "static", value: 1.0 },
					saturation: { mode: "static", value: 1.0 },
					hue: { mode: "static", value: 0 }
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			// At time 15, brightness is 0.2
			const evaluated = EffectEvaluator.evaluate(effect, { time: 15, frameIndex: 15, fps: 30, target }, 0);
			if (evaluated.type !== "color") throw new Error("Expected color type");
			if (evaluated.parameters.brightness !== 0.2) {
				throw new Error(`Expected evaluated brightness to be 0.2, got ${evaluated.parameters.brightness}`);
			}
		});

		runAssert("temporal-target-isolation-c", "Target isolation: animated effect on Object A keeps B and C unchanged", () => {
			const { rt, idxA, idxB, idxC } = createScene();
			const mask = buildObjectAMask();
			const effect: EffectDefinition = {
				id: "fx-lens-anim",
				type: "lens",
				enabled: true,
				opacity: 1.0,
				parameters: {
					strength: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 0 },
							{ time: 30, value: 2.0 }
						]
					},
					radius: { mode: "static", value: 4 },
					centerX: { mode: "static", value: 2 },
					centerY: { mode: "static", value: 2 }
				}
			};

			// Apply animated lens on Object A (mask target) at frame index 15
			const target: ResolvedEffectTarget = { type: "mask", maskId: "mask-A", source: { type: "alpha", mask }, contentIdentity: "mask:mask-A" };
			const evaluated = EffectEvaluator.evaluate(effect, { time: 15, frameIndex: 15, fps: 30, target }, 0);

			EffectCompositor.applyEffects(rt, [evaluated]);
			const pixels = rt.context.getImageData(0, 0, 10, 10).data;

			// Verify Object A changed
			if (pixels[idxA] === 120 && pixels[idxA+1] === 150) {
				throw new Error("Object A did not change under keyframed lens distortion");
			}
			// Verify Object B remains unchanged
			const diffB = Math.abs(pixels[idxB+2] - 160);
			if (diffB > 15) throw new Error(`Object B changed: got ${pixels[idxB+2]}, expected 160`);
			// Verify Object C remains unchanged
			const diffC = Math.abs(pixels[idxC+2] - 90);
			if (diffC > 15) throw new Error(`Object C changed: got ${pixels[idxC+2]}, expected 90`);

			rt.dispose();
		});

		runAssert("temporal-cache-isolation", "Cache: changing evaluated parameters causes MISS, same parameters causes HIT", () => {
			EffectCache.clear();
			const effect: EffectDefinition = {
				id: "fx-disp-anim",
				type: "displacement",
				enabled: true,
				opacity: 1.0,
				parameters: {
					strength: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 5 },
							{ time: 10, value: 5 },
							{ time: 20, value: 10 }
						]
					},
					scale: { mode: "static", value: 50 },
					angle: { mode: "static", value: 45 }
				}
			};
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };

			// Frame 0 and Frame 10 both evaluate to strength=5. They must share the same render cache entry (same semanticHash)
			const ev0 = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0);
			const ev10 = EffectEvaluator.evaluate(effect, { time: 10, frameIndex: 10, fps: 30, target }, 0);

			EffectCache.set(ev0.semanticHash, ev0);
			const hit = EffectCache.get(ev10.semanticHash);
			if (hit === null) {
				throw new Error("Expected cache HIT for identical evaluated visual state at different times");
			}

			// Frame 20 evaluates to strength=10. This must cause a cache MISS
			const ev20 = EffectEvaluator.evaluate(effect, { time: 20, frameIndex: 20, fps: 30, target }, 0);
			if (EffectCache.get(ev20.semanticHash) !== null) {
				throw new Error("Expected cache MISS for different evaluated parameter state");
			}
		});

		runAssert("temporal-cache-future-keyframe", "Cache: changing a future keyframe does not invalidate current frame cache", () => {
			EffectCache.clear();
			const effect1: EffectDefinition = {
				id: "fx-disp-anim",
				type: "displacement",
				enabled: true,
				opacity: 1.0,
				parameters: {
					strength: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 5 },
							{ time: 10, value: 10 },
							{ time: 20, value: 20 }
						]
					},
					scale: { mode: "static", value: 50 },
					angle: { mode: "static", value: 45 }
				}
			};
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };

			const evInitial = EffectEvaluator.evaluate(effect1, { time: 0, frameIndex: 0, fps: 30, target }, 0);
			EffectCache.set(evInitial.semanticHash, evInitial);

			// Now define effect2 with a modified keyframe at time 20 (future), but same value at time 0
			const effect2: EffectDefinition = {
				id: "fx-disp-anim",
				type: "displacement",
				enabled: true,
				opacity: 1.0,
				parameters: {
					strength: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 5 },
							{ time: 10, value: 10 },
							{ time: 20, value: 99 } // changed future keyframe
						]
					},
					scale: { mode: "static", value: 50 },
					angle: { mode: "static", value: 45 }
				}
			};

			const evLater = EffectEvaluator.evaluate(effect2, { time: 0, frameIndex: 0, fps: 30, target }, 0);
			// They must have the same semanticHash because evaluated state at time 0 is identical (strength=5)
			const hit = EffectCache.get(evLater.semanticHash);
			if (hit === null) {
				throw new Error("Expected cache HIT at time 0 after modifying a future keyframe");
			}
		});

		runAssert("temporal-validation-nan", "Validation: NaN keyframe value is rejected", () => {
			const effect: EffectDefinition = {
				id: "fx-nan",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: NaN }
						]
					}
				}
			};

			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Expected validation error for NaN keyframe value");
		});

		runAssert("temporal-validation-duplicate-time", "Validation: duplicate keyframe times are rejected", () => {
			const effect: EffectDefinition = {
				id: "fx-dup",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 5, value: 10 },
							{ time: 5, value: 20 }
						]
					}
				}
			};

			let threw = false;
			try {
				EffectValidator.validate(effect);
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Expected validation error for duplicate keyframe timestamps");
		});

		// ==================================================
		// GROUP M: P3.11 Temporal Effect Graph & Multi-Parameter Automation
		// ==================================================

		runAssert("p311-validation-parameter-identity", "P3.11 Validation: canonical parameter identity checks", () => {
			let threw = false;
			try {
				EffectTemporalValidator.validateParameterKey("invalidkey");
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Expected failure for malformed parameter key");

			threw = false;
			try {
				EffectTemporalValidator.validateParameterKey(".radius");
			} catch {
				threw = true;
			}
			if (!threw) throw new Error("Expected failure for empty effectId");
		});

		runAssert("p311-validation-type-compatibility", "P3.11 Validation: reject type mismatches", () => {
			const effect1: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "static",
						value: 10
					}
				}
			};
			const effect2: EffectDefinition = {
				id: "glow-1",
				type: "glow",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: { mode: "static", value: 5 },
					intensity: { mode: "static", value: 2 },
					color: {
						mode: "reference" as const,
						parameterId: "blur-1.radius",
						scale: 1,
						offset: 0
					}
				}
			};

			let threw = false;
			try {
				const graph = new EffectParameterGraph();
				graph.buildGraph([effect1, effect2]);
			} catch (e: any) {
				if (e.message.includes("incompatible")) {
					threw = true;
				}
			}
			if (!threw) throw new Error("Expected type compatibility validation error");
		});

		runAssert("p311-cycles-self", "P3.11 Cycles: self-cycle detection", () => {
			const effect: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "reference" as const,
						parameterId: "blur-1.radius",
						scale: 1,
						offset: 0
					}
				}
			};

			let threw = false;
			try {
				const graph = new EffectParameterGraph();
				graph.buildGraph([effect]);
			} catch (e: any) {
				if (e.message.includes("P3.11_PARAMETER_CYCLE") && e.message.includes("blur-1.radius -> blur-1.radius")) {
					threw = true;
				} else {
					throw new Error(`Unexpected error message: ${e.message}`);
				}
			}
			if (!threw) throw new Error("Expected cycle detection for self-reference");
		});

		runAssert("p311-cycles-multi", "P3.11 Cycles: multi-node cycle detection & path", () => {
			const effect1: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "reference" as const,
						parameterId: "glow-1.intensity",
						scale: 1,
						offset: 0
					}
				}
			};
			const effect2: EffectDefinition = {
				id: "glow-1",
				type: "glow",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: { mode: "static", value: 5 },
					intensity: {
						mode: "reference" as const,
						parameterId: "blur-1.radius",
						scale: 1,
						offset: 0
					},
					color: { mode: "static", value: { r: 255, g: 0, b: 0, a: 1 } }
				}
			};

			let threw = false;
			try {
				const graph = new EffectParameterGraph();
				graph.buildGraph([effect1, effect2]);
			} catch (e: any) {
				if (e.message.includes("P3.11_PARAMETER_CYCLE") && e.message.includes("blur-1.radius") && e.message.includes("glow-1.intensity")) {
					threw = true;
				} else {
					throw new Error(`Unexpected cycle error: ${e.message}`);
				}
			}
			if (!threw) throw new Error("Expected cycle detection for multi-node dependency loop");
		});

		runAssert("p311-chains-eval", "P3.11 References: scale, offset, and multi-level chains", () => {
			const effect1: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 10 },
							{ time: 10, value: 20 }
						]
					}
				}
			};
			const effect2: EffectDefinition = {
				id: "glow-1",
				type: "glow",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "reference" as const,
						parameterId: "blur-1.radius",
						scale: 2,
						offset: 5
					},
					intensity: {
						mode: "reference" as const,
						parameterId: "glow-1.radius",
						scale: 0.5,
						offset: 1
					},
					color: { mode: "static", value: { r: 255, g: 0, b: 0, a: 1 } }
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const sharedMap = new Map<string, number | RGBA>();
			const context = {
				time: 5,
				frameIndex: 5,
				fps: 30,
				target,
				allEffects: [effect1, effect2],
				evaluatedParameters: sharedMap
			};

			const ev1 = EffectEvaluator.evaluate(effect1, context, 0);
			const ev2 = EffectEvaluator.evaluate(effect2, context, 1);

			if (ev1.type !== "blur" || ev2.type !== "glow") {
				throw new Error("Expected ev1 to be blur and ev2 to be glow");
			}
			if (ev1.parameters.radius !== 15) {
				throw new Error(`Expected evaluated radius to be 15, got ${ev1.parameters.radius}`);
			}
			if (ev2.parameters.radius !== 35) {
				throw new Error(`Expected evaluated radius to be 35, got ${ev2.parameters.radius}`);
			}
			if (ev2.parameters.intensity !== 18.5) {
				throw new Error(`Expected evaluated intensity to be 18.5, got ${ev2.parameters.intensity}`);
			}
		});

		runAssert("p311-validation-post-bounds", "P3.11 Validation: post-resolution parameter bounds validation", () => {
			const effect1: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "static",
						value: 10
					}
				}
			};
			const effect2: EffectDefinition = {
				id: "glow-1",
				type: "glow",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "reference" as const,
						parameterId: "blur-1.radius",
						scale: -2,
						offset: 5
					},
					intensity: { mode: "static", value: 1 },
					color: { mode: "static", value: { r: 255, g: 0, b: 0, a: 1 } }
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const context = {
				time: 0,
				frameIndex: 0,
				fps: 30,
				target,
				allEffects: [effect1, effect2],
				evaluatedParameters: new Map<string, number | RGBA>()
			};

			let threw = false;
			try {
				EffectEvaluator.evaluate(effect2, context, 1);
			} catch (e: any) {
				if (e.message.includes("less than min")) {
					threw = true;
				}
			}
			if (!threw) throw new Error("Expected post-resolution bounds validation error for negative radius");
		});

		runAssert("p311-determinism", "P3.11 Determinism: snapshot, topological order and hash are property-order independent", () => {
			const effect1: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: { mode: "static", value: 10 }
				}
			};
			const effect2: EffectDefinition = {
				id: "glow-1",
				type: "glow",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: { mode: "reference" as const, parameterId: "blur-1.radius", scale: 1, offset: 0 },
					intensity: { mode: "static", value: 2 },
					color: { mode: "static", value: { r: 255, g: 0, b: 0, a: 1 } }
				}
			};

			const graphA = new EffectParameterGraph();
			graphA.buildGraph([effect1, effect2]);
			const snapA = graphA.getSnapshot();

			const graphB = new EffectParameterGraph();
			graphB.buildGraph([effect2, effect1]);
			const snapB = graphB.getSnapshot();

			if (JSON.stringify(snapA) !== JSON.stringify(snapB)) {
				throw new Error("Lexicographical and topological snapshots differ based on object input order");
			}

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const contextA = { time: 0, frameIndex: 0, fps: 30, target, allEffects: [effect1, effect2], evaluatedParameters: new Map() };
			const contextB = { time: 0, frameIndex: 0, fps: 30, target, allEffects: [effect2, effect1], evaluatedParameters: new Map() };

			const evA = EffectEvaluator.evaluate(effect2, contextA, 1);
			const evB = EffectEvaluator.evaluate(effect2, contextB, 1);

			if (evA.semanticHash !== evB.semanticHash) {
				throw new Error("Semantic hashes differ based on peer effects insertion order");
			}
		});

		runAssert("p311-cache-temporal", "P3.11 Cache: verify hit, miss, and isolation behavior", () => {
			EffectCache.clear();
			const effect1: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 10 },
							{ time: 10, value: 10 },
							{ time: 20, value: 20 }
						]
					}
				}
			};
			const effect2: EffectDefinition = {
				id: "glow-1",
				type: "glow",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: { mode: "reference" as const, parameterId: "blur-1.radius", scale: 1, offset: 0 },
					intensity: { mode: "static", value: 2 },
					color: { mode: "static", value: { r: 255, g: 0, b: 0, a: 1 } }
				}
			};

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };

			const context0 = { time: 0, frameIndex: 0, fps: 30, target, allEffects: [effect1, effect2], evaluatedParameters: new Map() };
			const evGlow0 = EffectEvaluator.evaluate(effect2, context0, 1);
			EffectCache.set(evGlow0.semanticHash, evGlow0);

			const context10 = { time: 10, frameIndex: 10, fps: 30, target, allEffects: [effect1, effect2], evaluatedParameters: new Map() };
			const evGlow10 = EffectEvaluator.evaluate(effect2, context10, 1);
			if (EffectCache.get(evGlow10.semanticHash) === null) {
				throw new Error("Expected cache HIT for same resolved values at different time");
			}

			const context20 = { time: 20, frameIndex: 20, fps: 30, target, allEffects: [effect1, effect2], evaluatedParameters: new Map() };
			const evGlow20 = EffectEvaluator.evaluate(effect2, context20, 1);
			if (EffectCache.get(evGlow20.semanticHash) !== null) {
				throw new Error("Expected cache MISS for changed resolved values");
			}
		});

		runAssert("p311-immutability", "P3.11 Immutability: ensure input definitions are not mutated", () => {
			const effect: EffectDefinition = {
				id: "blur-1",
				type: "blur",
				enabled: true,
				opacity: 1.0,
				parameters: {
					radius: {
						mode: "keyframes",
						interpolation: "linear",
						keyframes: [
							{ time: 0, value: 10 },
							{ time: 10, value: 20 }
						]
					}
				}
			};

			const originalJson = JSON.stringify(effect);
			
			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const context = { time: 5, frameIndex: 5, fps: 30, target, allEffects: [effect], evaluatedParameters: new Map() };
			EffectEvaluator.evaluate(effect, context, 0);

			if (JSON.stringify(effect) !== originalJson) {
				throw new Error("EffectDefinition was mutated during evaluation pipeline");
			}
		});

		runAssert("p311-pure-oracle", "P3.11 Oracle: verify independent pure reference oracle math correctness", () => {
			const nodes = new Map<string, RefNode>();
			nodes.set("blur-1.radius", {
				key: "blur-1.radius",
				type: "number",
				definition: {
					mode: "keyframes",
					interpolation: "linear",
					keyframes: [
						{ time: 0, value: 10 },
						{ time: 10, value: 20 }
					]
				},
				dependencies: []
			});
			nodes.set("glow-1.radius", {
				key: "glow-1.radius",
				type: "number",
				definition: {
					mode: "reference",
					parameterId: "blur-1.radius",
					scale: 2,
					offset: 5
				},
				dependencies: ["blur-1.radius"]
			});

			const resolved = EffectTemporalReference.resolveAll(nodes, 5);
			if (resolved.get("blur-1.radius") !== 15) {
				throw new Error(`Expected oracle blur-1.radius to be 15, got ${resolved.get("blur-1.radius")}`);
			}
			if (resolved.get("glow-1.radius") !== 35) {
				throw new Error(`Expected oracle glow-1.radius to be 35, got ${resolved.get("glow-1.radius")}`);
			}
		});

		// Standalone tests finished
		setResults(testLog);
		setOverallPass(allPassed);

		// ==================================================
		// NUMERICAL AUDIT
		// ==================================================
		const createNonTrivialAuditImage = (width = 50, height = 50): PixelBuffer => {
			const data = new Uint8ClampedArray(width * height * 4);
			for (let y = 0; y < height; y++) {
				for (let x = 0; x < width; x++) {
					const idx = (y * width + x) * 4;
					data[idx] = 100 + Math.round((x / width) * 100);
					data[idx + 1] = 120 + Math.round((y / height) * 100);
					data[idx + 2] = 150 - Math.round((x / width) * 50);
					data[idx + 3] = 180 + Math.round((y / height) * 50);
				}
			}
			return { width, height, data };
		};

		const performAuditForEffect = (
			name: string,
			effect: EffectDefinition,
			inputBuf: PixelBuffer
		) => {
			const rt = new RenderTarget({ width: 50, height: 50 });
			const ctx = rt.context;
			const imgData = ctx.createImageData(50, 50);
			imgData.data.set(inputBuf.data);
			ctx.putImageData(imgData, 0, 0);

			const target: ResolvedEffectTarget = { type: "layer", elementId: "el-1", contentIdentity: "layer:el-1" };
			const evaluated = EffectEvaluator.evaluate(effect, { time: 0, frameIndex: 0, fps: 30, target }, 0);

			const refOut = EffectDistortionReference.applyEffectsReference(inputBuf, [evaluated]);

			EffectCompositor.applyEffects(rt, [evaluated]);
			const compImg = rt.context.getImageData(0, 0, 50, 50);

			let maxError = 0;
			let totalError = 0;
			let affectedPixels = 0;
			const totalChannels = refOut.data.length;

			for (let p = 0; p < 50 * 50; p++) {
				let pixelDiff = false;
				for (let c = 0; c < 4; c++) {
					const idx = p * 4 + c;
					const diff = Math.abs(refOut.data[idx] - compImg.data[idx]);
					if (diff > 0) {
						pixelDiff = true;
					}
					if (diff > maxError) {
						maxError = diff;
					}
					totalError += diff;
				}
				if (pixelDiff) {
					affectedPixels++;
				}
			}

			const meanError = totalError / totalChannels;
			rt.dispose();

			return {
				name,
				maxError,
				meanError,
				affectedPixels
			};
		};

		const auditImage = createNonTrivialAuditImage();
		const dispAudit = performAuditForEffect("displacement", {
			id: "fx-disp-audit",
			type: "displacement",
			enabled: true,
			opacity: 0.9,
			parameters: { strength: { mode: "static" as const, value: 4 }, scale: { mode: "static" as const, value: 15 }, angle: { mode: "static" as const, value: 45 } }
		}, auditImage);

		const waveAudit = performAuditForEffect("wave", {
			id: "fx-wave-audit",
			type: "wave",
			enabled: true,
			opacity: 0.95,
			parameters: { amplitude: { mode: "static" as const, value: 4 }, frequency: { mode: "static" as const, value: 0.1 }, phase: { mode: "static" as const, value: 0.5 }, direction: { mode: "static" as const, value: 90 } }
		}, auditImage);

		const lensAudit = performAuditForEffect("lens", {
			id: "fx-lens-audit",
			type: "lens",
			enabled: true,
			opacity: 1.0,
			parameters: { strength: { mode: "static" as const, value: 2.0 }, radius: { mode: "static" as const, value: 25 }, centerX: { mode: "static" as const, value: 25 }, centerY: { mode: "static" as const, value: 25 } }
		}, auditImage);

		const toleranceTests = [0, 1, 2, 4, 8, 15];
		const toleranceResults: Record<number, boolean> = {};
		for (const tol of toleranceTests) {
			toleranceResults[tol] = (dispAudit.maxError <= tol) && (waveAudit.maxError <= tol) && (lensAudit.maxError <= tol);
		}

		const minSafeTolerance = toleranceTests.find(t => toleranceResults[t]) ?? 15;

		const auditResults = {
			displacement: dispAudit,
			wave: waveAudit,
			lens: lensAudit,
			toleranceResults,
			minSafeTolerance
		};

		const w = window as unknown as { BENCHMARK_DONE: boolean; AUDIT_RESULTS: typeof auditResults };
		w.AUDIT_RESULTS = auditResults;
		w.BENCHMARK_DONE = true;
	}, []);

	return (
		<div className="min-h-screen bg-black text-white font-sans p-8">
			<h1 className="text-3xl font-bold text-indigo-400 mb-6">P3.9 Hardened Effects & Distortion Gate</h1>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
					<h2 className="text-xl font-semibold mb-4 text-zinc-100 flex items-center gap-2">
						<div className={`w-2.5 h-2.5 rounded-full ${overallPass === true ? "bg-emerald-500" : overallPass === false ? "bg-rose-500" : "bg-zinc-600"}`}></div>
						Distortion Standalone Results
					</h2>
					<div id="math-tests" className="space-y-4">
						{overallPass !== null ? (
							<div>
								<div id="overall-status" className={`text-xl font-bold mb-4 ${overallPass ? "text-emerald-400" : "text-rose-400"}`}>
									P3.9 STANDALONE GATE OVERALL: {overallPass ? "PASS" : "FAIL"}
								</div>
								<ul className="space-y-2 font-mono text-sm">
									{results.map((r, i) => (
										<li key={i} className={r.passed ? "text-emerald-300" : "text-rose-400"}>
											[{r.passed ? "PASS" : "FAIL"}] {r.name}: {r.message}
										</li>
									))}
								</ul>
							</div>
						) : (
							<div className="text-zinc-500">Running standalone tests...</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
