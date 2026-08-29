import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type { TScene } from "@/types/timeline";
import { updateSceneInArray } from "@/lib/scenes";

export class RemoveMarkerCommand extends Command {
	private sceneId: string;
	private savedScenes: TScene[] | null = null;

	constructor(private markerId: string) {
		super();
		this.sceneId = "";
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		const scenes = editor.scenes.getScenes();
		const activeScene = editor.scenes.getActiveScene();

		this.savedScenes = [...scenes];
		this.sceneId = activeScene.id;
		const previousMarkers = activeScene.markers ? [...activeScene.markers] : [];

		const newMarkers = previousMarkers.filter(m => m.id !== this.markerId);

		const updatedScenes = updateSceneInArray({
			scenes,
			sceneId: this.sceneId,
			updates: { markers: newMarkers, updatedAt: new Date() },
		});

		editor.scenes.setScenes({ scenes: updatedScenes });
	}

	undo(): void {
		if (this.savedScenes) {
			const editor = EditorCore.getInstance();
			editor.scenes.setScenes({ scenes: this.savedScenes });
		}
	}

	redo(): void {
		this.execute();
	}
}
