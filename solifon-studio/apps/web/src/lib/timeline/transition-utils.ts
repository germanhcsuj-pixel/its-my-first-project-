import type {
	VideoTrack,
	TrackTransition,
	VideoElement,
	ImageElement,
	TextElement,
	StickerElement,
	TimelineTrack,
} from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import type { TransitionType } from "@/types/timeline";

type VisualElement = VideoElement | ImageElement | TextElement | StickerElement;

// element.duration is already the visible duration on the timeline
function getElementEndTime({
	element,
}: {
	element: VisualElement;
}): number {
	return element.startTime + element.duration;
}

// Допуск 2.0с — принимаем клипы с зазором до 2с или небольшим перекрытием
const ADJACENCY_EPSILON = 2.0;

export function areElementsAdjacent({
	elementA,
	elementB,
}: {
	elementA: VisualElement;
	elementB: VisualElement;
}): boolean {
	const endA = getElementEndTime({ element: elementA });
	const gap = elementB.startTime - endA; // положительный = зазор, отрицательный = перекрытие
	// Принимаем: зазор меньше 0.5с ИЛИ небольшое перекрытие (не более 2с)
	return gap <= ADJACENCY_EPSILON && gap >= -2.0;
}

export function findAdjacentPairs({
	track,
}: {
	track: TimelineTrack;
}): Array<{ from: VisualElement; to: VisualElement }> {
	const sorted = (track.elements as any[])
		.filter((el) => el.type !== "audio" && el.type !== "upload-audio") // фильтруем аудио
		.sort((a, b) => a.startTime - b.startTime) as VisualElement[];
	const pairs: Array<{ from: VisualElement; to: VisualElement }> = [];

	for (let i = 0; i < sorted.length - 1; i++) {
		const current = sorted[i];
		const next = sorted[i + 1];
		const endA = current.startTime + current.duration;
		const gap = next.startTime - endA;
		console.log(`[Gap Debug] "${current.type}" ends at ${endA.toFixed(3)}, next starts at ${next.startTime.toFixed(3)}, gap = ${gap.toFixed(3)}s`);
		if (areElementsAdjacent({ elementA: current, elementB: next })) {
			pairs.push({ from: current, to: next });
		}
	}

	return pairs;
}

export function getTransitionForPair({
	track,
	fromElementId,
	toElementId,
}: {
	track: TimelineTrack;
	fromElementId: string;
	toElementId: string;
}): TrackTransition | null {
	const transitions = track.transitions ?? [];
	return (
		transitions.find(
			(transition) =>
				transition.fromElementId === fromElementId &&
				transition.toElementId === toElementId,
		) ?? null
	);
}

export function buildTrackTransition({
	type,
	duration,
	fromElementId,
	toElementId,
}: {
	type: TransitionType;
	duration: number;
	fromElementId: string;
	toElementId: string;
}): TrackTransition {
	return {
		id: generateUUID(),
		type,
		duration,
		fromElementId,
		toElementId,
	};
}

export function addTransitionToTrack({
	track,
	transition,
}: {
	track: TimelineTrack;
	transition: TrackTransition;
}): TimelineTrack {
	const transitions = track.transitions ?? [];
	const existing = transitions.find(
		(t) =>
			t.fromElementId === transition.fromElementId &&
			t.toElementId === transition.toElementId,
	);
	if (existing) {
		return {
			...track,
			transitions: transitions.map((t) =>
				t.id === existing.id ? transition : t,
			),
		};
	}
	return {
		...track,
		transitions: [...transitions, transition],
	};
}

export function removeTransitionFromTrack({
	track,
	transitionId,
}: {
	track: TimelineTrack;
	transitionId: string;
}): TimelineTrack {
	const transitions = track.transitions ?? [];
	return {
		...track,
		transitions: transitions.filter((t) => t.id !== transitionId),
	};
}

export function cleanupTransitionsForTrack({
	track,
}: {
	track: TimelineTrack;
}): TimelineTrack {
	const transitions = track.transitions ?? [];
	const elementIds = new Set(track.elements.map((element) => element.id));
	const pairs = findAdjacentPairs({ track });
	const validPairKeys = new Set(
		pairs.map((p) => `${p.from.id}:${p.to.id}`),
	);

	const validTransitions = transitions.filter((transition) => {
		const bothExist =
			elementIds.has(transition.fromElementId) &&
			elementIds.has(transition.toElementId);
		const stillAdjacent = validPairKeys.has(
			`${transition.fromElementId}:${transition.toElementId}`,
		);
		return bothExist && stillAdjacent;
	});

	if (validTransitions.length === transitions.length) {
		return track;
	}

	return { ...track, transitions: validTransitions };
}
