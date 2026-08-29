export type EditStyleId = "anime_amv" | "cyberpunk" | "cinematic" | "tiktok" | "social_short" | "custom";

export type PacingConfig = "slow" | "medium" | "fast";
export type CuttingConfig = "hard" | "jump" | "match";

export type VisualConfig = {
	colorGrading?: "none" | "neon" | "cyberpunk" | "bw_contrast" | "color_grade" | "vhs" | "glitch";
	intensity: number;
	allowGlitch?: boolean;
	allowFlash?: boolean;
};

export type CaptionConfig = {
	enabled: boolean;
	style?: "subtitles" | "karaoke" | "dynamic_word" | "bold_tiktok";
	fontSize?: number;
	color?: string;
	stroke?: boolean;
	position?: "bottom" | "center" | "top";
};

export type TransitionConfig = {
	allowedTypes: ("none" | "crossfade" | "dip_to_black" | "dip_to_white" | "flash" | "wipe")[];
	preferredType: "none" | "crossfade" | "dip_to_black" | "dip_to_white" | "flash" | "wipe";
	maxDuration: number;
};

export type MusicSyncConfig = {
	strictness: number; // 0.0 to 1.0, where 1.0 means every cut MUST be on a beat
	allowOffBeatCuts: boolean;
};

export type InterestScoreWeights = {
	motion: number;
	face: number;
	composition: number;
	sharpness: number;
	audioEnergy: number;
	sceneChange: number;
};

export type EditStyle = {
	pacing: PacingConfig;
	cutting: CuttingConfig;
	cutConstraints: {
		minClipDuration: number;
		maxCutsPerSecond: number;
		preferredCutInterval: number;
	};
	visual: VisualConfig;
	captions: CaptionConfig;
	transitions: TransitionConfig;
	musicSync: MusicSyncConfig;
	interestWeights: InterestScoreWeights;
};

export const STYLE_PRESETS: Record<Exclude<EditStyleId, "custom">, EditStyle> = {
	anime_amv: {
		pacing: "fast",
		cutting: "jump",
		cutConstraints: {
			minClipDuration: 0.2, // very fast cuts allowed
			maxCutsPerSecond: 4,
			preferredCutInterval: 0.8,
		},
		visual: {
			colorGrading: "neon",
			intensity: 1.0,
			allowGlitch: true,
			allowFlash: true,
		},
		captions: {
			enabled: false,
		},
		transitions: {
			allowedTypes: ["none", "flash", "dip_to_white"],
			preferredType: "none",
			maxDuration: 0.3,
		},
		musicSync: {
			strictness: 1.0,
			allowOffBeatCuts: false,
		},
		interestWeights: {
			motion: 1.0,
			face: 0.5,
			composition: 0.3,
			sharpness: 0.5,
			audioEnergy: 1.0,
			sceneChange: 0.8,
		},
	},
	cinematic: {
		pacing: "slow",
		cutting: "match",
		cutConstraints: {
			minClipDuration: 1.5,
			maxCutsPerSecond: 1,
			preferredCutInterval: 3.0,
		},
		visual: {
			colorGrading: "color_grade",
			intensity: 0.8,
			allowGlitch: false,
			allowFlash: false,
		},
		captions: {
			enabled: true,
			style: "subtitles",
			position: "bottom",
		},
		transitions: {
			allowedTypes: ["none", "crossfade", "dip_to_black"],
			preferredType: "crossfade",
			maxDuration: 1.0,
		},
		musicSync: {
			strictness: 0.4,
			allowOffBeatCuts: true,
		},
		interestWeights: {
			motion: 0.4,
			face: 0.8,
			composition: 1.0,
			sharpness: 0.9,
			audioEnergy: 0.3,
			sceneChange: 0.6,
		},
	},
	tiktok: {
		pacing: "fast",
		cutting: "jump",
		cutConstraints: {
			minClipDuration: 0.5,
			maxCutsPerSecond: 2,
			preferredCutInterval: 1.5,
		},
		visual: {
			colorGrading: "none",
			intensity: 0.0,
			allowGlitch: false,
			allowFlash: true,
		},
		captions: {
			enabled: true,
			style: "bold_tiktok",
			position: "center",
		},
		transitions: {
			allowedTypes: ["none"],
			preferredType: "none",
			maxDuration: 0.2,
		},
		musicSync: {
			strictness: 0.6,
			allowOffBeatCuts: true,
		},
		interestWeights: {
			motion: 0.7,
			face: 1.0, // Face is most important for TikTok
			composition: 0.5,
			sharpness: 0.8,
			audioEnergy: 0.8,
			sceneChange: 0.5,
		},
	},
	cyberpunk: {
		pacing: "fast",
		cutting: "hard",
		cutConstraints: {
			minClipDuration: 0.4,
			maxCutsPerSecond: 3,
			preferredCutInterval: 1.2,
		},
		visual: {
			colorGrading: "cyberpunk",
			intensity: 1.0,
			allowGlitch: true,
			allowFlash: true,
		},
		captions: {
			enabled: false,
		},
		transitions: {
			allowedTypes: ["none", "flash"],
			preferredType: "none",
			maxDuration: 0.2,
		},
		musicSync: {
			strictness: 0.8,
			allowOffBeatCuts: false,
		},
		interestWeights: {
			motion: 0.9,
			face: 0.4,
			composition: 0.6,
			sharpness: 0.7,
			audioEnergy: 0.9,
			sceneChange: 0.8,
		},
	},
	social_short: {
		pacing: "medium",
		cutting: "hard",
		cutConstraints: {
			minClipDuration: 0.8,
			maxCutsPerSecond: 1.5,
			preferredCutInterval: 2.0,
		},
		visual: {
			colorGrading: "none",
			intensity: 0.0,
		},
		captions: {
			enabled: true,
			style: "dynamic_word",
			position: "center",
		},
		transitions: {
			allowedTypes: ["none", "crossfade"],
			preferredType: "none",
			maxDuration: 0.5,
		},
		musicSync: {
			strictness: 0.5,
			allowOffBeatCuts: true,
		},
		interestWeights: {
			motion: 0.6,
			face: 0.9,
			composition: 0.7,
			sharpness: 0.8,
			audioEnergy: 0.5,
			sceneChange: 0.6,
		},
	}
};
