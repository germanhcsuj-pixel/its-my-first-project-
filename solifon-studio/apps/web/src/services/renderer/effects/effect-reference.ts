import { RGBA } from "@/types/timeline";

export interface PixelBuffer {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

export class EffectReference {
	/**
	 * Clamps a number to the border coordinate.
	 */
	private static clamp(val: number, min: number, max: number): number {
		return val < min ? min : val > max ? max : val;
	}

	/**
	 * Generates a separable 1D Gaussian kernel.
	 */
	public static generateGaussianKernel(radius: number): number[] {
		if (radius <= 0) {
			return [1];
		}
		const sigma = radius / 2;
		const size = 2 * Math.ceil(radius) + 1;
		const half = Math.floor(size / 2);
		const kernel: number[] = new Array(size);
		let sum = 0;

		const twoSigmaSq = 2 * sigma * sigma;

		for (let i = 0; i < size; i++) {
			const x = i - half;
			kernel[i] = Math.exp(-(x * x) / twoSigmaSq);
			sum += kernel[i];
		}

		// Normalize
		for (let i = 0; i < size; i++) {
			kernel[i] /= sum;
		}

		return kernel;
	}

	/**
	 * Gaussian blur on a 4-channel RGBA pixel buffer.
	 */
	public static blur(src: PixelBuffer, radius: number): PixelBuffer {
		const { width, height, data } = src;
		const outData = new Uint8ClampedArray(data.length);
		const temp = new Float32Array(data.length);

		if (radius <= 0) {
			outData.set(data);
			return { width, height, data: outData };
		}

		const kernel = this.generateGaussianKernel(radius);
		const half = Math.floor(kernel.length / 2);

		// Horizontal pass: src -> temp
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let sumR = 0;
				let sumG = 0;
				let sumB = 0;
				let sumA = 0;

				for (let k = 0; k < kernel.length; k++) {
					const ix = this.clamp(x + k - half, 0, width - 1);
					const idx = (y * width + ix) * 4;
					const weight = kernel[k];

					sumR += data[idx] * weight;
					sumG += data[idx + 1] * weight;
					sumB += data[idx + 2] * weight;
					sumA += data[idx + 3] * weight;
				}

				const outIdx = (y * width + x) * 4;
				temp[outIdx] = sumR;
				temp[outIdx + 1] = sumG;
				temp[outIdx + 2] = sumB;
				temp[outIdx + 3] = sumA;
			}
		}

		// Vertical pass: temp -> outData
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let sumR = 0;
				let sumG = 0;
				let sumB = 0;
				let sumA = 0;

				for (let k = 0; k < kernel.length; k++) {
					const iy = this.clamp(y + k - half, 0, height - 1);
					const idx = (iy * width + x) * 4;
					const weight = kernel[k];

					sumR += temp[idx] * weight;
					sumG += temp[idx + 1] * weight;
					sumB += temp[idx + 2] * weight;
					sumA += temp[idx + 3] * weight;
				}

				const outIdx = (y * width + x) * 4;
				outData[outIdx] = this.clamp(Math.round(sumR), 0, 255);
				outData[outIdx + 1] = this.clamp(Math.round(sumG), 0, 255);
				outData[outIdx + 2] = this.clamp(Math.round(sumB), 0, 255);
				outData[outIdx + 3] = this.clamp(Math.round(sumA), 0, 255);
			}
		}

		return { width, height, data: outData };
	}

	/**
	 * Glow effect on an RGBA buffer.
	 */
	public static glow(src: PixelBuffer, radius: number, intensity: number, color: RGBA): PixelBuffer {
		const { width, height, data } = src;
		const outData = new Uint8ClampedArray(data.length);

		if (radius <= 0 || intensity <= 0) {
			outData.set(data);
			return { width, height, data: outData };
		}

		// 1. Extract alpha channel
		const alphaMap = new Uint8ClampedArray(width * height);
		for (let i = 0; i < width * height; i++) {
			alphaMap[i] = data[i * 4 + 3];
		}

		// 2. Gaussian blur the alpha channel
		const kernel = this.generateGaussianKernel(radius);
		const half = Math.floor(kernel.length / 2);
		const tempAlpha = new Float32Array(width * height);

		// Horizontal pass
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let sum = 0;
				for (let k = 0; k < kernel.length; k++) {
					const ix = this.clamp(x + k - half, 0, width - 1);
					sum += alphaMap[y * width + ix] * kernel[k];
				}
				tempAlpha[y * width + x] = sum;
			}
		}

		// Vertical pass
		const blurredAlpha = new Uint8ClampedArray(width * height);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				let sum = 0;
				for (let k = 0; k < kernel.length; k++) {
					const iy = this.clamp(y + k - half, 0, height - 1);
					sum += tempAlpha[iy * width + x] * kernel[k];
				}
				blurredAlpha[y * width + x] = this.clamp(Math.round(sum), 0, 255);
			}
		}

		// 3. Composite glow using Source Over blending
		for (let i = 0; i < width * height; i++) {
			const idx = i * 4;

			// Glow pixel (pre-composited opacity)
			const srcA = (blurredAlpha[i] / 255) * color.a * intensity;
			const srcR = color.r;
			const srcG = color.g;
			const srcB = color.b;

			// Destination pixel
			const dstR = data[idx];
			const dstG = data[idx + 1];
			const dstB = data[idx + 2];
			const dstA = data[idx + 3] / 255;

			// Source Over blending formula
			const outA = srcA + dstA * (1 - srcA);
			if (outA > 0) {
				const outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
				const outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
				const outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;

				outData[idx] = this.clamp(Math.round(outR), 0, 255);
				outData[idx + 1] = this.clamp(Math.round(outG), 0, 255);
				outData[idx + 2] = this.clamp(Math.round(outB), 0, 255);
				outData[idx + 3] = this.clamp(Math.round(outA * 255), 0, 255);
			} else {
				outData[idx] = 0;
				outData[idx + 1] = 0;
				outData[idx + 2] = 0;
				outData[idx + 3] = 0;
			}
		}

		return { width, height, data: outData };
	}

	/**
	 * Color adjustment effect on an RGBA buffer.
	 */
	public static color(src: PixelBuffer, brightness: number, contrast: number, saturation: number, hue: number): PixelBuffer {
		const { width, height, data } = src;
		const outData = new Uint8ClampedArray(data.length);

		// Normalize hue to [0, 360)
		const normHue = ((hue % 360) + 360) % 360;
		const hRad = (normHue * Math.PI) / 180;
		const cosVal = Math.cos(hRad);
		const sinVal = Math.sin(hRad);

		// W3C matrix values for Hue rotation
		const r_r = 0.213 + 0.787 * cosVal - 0.213 * sinVal;
		const r_g = 0.715 - 0.715 * cosVal - 0.715 * sinVal;
		const r_b = 0.072 - 0.072 * cosVal + 0.928 * sinVal;

		const g_r = 0.213 - 0.213 * cosVal + 0.143 * sinVal;
		const g_g = 0.715 + 0.285 * cosVal + 0.140 * sinVal;
		const g_b = 0.072 - 0.072 * cosVal - 0.283 * sinVal;

		const b_r = 0.213 - 0.213 * cosVal - 0.787 * sinVal;
		const b_g = 0.715 - 0.715 * cosVal + 0.715 * sinVal;
		const b_b = 0.072 + 0.928 * cosVal + 0.072 * sinVal;

		for (let i = 0; i < width * height; i++) {
			const idx = i * 4;
			let r = data[idx] / 255;
			let g = data[idx + 1] / 255;
			let b = data[idx + 2] / 255;
			const a = data[idx + 3];

			// 1. Brightness
			r *= brightness;
			g *= brightness;
			b *= brightness;

			// 2. Contrast
			r = (r - 0.5) * contrast + 0.5;
			g = (g - 0.5) * contrast + 0.5;
			b = (b - 0.5) * contrast + 0.5;

			// 3. Saturation (BT.601)
			const lum = 0.299 * r + 0.587 * g + 0.114 * b;
			r = lum + (r - lum) * saturation;
			g = lum + (g - lum) * saturation;
			b = lum + (b - lum) * saturation;

			// 4. Hue rotation
			const rNew = r_r * r + r_g * g + r_b * b;
			const gNew = g_r * r + g_g * g + g_b * b;
			const bNew = b_r * r + b_g * g + b_b * b;

			outData[idx] = this.clamp(Math.round(rNew * 255), 0, 255);
			outData[idx + 1] = this.clamp(Math.round(gNew * 255), 0, 255);
			outData[idx + 2] = this.clamp(Math.round(bNew * 255), 0, 255);
			outData[idx + 3] = a; // Alpha remains unchanged in Color effect
		}

		return { width, height, data: outData };
	}
}
