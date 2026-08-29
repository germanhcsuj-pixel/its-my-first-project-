"use client";

import { useTranslation } from "@i18next-toolkit/nextjs-approuter";

export function useLocalizedFaqItems() {
	const { t } = useTranslation();

	return [
		{
			question: t("What is Solifon Studio?"),
			answer: t(
				"Solifon Studio is an AI-native, open-source video editor that runs entirely in your browser. It is a free, privacy-first alternative to CapCut — no installation or sign-up required, just open the website and start editing.",
			),
		},
		{
			question: t("Is Solifon Studio free to use?"),
			answer: t(
				"Yes, Solifon Studio is completely free. It is open-source software licensed under a permissive license. There are no hidden fees, subscriptions, or premium tiers.",
			),
		},
		{
			question: t("Does Solifon Studio upload my files to a server?"),
			answer: t(
				"All your media files and editing operations stay on your device. However, AI-related features (such as AI image generation) may send data to third-party AI services or Solifon Studio's temporary relay server for processing.",
			),
		},
		{
			question: t("What export formats does Solifon Studio support?"),
			answer: t(
				"Solifon Studio supports exporting videos in MP4 and WebM formats with adjustable quality settings (low, medium, high, and very high).",
			),
		},
		{
			question: t("Does Solifon Studio work offline?"),
			answer: t(
				"Solifon Studio runs in your browser and requires an initial page load. Once loaded, most editing features work without an active internet connection since all processing is done locally.",
			),
		},
		{
			question: t("Is Solifon Studio open source?"),
			answer: t(
				"Yes, Solifon Studio is fully open source and community-driven. You can inspect the source code, contribute, or fork it on GitHub.",
			),
		},
		{
			question: t("How is Solifon Studio different from CapCut?"),
			answer: t(
				"Unlike CapCut, Solifon Studio is fully open source and runs entirely in your browser. Your media files stay on your device — only AI features may communicate with external services. Solifon Studio is AI-native with built-in AI agent, image generation, and audio transcription, with no account or subscription required.",
			),
		},
	];
}
