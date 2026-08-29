/**
 * apply-plan.ts — Deterministic, transactional application of an AIEditPlan to the timeline.
 *
 * GOLDEN RULE: LLM NEVER MUTATES TIMELINE DIRECTLY.
 * This module is the ONLY entry point from AI to timeline mutations.
 * It is called AFTER the EditPlanValidator has returned valid = true.
 *
 * Flow:
 *   Validate → createTransaction() → apply() → verify() → commit() | rollback()
 */

import { EditorCore } from "@/core";
import type { AIEditPlan } from "./edit-plan";
import { EditPlanValidator, type ValidatorContext, type ValidationResult } from "./edit-plan-validator";
import { computePlanHashAsync } from "./edit-plan-validator";
import { SplitElementsCommand } from "@/lib/commands/timeline/element/split-elements";
import { UpdateElementCommand } from "@/lib/commands/timeline/element/update-element";
import { BatchCommand } from "@/lib/commands/batch-command";
import { UpdateProjectSettingsCommand } from "@/lib/commands/project/update-project-settings";
import type { TransitionType, VideoFilter, VideoTrack, Transform } from "@/types/timeline";
import { resolveMotionRecipe } from "./motion-recipes";
import { ApplyAIEditPlanCommand } from "./p42/apply-ai-edit-command";

// ---- Types ----

export type ApplyReport = {
	planId: string;
	planHash: string;
	baseRevision: number;
	resultingRevision: number;
	status: "committed" | "rolled_back" | "rejected";
	commandsApplied: number;
	commandsFailed: number;
	warnings: string[];
	durationMs: number;
	validation?: ValidationResult;
	error?: string;
};

/** @deprecated Use ApplyReport */
export type ApplyPlanResult = ApplyReport;

type Transaction = {
	planId: string;
	snapshotTracks: ReturnType<typeof EditorCore.prototype.timeline.getTracks>;
	snapshotRevision: number;
};

// ---- In-memory revision counter ----
// This increments every time the timeline is modified outside of applyPlan,
// ensuring plans built on old state are detected before apply.
let _currentRevision = 0;

export function getCurrentTimelineRevision(): number {
	return _currentRevision;
}

export function bumpTimelineRevision(): void {
	_currentRevision++;
}

export function resetTimelineRevision(): void {
	_currentRevision = 0;
}

// ---- Core ----

export async function applyPlan(
	plan: AIEditPlan,
	ctx: ValidatorContext,
): Promise<ApplyReport> {
	const startMs = performance.now();
	const editor = EditorCore.getInstance();
	const validator = new EditPlanValidator();

	// Step 1: Validate
	const validation = validator.validate(plan, ctx);
	if (!validation.valid) {
		return {
			planId: plan.id,
			planHash: plan.hash,
			baseRevision: plan.baseTimelineRevision,
			resultingRevision: _currentRevision,
			status: "rejected",
			commandsApplied: 0,
			commandsFailed: 0,
			warnings: validation.warnings.map(w => w.message),
			durationMs: performance.now() - startMs,
			error: `Validation failed: ${validation.errors.map(e => e.message).join("; ")}`,
			validation,
		};
	}

	// Step 2: Verify hash matches canonical representation
	const computedHash = await computePlanHashAsync(plan);
	if (computedHash !== plan.hash) {
		return {
			planId: plan.id,
			planHash: plan.hash,
			baseRevision: plan.baseTimelineRevision,
			resultingRevision: _currentRevision,
			status: "rejected",
			commandsApplied: 0,
			commandsFailed: 0,
			warnings: [],
			durationMs: performance.now() - startMs,
			error: `Plan hash mismatch. Expected: ${computedHash}, got: ${plan.hash}`,
		};
	}

	// Step 3: Create transaction snapshot
	const transaction: Transaction = {
		planId: plan.id,
		snapshotTracks: editor.timeline.getTracks(),
		snapshotRevision: _currentRevision,
	};

	let commandsApplied = 0;
	let commandsFailed = 0;
	let executedCommand: any = null;

	try {
		const applyCmd = new ApplyAIEditPlanCommand(
			() => {
				const result = buildCommandBatch(plan, editor);
				commandsApplied = result.commandCount;
				const batch = new BatchCommand(result.commands);
				batch.execute();
				
				// Apply markers and transitions synchronously (in-memory tracks/scenes update)
				// We don't await because it runs synchronously internally.
				applyMarkersAndTransitions(plan, editor);
			},
			_currentRevision,
			() => {
				bumpTimelineRevision();
			},
			() => {
				_currentRevision = transaction.snapshotRevision;
			}
		);

		editor.command.execute({ command: applyCmd });
		executedCommand = applyCmd;

		// Step 5: Verify
		const postApplyTracks = editor.timeline.getTracks();
		if (!postApplyTracks || postApplyTracks.length === 0) {
			throw new Error("Post-apply verification failed: timeline is empty.");
		}

		return {
			planId: plan.id,
			planHash: plan.hash,
			baseRevision: plan.baseTimelineRevision,
			resultingRevision: _currentRevision,
			status: "committed",
			commandsApplied,
			commandsFailed,
			warnings: validation.warnings.map(w => w.message),
			durationMs: performance.now() - startMs,
			validation,
		};
	} catch (err) {
		// Step 7: Rollback
		commandsFailed++;
		if (executedCommand) {
			try {
				editor.command.undo();
			} catch (undoErr) {
				console.error("[applyPlan] Command manager undo failed", undoErr);
			}
		}
		rollback(transaction, editor);
		return {
			planId: plan.id,
			planHash: plan.hash,
			baseRevision: plan.baseTimelineRevision,
			resultingRevision: transaction.snapshotRevision,
			status: "rolled_back",
			commandsApplied,
			commandsFailed,
			warnings: validation.warnings.map(w => w.message),
			durationMs: performance.now() - startMs,
			error: `Apply failed and was rolled back: ${err instanceof Error ? err.message : String(err)}`,
			validation,
		};
	}
}

// ---- Apply phase (deterministic) ----

type CommandBatch = {
	commands: InstanceType<typeof BatchCommand>["commands"] extends never[] ? any[] : any[];
	commandCount: number;
};

function buildCommandBatch(plan: AIEditPlan, editor: EditorCore): { commands: any[]; commandCount: number } {
	const tracks = editor.timeline.getTracks();
	const commands: any[] = [];
	if (!tracks || tracks.length === 0) return { commands, commandCount: 0 };

	const mainTrack = tracks.find(t => t.type === "video" && "isMain" in t && (t as VideoTrack).isMain) as VideoTrack | undefined;

	// 1. Cuts (splits) — sorted ascending so later cuts don't invalidate earlier element IDs
	if (mainTrack) {
		const sortedCuts = [...plan.cuts].sort((a, b) => a.time - b.time);
		for (const cut of sortedCuts) {
			const elements = getElementsAtTime(mainTrack, cut.time);
			if (elements.length > 0) {
				commands.push(
					new SplitElementsCommand(
						elements.map(el => ({ trackId: mainTrack.id, elementId: el.id })),
						cut.time,
						"both",
					)
				);
			}
		}
	}

	// 2. Effects — resolve trackId: SmartEditCore sets trackId = mediaId.
	//    We resolve by finding the video track that CONTAINS an element with that mediaId.
	for (const trackEffect of plan.effects) {
		// First try exact track ID match
		let targetTrack = tracks.find(t => t.id === trackEffect.trackId && t.type === "video") as VideoTrack | undefined;

		// Fallback: resolve mediaId -> track that contains element with that mediaId
		let targetElementId: string | undefined;
		if (!targetTrack) {
			for (const track of tracks) {
				if (track.type !== "video") continue;
				const vt = track as VideoTrack;
				const matchingEl = vt.elements.find((el: any) => el.mediaId === trackEffect.trackId);
				if (matchingEl) {
					targetTrack = vt;
					targetElementId = matchingEl.id;
					break;
				}
			}
		}

		if (!targetTrack) continue;

		for (const element of targetTrack.elements) {
			// If we resolved via mediaId fallback, only apply to that specific element.
			if (targetElementId && element.id !== targetElementId) continue;
			const updates: any = {};
			
			if (trackEffect.filters) {
				updates.filters = trackEffect.filters;
			}
			
			const newEffects = [...(element.effects || [])];
			
			if (trackEffect.effects) {
				for (const eff of trackEffect.effects) {
					const existingIndex = newEffects.findIndex((e: any) => e.type === eff.type);
					if (existingIndex >= 0) {
						newEffects[existingIndex] = eff;
					} else {
						newEffects.push(eff);
					}
				}
			}
			
			if (trackEffect.motion && trackEffect.motion !== "NONE") {
				const resolved = resolveMotionRecipe(trackEffect.motion, element.duration, Math.random() * 100000);
				
				if (resolved.transformKeyframes || resolved.propertyKeyframes) {
					const newTransform: Transform = { ...element.transform };
					
					if (resolved.transformKeyframes) {
						newTransform.transformKeyframes = resolved.transformKeyframes;
					}
					if (resolved.propertyKeyframes) {
						newTransform.propertyKeyframes = resolved.propertyKeyframes;
					}
					
					updates.transform = newTransform;
				}
				
				if (resolved.effects) {
					for (const eff of resolved.effects) {
						const existingIndex = newEffects.findIndex((e: any) => e.type === eff.type);
						if (existingIndex >= 0) {
							newEffects[existingIndex] = eff;
						} else {
							newEffects.push(eff);
						}
					}
				}
				
				// Handle cameraShake if present in the recipe
				if (resolved.cameraShake) {
					const currentSettings = editor.project.getActive().settings as any;
					const newCamera = currentSettings.virtualCamera ? { ...currentSettings.virtualCamera } : {};
					newCamera.shake = resolved.cameraShake;
					commands.push(
						new UpdateProjectSettingsCommand({
							virtualCamera: newCamera
						} as any)
					);
				}
			}

			if (newEffects.length > 0) {
				updates.effects = newEffects;
			}

			if (Object.keys(updates).length > 0) {
				commands.push(
					new UpdateElementCommand(
						targetTrack.id,
						element.id,
						updates,
					)
				);
			}
		}
	}

	return { commands, commandCount: commands.length };
}

async function applyMarkersAndTransitions(plan: AIEditPlan, editor: EditorCore): Promise<void> {
	const tracks = editor.timeline.getTracks();
	const mainTrack = tracks.find(t => t.type === "video" && "isMain" in t && (t as VideoTrack).isMain) as VideoTrack | undefined;

	// 3. Apply real transitions via editor.timeline.addTransition()
	if (mainTrack) {
		for (const transition of plan.transitions) {
			// After splits, find the two adjacent elements around the cut point
			const currentTracks = editor.timeline.getTracks();
			const currentMain = currentTracks.find(t => t.id === mainTrack.id) as VideoTrack | undefined;
			if (!currentMain) continue;

			const { from, to } = findAdjacentElements(currentMain, transition.atTime);
			if (from && to) {
				// Map generic transition type string to known TransitionType
				const transitionType = normalizeTransitionType(transition.type);
				editor.timeline.addTransition({
					trackId: currentMain.id,
					fromElementId: from.id,
					toElementId: to.id,
					type: transitionType,
					duration: transition.duration,
				});
			} else {
				// Fallback: store as marker for future rendering
				editor.scenes.addMarker({
					time: transition.atTime,
					type: "transition",
					data: { transitionType: transition.type, duration: transition.duration },
				});
			}
		}
	}

	// 4. Beat markers for UI visualization
	for (const decision of plan.decisions) {
		if (decision.type === "cut" && decision.sources.some(s => s.startsWith("beat_"))) {
			editor.scenes.addMarker({
				time: decision.time,
				type: "beat",
				data: { reason: decision.reason, confidence: decision.confidence },
			});
		}
	}
}

// ---- Rollback ----

function rollback(transaction: Transaction, editor: EditorCore): void {
	try {
		editor.timeline.updateTracks(transaction.snapshotTracks);
		console.warn(`[applyPlan] Rolled back plan ${transaction.planId} to revision ${transaction.snapshotRevision}.`);
	} catch (rollbackErr) {
		console.error("[applyPlan] CRITICAL: Rollback itself failed!", rollbackErr);
	}
}

// ---- Helpers ----

function getElementsAtTime(track: any, time: number): { id: string }[] {
	if (!track.elements) return [];
	return track.elements.filter((el: any) => {
		const start = el.startTime;
		const end = el.startTime + el.duration;
		return time > start && time < end;
	});
}

function findAdjacentElements(track: VideoTrack, time: number): { from: any | null, to: any | null } {
	if (!track.elements || track.elements.length === 0) return { from: null, to: null };
	let from = null;
	let to = null;
	
	// Assume elements are sorted by startTime
	const sortedElements = [...track.elements].sort((a: any, b: any) => a.startTime - b.startTime);
	for (let i = 0; i < sortedElements.length; i++) {
		const el = sortedElements[i];
		// Looking for a cut point approximately at `time`
		if (Math.abs(el.startTime - time) < 0.1) {
			to = el;
			if (i > 0) from = sortedElements[i - 1];
			break;
		} else if (Math.abs((el.startTime + el.duration) - time) < 0.1) {
			from = el;
			if (i < sortedElements.length - 1) to = sortedElements[i + 1];
			break;
		}
	}
	return { from, to };
}

function normalizeTransitionType(type: string): TransitionType {
	const validTypes: TransitionType[] = [
		"fade", "dissolve", "wipe-left", "wipe-right", 
		"wipe-up", "wipe-down", "slide-left", "slide-right", 
		"slide-up", "slide-down", "zoom-in", "zoom-out"
	];
	// Try to map some common ones
	if (type === "flash") return "fade";
	if (type === "crossfade") return "dissolve";
	if (type === "zoom") return "zoom-in";
	if (type === "wipe") return "wipe-right";
	if (type === "push") return "slide-left";
	
	if (validTypes.includes(type as TransitionType)) {
		return type as TransitionType;
	}
	return "fade";
}
