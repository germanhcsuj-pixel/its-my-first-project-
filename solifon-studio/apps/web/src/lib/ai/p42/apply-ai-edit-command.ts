/**
 * apply-ai-edit-command.ts — Command wrapper for transactional AI edit plans.
 *
 * Implements the command pattern to integrate the entire AI Edit Plan
 * execution (splits, updates, markers, transitions) into the editor's
 * undo/redo history as a single logical transaction.
 */

import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TScene } from "@/types/timeline";

export class ApplyAIEditPlanCommand extends Command {
	private savedScenes: TScene[] | null = null;
	private savedRevision: number = 0;
	private sceneId: string = "";

	constructor(
		private executeFn: () => void,
		private startRevision: number,
		private commitRevisionFn: () => void,
		private rollbackRevisionFn: () => void
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		const activeScene = editor.scenes.getActiveScene();
		this.sceneId = activeScene.id;
		
		// Capture deep copy of scenes state before execution
		const scenes = editor.scenes.getScenes();
		this.savedScenes = JSON.parse(JSON.stringify(scenes));
		this.savedRevision = this.startRevision;

		// Execute all operations (cuts, transitions, effects)
		this.executeFn();

		// Commit revision bump
		this.commitRevisionFn();
	}

	undo(): void {
		if (this.savedScenes) {
			const editor = EditorCore.getInstance();
			
			// Restore the entire scenes structure (including markers and tracks)
			// @ts-ignore
			editor.scenes.setScenes({ scenes: this.savedScenes });

			// Restore active scene reference
			const activeScene = this.savedScenes.find(s => s.id === this.sceneId);
			if (activeScene) {
				editor.timeline.updateTracks(activeScene.tracks);
			}

			// Restore the revision counter
			this.rollbackRevisionFn();
		}
	}

	redo(): void {
		this.execute();
	}
}
