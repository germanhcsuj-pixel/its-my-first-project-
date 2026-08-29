"use client";

import { Plus, Eye } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditor } from "@/hooks/use-editor";
import { clearDragData, setDragData } from "@/lib/drag-data";
import type { TimelineDragData } from "@/types/drag";
import { cn } from "@/utils/ui";

export interface DraggableItemProps {
	name: string;
	preview: ReactNode;
	dragData: TimelineDragData;
	onDragStart?: ({ e }: { e: React.DragEvent }) => void;
	onAddToTimeline?: ({ currentTime }: { currentTime: number }) => void;
	onClick?: () => void;
	onDoubleClick?: () => void;
	onPreview?: () => void;
	aspectRatio?: number;
	className?: string;
	containerClassName?: string;
	shouldShowPlusOnDrag?: boolean;
	shouldShowLabel?: boolean;
	isRounded?: boolean;
	variant?: "card" | "compact";
	isDraggable?: boolean;
	isHighlighted?: boolean;
	isSelected?: boolean;
}

export function DraggableItem({
	name,
	preview,
	dragData,
	onDragStart,
	onAddToTimeline,
	onClick,
	onDoubleClick,
	onPreview,
	aspectRatio = 16 / 9,
	className = "",
	containerClassName,
	shouldShowPlusOnDrag = true,
	shouldShowLabel = true,
	isRounded = true,
	variant = "card",
	isDraggable = true,
	isHighlighted = false,
	isSelected = false,
}: DraggableItemProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
	const dragRef = useRef<HTMLDivElement>(null);
	const didDragRef = useRef(false);
	const editor = useEditor();
	const highlightClassName = `ring-2 ring-primary bg-primary/10 ${isRounded ? "rounded-sm" : ""}`;
	const selectedClassName = `ring-2 ring-primary ${isRounded ? "rounded-sm" : ""}`;

	const handleAddToTimeline = () => {
		onAddToTimeline?.({ currentTime: editor.playback.getCurrentTime() });
	};

	const emptyImg = new window.Image();
	emptyImg.src =
		"data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";

	useEffect(() => {
		if (!isDragging) return;

		const handleDragOver = (e: DragEvent) => {
			setDragPosition({ x: e.clientX, y: e.clientY });
		};

		document.addEventListener("dragover", handleDragOver);

		return () => {
			document.removeEventListener("dragover", handleDragOver);
		};
	}, [isDragging]);

	const handleDragStart = (e: React.DragEvent) => {
		e.dataTransfer.setDragImage(emptyImg, 0, 0);

		setDragData({ dataTransfer: e.dataTransfer, dragData });
		e.dataTransfer.effectAllowed = "copy";

		setDragPosition({ x: e.clientX, y: e.clientY });
		setIsDragging(true);
		didDragRef.current = true;

		onDragStart?.({ e });
	};

	const handleDragEnd = () => {
		setIsDragging(false);
		clearDragData();
	};

	const handleClick = () => {
		if (didDragRef.current) {
			didDragRef.current = false;
			return;
		}
		if (onClick) {
			onClick();
		} else {
			handleAddToTimeline();
		}
	};

	const handleDoubleClick = () => {
		onDoubleClick?.();
	};

	return (
		<>
			{variant === "card" ? (
				// biome-ignore lint/a11y/useSemanticElements: container wraps draggable content with nested interactive elements
				<div
					ref={dragRef}
					className={cn("group relative", containerClassName ?? "size-28")}
					onClick={handleClick}
					onDoubleClick={handleDoubleClick}
					onKeyUp={(event) => {
						if (event.key === "Enter") handleClick();
					}}
					role="button"
					tabIndex={0}
				>
					<div
						className={cn(
							"relative flex h-auto w-full cursor-default flex-col gap-1 p-1",
							className,
							isHighlighted && highlightClassName,
							isSelected && selectedClassName,
						)}
					>
						<AspectRatio
							ratio={aspectRatio}
							className={cn(
								"bg-accent relative overflow-hidden",
								isRounded && "rounded-sm",
								isDraggable && "[&::-webkit-drag-ghost]:opacity-0",
							)}
							draggable={isDraggable}
							onDragStart={isDraggable ? handleDragStart : undefined}
							onDragEnd={isDraggable ? handleDragEnd : undefined}
						>
							{preview}
							{!isDragging && (
								<div className="absolute right-1 bottom-1 flex flex-col gap-1 z-10">
									{onPreview && (
										<PreviewButton 
											onClick={onPreview}
											tooltipText="Preview Asset"
										/>
									)}
									<PlusButton
										onClick={handleAddToTimeline}
										tooltipText="Add to timeline"
									/>
								</div>
							)}
						</AspectRatio>
						{shouldShowLabel && (
							<span
								className="text-muted-foreground w-full truncate text-left text-[0.7rem]"
								title={name}
							>
								<span className="sr-only">{name}</span>
								<span aria-hidden="true">
									{name.length > 8
										? `${name.slice(0, 16)}...${name.slice(-3)}`
										: name}
								</span>
							</span>
						)}
					</div>
				</div>
			) : (
				<div
					ref={dragRef}
					className={cn(
						"group relative w-full",
						isHighlighted && highlightClassName,
						isSelected && selectedClassName,
					)}
				>
					<button
						type="button"
						className={cn(
							"flex h-8 w-full cursor-default items-center gap-3 px-1",
							isDraggable && "[&::-webkit-drag-ghost]:opacity-0",
							className,
						)}
						draggable={isDraggable}
						onDragStart={isDraggable ? handleDragStart : undefined}
						onDragEnd={isDraggable ? handleDragEnd : undefined}
						onClick={handleClick}
						onDoubleClick={handleDoubleClick}
					>
						<div className="size-6 flex-shrink-0 overflow-hidden rounded-[0.35rem]">
							{preview}
						</div>
						<span className="w-full flex-1 truncate text-sm text-left">
							{name}
						</span>
					</button>
				</div>
			)}

			{isDraggable &&
				isDragging &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						className="pointer-events-none fixed z-9999"
						style={{
							left: dragPosition.x - 40,
							top: dragPosition.y - 40,
						}}
					>
						<div className="w-[80px]">
							<AspectRatio
								ratio={1}
								className="ring-primary relative overflow-hidden rounded-md shadow-2xl ring-3"
							>
								<div className="size-full [&_img]:size-full [&_img]:rounded-none [&_img]:object-cover">
									{preview}
								</div>
								{shouldShowPlusOnDrag && (
									<PlusButton
										onClick={handleAddToTimeline}
										tooltipText="Add to timeline or drag to position"
									/>
								)}
							</AspectRatio>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}

function PlusButton({
	className,
	onClick,
	tooltipText,
}: {
	className?: string;
	onClick?: () => void;
	tooltipText?: string;
}) {
	const button = (
		<Button
			size="icon"
			className={cn(
				"bg-primary hover:bg-primary/90 text-primary-foreground size-7 rounded shadow-md opacity-90 transition-opacity hover:opacity-100",
				className,
			)}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick?.();
			}}
			title={tooltipText}
		>
			<Plus className="size-4" />
		</Button>
	);

	if (tooltipText) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>
					<p>{tooltipText}</p>
				</TooltipContent>
			</Tooltip>
		);
	}

	return button;
}

function PreviewButton({
	className,
	onClick,
	tooltipText,
}: {
	className?: string;
	onClick?: () => void;
	tooltipText?: string;
}) {
	const button = (
		<Button
			size="icon"
			className={cn(
				"bg-background/80 hover:bg-background text-foreground size-7 rounded shadow-sm opacity-70 transition-opacity hover:opacity-100",
				className,
			)}
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onClick?.();
			}}
			title={tooltipText}
		>
			<Eye className="size-4" />
		</Button>
	);

	if (tooltipText) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>
					<p>{tooltipText}</p>
				</TooltipContent>
			</Tooltip>
		);
	}

	return button;
}
