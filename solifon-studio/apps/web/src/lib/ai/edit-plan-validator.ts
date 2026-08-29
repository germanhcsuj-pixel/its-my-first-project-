import type { AIEditPlan, Cut, Transition } from "./edit-plan";

// ---- Validation Types ----

export type ValidationErrorCode =
	| "OVERLAPPING_CLIPS"
	| "INVALID_MEDIA_ID"
	| "NEGATIVE_TIMESTAMP"
	| "CLIP_EXCEEDS_MEDIA_DURATION"
	| "TRANSITION_TOO_LONG"
	| "DUPLICATE_CUTS"
	| "ZERO_DURATION_CLIP"
	| "TRANSITION_COLLISION"
	| "FILTER_PARAM_OUT_OF_RANGE"
	| "CAPTION_OVERFLOW"
	| "UNSUPPORTED_RENDERER_CAPABILITY"
	| "TARGET_DURATION_EXCEEDED"
	| "PLAN_OUTDATED";

export type ValidationWarningCode =
	| "CLIP_TOO_SHORT"
	| "HIGH_CUT_FREQUENCY"
	| "DURATION_OVER_TARGET";

export type ValidationError = {
	code: ValidationErrorCode;
	message: string;
	context?: Record<string, unknown>;
};

export type ValidationWarning = {
	code: ValidationWarningCode;
	message: string;
	context?: Record<string, unknown>;
};

export type AutoFix = {
	description: string;
	type: "technical"; // NEVER creative — Validator only fixes technical errors
};

export type ValidationResult = {
	valid: boolean;
	errors: ValidationError[];
	warnings: ValidationWarning[];
	autoFixes: AutoFix[];
};

// ---- Validator Context ----

export type ValidatorContext = {
	mediaLibrary: Map<string, { duration: number }>;
	currentTimelineRevision: number;
	rendererCapabilities?: {
		tier: "high" | "balanced" | "compatibility";
		supportedCodecs: string[];
		maxResolution: { width: number; height: number };
	};
};

// ---- EditPlanValidator ----

export class EditPlanValidator {
	validate(plan: AIEditPlan, ctx: ValidatorContext): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];
		const autoFixes: AutoFix[] = [];

		// 1. Check plan is not outdated vs current timeline revision
		if (plan.baseTimelineRevision !== ctx.currentTimelineRevision) {
			errors.push({
				code: "PLAN_OUTDATED",
				message: `Plan was built on timeline revision ${plan.baseTimelineRevision}, but current revision is ${ctx.currentTimelineRevision}. Regenerate diff before applying.`,
				context: {
					planRevision: plan.baseTimelineRevision,
					currentRevision: ctx.currentTimelineRevision,
				},
			});
			// This is a fatal error — stop here, no point validating the rest.
			return { valid: false, errors, warnings, autoFixes };
		}

		// 2. Validate source clips have valid media IDs
		for (const clip of plan.sourceClips) {
			if (!ctx.mediaLibrary.has(clip.mediaId)) {
				errors.push({
					code: "INVALID_MEDIA_ID",
					message: `Media ID "${clip.mediaId}" not found in library.`,
					context: { mediaId: clip.mediaId },
				});
			}
		}

		// 3. Validate cuts
		const cutTimes = new Set<number>();
		for (const cut of plan.cuts) {
			// Negative timestamps
			if (cut.time < 0) {
				errors.push({
					code: "NEGATIVE_TIMESTAMP",
					message: `Cut at negative time: ${cut.time}s`,
					context: { cut },
				});
				continue;
			}

			// Duplicate cuts
			const key = Math.round(cut.time * 1000); // ms precision
			if (cutTimes.has(key)) {
				errors.push({
					code: "DUPLICATE_CUTS",
					message: `Duplicate cut at ${cut.time}s`,
					context: { time: cut.time },
				});
			}
			cutTimes.add(key);
		}

		// 4. Validate style-aware cut constraints
		if (plan.cuts.length > 0 && plan.intent) {
			const sorted = [...plan.cuts].sort((a, b) => a.time - b.time);
			const constraints = this.getCutConstraintsForPacing(plan.intent.pacing);

			for (let i = 1; i < sorted.length; i++) {
				const interval = sorted[i].time - sorted[i - 1].time;
				if (interval < constraints.minClipDuration) {
					warnings.push({
						code: "CLIP_TOO_SHORT",
						message: `Clip between ${sorted[i - 1].time}s and ${sorted[i].time}s is ${interval.toFixed(3)}s — below style minimum of ${constraints.minClipDuration}s.`,
						context: { interval, min: constraints.minClipDuration },
					});
				}
			}

			// High cut frequency check (global)
			if (sorted.length > 0) {
				const span = sorted[sorted.length - 1].time - sorted[0].time;
				const cutsPerSecond = span > 0 ? sorted.length / span : 0;
				if (cutsPerSecond > constraints.maxCutsPerSecond) {
					warnings.push({
						code: "HIGH_CUT_FREQUENCY",
						message: `${cutsPerSecond.toFixed(2)} cuts/sec exceeds style max of ${constraints.maxCutsPerSecond}.`,
						context: { cutsPerSecond, max: constraints.maxCutsPerSecond },
					});
				}
			}
		}

		// 5. Validate transitions
		const sortedCuts = [...plan.cuts].sort((a, b) => a.time - b.time);
		for (const transition of plan.transitions) {
			if (transition.atTime < 0) {
				errors.push({
					code: "NEGATIVE_TIMESTAMP",
					message: `Transition at negative time: ${transition.atTime}s`,
					context: { transition },
				});
				continue;
			}

			if (transition.duration <= 0) {
				errors.push({
					code: "ZERO_DURATION_CLIP",
					message: `Transition at ${transition.atTime}s has zero or negative duration.`,
					context: { transition },
				});
				continue;
			}

			// Check transition doesn't exceed available clip duration
			const nearestCut = this.findNearestCut(
				sortedCuts.filter(c => Math.abs(c.time - transition.atTime) > 0.001),
				transition.atTime
			);
			if (nearestCut) {
				const available = Math.abs(transition.atTime - nearestCut.time);
				if (transition.duration > available * 2) {
					// Auto-fix: clamp transition to available space
					const fixedDuration = Math.max(0.1, available);
					autoFixes.push({
						description: `Clamped transition at ${transition.atTime}s from ${transition.duration}s to ${fixedDuration.toFixed(2)}s (technical: exceeds clip boundary).`,
						type: "technical",
					});
					transition.duration = fixedDuration;
				}
			}
		}

		// 6. Validate filter parameters
		for (const trackEffect of plan.effects) {
			for (const filter of trackEffect.filters || []) {
				if (filter.intensity < 0 || filter.intensity > 1) {
					errors.push({
						code: "FILTER_PARAM_OUT_OF_RANGE",
						message: `Filter "${filter.id}" intensity ${filter.intensity} is out of range [0, 1].`,
						context: { filter },
					});
				}

				if (filter.parameters) {
					const p = filter.parameters;
					if (p.noise !== undefined && (p.noise < 0 || p.noise > 1)) {
						errors.push({
							code: "FILTER_PARAM_OUT_OF_RANGE",
							message: `Filter "${filter.id}" noise ${p.noise} out of range [0, 1].`,
						});
					}
					if (p.distortion !== undefined && (p.distortion < 0 || p.distortion > 1)) {
						errors.push({
							code: "FILTER_PARAM_OUT_OF_RANGE",
							message: `Filter "${filter.id}" distortion ${p.distortion} out of range [0, 1].`,
						});
					}
				}
			}
			
			for (const effect of trackEffect.effects || []) {
				if (effect.type === "glow") {
					if (effect.radius < 0) {
						errors.push({ code: "FILTER_PARAM_OUT_OF_RANGE", message: `Glow radius ${effect.radius} < 0` });
					}
					if (effect.intensity < 0 || effect.intensity > 10) {
						errors.push({ code: "FILTER_PARAM_OUT_OF_RANGE", message: `Glow intensity ${effect.intensity} out of range [0, 10]` });
					}
					if (effect.blendMode && effect.blendMode !== "add" && effect.blendMode !== "screen") {
						errors.push({ code: "FILTER_PARAM_OUT_OF_RANGE", message: `Unknown glow blend mode: ${effect.blendMode}` });
					}
				} else if (effect.type === "motion-blur") {
					if (effect.samples < 1 || effect.samples > 16) {
						errors.push({ code: "FILTER_PARAM_OUT_OF_RANGE", message: `Motion blur samples ${effect.samples} out of range [1, 16]` });
					}
					if (effect.shutterAngle < 0 || effect.shutterAngle > 360) {
						errors.push({ code: "FILTER_PARAM_OUT_OF_RANGE", message: `Motion blur shutterAngle ${effect.shutterAngle} out of range [0, 360]` });
					}
				} else if (effect.type === "blur") {
					if (effect.radius < 0) {
						errors.push({ code: "FILTER_PARAM_OUT_OF_RANGE", message: `Blur radius ${effect.radius} < 0` });
					}
				} else {
					errors.push({ code: "FILTER_PARAM_OUT_OF_RANGE", message: `Unknown effect type: ${(effect as any).type}` });
				}
			}
		}

		// 7. Validate target duration tolerance (±10%)
		if (plan.intent.targetDuration) {
			const actualCutCount = plan.cuts.length;
			// We can only warn here without knowing final assembled duration
			// A real check would be in the apply phase; this is a pre-flight sanity check
			if (actualCutCount === 0 && plan.intent.targetDuration > 0) {
				warnings.push({
					code: "DURATION_OVER_TARGET",
					message: "No cuts defined but targetDuration is set — final duration may not match target.",
				});
			}
		}

		// 8. Renderer capability check
		if (ctx.rendererCapabilities && ctx.rendererCapabilities.tier === "compatibility") {
			const hasHeavyFilters = plan.effects.some(e =>
				e.filters && e.filters.some(f => ["glitch", "vhs", "cyberpunk"].includes(f.id))
			);
			if (hasHeavyFilters) {
				warnings.push({
					code: "HIGH_CUT_FREQUENCY", // re-use, or we could add a new code
					message: "Heavy WebGL filters (glitch, vhs, cyberpunk) may not render correctly in compatibility mode.",
					context: { tier: "compatibility" },
				});
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
			autoFixes,
		};
	}

	// ---- Helpers ----

	private getCutConstraintsForPacing(pacing: "slow" | "medium" | "fast") {
		switch (pacing) {
			case "slow":
				return { minClipDuration: 1.5, maxCutsPerSecond: 0.5, preferredCutInterval: 3.0 };
			case "medium":
				return { minClipDuration: 0.4, maxCutsPerSecond: 1.5, preferredCutInterval: 1.5 };
			case "fast":
				return { minClipDuration: 0.25, maxCutsPerSecond: 4.0, preferredCutInterval: 0.5 };
		}
	}

	private findNearestCut(sortedCuts: Cut[], time: number): Cut | null {
		if (sortedCuts.length === 0) return null;

		let nearest: Cut | null = null;
		let minDist = Infinity;

		for (const cut of sortedCuts) {
			const dist = Math.abs(cut.time - time);
			if (dist < minDist) {
				minDist = dist;
				nearest = cut;
			}
		}

		return nearest;
	}
}

// ---- Plan Hashing ----

export function computePlanHash(plan: AIEditPlan): string {
	// Build a canonical representation that excludes:
	// - id (random UUID, meaningless for content)
	// - hash itself
	// - timestamps / created dates
	const canonical = {
		intent: plan.intent,
		sourceClips: plan.sourceClips.map(c => c.mediaId).sort(),
		cuts: [...plan.cuts].sort((a, b) => a.time - b.time),
		transitions: [...plan.transitions].sort((a, b) => a.atTime - b.atTime),
		effects: plan.effects,
		captions: plan.captions,
		musicSync: plan.musicSync,
	};

	const json = JSON.stringify(canonical, null, 0);

	// Use Web Crypto API (sync-style via TextEncoder + subtle trick)
	// Note: For a truly sync hash in browser we use a simple djb2 as fallback.
	// SHA-256 requires async; callers should use computePlanHashAsync.
	return djb2Hash(json);
}

export async function computePlanHashAsync(plan: AIEditPlan): Promise<string> {
	const canonical = {
		intent: plan.intent,
		sourceClips: plan.sourceClips.map(c => c.mediaId).sort(),
		cuts: [...plan.cuts].sort((a, b) => a.time - b.time),
		transitions: [...plan.transitions].sort((a, b) => a.atTime - b.atTime),
		effects: plan.effects,
		captions: plan.captions,
		musicSync: plan.musicSync,
	};

	const json = JSON.stringify(canonical, null, 0);
	const encoder = new TextEncoder();
	const data = encoder.encode(json);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function djb2Hash(str: string): string {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) + str.charCodeAt(i);
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(16);
}
