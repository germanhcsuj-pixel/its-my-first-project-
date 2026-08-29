import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateUUID } from "@/utils/id";

export type AudioAssetStatus = "pending" | "running" | "complete" | "failed";

export interface GeneratedAudio {
	id: string;
	prompt: string;
	modelId: string;
	status: AudioAssetStatus;
	audioUrl?: string;
	error?: string;
	progress?: number;
	createdAt: Date;
}

interface AIAudioGenerationState {
	prompt: string;
	modelId: string;
	isGenerating: boolean;
	generatedAudios: GeneratedAudio[];
	setPrompt: (prompt: string) => void;
	setModelId: (modelId: string) => void;
	generate: () => void;
	removeAudio: (id: string) => void;
}

let worker: Worker | null = null;
if (typeof window !== "undefined") {
	worker = new Worker(new URL("@/lib/ai/audio-worker", import.meta.url), {
		type: "module",
	});
}

export const useAIAudioGenerationStore = create<
	AIAudioGenerationState,
	[["zustand/persist", unknown]]
>(
	persist(
		(set, get) => {
			if (worker) {
				worker.addEventListener("message", (event) => {
					const { id, status, url, error, progress } = event.data;
					
					set((state) => {
						const audios = [...state.generatedAudios];
						const index = audios.findIndex((a) => a.id === id);
						if (index === -1) return state;

						if (status === "downloading") {
							audios[index] = { ...audios[index], progress: progress?.progress ?? 0 };
						} else if (status === "complete") {
							audios[index] = { ...audios[index], status: "complete", audioUrl: url };
						} else if (status === "error") {
							audios[index] = { ...audios[index], status: "failed", error };
						} else if (status === "loading" || status === "generating") {
							audios[index] = { ...audios[index], status: "running" };
						}

						const isGenerating = audios.some((a) => a.status === "running" || a.status === "pending");
						
						return { generatedAudios: audios, isGenerating };
					});
				});
			}

			return {
				prompt: "",
				modelId: "Xenova/musicgen-small",
				isGenerating: false,
				generatedAudios: [],
				
				setPrompt: (prompt) => set({ prompt }),
				setModelId: (modelId) => set({ modelId }),
				
				generate: () => {
					const { prompt, modelId, isGenerating } = get();
					if (isGenerating || !prompt.trim() || !worker) return;

					const id = generateUUID();
					const newAudio: GeneratedAudio = {
						id,
						prompt,
						modelId,
						status: "pending",
						createdAt: new Date(),
					};

					set((state) => ({
						isGenerating: true,
						generatedAudios: [newAudio, ...state.generatedAudios],
					}));

					worker.postMessage({
						type: "generate",
						id,
						prompt,
						modelId,
					});
				},

				removeAudio: (id) =>
					set((state) => ({
						generatedAudios: state.generatedAudios.filter((a) => a.id !== id),
					})),
			};
		},
		{
			name: "ai-audio-generation-storage",
			partialize: (state) => ({
				prompt: state.prompt,
				modelId: state.modelId,
			}),
		},
	),
);
