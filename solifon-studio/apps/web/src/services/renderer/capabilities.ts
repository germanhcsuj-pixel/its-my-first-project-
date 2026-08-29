export type RenderCapabilities = {
	webgl2: boolean;
	maxTextureSize: number;
	hardwareAcceleration: boolean;
	offscreenCanvas: boolean;
	webCodecs: boolean;
	sharedArrayBuffer: boolean;
	maxResolution: {
		width: number;
		height: number;
	};
	supportedCodecs: string[];
	tier: "high" | "balanced" | "compatibility";
};

let cachedCapabilities: RenderCapabilities | null = null;

export function detectRenderCapabilities(): RenderCapabilities {
	if (cachedCapabilities) {
		return cachedCapabilities;
	}

	const caps: RenderCapabilities = {
		webgl2: false,
		maxTextureSize: 2048,
		hardwareAcceleration: false,
		offscreenCanvas: typeof OffscreenCanvas !== "undefined",
		webCodecs: typeof window !== "undefined" && "VideoEncoder" in window,
		sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
		maxResolution: {
			width: 1920,
			height: 1080,
		},
		supportedCodecs: [],
		tier: "compatibility",
	};

	if (typeof document === "undefined") {
		// SSR environment
		return caps;
	}

	// Codec detection
	if (caps.webCodecs && typeof VideoEncoder !== "undefined") {
		VideoEncoder.isConfigSupported({
			codec: "avc1.42001E", // H.264
			width: 1920,
			height: 1080,
		}).then((support) => {
			if (support.supported) caps.supportedCodecs.push("h264");
		}).catch(() => {});
		
		VideoEncoder.isConfigSupported({
			codec: "vp09.00.10.08", // VP9
			width: 1920,
			height: 1080,
		}).then((support) => {
			if (support.supported) caps.supportedCodecs.push("vp9");
		}).catch(() => {});
	}

	try {
		const canvas = document.createElement("canvas");
		const gl = canvas.getContext("webgl2", { powerPreference: "high-performance" }) as WebGL2RenderingContext | null;
		
		if (gl) {
			caps.webgl2 = true;
			caps.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
			
			const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
			if (debugInfo) {
				const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)?.toLowerCase() || "";
				// Very basic heuristic for hardware acceleration
				if (!renderer.includes("swiftshader") && !renderer.includes("llvmpipe") && !renderer.includes("software")) {
					caps.hardwareAcceleration = true;
				}
			}
		} else {
			// Fallback to webgl1 to check texture size
			const gl1 = canvas.getContext("webgl") as WebGLRenderingContext | null;
			if (gl1) {
				caps.maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE);
			}
		}
	} catch (e) {
		console.warn("Failed to detect WebGL capabilities:", e);
	}

	// Update max resolution based on texture size
	if (caps.maxTextureSize >= 8192) {
		caps.maxResolution = { width: 3840, height: 2160 }; // 4K
	} else if (caps.maxTextureSize >= 4096) {
		caps.maxResolution = { width: 2560, height: 1440 }; // 1440p
	}

	// Determine tier
	if (caps.webgl2 && caps.hardwareAcceleration && caps.webCodecs && caps.maxTextureSize >= 8192) {
		caps.tier = "high";
	} else if (caps.webgl2 && caps.maxTextureSize >= 4096) {
		caps.tier = "balanced";
	} else {
		caps.tier = "compatibility";
	}

	cachedCapabilities = caps;
	return caps;
}
