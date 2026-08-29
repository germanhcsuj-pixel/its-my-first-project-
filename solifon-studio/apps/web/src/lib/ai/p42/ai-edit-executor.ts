/**
 * ai-edit-executor.ts — P4.2 AI Edit Execution Service.
 *
 * Connects the AIEditPlan to the real editor and timeline commands.
 *
 * CORE ARCHITECTURAL RULE: LLM NEVER MUTATES TIMELINE DIRECTLY.
 * Execution flows strictly through:
 * AIEditPlan → Validator → AIEditExecutor → Timeline commands.
 */

import { EditorCore } from "@/core";
import type { AIEditPlan, EditDecision } from "../edit-plan";
import { EditPlanValidator, type ValidatorContext, type ValidationResult } from "../edit-plan-validator";
import { applyPlan, getCurrentTimelineRevision } from "../apply-plan";

// ---- Execution Result ----

export interface AIEditExecutorResult {
	success: boolean;
	appliedOperationIds: string[];
	resultingRevision: number;
	decisionTrace: EditDecision[];
	validation: ValidationResult;
	error?: string;
}

// ---- AI Edit Executor Service ----

export class AIEditExecutor {
	/**
	 * Transactionally applies an AIEditPlan to the real timeline.
	 *
	 * Flow:
	 * 1. Validate plan.
	 * 2. Verify timeline revision.
	 * 3. Apply transactionally using applyPlan.
	 * 4. Verify resulting timeline.
	 * 5. Commit/Rollback.
	 */
	static async execute(
		plan: AIEditPlan,
		expectedRevision: number,
	): Promise<AIEditExecutorResult> {
		const editor = EditorCore.getInstance();
		const currentRevision = getCurrentTimelineRevision();

		// 1 & 2. Verify timeline revision first (Optimistic Concurrency Control)
		if (expectedRevision !== currentRevision) {
			const validator = new EditPlanValidator();
			const mediaLibrary = new Map<string, { duration: number }>();
			const assets = editor.media.getAssets();
			for (const asset of assets) {
				mediaLibrary.set(asset.id, { duration: asset.duration || 0 });
			}

			const validation: ValidationResult = {
				valid: false,
				errors: [
					{
						code: "PLAN_OUTDATED",
						message: `Revision conflict: expected revision ${expectedRevision}, but current timeline revision is ${currentRevision}.`,
						context: { expectedRevision, currentRevision },
					},
				],
				warnings: [],
				autoFixes: [],
			};

			return {
				success: false,
				appliedOperationIds: [],
				resultingRevision: currentRevision,
				decisionTrace: plan.decisions,
				validation,
				error: `Revision conflict: expected ${expectedRevision}, got ${currentRevision}`,
			};
		}

		// Prepare validator context
		const mediaLibrary = new Map<string, { duration: number }>();
		const assets = editor.media.getAssets();
		for (const asset of assets) {
			mediaLibrary.set(asset.id, { duration: asset.duration || 0 });
		}

		const ctx: ValidatorContext = {
			mediaLibrary,
			currentTimelineRevision: currentRevision,
		};

		// 3, 4, 5, 6, 7. Run transactional applyPlan
		const report = await applyPlan(plan, ctx);

		const success = report.status === "committed";
		const appliedOperationIds = plan.decisions.map(d => d.id);

		// If applyPlan succeeded, let's push the batch command to command history so Undo works
		// Wait, did applyPlan run editor.command.execute?
		// We will update apply-plan.ts to use editor.command.execute inside it,
		// ensuring undo history integration is correct.

		return {
			success,
			appliedOperationIds,
			resultingRevision: report.resultingRevision,
			decisionTrace: plan.decisions,
			validation: report.validation || { valid: success, errors: [], warnings: [], autoFixes: [] },
			error: report.error,
		};
	}
}
