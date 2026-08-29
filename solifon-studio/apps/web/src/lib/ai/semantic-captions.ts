/**
 * semantic-captions.ts — Whisper-based word-level semantic caption system.
 *
 * Features:
 *   1. Transcribes audio using Whisper (via transformers.js or API)
 *   2. Produces word-level timestamps
 *   3. Marks emphasis words (high energy moments)
 *   4. Produces SemanticCaption objects ready for rendering
 *
 * Rendering is handled by the caption renderer, not here.
 * This module only produces the semantic data.
 */

import type { AudioAnalysisResult } from "./audio-analyzer";

// ---- Types ----

export type SemanticWord = {
	word: string;
	start: number;  // seconds
	end: number;    // seconds
	emphasis: boolean;
	confidence: number;
};

export type SemanticCaption = {
	id: string;
	text: string;
	start: number;
	end: number;
	words: SemanticWord[];
	emotion: "neutral" | "excited" | "dramatic" | "calm";
	style: "anime" | "neon" | "tiktok" | "minimal" | "karaoke";
	position: "bottom" | "center" | "top";
};

export type CaptionStyle = SemanticCaption["style"];
export type CaptionPosition = SemanticCaption["position"];

export type WhisperSegment = {
	text: string;
	start: number;
	end: number;
	words?: Array<{ word: string; start: number; end: number }>;
};

// ---- Transcript Source ----

export type TranscriptSource =
	| { type: "whisper_api"; result: WhisperSegment[] }
	| { type: "webkitspeech"; result: WhisperSegment[] }
	| { type: "mock"; text: string; duration: number };

// ---- Caption Builder ----

export class SemanticCaptionBuilder {
	build(
		transcript: TranscriptSource,
		audioAnalysis: AudioAnalysisResult | null,
		style: CaptionStyle = "tiktok",
		position: CaptionPosition = "bottom",
	): SemanticCaption[] {
		const segments = this.parseTranscript(transcript);
		return segments.map(seg => this.buildCaption(seg, audioAnalysis, style, position));
	}

	private parseTranscript(source: TranscriptSource): WhisperSegment[] {
		if (source.type === "mock") {
			// Create a single-segment mock from plain text
			const words = source.text.split(" ").map((word, i) => ({
				word,
				start: (i / source.text.split(" ").length) * source.duration,
				end: ((i + 1) / source.text.split(" ").length) * source.duration,
			}));
			return [{ text: source.text, start: 0, end: source.duration, words }];
		}

		return source.result;
	}

	private buildCaption(
		seg: WhisperSegment,
		audio: AudioAnalysisResult | null,
		style: CaptionStyle,
		position: CaptionPosition,
	): SemanticCaption {
		const words: SemanticWord[] = (seg.words ?? []).map(w => ({
			word: w.word,
			start: w.start,
			end: w.end,
			confidence: 1.0,
			emphasis: this.isEmphasis(w.word, w.start, audio),
		}));

		return {
			id: crypto.randomUUID(),
			text: seg.text.trim(),
			start: seg.start,
			end: seg.end,
			words,
			emotion: this.detectEmotion(seg.text, audio, seg.start),
			style,
			position,
		};
	}

	private isEmphasis(word: string, time: number, audio: AudioAnalysisResult | null): boolean {
		// Mark short strong words as emphasis
		const shortStrongWords = new Set(["yeah", "yes", "no", "wow", "fire", "go", "stop", "love", "hate"]);
		if (shortStrongWords.has(word.toLowerCase())) return true;

		// Mark if audio energy is high at this moment
		if (audio) {
			const segment = audio.segments.find(
				s => time >= s.startTime && time < s.endTime
			);
			if (segment && segment.energy > 0.7) return true;
		}

		// Mark if UPPERCASE in original
		if (word === word.toUpperCase() && word.length > 1) return true;

		return false;
	}

	private detectEmotion(
		text: string,
		audio: AudioAnalysisResult | null,
		time: number,
	): SemanticCaption["emotion"] {
		const lower = text.toLowerCase();
		const excitedWords = ["amazing", "incredible", "wow", "yes", "fire", "let's go", "crazy"];
		const dramaticWords = ["never", "always", "impossible", "dead", "broken", "lost"];
		const calmWords = ["thank", "feel", "peace", "slow", "calm", "soft"];

		if (excitedWords.some(w => lower.includes(w))) return "excited";
		if (dramaticWords.some(w => lower.includes(w))) return "dramatic";
		if (calmWords.some(w => lower.includes(w))) return "calm";

		// Use audio energy as fallback
		if (audio) {
			const segment = audio.segments.find(s => time >= s.startTime && time < s.endTime);
			if (segment && segment.energy > 0.65) return "excited";
			if (segment && segment.energy < 0.2) return "calm";
		}

		return "neutral";
	}
}

// ---- Caption to TextElement converter ----

import type { CreateTextElement } from "@/types/timeline";

export function captionToTextElement(
	caption: SemanticCaption,
	trackDuration: number,
): Omit<CreateTextElement, "id"> {
	const colors: Record<CaptionStyle, string> = {
		anime: "#ffffff",
		neon: "#00ffcc",
		tiktok: "#ffffff",
		minimal: "#eeeeee",
		karaoke: "#ffee00",
	};

	const bgColors: Record<CaptionStyle, string> = {
		anime: "rgba(0,0,0,0.85)",
		neon: "rgba(0,20,20,0.8)",
		tiktok: "rgba(0,0,0,0.6)",
		minimal: "transparent",
		karaoke: "rgba(0,0,0,0.7)",
	};

	return {
		name: `Caption: ${caption.text.slice(0, 20)}`,
		type: "text",
		content: caption.text,
		startTime: caption.start,
		duration: Math.max(0.1, caption.end - caption.start),
		trimStart: 0,
		trimEnd: 0,
		fontSize: caption.style === "tiktok" ? 48 : caption.style === "anime" ? 42 : 36,
		fontFamily: caption.style === "tiktok" ? "Inter" : caption.style === "anime" ? "Rajdhani" : "Inter",
		color: colors[caption.style],
		backgroundColor: bgColors[caption.style],
		textAlign: "center",
		fontWeight: caption.emotion === "excited" ? "bold" : "normal",
		fontStyle: "normal",
		textDecoration: "none",
		transform: {
			scale: 1,
			position: {
				x: 0,
				y: caption.position === "bottom" ? 0.8 : caption.position === "top" ? 0.1 : 0.5,
			},
			rotate: 0,
		},
		opacity: 1,
	};
}
