/**
 * deterministic.ts — Deterministic utilities for P4.1.
 *
 * Replaces Math.random(), crypto.randomUUID(), and Date.now()
 * with seeded deterministic equivalents for reproducible planning.
 *
 * RULE: All P4.1 planning code MUST use these utilities instead of
 * native non-deterministic functions.
 */

// ---- Seeded PRNG (xorshift128) ----

export interface SeededRNG {
	next(): number; // returns 0.0 – 1.0
	nextInt(min: number, max: number): number;
	readonly seed: number;
}

export function createSeededRNG(seed: number): SeededRNG {
	let s0 = seed | 0 || 1;
	let s1 = (seed * 1103515245 + 12345) | 0 || 2;
	let s2 = (seed * 214013 + 2531011) | 0 || 3;
	let s3 = (seed * 16807 + 0) | 0 || 4;

	function next(): number {
		const t = s0 ^ (s0 << 11);
		s0 = s1;
		s1 = s2;
		s2 = s3;
		s3 = (s3 ^ (s3 >>> 19)) ^ (t ^ (t >>> 8));
		return (s3 >>> 0) / 4294967296;
	}

	function nextInt(min: number, max: number): number {
		return Math.floor(next() * (max - min + 1)) + min;
	}

	return { next, nextInt, seed };
}

// ---- Deterministic UUID ----

let _uuidCounter = 0;

export function resetDeterministicUUID(startFrom = 0): void {
	_uuidCounter = startFrom;
}

export function deterministicUUID(prefix: string): string {
	_uuidCounter++;
	return `${prefix}-${_uuidCounter.toString(16).padStart(8, "0")}`;
}

// ---- Deterministic Seed from Analysis ----

export function computeAnalysisSeed(
	videoDuration: number,
	audioDuration: number,
	beatCount: number,
	shotCount: number,
): number {
	// Combine numeric analysis properties into a deterministic seed.
	// Same analysis input → same seed → same plan.
	let hash = 5381;
	const values = [videoDuration, audioDuration, beatCount, shotCount];
	for (const v of values) {
		const bits = Math.round(v * 1000);
		hash = ((hash << 5) + hash + bits) | 0;
	}
	return Math.abs(hash);
}
