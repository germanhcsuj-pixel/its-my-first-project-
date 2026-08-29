
"use client";

import { useTranslation } from "@i18next-toolkit/nextjs-approuter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditor } from "@/hooks/use-editor";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/ui";

export function EffectsView() {
	const { t } = useTranslation();
	const editor = useEditor();

	const EFFECTS_PRESETS = [
		// --- 3D & СТЕКЛО (Shader-based) ---
		{ id: "3d-melt", label: t("3D Water Melt"), type: "shader", category: "3D & Glass" },
		{ id: "3d-liquid-glass", label: t("3D Crystal Glass"), type: "shader", category: "3D & Glass" },
		{ id: "3d-parallax-extrusion", label: t("3D Depth Extrusion"), type: "shader", category: "3D & Glass" },
		{ id: "3d-mercury-fluid", label: t("3D Chrome Mercury"), type: "shader", category: "3D & Glass" },
		
		// --- ФУТУРИЗМ & КИБЕРПАНК (Shader-based) ---
		{ id: "pixel-dissolve", label: t("Pixel Dissolve"), type: "shader", category: "Futuristic" },
		{ id: "3d-hologram-voxels", label: t("3D Hologram"), type: "shader", category: "Futuristic" },
		{ id: "3d-black-hole", label: t("3D Black Hole"), type: "shader", category: "Futuristic" },
		{ id: "cyber-glitch", label: t("Cyber Glitch"), type: "shader", category: "Futuristic" },

		// --- АТМОСФЕРА & ШУМ (Shader-based) ---
		{ id: "3d-god-rays", label: t("Volumetric God Rays"), type: "shader", category: "Atmosphere" },
		{ id: "fractal-noise", label: t("Fractal Noise"), type: "shader", category: "Atmosphere" },
		
		// --- РЕТРО & ИСКАЖЕНИЯ (Shader-based) ---
		{ id: "rgb-glitch", label: t("RGB Glitch"), type: "shader", category: "Retro" },
		{ id: "text-shatter", label: t("3D Shatter"), type: "shader", category: "Retro" },
		{ id: "liquid-warp", label: t("Liquid Warp"), type: "shader", category: "Retro" },
		{ id: "pixelate", label: t("8-Bit Pixelate"), type: "shader", category: "Retro" },
		{ id: "vhs-scanlines", label: t("VHS Scanlines"), type: "shader", category: "Retro" },
		{ id: "old-film", label: t("Old Film"), type: "shader", category: "Retro" },

		// --- АНИМАЦИИ ПОЯВЛЕНИЯ (GSAP-based) ---
		{ id: "cinematic-reveal", label: t("Cinematic Reveal"), type: "gsap", category: "Entrance" },
		{ id: "bounce-in", label: t("Bounce In"), type: "gsap", category: "Entrance" },
		{ id: "pulse-grow", label: t("Pulse Grow"), type: "gsap", category: "Entrance" },
		{ id: "pop-up", label: t("Pop-Up"), type: "gsap", category: "Entrance" },
		{ id: "typewriter", label: t("Typewriter"), type: "gsap", category: "Entrance" },

		// --- АНИМАЦИИ ЦИКЛОВ (GSAP-based) ---
		{ id: "wavy-text", label: t("Wavy Text"), type: "gsap", category: "Loop" },
		{ id: "pulse", label: t("Pulse"), type: "gsap", category: "Loop" },
		{ id: "shake", label: t("Shake"), type: "gsap", category: "Loop" },
		
		// --- ПРОСТЫЕ АНИМАЦИИ (GSAP-based) ---
		{ id: "fade-in", label: t("Fade In"), type: "gsap", category: "Basic" },
		{ id: "slide-left", label: t("Slide Left"), type: "gsap", category: "Basic" },
		{ id: "apple-smooth", label: t("Apple Smooth"), type: "gsap", category: "Basic" },
	];

	const selected = editor.selection.getSelectedElements();
	let activeAnimation: string | null | undefined = null;
	let activeEffect: string | null | undefined = null;
	
	if (selected.length > 0) {
		const sel = selected[0];
		const track = editor.timeline.getTracks().find((t) => t.id === sel.trackId);
		const el = track?.elements.find((e) => e.id === sel.elementId) as any;
		activeAnimation = el?.animation;
		activeEffect = el?.effect;
	}

	const handleApply = (preset: typeof EFFECTS_PRESETS[0]) => {
		const selected = editor.selection.getSelectedElements();
		if (selected.length === 0) {
			toast.info(t("Select an element on the timeline first."));
			return;
		}

		editor.timeline.updateElements({
			updates: selected.map((s) => ({
				trackId: s.trackId,
				elementId: s.elementId,
				updates: preset.type === "gsap" 
					? { animation: preset.id } 
					: { effect: preset.id },
			})),
		});

		toast.success(t("Applied: ") + preset.label);
	};

	const handleRemove = () => {
		const selected = editor.selection.getSelectedElements();
		if (selected.length === 0) return;
		editor.timeline.updateElements({
			updates: selected.map((s) => ({
				trackId: s.trackId,
				elementId: s.elementId,
				updates: { animation: null, effect: null },
			})),
		});
		toast.success(t("Effect removed"));
	};

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-4 pt-3 pb-2 space-y-2">
				<h3 className="text-sm font-semibold">{t("Effects & Animations")}</h3>
				<Button
					size="sm"
					variant="outline"
					disabled={selected.length === 0}
					className="w-full text-xs h-7 border-dashed text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					onClick={handleRemove}
				>
					{t("Remove effects from selected")}
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-3 space-y-6">
					
					<div>
						<h4 className="text-xs font-semibold text-muted-foreground mb-2 px-1">
							{t("Shader-based Effects")}
						</h4>
						<div className="grid grid-cols-2 gap-2">
							{EFFECTS_PRESETS.filter((p) => p.type === "shader").map((preset) => (
								<button
									key={preset.id}
									disabled={selected.length === 0}
									onClick={() => handleApply(preset)}
									className={cn(
										"flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-xs font-medium transition-all",
										selected.length === 0 ? "opacity-50 cursor-not-allowed" : "active:scale-95",
										activeEffect === preset.id
											? "border-primary bg-primary/10 shadow-sm"
											: "bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
									)}
								>
									<span className="text-[11px] text-center leading-tight">
										{preset.label}
									</span>
									<span className="text-[9px] text-muted-foreground">
										{preset.category}
									</span>
								</button>
							))}
						</div>
					</div>

					<div>
						<h4 className="text-xs font-semibold text-muted-foreground mb-2 px-1">
							{t("GSAP Animations")}
						</h4>
						<div className="grid grid-cols-2 gap-2">
							{EFFECTS_PRESETS.filter((p) => p.type === "gsap").map((preset) => (
								<button
									key={preset.id}
									disabled={selected.length === 0}
									onClick={() => handleApply(preset)}
									className={cn(
										"flex flex-col items-center justify-center gap-1 rounded-lg border p-3 text-xs font-medium transition-all",
										selected.length === 0 ? "opacity-50 cursor-not-allowed" : "active:scale-95",
										activeAnimation === preset.id
											? "border-primary bg-primary/10 shadow-sm"
											: "bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
									)}
								>
									<span className="text-[11px] text-center leading-tight">
										{preset.label}
									</span>
									<span className="text-[9px] text-muted-foreground">
										{preset.category}
									</span>
								</button>
							))}
						</div>
					</div>
					
				</div>
			</ScrollArea>
		</div>
	);
}


// trigger recompile