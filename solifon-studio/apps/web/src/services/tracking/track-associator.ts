import { Bounds, TrackObservation } from "./tracking-types";

export class TrackAssociator {
	/**
	 * Computes the Intersection-over-Union (IoU) of two bounding boxes.
	 */
	public static computeIoU(a: Bounds, b: Bounds): number {
		const x1 = Math.max(a.x, b.x);
		const y1 = Math.max(a.y, b.y);
		const x2 = Math.min(a.x + a.width, b.x + b.width);
		const y2 = Math.min(a.y + a.height, b.y + b.height);

		const intersectionWidth = Math.max(0, x2 - x1);
		const intersectionHeight = Math.max(0, y2 - y1);
		const intersectionArea = intersectionWidth * intersectionHeight;

		const areaA = a.width * a.height;
		const areaB = b.width * b.height;
		const unionArea = areaA + areaB - intersectionArea;

		if (unionArea <= 0) return 0;
		return intersectionArea / unionArea;
	}

	/**
	 * Computes center distance between two bounding boxes.
	 */
	public static computeCenterDistance(a: Bounds, b: Bounds): number {
		const cxA = a.x + a.width / 2;
		const cyA = a.y + a.height / 2;
		const cxB = b.x + b.width / 2;
		const cyB = b.y + b.height / 2;

		return Math.sqrt((cxA - cxB) ** 2 + (cyA - cyB) ** 2);
	}

	/**
	 * Computes the deterministic association score between two observations.
	 * Returns 0 if labels do not match.
	 */
	public static computeScore(a: TrackObservation, b: TrackObservation): number {
		if (a.label !== b.label) {
			return 0;
		}

		const iou = this.computeIoU(a.bounds, b.bounds);
		const dist = this.computeCenterDistance(a.bounds, b.bounds);
		
		// Use 1 / (1 + dist) as normalized center similarity
		const centerSimilarity = 1 / (1 + dist);
		const confidenceSimilarity = 1 - Math.abs(a.confidence - b.confidence);

		// Formula: IoU * 0.6 + centerSimilarity * 0.3 + confidenceSimilarity * 0.1
		return iou * 0.6 + centerSimilarity * 0.3 + confidenceSimilarity * 0.1;
	}

	/**
	 * Deterministically associates observations from frame index F to existing tracks.
	 * Tie-breaking rules:
	 * 1. Highest score
	 * 2. Highest confidence
	 * 3. Lexicographically smallest detectionId
	 */
	public static associate(
		activeTracks: { trackId: string; lastObservation: TrackObservation }[],
		newObservations: TrackObservation[]
	): Map<string, string> { // Maps newObservation.detectionId -> trackId
		const associations = new Map<string, string>();
		if (activeTracks.length === 0 || newObservations.length === 0) {
			return associations;
		}

		// Calculate scores for all possible pairs
		interface CandidatePair {
			trackId: string;
			trackLastObs: TrackObservation;
			obs: TrackObservation;
			score: number;
		}

		const candidates: CandidatePair[] = [];

		for (const track of activeTracks) {
			for (const obs of newObservations) {
				const score = this.computeScore(track.lastObservation, obs);
				if (score >= 0.25) {
					candidates.push({
						trackId: track.trackId,
						trackLastObs: track.lastObservation,
						obs,
						score
					});
				}
			}
		}

		// Sort candidates by score descending, then confidence descending, then detectionId ascending
		candidates.sort((first, second) => {
			if (Math.abs(first.score - second.score) > 0.0001) {
				return second.score - first.score;
			}
			if (Math.abs(first.obs.confidence - second.obs.confidence) > 0.0001) {
				return second.obs.confidence - first.obs.confidence;
			}
			return first.obs.detectionId.localeCompare(second.obs.detectionId);
		});

		const matchedTracks = new Set<string>();
		const matchedDetections = new Set<string>();

		for (const pair of candidates) {
			if (matchedTracks.has(pair.trackId) || matchedDetections.has(pair.obs.detectionId)) {
				continue;
			}
			associations.set(pair.obs.detectionId, pair.trackId);
			matchedTracks.add(pair.trackId);
			matchedDetections.add(pair.obs.detectionId);
		}

		return associations;
	}
}
