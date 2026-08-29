import { useRef, useState, useEffect } from "react";
import { usePreviewInteraction } from "@/hooks/use-preview-interaction";
import { SelectionOverlay } from "./selection-overlay";
import { GuideLines } from "./guide-lines";
import { useEditor } from "@/hooks/use-editor";
import { hitTestElements } from "@/lib/preview/hit-test";
import { TextElement } from "@/types/timeline";

export function PreviewInteractionOverlay({
	canvasRef,
	displaySize,
}: {
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	displaySize: { width: number; height: number };
}) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const {
		onPointerDown,
		onPointerMove,
		onPointerUp,
		onScaleStart,
		onResizeStart,
		isTransforming,
		activeGuides,
	} = usePreviewInteraction({ canvasRef, overlayRef });

	const editor = useEditor();
	const canvasWidth = canvasRef.current?.width ?? 0;
	const canvasHeight = canvasRef.current?.height ?? 0;

	// Simple text editing state - when user double clicks text
	const [editingTextElement, setEditingTextElement] = useState<{
		element: TextElement;
		trackId: string;
	} | null>(null);
	const [editText, setEditText] = useState("");

	useEffect(() => {
		if (editingTextElement) {
			setEditText(editingTextElement.element.content);
		}
	}, [editingTextElement]);

	const handleDoubleClick = (e: React.MouseEvent) => {
		if (!canvasRef.current) return;
		const rect = canvasRef.current.getBoundingClientRect();
		const scaleX = canvasWidth / rect.width;
		const scaleY = canvasHeight / rect.height;
		const canvasX = (e.clientX - rect.left) * scaleX;
		const canvasY = (e.clientY - rect.top) * scaleY;

		const tracks = editor.timeline.getTracks();
		const mediaAssets = editor.media.getAssets();
		const currentTime = editor.playback.getCurrentTime();

		const hitResult = hitTestElements({
			point: { x: canvasX, y: canvasY },
			tracks,
			mediaAssets,
			canvasWidth,
			canvasHeight,
			currentTime,
		});

		if (hitResult && hitResult.element.type === "text") {
			setEditingTextElement({
				element: hitResult.element as TextElement,
				trackId: hitResult.trackId,
			});
		} else {
			setEditingTextElement(null);
		}
	};

	const saveTextEdit = () => {
		if (editingTextElement && editText !== editingTextElement.element.content) {
			editor.timeline.updateElements({
				updates: [
					{
						trackId: editingTextElement.trackId,
						elementId: editingTextElement.element.id,
						updates: { content: editText },
					},
				],
			});
		}
		setEditingTextElement(null);
	};

	return (
		<div
			ref={overlayRef}
			className="pointer-events-auto absolute inset-0"
			onPointerDown={(e) => {
				if (editingTextElement) saveTextEdit();
				onPointerDown(e);
			}}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onDoubleClick={handleDoubleClick}
		>
			<GuideLines
				guides={activeGuides}
				displaySize={displaySize}
				canvasWidth={canvasWidth}
				canvasHeight={canvasHeight}
			/>
			<SelectionOverlay
				displaySize={displaySize}
				onScaleStart={onScaleStart}
				onResizeStart={onResizeStart}
				isTransforming={isTransforming}
			/>
			{editingTextElement && (
				<div
					className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
					onPointerDown={(e) => e.stopPropagation()} // stop dragging while typing
				>
					<div className="flex flex-col items-center gap-4 bg-background p-6 rounded-xl border shadow-xl">
						<h3 className="text-lg font-medium">Edit Text</h3>
						<textarea
							autoFocus
							className="bg-muted text-foreground w-96 h-32 p-4 rounded-md outline-none resize-none"
							value={editText}
							onChange={(e) => setEditText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									saveTextEdit();
								}
								if (e.key === "Escape") {
									setEditingTextElement(null);
								}
							}}
						/>
						<div className="flex justify-end w-full gap-2">
							<button 
								className="px-4 py-2 text-sm rounded-md hover:bg-muted" 
								onClick={() => setEditingTextElement(null)}
							>
								Cancel
							</button>
							<button 
								className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md" 
								onClick={saveTextEdit}
							>
								Save
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
