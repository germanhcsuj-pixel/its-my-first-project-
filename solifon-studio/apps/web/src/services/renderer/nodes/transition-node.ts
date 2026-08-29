import { BaseNode } from "./base-node";

// Глобальный кеш холстов для избежания аллокаций памяти
let sharedCanvasA: HTMLCanvasElement | null = null;
let sharedCanvasB: HTMLCanvasElement | null = null;

function getSharedCanvases(width: number, height: number) {
	if (!sharedCanvasA) sharedCanvasA = document.createElement("canvas");
	if (!sharedCanvasB) sharedCanvasB = document.createElement("canvas");

	if (sharedCanvasA.width !== width) sharedCanvasA.width = width;
	if (sharedCanvasA.height !== height) sharedCanvasA.height = height;
	if (sharedCanvasB.width !== width) sharedCanvasB.width = width;
	if (sharedCanvasB.height !== height) sharedCanvasB.height = height;

	// ВАЖНО: Убран willReadFrequently, чтобы рендеринг был на GPU
	const ctxA = sharedCanvasA.getContext("2d")!;
	const ctxB = sharedCanvasB.getContext("2d")!;

	ctxA.clearRect(0, 0, width, height);
	ctxB.clearRect(0, 0, width, height);

	return { canvasA: sharedCanvasA, ctxA, canvasB: sharedCanvasB, ctxB };
}

export type TransitionNodeParams = {
	type: string;
	duration: number;
	transitionStart: number;
	outgoingNode: BaseNode;
	incomingNode: BaseNode;
	[key: string]: any;
};

export class TransitionNode extends BaseNode {
	type: string;
	duration: number;
	transitionStart: number;
	outgoingNode: BaseNode;
	incomingNode: BaseNode;

	constructor(params: TransitionNodeParams) {
		super(params);
		this.type = params.type;
		this.duration = params.duration;
		this.transitionStart = params.transitionStart;
		this.outgoingNode = params.outgoingNode;
		this.incomingNode = params.incomingNode;

		// Для совместимости с клонированием и эффектами
		(this as any).outgoing = params.outgoingNode;
		(this as any).incoming = params.incomingNode;
	}

	async render(args: { target: any; time: number; [key: string]: any }) {
		const { target, time } = args;
		const w = target.width;
		const h = target.height;

		// Проверка попадания в диапазон перехода
		if (time < this.transitionStart || time > this.transitionStart + this.duration) {
			return;
		}

		// 1. Считаем прогресс перехода (от 0 до 1)
		const t = Math.max(0, Math.min(1, (time - this.transitionStart) / this.duration));

		// 2. Берем подготовленные временные Canvas
		const { canvasA, ctxA, canvasB, ctxB } = getSharedCanvases(w, h);

		// 3. Безопасный изолятор контекста для асинхронного рендеринга (без мутации глобального target)
		const targetA = Object.create(target, { context: { value: ctxA } });
		const targetB = Object.create(target, { context: { value: ctxB } });

		// 4. Отрисовываем исходный и входящий клипы на соответствующие холсты
		if ((args as any).scheduler) {
			await Promise.all([
				(args as any).scheduler.renderNode({ node: this.outgoingNode, target: targetA as any, time: args.time, forceRender: true }),
				(args as any).scheduler.renderNode({ node: this.incomingNode, target: targetB as any, time: args.time, forceRender: true }),
			]);
		} else {
			await Promise.all([
				this.outgoingNode.render({ ...args, target: targetA, forceRender: true }),
				this.incomingNode.render({ ...args, target: targetB, forceRender: true }),
			]);
		}

		// 5. Блендим результаты на основной контекст
		this.blend(target.context as CanvasRenderingContext2D, canvasA, canvasB, t, w, h);
	}

	// 🎨 ДВИЖОК СМЕШИВАНИЯ (БЛЕНДИНГА)
	private blend(
		ctx: CanvasRenderingContext2D,
		canvasA: HTMLCanvasElement,
		canvasB: HTMLCanvasElement,
		t: number,
		w: number,
		h: number
	) {
		ctx.save();

		switch (this.type) {
			case "fade":
			case "dissolve":
				ctx.globalAlpha = 1 - t;
				ctx.drawImage(canvasA, 0, 0, w, h);
				ctx.globalAlpha = t;
				ctx.drawImage(canvasB, 0, 0, w, h);
				break;

			case "wipe-left":
				ctx.drawImage(canvasA, 0, 0, w, h);
				ctx.beginPath();
				ctx.rect(w * (1 - t), 0, w * t, h);
				ctx.clip();
				ctx.drawImage(canvasB, 0, 0, w, h);
				break;

			case "wipe-right":
				ctx.drawImage(canvasA, 0, 0, w, h);
				ctx.beginPath();
				ctx.rect(0, 0, w * t, h);
				ctx.clip();
				ctx.drawImage(canvasB, 0, 0, w, h);
				break;

			case "wipe-up":
				ctx.drawImage(canvasA, 0, 0, w, h);
				ctx.beginPath();
				ctx.rect(0, h * (1 - t), w, h * t);
				ctx.clip();
				ctx.drawImage(canvasB, 0, 0, w, h);
				break;

			case "wipe-down":
				ctx.drawImage(canvasA, 0, 0, w, h);
				ctx.beginPath();
				ctx.rect(0, 0, w, h * t);
				ctx.clip();
				ctx.drawImage(canvasB, 0, 0, w, h);
				break;

			case "slide-left":
				ctx.drawImage(canvasA, -w * t, 0, w, h);
				ctx.drawImage(canvasB, w * (1 - t), 0, w, h);
				break;

			case "slide-right":
				ctx.drawImage(canvasA, w * t, 0, w, h);
				ctx.drawImage(canvasB, -w * (1 - t), 0, w, h);
				break;

			case "slide-up":
				ctx.drawImage(canvasA, 0, -h * t, w, h);
				ctx.drawImage(canvasB, 0, h * (1 - t), w, h);
				break;

			case "slide-down":
				ctx.drawImage(canvasA, 0, h * t, w, h);
				ctx.drawImage(canvasB, 0, h * (1 - t), w, h);
				break;

			case "zoom-in": {
				const scaleB = Math.max(0.0001, t);
				ctx.globalAlpha = 1 - t;
				ctx.drawImage(canvasA, 0, 0, w, h);

				ctx.globalAlpha = t;
				ctx.translate(w / 2, h / 2);
				ctx.scale(scaleB, scaleB);
				ctx.translate(-w / 2, -h / 2);
				ctx.drawImage(canvasB, 0, 0, w, h);
				break;
			}

			case "zoom-out": {
				const scaleA = Math.max(0.0001, 1 - t);
				ctx.globalAlpha = 1 - t;
				ctx.translate(w / 2, h / 2);
				ctx.scale(scaleA, scaleA);
				ctx.translate(-w / 2, -h / 2);
				ctx.drawImage(canvasA, 0, 0, w, h);

				ctx.resetTransform(); // сброс матрицы перед отрисовкой canvasB
				ctx.globalAlpha = t;
				ctx.drawImage(canvasB, 0, 0, w, h);
				break;
			}

			default:
				if (t < 0.5) ctx.drawImage(canvasA, 0, 0, w, h);
				else ctx.drawImage(canvasB, 0, 0, w, h);
				break;
		}

		ctx.restore();
	}
}
