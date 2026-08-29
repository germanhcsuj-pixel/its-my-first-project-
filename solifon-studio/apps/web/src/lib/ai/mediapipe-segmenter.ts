import { generateUUID } from "@/utils/id";

export interface SegmenterResult {
	maskData: Uint8Array;
	width: number;
	height: number;
}

export class BackgroundRemover {
	private worker: Worker | null = null;
	private initPromise: Promise<void> | null = null;
	private isInitialized = false;
	private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

	async initialize() {
		if (this.isInitialized) return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = new Promise((resolve, reject) => {
			if (typeof window !== "undefined") {
				this.worker = new Worker(new URL("../../workers/mediapipe.worker.ts", import.meta.url), { type: "module" });
				
				this.worker.addEventListener("message", (event) => {
					const { type, id, maskData, width, height, error } = event.data;
					if (type === "init_done") {
						this.isInitialized = true;
						resolve();
					} else if (type === "error") {
						if (!this.isInitialized) reject(new Error(error));
						else if (id && this.pendingRequests.has(id)) {
							this.pendingRequests.get(id)!.reject(new Error(error));
							this.pendingRequests.delete(id);
						}
					} else if (type === "segment_done") {
						if (id && this.pendingRequests.has(id)) {
							if (maskData) {
								this.pendingRequests.get(id)!.resolve({ maskData, width, height });
							} else {
								this.pendingRequests.get(id)!.resolve(null);
							}
							this.pendingRequests.delete(id);
						}
					}
				});
				
				this.worker.postMessage({ type: "init" });
			} else {
				reject(new Error("Cannot initialize worker in SSR"));
			}
		});

		return this.initPromise;
	}

	async segmentVideoFrame(imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap, timestampMs: number): Promise<SegmenterResult | null> {
		if (!this.worker) {
			await this.initialize();
		}
		if (!this.worker) return null;

		return new Promise((resolve, reject) => {
			const id = generateUUID();
			this.pendingRequests.set(id, { resolve, reject });
			
			createImageBitmap(imageSource as any).then((imageBitmap) => {
				this.worker!.postMessage({ type: "segment", id, imageBitmap, timestampMs }, [imageBitmap]);
			}).catch(err => {
				this.pendingRequests.delete(id);
				reject(err);
			});
		});
	}
	
	async segmentImage(imageSource: HTMLImageElement | HTMLCanvasElement | OffscreenCanvas | ImageBitmap): Promise<SegmenterResult | null> {
		return this.segmentVideoFrame(imageSource, 0);
	}

	dispose() {
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.isInitialized = false;
		this.initPromise = null;
		this.pendingRequests.clear();
	}
}

export const globalBackgroundRemover = new BackgroundRemover();
