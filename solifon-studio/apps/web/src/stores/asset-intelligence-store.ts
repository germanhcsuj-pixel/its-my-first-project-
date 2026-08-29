import { create } from "zustand";
import { analyzeVideo, type VideoAnalyzerOptions } from "@/lib/ai/video-analyzer-client";
import type { VideoAnalysisResult } from "@/workers/video-analyzer.worker";

export type Scene = {
	start: number;
	end: number;
};

export type MediaAssetAnalysis = {
	mediaId: string;
	duration: number;
	scenes: Scene[];
	quality: number;
	speech: boolean;
	faces: number;
	motion: number;
	detectedObjects?: string[];
	dominantColors?: string[];
};

interface AssetIntelligenceState {
	analysisData: Record<string, MediaAssetAnalysis>;
	isAnalyzing: Record<string, boolean>;
	
	analyzeAsset: (mediaId: string, videoElement: HTMLVideoElement, options?: VideoAnalyzerOptions) => Promise<void>;
	getAnalysis: (mediaId: string) => MediaAssetAnalysis | undefined;
}

export const useAssetIntelligenceStore = create<AssetIntelligenceState>((set, get) => ({
	analysisData: {},
	isAnalyzing: {},

	analyzeAsset: async (mediaId, videoElement, options) => {
		// Prevent parallel analysis of the same asset
		if (get().isAnalyzing[mediaId]) return;

		set((state) => ({
			isAnalyzing: { ...state.isAnalyzing, [mediaId]: true }
		}));

		try {
			const result: VideoAnalysisResult = await analyzeVideo(videoElement, options);
			
			// Map scene changes (timestamps) to Scene intervals
			const scenes: Scene[] = [];
			let lastTime = 0;
			for (const changeTime of result.sceneChanges) {
				scenes.push({ start: lastTime, end: changeTime });
				lastTime = changeTime;
			}
			scenes.push({ start: lastTime, end: result.duration });

			// Estimate faces/speech from raw data (MVP mock for missing features)
			// In P2, we would run MediaPipe FaceDetector and WebSpeech API
			const hasSpeech = false;
			const faceCount = 0;

			const analysis: MediaAssetAnalysis = {
				mediaId,
				duration: result.duration,
				scenes,
				quality: result.averageSharpness,
				speech: hasSpeech,
				faces: faceCount,
				motion: result.averageMotion,
			};

			set((state) => ({
				analysisData: { ...state.analysisData, [mediaId]: analysis }
			}));

		} catch (error) {
			console.error(`Asset intelligence analysis failed for ${mediaId}:`, error);
		} finally {
			set((state) => ({
				isAnalyzing: { ...state.isAnalyzing, [mediaId]: false }
			}));
		}
	},

	getAnalysis: (mediaId) => {
		return get().analysisData[mediaId];
	}
}));
