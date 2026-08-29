export interface FontSpec {
	family: string;
	url?: string;
	weight?: string | number;
	style?: string;
}

export type FontStatus = "loading" | "ready" | "failed";

export class FontRegistry {
	private static instance: FontRegistry;
	
	private fontStatus = new Map<string, FontStatus>();
	private fontPromises = new Map<string, Promise<void>>();

	private constructor() {}

	public static getInstance(): FontRegistry {
		if (!FontRegistry.instance) {
			FontRegistry.instance = new FontRegistry();
		}
		return FontRegistry.instance;
	}

	public getFontKey(spec: FontSpec): string {
		const weight = spec.weight ?? "normal";
		const style = spec.style ?? "normal";
		return `${spec.family}:${weight}:${style}`;
	}

	public isReady(spec: FontSpec): boolean {
		// If it's a built-in system font, we might assume it's ready, but for now we track everything loaded via URL or assume system fonts are ready if not explicitly tracked.
		const key = this.getFontKey(spec);
		if (this.fontStatus.has(key)) {
			return this.fontStatus.get(key) === "ready";
		}
		// If it's not tracked and has no URL, assume it's a system font that is ready
		if (!spec.url) {
			return true;
		}
		return false;
	}

	public getStatus(spec: FontSpec): FontStatus | undefined {
		const key = this.getFontKey(spec);
		return this.fontStatus.get(key);
	}

	public async loadFont(spec: FontSpec): Promise<void> {
		if (!spec.url) {
			return; // System font
		}

		const key = this.getFontKey(spec);

		if (this.fontStatus.get(key) === "ready") {
			return;
		}

		if (this.fontPromises.has(key)) {
			return this.fontPromises.get(key);
		}

		this.fontStatus.set(key, "loading");

		const promise = (async () => {
			try {
				const font = new FontFace(spec.family, `url(${spec.url})`, {
					weight: String(spec.weight ?? "normal"),
					style: spec.style ?? "normal",
				});
				await font.load();
				document.fonts.add(font);
				this.fontStatus.set(key, "ready");
			} catch (err) {
				console.error(`Failed to load font ${key}:`, err);
				this.fontStatus.set(key, "failed");
				throw err; // Re-throw to inform caller
			}
		})();

		this.fontPromises.set(key, promise);
		
		try {
			await promise;
		} finally {
			// Do not remove from promises map, so subsequent calls can still await it or immediately resolve
		}
	}

	public async awaitReady(spec: FontSpec): Promise<void> {
		const key = this.getFontKey(spec);
		
		if (!spec.url && !this.fontPromises.has(key)) {
			return; // Assuming system font
		}

		const promise = this.fontPromises.get(key);
		if (promise) {
			await promise;
		} else {
			// If it's requested but not yet loading via loadFont, we might throw or implicitly load.
			// Let's assume the caller must call loadFont explicitly.
			if (spec.url) {
				await this.loadFont(spec);
			}
		}
	}
}

export const fontRegistry = FontRegistry.getInstance();
