"use client";

import { useTranslation } from "@i18next-toolkit/nextjs-approuter";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useEditor } from "@/hooks/use-editor";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import {
	PropertyGroup,
	PropertyItem,
	PropertyItemLabel,
	PropertyItemValue,
} from "./property-item";

// All known animations — must match preview/index.tsx
const ANIMATIONS = [
	// Intro
	{ id: "fade-in",        label: "Fade In",       group: "Появление" },
	{ id: "slide-left",     label: "Slide Left",    group: "Появление" },
	{ id: "slide-right",    label: "Slide Right",   group: "Появление" },
	{ id: "slide-up",       label: "Slide Up",      group: "Появление" },
	{ id: "slide-down",     label: "Slide Down",    group: "Появление" },
	{ id: "zoom-in",        label: "Zoom In",       group: "Появление" },
	{ id: "zoom-out",       label: "Zoom Out (In)", group: "Появление" },
	{ id: "apple-smooth",   label: "🍎 Apple Smooth", group: "Появление" },
	{ id: "elastic-pop",    label: "Elastic Pop",   group: "Появление" },
	{ id: "bounce-in",      label: "Bounce In",     group: "Появление" },
	{ id: "roll-in",        label: "Roll In",       group: "Появление" },
	{ id: "flip-in",        label: "Flip In",       group: "Появление" },
	{ id: "drop-in",        label: "Drop In",       group: "Появление" },
	{ id: "swing-in",       label: "Swing In",      group: "Появление" },
	{ id: "blur-in",        label: "Blur In",       group: "Появление" },
	// Outro
	{ id: "fade-out",       label: "Fade Out",      group: "Выход" },
	{ id: "slide-out-left", label: "Slide Out L",   group: "Выход" },
	{ id: "slide-out-right",label: "Slide Out R",   group: "Выход" },
	{ id: "zoom-out-exit",  label: "Zoom Out",      group: "Выход" },
	{ id: "spin-out",       label: "Spin Out",      group: "Выход" },
	// Loop
	{ id: "pulse",          label: "Pulse",         group: "Цикл" },
	{ id: "shake",          label: "Shake",         group: "Цикл" },
	{ id: "wobble",         label: "Wobble",        group: "Цикл" },
	{ id: "float",          label: "Float",         group: "Цикл" },
	{ id: "neon-flicker",   label: "Neon Flicker",  group: "Цикл" },
	{ id: "pendulum",       label: "Pendulum",      group: "Цикл" },
	{ id: "heartbeat",      label: "Heartbeat",     group: "Цикл" },
	{ id: "spin-slow",      label: "Slow Spin",     group: "Цикл" },
	// Text
	{ id: "typewriter",     label: "Typewriter",    group: "Текст" },
	{ id: "word-reveal",    label: "Word Reveal",   group: "Текст" },
	// GSAP
	{ id: "gsap-elastic-pop",    label: "Elastic Pop (GSAP)",   group: "GSAP" },
	{ id: "gsap-bounce-drop",    label: "Bounce Drop (GSAP)",   group: "GSAP" },
	{ id: "gsap-slide-back",     label: "Slide & Pull (GSAP)",  group: "GSAP" },
	{ id: "gsap-swing-reveal",   label: "Swing Reveal (GSAP)",  group: "GSAP" },
	{ id: "gsap-cinematic-zoom", label: "Cinematic Zoom (GSAP)",group: "GSAP" },
	{ id: "gsap-elastic-spin",   label: "Elastic Spin (GSAP)",  group: "GSAP" },
];

const EFFECTS = [
	{ id: "cyber-glitch",  label: "⚡ Cyber Glitch"   },
	{ id: "liquid-warp",   label: "🌊 Liquid Warp"    },
	{ id: "pixelate",      label: "👾 Pixelate"       },
	{ id: "blur-zoom",     label: "🌀 Blur Zoom"      },
	{ id: "text-shatter",  label: "💥 Shatter"        },
	{ id: "vhs-scanlines", label: "📺 VHS Scanlines"  },
	{ id: "neon-glow",     label: "🟣 Neon Glow"      },
	{ id: "earthquake",    label: "📳 Earthquake"     },
	{ id: "strobe",        label: "✨ Strobe Flash"   },
	{ id: "old-film",      label: "🎞️ Old Film"       },
];

const ANIM_GROUPS = ["Все", "Появление", "Выход", "Цикл", "Текст", "GSAP"];

interface AnimationControlsProps {
	element: any;
	trackId: string;
}

export function AnimationControls({ element, trackId }: AnimationControlsProps) {
	const { t } = useTranslation();
	const editor = useEditor();

	const currentAnimation: string | null = element.animation ?? null;
	const currentEffect: string | null = element.effect ?? null;

	const updateElement = (updates: Record<string, any>, pushHistory = true) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, updates }],
			pushHistory,
		});
	};

	const applyAnimation = (animId: string) => {
		updateElement({ animation: animId, effect: null });
		toast.success(`Animation: ${animId}`);
	};

	const applyEffect = (effectId: string) => {
		updateElement({ effect: effectId, animation: null });
		toast.success(`Effect: ${effectId}`);
	};

	const clearAll = () => {
		updateElement({ animation: null, effect: null });
		toast.success("Animation/Effect removed");
	};

	return (
		<>
			{/* Current state indicator */}
			{(currentAnimation || currentEffect) && (
				<PropertyGroup title="Активный эффект" hasBorderTop collapsible={false}>
					<div className="flex items-center gap-2 flex-wrap">
						{currentAnimation && (
							<div className="flex items-center gap-1.5 bg-primary/15 border border-primary/30 rounded-md px-2.5 py-1">
								<span className="text-xs font-medium text-primary">🎬 {currentAnimation}</span>
								<button
									onClick={() => updateElement({ animation: null })}
									className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
								>
									✕
								</button>
							</div>
						)}
						{currentEffect && (
							<div className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 rounded-md px-2.5 py-1">
								<span className="text-xs font-medium text-orange-500">✨ {currentEffect}</span>
								<button
									onClick={() => updateElement({ effect: null })}
									className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
								>
									✕
								</button>
							</div>
						)}
						<Button
							size="sm"
							variant="ghost"
							className="text-[10px] h-6 px-2 text-muted-foreground hover:text-destructive"
							onClick={clearAll}
						>
							Убрать всё
						</Button>
					</div>
				</PropertyGroup>
			)}

			{/* Animation timing controls */}
			{currentAnimation && (
				<PropertyGroup title="Тайминг анимации" hasBorderTop collapsible>
					<div className="space-y-3">
						{/* Animation speed multiplier */}
						<PropertyItem>
							<PropertyItemLabel>Скорость</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2 w-full">
									<Slider
										min={0.1}
										max={3}
										step={0.1}
										value={[element.animationSpeed ?? 1]}
										onValueChange={([v]) => updateElement({ animationSpeed: v }, false)}
										onPointerUp={() => updateElement({ animationSpeed: element.animationSpeed ?? 1 })}
										className="flex-1"
									/>
									<span className="text-xs tabular-nums w-8 text-right">
										{(element.animationSpeed ?? 1).toFixed(1)}x
									</span>
								</div>
							</PropertyItemValue>
						</PropertyItem>

						{/* Animation coverage */}
						<PropertyItem>
							<PropertyItemLabel>Длина (сек)</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2 w-full">
									<Slider
										min={0.1}
										max={element.duration}
										step={0.1}
										value={[element.animationDuration ?? element.duration]}
										onValueChange={([v]) => updateElement({ animationDuration: v }, false)}
										onPointerUp={() => updateElement({ animationDuration: element.animationDuration ?? element.duration })}
										className="flex-1"
									/>
									<span className="text-xs tabular-nums w-8 text-right">
										{(element.animationDuration ?? element.duration).toFixed(1)}с
									</span>
								</div>
							</PropertyItemValue>
						</PropertyItem>

						<PropertyItem>
							<PropertyItemLabel>Старт (сек)</PropertyItemLabel>
							<PropertyItemValue>
								<div className="flex items-center gap-2 w-full">
									<Slider
										min={0}
										max={Math.max(1, element.duration - 0.1)}
										step={0.1}
										value={[element.animationStartTime ?? 0]}
										onValueChange={([v]) => updateElement({ animationStartTime: v }, false)}
										onPointerUp={() => updateElement({ animationStartTime: element.animationStartTime ?? 0 })}
										className="flex-1"
									/>
									<span className="text-xs tabular-nums w-8 text-right">
										{(element.animationStartTime ?? 0).toFixed(1)}с
									</span>
								</div>
							</PropertyItemValue>
						</PropertyItem>

						{/* Direction toggle for slide animations */}
						{(currentAnimation?.includes("slide") || currentAnimation?.includes("bounce") || currentAnimation?.includes("drop")) && (
							<PropertyItem>
								<PropertyItemLabel>Направление</PropertyItemLabel>
								<PropertyItemValue>
									<div className="flex gap-1">
										{["↑","↓","←","→"].map((dir, i) => (
											<button
												key={dir}
												onClick={() => updateElement({ animationDirection: i })}
												className={cn(
													"flex-1 h-7 rounded-sm text-xs border transition-colors",
													element.animationDirection === i
														? "border-primary bg-primary/10 text-primary"
														: "border-border text-muted-foreground hover:border-primary/50"
												)}
											>
												{dir}
											</button>
										))}
									</div>
								</PropertyItemValue>
							</PropertyItem>
						)}
					</div>
				</PropertyGroup>
			)}
		</>
	);
}

// Compact inline animation picker for properties panel
export function InlineAnimationPicker({ element, trackId }: AnimationControlsProps) {
	const editor = useEditor();
	const currentAnimation: string | null = element.animation ?? null;
	const currentEffect: string | null = element.effect ?? null;

	const updateElement = (updates: Record<string, any>) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, updates }],
		});
	};

	return (
		<PropertyGroup title="🎬 Анимация & Эффект" hasBorderTop collapsible>
			{/* Active tags */}
			<div className="flex flex-wrap gap-1.5 mb-3">
				{currentAnimation && (
					<span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/15 text-primary border border-primary/30 rounded px-2 py-0.5">
						🎬 {currentAnimation}
						<button onClick={() => updateElement({ animation: null })} className="hover:text-red-400 transition-colors">✕</button>
					</span>
				)}
				{currentEffect && (
					<span className="inline-flex items-center gap-1 text-[10px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded px-2 py-0.5">
						✨ {currentEffect}
						<button onClick={() => updateElement({ effect: null })} className="hover:text-red-400 transition-colors">✕</button>
					</span>
				)}
				{!currentAnimation && !currentEffect && (
					<span className="text-[10px] text-muted-foreground italic">Нет анимации</span>
				)}
			</div>

			{/* Quick animation/effect speed and timing */}
			<div className="mb-3 space-y-4 mt-4">
				{currentAnimation && (
					<div className="space-y-3 p-2 bg-muted/50 rounded-lg">
						<div className="text-[11px] font-medium text-foreground">Настройки анимации</div>
						
						<div className="space-y-1">
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Старт (сек)</span>
								<span>{(element.animationStartTime ?? 0).toFixed(1)}с</span>
							</div>
							<Slider
								min={0} max={Math.max(1, element.duration - 0.1)} step={0.1}
								value={[element.animationStartTime ?? 0]}
								onValueChange={([v]) => updateElement({ animationStartTime: v })}
							/>
						</div>
						
						<div className="space-y-1">
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Длина (сек)</span>
								<span>{(element.animationDuration ?? element.duration).toFixed(1)}с</span>
							</div>
							<Slider
								min={0.1} max={element.duration} step={0.1}
								value={[element.animationDuration ?? element.duration]}
								onValueChange={([v]) => updateElement({ animationDuration: v })}
							/>
						</div>

						<div className="space-y-1">
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Скорость</span>
								<span>{(element.animationSpeed ?? 1).toFixed(1)}x</span>
							</div>
							<Slider
								min={0.1} max={3} step={0.1}
								value={[element.animationSpeed ?? 1]}
								onValueChange={([v]) => updateElement({ animationSpeed: v })}
							/>
						</div>
					</div>
				)}

				{currentEffect && (
					<div className="space-y-3 p-2 bg-muted/50 rounded-lg">
						<div className="text-[11px] font-medium text-foreground">Настройки эффекта</div>
						
						<div className="space-y-1">
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Старт (сек)</span>
								<span>{(element.effectStartTime ?? 0).toFixed(1)}с</span>
							</div>
							<Slider
								min={0} max={Math.max(1, element.duration - 0.1)} step={0.1}
								value={[element.effectStartTime ?? 0]}
								onValueChange={([v]) => updateElement({ effectStartTime: v })}
							/>
						</div>
						
						<div className="space-y-1">
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Длина (сек)</span>
								<span>{(element.effectDuration ?? element.duration).toFixed(1)}с</span>
							</div>
							<Slider
								min={0.1} max={element.duration} step={0.1}
								value={[element.effectDuration ?? element.duration]}
								onValueChange={([v]) => updateElement({ effectDuration: v })}
							/>
						</div>

						<div className="space-y-1">
							<div className="flex justify-between text-[10px] text-muted-foreground">
								<span>Скорость</span>
								<span>{(element.effectSpeed ?? 1).toFixed(1)}x</span>
							</div>
							<Slider
								min={0.1} max={3} step={0.1}
								value={[element.effectSpeed ?? 1]}
								onValueChange={([v]) => updateElement({ effectSpeed: v })}
							/>
						</div>
					</div>
				)}
			</div>

			{/* Quick select buttons — top 6 animations */}
			<p className="text-[10px] text-muted-foreground mb-1.5">Быстрый выбор:</p>
			<div className="grid grid-cols-3 gap-1">
				{[
					{ id: "fade-in",     label: "✨ Fade" },
					{ id: "slide-left",  label: "⬅ Slide" },
					{ id: "elastic-pop", label: "🎈 Pop"  },
					{ id: "bounce-in",   label: "🏀 Bounce"},
					{ id: "typewriter",  label: "⌨ Type"  },
					{ id: "pulse",       label: "💓 Pulse" },
				].map((a) => (
					<button
						key={a.id}
						onClick={() => updateElement({ animation: a.id, effect: null })}
						className={cn(
							"text-[10px] py-1 px-1 rounded border transition-colors",
							currentAnimation === a.id
								? "border-primary bg-primary/15 text-primary"
								: "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
						)}
					>
						{a.label}
					</button>
				))}
			</div>

			{/* Quick select effects */}
			<p className="text-[10px] text-muted-foreground mt-2 mb-1.5">Визуальные эффекты:</p>
			<div className="grid grid-cols-3 gap-1">
				{[
					{ id: "cyber-glitch", label: "⚡ Glitch" },
					{ id: "liquid-warp",  label: "🌊 Warp"  },
					{ id: "vhs-scanlines",label: "📺 VHS"   },
					{ id: "neon-glow",    label: "🟣 Neon"  },
					{ id: "old-film",     label: "🎞 Film"  },
					{ id: "pixelate",     label: "👾 Pixel" },
				].map((e) => (
					<button
						key={e.id}
						onClick={() => updateElement({ effect: e.id, animation: null })}
						className={cn(
							"text-[10px] py-1 px-1 rounded border transition-colors",
							currentEffect === e.id
								? "border-orange-500 bg-orange-500/15 text-orange-400"
								: "border-border text-muted-foreground hover:border-orange-500/40 hover:text-foreground"
						)}
					>
						{e.label}
					</button>
				))}
			</div>
		</PropertyGroup>
	);
}
