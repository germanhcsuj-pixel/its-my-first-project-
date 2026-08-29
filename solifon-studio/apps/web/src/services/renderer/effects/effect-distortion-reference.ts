import { EvaluatedEffect, EvaluatedDisplacementEffectParams, EvaluatedWaveEffectParams, EvaluatedLensEffectParams } from "@/types/timeline";
import { EffectReference } from "./effect-reference";

export interface PixelBuffer {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

export class EffectDistortionReference {
	/**
	 * Validates the structure and constraints of a PixelBuffer.
	 */
	public static validatePixelBuffer(buf: PixelBuffer): void {
		if (!buf) {
			throw new Error("PixelBuffer is required");
		}
		if (typeof buf.width !== "number" || isNaN(buf.width) || !isFinite(buf.width) || buf.width <= 0) {
			throw new Error(`Invalid PixelBuffer width: ${buf.width}`);
		}
		if (typeof buf.height !== "number" || isNaN(buf.height) || !isFinite(buf.height) || buf.height <= 0) {
			throw new Error(`Invalid PixelBuffer height: ${buf.height}`);
		}
		if (!(buf.data instanceof Uint8ClampedArray)) {
			throw new Error("PixelBuffer data must be a Uint8ClampedArray");
		}
		if (buf.data.length !== buf.width * buf.height * 4) {
			throw new Error(`PixelBuffer data length mismatch: expected ${buf.width * buf.height * 4}, got ${buf.data.length}`);
		}
	}

	/**
	 * Bilinearly samples the pixel buffer at coordinates (u, v).
	 * If out-of-bounds, returns transparent (0, 0, 0, 0) according to the policy.
	 */
	public static sampleBilinear(src: PixelBuffer, u: number, v: number): { r: number; g: number; b: number; a: number } {
		const { width, height, data } = src;
		if (u < 0 || u > width - 1 || v < 0 || v > height - 1) {
			return { r: 0, g: 0, b: 0, a: 0 };
		}

		const x1 = Math.floor(u);
		const y1 = Math.floor(v);
		const x2 = Math.min(width - 1, x1 + 1);
		const y2 = Math.min(height - 1, y1 + 1);

		const dx = u - x1;
		const dy = v - y1;

		const idx11 = (y1 * width + x1) * 4;
		const idx12 = (y1 * width + x2) * 4;
		const idx21 = (y2 * width + x1) * 4;
		const idx22 = (y2 * width + x2) * 4;

		const r = (1 - dx) * (1 - dy) * data[idx11] +
		          dx * (1 - dy) * data[idx12] +
		          (1 - dx) * dy * data[idx21] +
		          dx * dy * data[idx22];

		const g = (1 - dx) * (1 - dy) * data[idx11 + 1] +
		          dx * (1 - dy) * data[idx12 + 1] +
		          (1 - dx) * dy * data[idx21 + 1] +
		          dx * dy * data[idx22 + 1];

		const b = (1 - dx) * (1 - dy) * data[idx11 + 2] +
		          dx * (1 - dy) * data[idx12 + 2] +
		          (1 - dx) * dy * data[idx21 + 2] +
		          dx * dy * data[idx22 + 2];

		const a = (1 - dx) * (1 - dy) * data[idx11 + 3] +
		          dx * (1 - dy) * data[idx12 + 3] +
		          (1 - dx) * dy * data[idx21 + 3] +
		          dx * dy * data[idx22 + 3];

		return {
			r: Math.round(r),
			g: Math.round(g),
			b: Math.round(b),
			a: Math.round(a)
		};
	}

	/**
	 * Applies spatial displacement distortion.
	 * Coordinate shift along `angle` modulated by coordinates and `scale`.
	 */
	public static applyDisplacementReference(src: PixelBuffer, params: EvaluatedDisplacementEffectParams): PixelBuffer {
		this.validatePixelBuffer(src);
		if (typeof params.strength !== "number" || isNaN(params.strength) || !isFinite(params.strength) ||
		    typeof params.scale !== "number" || isNaN(params.scale) || !isFinite(params.scale) || params.scale <= 0 ||
		    typeof params.angle !== "number" || isNaN(params.angle) || !isFinite(params.angle)) {
			throw new Error("Invalid displacement parameters");
		}
		const { width, height } = src;
		const outData = new Uint8ClampedArray(width * height * 4);
		const outBuf: PixelBuffer = { width, height, data: outData };

		const { strength, scale, angle } = params;
		if (strength === 0) {
			outData.set(src.data);
			return outBuf;
		}

		const rad = (angle * Math.PI) / 180;
		const cosA = Math.cos(rad);
		const sinA = Math.sin(rad);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const u = x + strength * cosA * Math.sin((y / scale) * 2 * Math.PI);
				const v = y + strength * sinA * Math.sin((x / scale) * 2 * Math.PI);

				const sampled = this.sampleBilinear(src, u, v);
				const outIdx = (y * width + x) * 4;
				outData[outIdx] = sampled.r;
				outData[outIdx + 1] = sampled.g;
				outData[outIdx + 2] = sampled.b;
				outData[outIdx + 3] = sampled.a;
			}
		}

		return outBuf;
	}

	/**
	 * Applies transverse wave distortion.
	 * Shifting perpendicular to wave direction.
	 */
	public static applyWaveReference(src: PixelBuffer, params: EvaluatedWaveEffectParams): PixelBuffer {
		this.validatePixelBuffer(src);
		if (typeof params.amplitude !== "number" || isNaN(params.amplitude) || !isFinite(params.amplitude) || params.amplitude < 0 ||
		    typeof params.frequency !== "number" || isNaN(params.frequency) || !isFinite(params.frequency) || params.frequency <= 0 ||
		    typeof params.phase !== "number" || isNaN(params.phase) || !isFinite(params.phase) ||
		    typeof params.direction !== "number" || isNaN(params.direction) || !isFinite(params.direction)) {
			throw new Error("Invalid wave parameters");
		}
		const { width, height } = src;
		const outData = new Uint8ClampedArray(width * height * 4);
		const outBuf: PixelBuffer = { width, height, data: outData };

		const { amplitude, frequency, phase, direction } = params;
		if (amplitude === 0) {
			outData.set(src.data);
			return outBuf;
		}

		const rad = (direction * Math.PI) / 180;
		const cosD = Math.cos(rad);
		const sinD = Math.sin(rad);

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const p = x * cosD + y * sinD;
				const waveOffset = Math.sin(p * frequency * 2 * Math.PI + phase) * amplitude;

				const u = x - sinD * waveOffset;
				const v = y + cosD * waveOffset;

				const sampled = this.sampleBilinear(src, u, v);
				const outIdx = (y * width + x) * 4;
				outData[outIdx] = sampled.r;
				outData[outIdx + 1] = sampled.g;
				outData[outIdx + 2] = sampled.b;
				outData[outIdx + 3] = sampled.a;
			}
		}

		return outBuf;
	}

	/**
	 * Applies radial bloat/pinch lens distortion.
	 */
	public static applyLensReference(src: PixelBuffer, params: EvaluatedLensEffectParams): PixelBuffer {
		this.validatePixelBuffer(src);
		if (typeof params.strength !== "number" || isNaN(params.strength) || !isFinite(params.strength) || params.strength < -10 || params.strength > 10 ||
		    typeof params.radius !== "number" || isNaN(params.radius) || !isFinite(params.radius) || params.radius <= 0 ||
		    typeof params.centerX !== "number" || isNaN(params.centerX) || !isFinite(params.centerX) ||
		    typeof params.centerY !== "number" || isNaN(params.centerY) || !isFinite(params.centerY)) {
			throw new Error("Invalid lens parameters");
		}
		const { width, height } = src;
		const outData = new Uint8ClampedArray(width * height * 4);
		const outBuf: PixelBuffer = { width, height, data: outData };

		const { strength, radius, centerX, centerY } = params;
		if (strength === 0) {
			outData.set(src.data);
			return outBuf;
		}

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const dx = x - centerX;
				const dy = y - centerY;
				const r = Math.sqrt(dx * dx + dy * dy);

				if (r < radius && r > 0) {
					const t = r / radius;
					const distortedT = Math.pow(t, strength > 0 ? (1 / (1 + strength)) : (1 - strength));
					const u = centerX + dx * (distortedT / t);
					const v = centerY + dy * (distortedT / t);

					const sampled = this.sampleBilinear(src, u, v);
					const outIdx = (y * width + x) * 4;
					outData[outIdx] = sampled.r;
					outData[outIdx + 1] = sampled.g;
					outData[outIdx + 2] = sampled.b;
					outData[outIdx + 3] = sampled.a;
				} else {
					const idx = (y * width + x) * 4;
					outData[idx] = src.data[idx];
					outData[idx + 1] = src.data[idx + 1];
					outData[idx + 2] = src.data[idx + 2];
					outData[idx + 3] = src.data[idx + 3];
				}
			}
		}

		return outBuf;
	}

	/**
	 * Composed reference pipeline executing all P3.8 + P3.9 effects in strict sequence.
	 */
	public static applyEffectsReference(input: PixelBuffer, effects: EvaluatedEffect[]): PixelBuffer {
		this.validatePixelBuffer(input);
		let current = input;

		for (const effect of effects) {
			if (!effect.enabled) {
				continue;
			}

			const effectInput = current;
			let effectOutput: PixelBuffer;

			if (effect.type === "blur") {
				effectOutput = EffectReference.blur(effectInput, effect.parameters.radius);
			} else if (effect.type === "glow") {
				effectOutput = EffectReference.glow(effectInput, effect.parameters.radius, effect.parameters.intensity, effect.parameters.color);
			} else if (effect.type === "color") {
				effectOutput = EffectReference.color(effectInput, effect.parameters.brightness, effect.parameters.contrast, effect.parameters.saturation, effect.parameters.hue);
			} else if (effect.type === "displacement") {
				effectOutput = this.applyDisplacementReference(effectInput, effect.parameters);
			} else if (effect.type === "wave") {
				effectOutput = this.applyWaveReference(effectInput, effect.parameters);
			} else if (effect.type === "lens") {
				effectOutput = this.applyLensReference(effectInput, effect.parameters);
			} else {
				continue;
			}

			const opacity = effect.opacity;
			if (opacity === 1) {
				current = effectOutput;
			} else {
				const lerpedData = new Uint8ClampedArray(input.width * input.height * 4);
				for (let i = 0; i < lerpedData.length; i++) {
					lerpedData[i] = Math.max(0, Math.min(255, Math.round(effectInput.data[i] * (1 - opacity) + effectOutput.data[i] * opacity)));
				}
				current = { width: input.width, height: input.height, data: lerpedData };
			}
		}

		return current;
	}
}
