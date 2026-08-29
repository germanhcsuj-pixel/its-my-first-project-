import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { EditorCore } from "@/core";
import { useTimelineStore } from "@/stores/timeline-store";

export class UpdateElementTrimCommand extends Command {
	private savedState: TimelineTrack[] | null = null;

	constructor(
		private elementId: string,
		private trimStart: number,
		private trimEnd: number,
		private startTime?: number,
		private duration?: number,
	) {
		super();
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		const isRippleEditing = useTimelineStore.getState().rippleEditingEnabled;

		const updatedTracks = this.savedState.map((track) => {
			const targetElement = track.elements.find((el) => el.id === this.elementId);
			if (!targetElement) return track;
			
			const newDuration = this.duration ?? targetElement.duration;
			const durationDelta = newDuration - targetElement.duration;

			const newElements = track.elements.map((element) => {
				if (element.id === this.elementId) {
					return {
						...element,
						trimStart: this.trimStart,
						trimEnd: this.trimEnd,
						startTime: this.startTime ?? element.startTime,
						duration: newDuration,
					};
				}
				if (isRippleEditing && element.startTime > targetElement.startTime) {
					return {
						...element,
						startTime: Math.max(0, element.startTime + durationDelta),
					};
				}
				return element;
			});
			return { ...track, elements: newElements } as typeof track;
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
