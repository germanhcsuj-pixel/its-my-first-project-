/**
 * webgl-filter-chain.ts — Composable WebGL filter chain for the AI Edit Engine.
 *
 * Renders a sequence of VideoFilter[] onto a canvas using WebGL2.
 * Each filter is a separate pass: input texture → fragment shader → output.
 *
 * Usage:
 *   const chain = new WebGLFilterChain(canvas);
 *   chain.apply(sourceCanvas, [
 *     { id: "cinematic", intensity: 0.7 },
 *     { id: "vhs", intensity: 0.3, parameters: { noise: 0.5 } },
 *   ]);
 */

import type { VideoFilter, VideoFilterId } from "@/types/timeline";

// ---- Shader Sources ----

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 vUv;
void main() {
  vUv = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FILTER_SHADERS: Record<VideoFilterId, (intensity: string) => string> = {
	cinematic: (i) => `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
void main() {
  vec4 c = texture(u_texture, vUv);
  // Letterbox bars
  float barHeight = 0.06 * ${i};
  if (vUv.y < barHeight || vUv.y > 1.0 - barHeight) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  // Contrast + desaturate slightly
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 graded = mix(c.rgb, vec3(luma), 0.15 * ${i});
  graded = (graded - 0.5) * (1.0 + 0.2 * ${i}) + 0.5;
  fragColor = vec4(graded, c.a);
}`,

	vhs: (i) => `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_time;
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  // Scanlines
  float scanline = sin(uv.y * 800.0) * 0.04 * ${i};
  // Horizontal distortion
  float jitter = (rand(vec2(uv.y, u_time * 0.1)) - 0.5) * 0.003 * ${i};
  uv.x += jitter;
  // Chromatic aberration
  float ca = 0.003 * ${i};
  float r = texture(u_texture, uv + vec2(ca, 0)).r;
  float g = texture(u_texture, uv).g;
  float b = texture(u_texture, uv - vec2(ca, 0)).b;
  vec4 c = vec4(r, g, b, texture(u_texture, uv).a);
  // Noise
  float noise = rand(uv + u_time) * 0.06 * ${i};
  fragColor = vec4(c.rgb + scanline + noise, c.a);
}`,

	glitch: (i) => `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_time;
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  // Block glitch
  float blockY = floor(uv.y * 20.0) / 20.0;
  float glitchRand = rand(vec2(blockY, floor(u_time * 5.0)));
  if (glitchRand > (1.0 - 0.15 * ${i})) {
    uv.x += (glitchRand - 0.85) * 0.4;
  }
  // RGB split
  float split = 0.007 * ${i};
  vec4 c;
  c.r = texture(u_texture, uv + vec2(split, 0.0)).r;
  c.g = texture(u_texture, uv).g;
  c.b = texture(u_texture, uv - vec2(split, 0.0)).b;
  c.a = texture(u_texture, uv).a;
  fragColor = c;
}`,

	bw_contrast: (_i) => `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
void main() {
  vec4 c = texture(u_texture, vUv);
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  luma = (luma - 0.5) * 1.8 + 0.5;
  fragColor = vec4(vec3(luma), c.a);
}`,

	cyberpunk: (i) => `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
void main() {
  vec4 c = texture(u_texture, vUv);
  // Boost cyan and magenta
  vec3 cp = c.rgb;
  cp.r += 0.15 * ${i};
  cp.b += 0.25 * ${i};
  cp.g = cp.g * (1.0 - 0.1 * ${i});
  // High contrast
  cp = (cp - 0.5) * (1.0 + 0.3 * ${i}) + 0.5;
  fragColor = vec4(clamp(cp, 0.0, 1.0), c.a);
}`,

	neon: (i) => `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
void main() {
  vec4 c = texture(u_texture, vUv);
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  // Boost saturation strongly
  vec3 saturated = mix(vec3(luma), c.rgb, 1.0 + 2.5 * ${i});
  // Add neon bloom-like glow
  vec3 bloom = saturated * (1.0 + 0.3 * ${i} * step(0.6, luma));
  fragColor = vec4(clamp(bloom, 0.0, 1.0), c.a);
}`,

	color_grade: (i) => `#version 300 es
precision mediump float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
void main() {
  vec4 c = texture(u_texture, vUv);
  // Lift shadows, crush highlights slightly
  vec3 graded = c.rgb;
  graded = mix(graded, pow(graded, vec3(0.85)), ${i} * 0.5);
  // Warm highlights
  float luma = dot(graded, vec3(0.299, 0.587, 0.114));
  graded.r = mix(graded.r, graded.r + 0.05, step(0.6, luma) * ${i});
  graded.b = mix(graded.b, graded.b - 0.03, step(0.6, luma) * ${i});
  fragColor = vec4(clamp(graded, 0.0, 1.0), c.a);
}`,
};

export class WebGLFilterChain {
	private gl: WebGL2RenderingContext | null;
	private ctx2d: CanvasRenderingContext2D | null = null;
	private programs = new Map<string, WebGLProgram>();
	private quadVao: WebGLVertexArrayObject | null = null;
	private framebufs: [WebGLFramebuffer, WebGLTexture][] = [];
	private time = 0;

	constructor(private canvas: HTMLCanvasElement) {
		const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false });
		if (!gl) {
			console.warn("WebGL2 not supported, falling back to Canvas2D (limited filters)");
			this.gl = null;
			this.ctx2d = canvas.getContext("2d");
			return;
		}
		this.gl = gl;
		this.quadVao = this.createQuad();
	}

	apply(
		source: HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
		filters: VideoFilter[],
		deltaTime = 0.016,
	): void {
		if (!this.gl) {
			this.applyCanvas2DFallback(source, filters);
			return;
		}

		const gl = this.gl;
		if (!this.quadVao) return;
		
		this.time += deltaTime;
		const w = this.canvas.width;
		const h = this.canvas.height;

		if (filters.length === 0) {
			const ctx2d = this.canvas.getContext("2d");
			if (ctx2d) ctx2d.drawImage(source as CanvasImageSource, 0, 0);
			return;
		}

		this.ensureFramebuffers(w, h);
		const [fb0, tex0] = this.framebufs[0];
		const [fb1, tex1] = this.framebufs[1];

		const sourceTex = this.uploadTexture(source, w, h);
		if (!sourceTex) return;

		let readTex = sourceTex;
		let writeFb = fb0;
		let writeTex = tex0;

		for (let i = 0; i < filters.length; i++) {
			const filter = filters[i];
			const isLast = i === filters.length - 1;

			const prog = this.getOrCompileProgram(filter);
			if (!prog) continue;

			if (isLast) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.viewport(0, 0, w, h);
			} else {
				gl.bindFramebuffer(gl.FRAMEBUFFER, writeFb);
				gl.viewport(0, 0, w, h);
			}

			gl.useProgram(prog);
			gl.bindVertexArray(this.quadVao);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, readTex);
			const texLoc = gl.getUniformLocation(prog, "u_texture");
			gl.uniform1i(texLoc, 0);

			const timeLoc = gl.getUniformLocation(prog, "u_time");
			if (timeLoc) gl.uniform1f(timeLoc, this.time);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.bindVertexArray(null);

			if (!isLast) {
				readTex = writeTex;
				writeFb = writeFb === fb0 ? fb1 : fb0;
				writeTex = writeTex === tex0 ? tex1 : tex0;
			}
		}

		gl.deleteTexture(sourceTex);
	}

	tick(dt: number): void {
		this.time += dt;
	}

	dispose(): void {
		if (!this.gl) return;
		const gl = this.gl;
		for (const [fb, tex] of this.framebufs) {
			gl.deleteFramebuffer(fb);
			gl.deleteTexture(tex);
		}
		this.programs.forEach(p => gl.deleteProgram(p));
	}

	private applyCanvas2DFallback(
		source: HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
		filters: VideoFilter[]
	): void {
		if (!this.ctx2d) return;
		const ctx = this.ctx2d;
		
		let cssFilters = "";
		for (const filter of filters) {
			if (filter.id === "bw_contrast") {
				cssFilters += `grayscale(100%) contrast(${100 + filter.intensity * 50}%) `;
			} else if (filter.id === "color_grade") {
				cssFilters += `saturate(${100 + filter.intensity * 30}%) brightness(${100 + filter.intensity * 10}%) `;
			} else if (filter.id === "cyberpunk") {
				cssFilters += `hue-rotate(30deg) saturate(${100 + filter.intensity * 100}%) contrast(120%) `;
			} else if (filter.id === "neon") {
				cssFilters += `saturate(${100 + filter.intensity * 150}%) brightness(120%) `;
			} else if (filter.id === "vhs" || filter.id === "glitch") {
				cssFilters += `sepia(${filter.intensity * 30}%) contrast(${100 + filter.intensity * 20}%) `;
			}
		}
		
		ctx.filter = cssFilters.trim() || "none";
		ctx.drawImage(source as CanvasImageSource, 0, 0, this.canvas.width, this.canvas.height);
		ctx.filter = "none";
	}

	private getOrCompileProgram(filter: VideoFilter): WebGLProgram | null {
		const key = `${filter.id}_${filter.intensity.toFixed(2)}`;
		if (this.programs.has(key)) return this.programs.get(key)!;

		const fragBuilder = FILTER_SHADERS[filter.id as keyof typeof FILTER_SHADERS];
		if (!fragBuilder) return null;

		const fragSource = fragBuilder(filter.intensity.toString());
		const prog = this.compileProgram(VERTEX_SHADER, fragSource);
		if (prog) this.programs.set(key, prog);
		return prog;
	}

	private compileProgram(vert: string, frag: string): WebGLProgram | null {
		if (!this.gl) return null;
		const gl = this.gl;
		const vs = this.compileShader(gl.VERTEX_SHADER, vert);
		const fs = this.compileShader(gl.FRAGMENT_SHADER, frag);
		if (!vs || !fs) return null;

		const prog = gl.createProgram()!;
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);

		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			console.error("Program link error:", gl.getProgramInfoLog(prog));
			return null;
		}
		return prog;
	}

	private compileShader(type: number, src: string): WebGLShader | null {
		if (!this.gl) return null;
		const gl = this.gl;
		const shader = gl.createShader(type)!;
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error("Shader compile error:", gl.getShaderInfoLog(shader), "\n---\n", src);
			return null;
		}
		return shader;
	}

	private createQuad(): WebGLVertexArrayObject | null {
		if (!this.gl) return null;
		const gl = this.gl;
		// Full-screen quad: position [-1,1] and texCoord [0,1]
		const data = new Float32Array([
			-1, -1, 0, 0,
			1, -1, 1, 0,
			-1, 1, 0, 1,
			1, 1, 1, 1,
		]);

		const vao = gl.createVertexArray()!;
		gl.bindVertexArray(vao);

		const vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

		// pos (location 0)
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);

		// uv (location 1)
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

		gl.bindVertexArray(null);
		return vao;
	}

	private uploadTexture(
		source: HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
		w: number,
		h: number,
	): WebGLTexture | null {
		if (!this.gl) return null;
		const gl = this.gl;
		const tex = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, tex);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
		return tex;
	}

	private ensureFramebuffers(w: number, h: number): void {
		if (!this.gl) return;
		if (this.framebufs.length === 2) {
			return;
		}

		const gl = this.gl;

		for (let i = 0; i < 2; i++) {
			const tex = gl.createTexture()!;
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			const fb = gl.createFramebuffer()!;
			gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

			this.framebufs.push([fb, tex]);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}
}
