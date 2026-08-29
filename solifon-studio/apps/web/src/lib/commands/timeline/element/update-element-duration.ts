import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";
import { useTimelineStore } from "@/stores/timeline-store";

export class UpdateElementDurationCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private trackId: string,
		private elementId: string,
		private duration: number,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		const isRippleEditing = useTimelineStore.getState().rippleEditingEnabled;

		const updatedTracks = this.savedState.map((t) => {
			if (t.id !== this.trackId) return t;
			const targetElement = t.elements.find((el) => el.id === this.elementId);
			if (!targetElement) return t;
			const durationDelta = this.duration - targetElement.duration;

			const newElements = t.elements.map((el) => {
				if (el.id === this.elementId) {
					return { ...el, duration: this.duration };
				}
				if (isRippleEditing && el.startTime > targetElement.startTime) {
					return {
						...el,
						startTime: Math.max(0, el.startTime + durationDelta),
					};
				}
				return el;
			});
			return { ...t, elements: newElements } as typeof t;
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
