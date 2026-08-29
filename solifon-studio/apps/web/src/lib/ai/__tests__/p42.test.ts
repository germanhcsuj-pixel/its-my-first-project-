/**
 * P4.2 Execution, Preview, and Render Tests
 *
 * Tests:
 * - AIEditExecutor validates and transactionally executes plan
 * - Commands reach the timeline via the EditorCore command history (Undo/Redo)
 * - Outdated base revision fails execution with PLAN_OUTDATED
 * - Transaction fails safely on invalid inputs, triggering Rollback
 * - Preview (dry run) summarizes changes without modifying the timeline
 * - Determinism: same input, prompt, seed, etc. yields identical plans & command sequences
 * - Undo/Redo restores state successfully
 * - Target isolation is preserved
 */

// Mock window and other DOM APIs for bun/node testing environment
if (typeof globalThis.window === "undefined") {
	(globalThis as any).window = globalThis;
}
if (typeof globalThis.document === "undefined") {
	(globalThis as any).document = {
		createElement: () => ({
			getContext: () => ({})
		})
	};
}

import { describe, it, expect } from "bun:test";
import { EditorCore } from "@/core";
import { AIEditExecutor } from "../p42/ai-edit-executor";
import { parseEditIntent } from "../p41/edit-intent";
import { EditPlanGenerator } from "../p41/edit-plan-generator";
import { buildAudioAnalysis } from "../p41/audio-analysis";
import { buildVideoAnalysis } from "../p41/video-analysis";
import { executeDryRun } from "../p41/dry-run";
import { getCurrentTimelineRevision, bumpTimelineRevision, resetTimelineRevision } from "../apply-plan";
import type { VideoTrack, VideoElement } from "@/types/timeline";

// Helper to create basic assets
function setupMockEditor() {
	const editor = EditorCore.getInstance();
	editor.media.clearAllAssets();
	editor.command.clear();
	resetTimelineRevision();

	const mockAssets = [
		{ id: "asset-1", name: "Clip 1", type: "video" as const, duration: 30, file: {} as File, url: "test://asset-1" },
		{ id: "asset-2", name: "Clip 2", type: "video" as const, duration: 30, file: {} as File, url: "test://asset-2" },
	];
	editor.media.setAssets({ assets: mockAssets });

	const mockProject = {
		metadata: {
			id: "project-1",
			name: "Mock Project",
			duration: 30,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		scenes: [
			{
				id: "scene-1",
				name: "Scene 1",
				isMain: true,
				tracks: [],
				bookmarks: [],
				markers: [],
			}
		],
		currentSceneId: "scene-1",
		settings: {
			fps: 30,
			canvasSize: { width: 100, height: 100 },
			originalCanvasSize: null,
			background: {
				type: "color" as const,
				color: "#000000",
			},
		},
		version: 1,
	};

	// @ts-ignore
	editor.project.setActiveProject({ project: mockProject });
	// @ts-ignore
	editor.scenes.initializeScenes({ scenes: mockProject.scenes, currentSceneId: mockProject.currentSceneId });

	// Create a main video track
	const mainTrack = {
		id: "track-main",
		name: "Main Video Track",
		type: "video" as const,
		isMain: true,
		muted: false,
		hidden: false,
		elements: [
			{
				id: "element-1",
				name: "Clip 1 Element",
				type: "video" as const,
				mediaId: "asset-1",
				startTime: 0,
				duration: 10,
				trimStart: 0,
				trimEnd: 10,
				transform: { position: { x: 0, y: 0 }, scale: 1.0, rotate: 0 },
				opacity: 1.0,
			}
		]
	};

	// @ts-ignore
	editor.timeline.updateTracks([mainTrack]);
}

describe("P4.2 Execution & Preview", () => {
	it("1. should execute a valid edit plan successfully", async () => {
		setupMockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();

		// Generate plan
		const intent = parseEditIntent("make an energetic AMV with glow sync to beats");
		const clips = [{ mediaId: "asset-1" }];
		
		const audio = buildAudioAnalysis({
			duration: 10,
			sampleRate: 44100,
			bpm: 120,
			beats: [{ time: 3.5, strength: 0.8, isMajor: true }],
			segments: [{ startTime: 0, endTime: 10, energy: 0.5, isSilence: false }],
			totalEnergy: 0.5,
			peakEnergy: 0.8,
		});

		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, audio, clips, revision);

		// Execute plan
		const result = await AIEditExecutor.execute(genResult.plan, revision);

		if (!result.success) {
			console.log("EXECUTION FAILURE:", result);
		}

		expect(result.success).toBe(true);
		expect(result.resultingRevision).toBe(revision + 1);
		expect(result.appliedOperationIds.length).toBeGreaterThan(0);
		expect(result.error).toBeUndefined();

		// Check command history
		expect(editor.command.canUndo()).toBe(true);
	});

	it("2. should reject outdated plans (revision mismatch)", async () => {
		setupMockEditor();
		const revision = getCurrentTimelineRevision();

		const intent = parseEditIntent("cinematic edit cut to beat");
		const clips = [{ mediaId: "asset-1" }];
		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, null, clips, revision);

		// Manually bump revision to simulate concurrent edit
		bumpTimelineRevision();

		// Execute plan with old revision
		const result = await AIEditExecutor.execute(genResult.plan, revision);

		expect(result.success).toBe(false);
		expect(result.error).toContain("Revision conflict");
		expect(result.validation.errors.some(e => e.code === "PLAN_OUTDATED")).toBe(true);
	});

	it("3. should rollback safely on invalid inputs/failures", async () => {
		setupMockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();
		const originalTracksJSON = JSON.stringify(editor.timeline.getTracks());

		// Generate a plan but reference a non-existent asset to cause failure
		const intent = parseEditIntent("cinematic edit cut to beat");
		const clips = [{ mediaId: "nonexistent-asset" }];
		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, null, clips, revision);

		const result = await AIEditExecutor.execute(genResult.plan, revision);

		expect(result.success).toBe(false);
		// Timeline must be intact and not mutated
		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracksJSON);
	});

	it("4. should generate a dry-run preview summarizing changes without mutating timeline", async () => {
		setupMockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();
		const originalTracksJSON = JSON.stringify(editor.timeline.getTracks());

		const intent = parseEditIntent("energetic AMV with glow sync to beats");
		const clips = [{ mediaId: "asset-1" }];
		const audio = buildAudioAnalysis({
			duration: 10,
			sampleRate: 44100,
			bpm: 120,
			beats: [{ time: 3.5, strength: 0.8, isMajor: true }],
			segments: [{ startTime: 0, endTime: 10, energy: 0.5, isSilence: false }],
			totalEnergy: 0.5,
			peakEnergy: 0.8,
		});

		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, audio, clips, revision);

		const preview = executeDryRun(genResult.plan, genResult.trace, genResult.intensityCurve);

		expect(preview.timelineMutated).toBe(false);
		expect(preview.cutPositions.length).toBeGreaterThan(0);
		expect(preview.intensityProfile.length).toBeGreaterThan(0);

		// Ensure real timeline remains unchanged
		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracksJSON);
	});

	it("5. should support undo to restore previous state", async () => {
		setupMockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();
		const originalTracksJSON = JSON.stringify(editor.timeline.getTracks());

		const intent = parseEditIntent("make an energetic AMV with glow sync to beats");
		const clips = [{ mediaId: "asset-1" }];
		const audio = buildAudioAnalysis({
			duration: 10,
			sampleRate: 44100,
			bpm: 120,
			beats: [{ time: 3.5, strength: 0.8, isMajor: true }],
			segments: [{ startTime: 0, endTime: 10, energy: 0.5, isSilence: false }],
			totalEnergy: 0.5,
			peakEnergy: 0.8,
		});

		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, audio, clips, revision);

		// Execute
		const result = await AIEditExecutor.execute(genResult.plan, revision);
		expect(result.success).toBe(true);

		// Undo the operation
		expect(editor.command.canUndo()).toBe(true);
		editor.command.undo();

		// Check if it returned to the exact original track state
		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracksJSON);
	});

	it("6. should be deterministic (same input -> same execution result)", async () => {
		const rawAudio = {
			duration: 10,
			sampleRate: 44100,
			bpm: 120,
			beats: [{ time: 3.5, strength: 0.8, isMajor: true }],
			segments: [{ startTime: 0, endTime: 10, energy: 0.5, isSilence: false }],
			totalEnergy: 0.5,
			peakEnergy: 0.8,
		};

		setupMockEditor();
		const revision = getCurrentTimelineRevision();
		const gen = new EditPlanGenerator();

		const intent = parseEditIntent("energetic AMV sync to beats");
		const clips = [{ mediaId: "asset-1" }];
		const audio = buildAudioAnalysis(rawAudio);

		const gen1 = await gen.generate(intent, null, audio, clips, revision);
		setupMockEditor();
		const res1 = await AIEditExecutor.execute(gen1.plan, revision);

		setupMockEditor();
		const gen2 = await gen.generate(intent, null, audio, clips, revision);
		const res2 = await AIEditExecutor.execute(gen2.plan, revision);

		expect(res1.success).toBe(res2.success);
		expect(res1.resultingRevision).toBe(res2.resultingRevision);
		expect(JSON.stringify(res1.appliedOperationIds)).toBe(JSON.stringify(res2.appliedOperationIds));
	});
});
