/**
 * ai-checkpoints.ts — Undo/Redo specifically for AI edits.
 *
 * The standard command history handles user edits.
 * This module maintains a separate AI-specific checkpoint stack so users can:
 *   1. See a list of AI edits with timestamps and plan summaries
 *   2. Revert to any previous AI state (without undoing manual edits)
 *   3. Compare Plan v1 → Plan v2 (EditDiff)
 *
 * AI Checkpoint is taken BEFORE each applyPlan() call.
 */

import type { AIEditPlan } from "./edit-plan";
import type { TimelineTrack } from "@/types/timeline";

// ---- Types ----

export type AICheckpoint = {
	id: string;
	planId: string;
	planVersion: number;
	planHash: string;
	planSummary: string;          // human-readable: "Beat cut: 42 cuts, 18 sync points"
	snapshotTracks: TimelineTrack[];
	timelineRevision: number;
	timestamp: number;            // Date.now()
};

export type EditDiff = {
	fromVersion: number;
	toVersion: number;
	added: DiffEntry[];
	removed: DiffEntry[];
	changed: DiffEntry[];
	summary: string;
};

export type DiffEntry = {
	type: "cut" | "transition" | "effect" | "caption";
	time?: number;
	description: string;
};

// ---- AI Checkpoint Manager ----

const MAX_CHECKPOINTS = 20;

export class AICheckpointManager {
	private checkpoints: AICheckpoint[] = [];
	private currentIndex = -1;

	/**
	 * Save a checkpoint BEFORE applying a plan.
	 * Returns the checkpoint ID.
	 */
	saveCheckpoint(
		plan: AIEditPlan,
		currentTracks: TimelineTrack[],
		timelineRevision: number,
	): string {
		const id = crypto.randomUUID();

		const checkpoint: AICheckpoint = {
			id,
			planId: plan.id,
			planVersion: plan.version,
			planHash: plan.hash,
			planSummary: summarizePlan(plan),
			snapshotTracks: JSON.parse(JSON.stringify(currentTracks)), // deep clone
			timelineRevision,
			timestamp: Date.now(),
		};

		// If we're branching from a past checkpoint, drop future checkpoints
		if (this.currentIndex < this.checkpoints.length - 1) {
			this.checkpoints = this.checkpoints.slice(0, this.currentIndex + 1);
		}

		this.checkpoints.push(checkpoint);
		this.currentIndex = this.checkpoints.length - 1;

		// Cap history
		if (this.checkpoints.length > MAX_CHECKPOINTS) {
			this.checkpoints.shift();
			this.currentIndex--;
		}

		return id;
	}

	/**
	 * Revert timeline to a specific AI checkpoint.
	 * Returns the snapshot tracks to restore.
	 */
	revertTo(checkpointId: string): TimelineTrack[] | null {
		const idx = this.checkpoints.findIndex(c => c.id === checkpointId);
		if (idx === -1) return null;

		this.currentIndex = idx;
		return JSON.parse(JSON.stringify(this.checkpoints[idx].snapshotTracks));
	}

	/** Revert to the checkpoint just before the last AI edit. */
	revertLast(): TimelineTrack[] | null {
		if (this.currentIndex <= 0) return null;
		this.currentIndex--;
		return JSON.parse(JSON.stringify(this.checkpoints[this.currentIndex].snapshotTracks));
	}

	getCheckpoints(): AICheckpoint[] {
		return [...this.checkpoints];
	}

	getCurrentCheckpoint(): AICheckpoint | null {
		return this.checkpoints[this.currentIndex] ?? null;
	}

	clear(): void {
		this.checkpoints = [];
		this.currentIndex = -1;
	}
}

// ---- Refinement Loop ----

export type RefinementFeedback = {
	feedback: string;  // user's natural language feedback, e.g. "too fast", "remove the first clip"
	previousPlan: AIEditPlan;
	currentTracks: TimelineTrack[];
};

export type RefinementRequest = {
	prompt: string;            // enriched prompt for the AI agent
	baseTimelineRevision: number;
	previousPlanHash: string;
};

/**
 * Builds an enriched refinement prompt from user feedback + previous plan context.
 * This is passed to the AI agent to build Plan v2.
 */
export function buildRefinementPrompt(req: RefinementFeedback): RefinementRequest {
	const plan = req.previousPlan;
	const summary = summarizePlan(plan);

	const prompt = [
		`[AI Edit Refinement v${plan.version + 1}]`,
		`Previous edit summary: ${summary}`,
		`User feedback: "${req.feedback}"`,
		`Style: ${plan.intent.style}, pacing: ${plan.intent.pacing}`,
		`Number of cuts: ${plan.cuts.length}`,
		`Please build a new AIEditPlan that addresses the user's feedback while keeping the same style intent.`,
		`Respond ONLY with a valid AIEditPlan JSON. Do NOT mutate the timeline directly.`,
	].join("\n");

	return {
		prompt,
		baseTimelineRevision: plan.baseTimelineRevision,
		previousPlanHash: plan.hash,
	};
}

// ---- Edit Diff ----

/**
 * Computes a human-readable diff between two versions of an AIEditPlan.
 */
export function diffPlans(planA: AIEditPlan, planB: AIEditPlan): EditDiff {
	const added: DiffEntry[] = [];
	const removed: DiffEntry[] = [];
	const changed: DiffEntry[] = [];

	// --- Cuts diff ---
	const timesA = new Set(planA.cuts.map(c => Math.round(c.time * 100)));
	const timesB = new Set(planB.cuts.map(c => Math.round(c.time * 100)));

	for (const cut of planB.cuts) {
		const key = Math.round(cut.time * 100);
		if (!timesA.has(key)) {
			added.push({ type: "cut", time: cut.time, description: `Cut at ${cut.time.toFixed(2)}s` });
		}
	}

	for (const cut of planA.cuts) {
		const key = Math.round(cut.time * 100);
		if (!timesB.has(key)) {
			removed.push({ type: "cut", time: cut.time, description: `Cut at ${cut.time.toFixed(2)}s` });
		}
	}

	// --- Transitions diff ---
	const transA = new Map(planA.transitions.map(t => [Math.round(t.atTime * 100), t]));
	const transB = new Map(planB.transitions.map(t => [Math.round(t.atTime * 100), t]));

	for (const [key, t] of transB) {
		if (!transA.has(key)) {
			added.push({ type: "transition", time: t.atTime, description: `${t.type} transition at ${t.atTime.toFixed(2)}s` });
		} else {
			const prev = transA.get(key)!;
			if (prev.type !== t.type) {
				changed.push({
					type: "transition",
					time: t.atTime,
					description: `Transition at ${t.atTime.toFixed(2)}s: ${prev.type} → ${t.type}`,
				});
			}
		}
	}

	for (const [key, t] of transA) {
		if (!transB.has(key)) {
			removed.push({ type: "transition", time: t.atTime, description: `${t.type} transition at ${t.atTime.toFixed(2)}s` });
		}
	}

	// --- Pacing change ---
	if (planA.intent.pacing !== planB.intent.pacing) {
		changed.push({
			type: "cut",
			description: `Pacing: ${planA.intent.pacing} → ${planB.intent.pacing}`,
		});
	}

	// --- Summary ---
	const parts: string[] = [];
	if (added.length > 0) parts.push(`+${added.length} items`);
	if (removed.length > 0) parts.push(`-${removed.length} items`);
	if (changed.length > 0) parts.push(`~${changed.length} changed`);
	const summary = parts.length > 0 ? parts.join(" · ") : "No changes";

	return {
		fromVersion: planA.version,
		toVersion: planB.version,
		added,
		removed,
		changed,
		summary,
	};
}

// ---- Internal: Plan Summary ----

export function summarizePlan(plan: AIEditPlan): string {
	const beatCuts = plan.decisions.filter(
		d => d.type === "cut" && d.sources.some(s => s.startsWith("beat_"))
	).length;

	const parts = [
		`${plan.cuts.length} cuts`,
		beatCuts > 0 ? `${beatCuts} beat sync` : null,
		plan.transitions.length > 0 ? `${plan.transitions.length} transitions` : null,
		plan.captions?.enabled ? "captions on" : null,
		`${Math.round(plan.confidence * 100)}% confidence`,
	].filter(Boolean);

	return `[Plan v${plan.version}] ${parts.join(" · ")}`;
}
