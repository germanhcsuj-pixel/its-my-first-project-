import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

let segmenter: ImageSegmenter | null = null;
let isInitializing = false;
let lastTimestamp = -1;

self.addEventListener("message", async (event) => {
	const { type, imageBitmap, timestampMs, id } = event.data;

	if (type === "init") {
		if (segmenter || isInitializing) return;
		isInitializing = true;
		try {
			const vision = await FilesetResolver.forVisionTasks(
				"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
			);
			
			segmenter = await ImageSegmenter.createFromOptions(vision, {
				baseOptions: {
					modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
					delegate: "GPU"
				},
				runningMode: "VIDEO",
				outputCategoryMask: true,
				outputConfidenceMasks: false
			});
			self.postMessage({ type: "init_done" });
		} catch (error) {
			self.postMessage({ type: "error", error: String(error) });
		} finally {
			isInitializing = false;
		}
	} else if (type === "segment") {
		if (!segmenter) {
			self.postMessage({ type: "error", id, error: "Segmenter not initialized" });
			return;
		}

		if (lastTimestamp < 0) {
			lastTimestamp = 0;
		} else {
			lastTimestamp += 33;
		}

		try {
			const result = segmenter.segmentForVideo(imageBitmap, lastTimestamp);
			
			if (result?.categoryMask) {
				let maskData: Uint8Array;
				
				// Extract raw mask data. MediaPipe gives an MPImage object.
				if (typeof (result.categoryMask as any).getAsUint8Array === "function") {
					maskData = new Uint8Array((result.categoryMask as any).getAsUint8Array());
				} else if (typeof (result.categoryMask as any).getAsImageData === "function") {
					// Fallback if only ImageData is available
					const imgData = (result.categoryMask as any).getAsImageData().data;
					maskData = new Uint8Array(imgData.length / 4);
					for(let i=0; i<maskData.length; i++) {
						maskData[i] = imgData[i*4];
					}
				} else {
					throw new Error("Unable to extract mask data");
				}
				
				const width = result.categoryMask.width;
				const height = result.categoryMask.height;

				if (typeof result.close === "function") result.close();

				self.postMessage({ type: "segment_done", id, maskData, width, height }, [maskData.buffer as any]);
			} else {
				self.postMessage({ type: "segment_done", id, maskData: null });
			}
		} catch (error) {
			self.postMessage({ type: "error", id, error: String(error) });
		}
		
		if (imageBitmap && typeof imageBitmap.close === "function") {
			imageBitmap.close();
		}
	}
});
