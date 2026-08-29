import { TextLayoutWord } from "./text-layout";

export interface KineticRenderState {
	text: string;
	opacity: number;
	x: number;
	y: number;
	width: number;
	height: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
	visible: boolean;
	revealProgress: number; // 0 to 1
}

export interface KineticConfig {
	scope: "line" | "word" | "character";
	type: "fade-stagger" | "slide" | "scale" | "reveal" | "bounce";
	staggerDelay: number;
}

export interface TextLayoutEntity {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
	normalizedIndex?: number;
}

export class KineticEvaluator {
	public evaluate(
		entities: TextLayoutEntity[],
		localTime: number,
		config: KineticConfig
	): KineticRenderState[] {
		const totalEntities = entities.length;
		if (totalEntities === 0) return [];

		return entities.map((entity, index) => {
			let opacity = 1;
			let x = entity.x;
			let y = entity.y;
			let scaleX = 1;
			let scaleY = 1;
			let rotation = 0;
			let visible = true;
			let revealProgress = 1;

			// entity's own normalized time based on stagger delay
			const entityStartTime = index * config.staggerDelay;
			// Relative time for this specific entity
			let entityLocalTime = localTime - entityStartTime;

			if (entityLocalTime < 0) {
				// entity hasn't started animating yet
				opacity = 0;
				visible = false;
				revealProgress = 0;
			} else {
				// Fixed duration per entity reveal
				const duration = 0.5;
				const progress = Math.min(1, Math.max(0, entityLocalTime / duration));

				switch (config.type) {
					case "fade-stagger":
						opacity = progress;
						break;
						
					case "slide":
						opacity = progress;
						// Slide up from 20px below
						const slideOffset = 20 * (1 - this.easeOutCubic(progress));
						y += slideOffset;
						break;

					case "scale":
						opacity = progress;
						if (progress < 1) {
							const scale = this.easeOutBack(progress);
							scaleX = scaleY = scale;
						}
						break;

					case "bounce":
						opacity = Math.min(1, entityLocalTime / 0.2); // fade in fast
						if (progress < 1) {
							scaleX = scaleY = this.easeOutBack(progress);
						}
						break;

					case "reveal":
						// Instead of fading, we reveal it
						opacity = 1;
						revealProgress = progress;
						if (progress === 0) visible = false;
						break;
				}
			}

			return {
				text: entity.text,
				opacity,
				x,
				y,
				width: entity.width,
				height: entity.height,
				scaleX,
				scaleY,
				rotation,
				visible,
				revealProgress
			};
		});
	}

	private easeOutCubic(x: number): number {
		return 1 - Math.pow(1 - x, 3);
	}
	
	private easeOutBack(x: number): number {
		const c1 = 1.70158;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
	}
}

export const kineticEvaluator = new KineticEvaluator();
