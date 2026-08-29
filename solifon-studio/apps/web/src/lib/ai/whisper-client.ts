export class WhisperClient {
	private worker: Worker | null = null;
	private onReady?: () => void;
	private onProgress?: (progress: any) => void;

	constructor() {
		if (typeof window !== "undefined") {
			this.worker = new Worker(new URL("../../workers/whisper.worker.ts", import.meta.url));
			this.worker.addEventListener("message", this.handleMessage.bind(this));
		}
	}

	private handleMessage(event: MessageEvent) {
		const { status } = event.data;
		if (status === "ready" && this.onReady) {
			this.onReady();
		} else if (status === "progress" && this.onProgress) {
			this.onProgress(event.data);
		}
	}

	load(model: string, onProgress?: (progress: any) => void): Promise<void> {
		this.onProgress = onProgress;
		return new Promise((resolve, reject) => {
			this.onReady = resolve;
			if (this.worker) {
				this.worker.postMessage({ type: "load", model });
			} else {
				reject(new Error("Worker not initialized"));
			}
		});
	}

	transcribe(
		audioData: Float32Array,
		model: string,
		language: string
	): Promise<{ text: string; chunks: { timestamp: [number, number]; text: string }[] }> {
		return new Promise((resolve, reject) => {
			if (!this.worker) return reject(new Error("Worker not initialized"));

			const messageHandler = (event: MessageEvent) => {
				const { status, result, error } = event.data;
				if (status === "complete") {
					this.worker?.removeEventListener("message", messageHandler);
					resolve(result);
				} else if (status === "error") {
					this.worker?.removeEventListener("message", messageHandler);
					reject(new Error(error));
				}
			};

			this.worker.addEventListener("message", messageHandler);
			this.worker.postMessage({ type: "transcribe", audio: audioData, model, language });
		});
	}

	static async extractAudioTo16kHzMono(arrayBuffer: ArrayBuffer): Promise<Float32Array> {
		const { FFmpeg } = await import("@ffmpeg/ffmpeg");
		const { fetchFile } = await import("@ffmpeg/util");
		const ffmpeg = new FFmpeg();
		
		await ffmpeg.load();
		
		await ffmpeg.writeFile("input", await fetchFile(new Blob([arrayBuffer])));
		await ffmpeg.exec([
			"-i", "input",
			"-f", "f32le",
			"-ac", "1",
			"-ar", "16000",
			"output.raw"
		]);
		
		const data = await ffmpeg.readFile("output.raw") as Uint8Array;
		const float32Data = new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4);
		
		return float32Data;
	}
}

