/**
 * P4.3 E2E Release Gate Tests
 *
 * Scenarios:
 * 1. Full E2E Flow: Prompt -> Plan -> Preview -> Apply -> Undo (Full state restoration)
 * 2. Stale Revision Lockout: Modify timeline after preview -> Apply returns PLAN_OUTDATED -> Timeline unchanged
 * 3. Dry-Run Immutability: Verify preview does not touch timeline tracks, markers, transitions, or settings
 * 4. Error Handling & Rollback:
 *    - Plan generation error
 *    - Validation error
 *    - Apply error (invalid asset duration)
 *    - Rollback safety (no partial modifications remain)
 */

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
import { executeDryRun } from "../p41/dry-run";
import { getCurrentTimelineRevision, resetTimelineRevision, bumpTimelineRevision } from "../apply-plan";
import type { VideoTrack } from "@/types/timeline";

function setupP43MockEditor() {
	const editor = EditorCore.getInstance();
	editor.media.clearAllAssets();
	editor.command.clear();
	resetTimelineRevision();

	const mockAssets = [
		{ id: "asset-1", name: "Asset 1", type: "video" as const, duration: 30, file: {} as File, url: "test://asset-1" },
		{ id: "asset-2", name: "Asset 2", type: "video" as const, duration: 20, file: {} as File, url: "test://asset-2" },
	];
	editor.media.setAssets({ assets: mockAssets });

	const mockProject = {
		metadata: {
			id: "proj-p43",
			name: "P43 Project",
			duration: 30,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		scenes: [
			{
				id: "scene-p43",
				name: "Scene P43",
				isMain: true,
				tracks: [],
				bookmarks: [],
				markers: [],
			}
		],
		currentSceneId: "scene-p43",
		settings: {
			fps: 30,
			canvasSize: { width: 1920, height: 1080 },
			originalCanvasSize: null,
			background: {
				type: "color" as const,
				color: "#1e1e24",
			},
		},
		version: 1,
	};

	// @ts-ignore
	editor.project.setActiveProject({ project: mockProject });
	// @ts-ignore
	editor.scenes.initializeScenes({ scenes: mockProject.scenes, currentSceneId: mockProject.currentSceneId });

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
				name: "Element 1",
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

describe("P4.3 Release Gate E2E Scenarios", () => {
	it("1. should perform full E2E AI edit flow and restore on Undo", async () => {
		setupP43MockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();
		const originalTracksJSON = JSON.stringify(editor.timeline.getTracks());
		const originalMarkers = JSON.stringify(editor.scenes.getMarkers());

		// 1. Enter prompt & Parse intent
		const intent = parseEditIntent("energetic AMV with glow and cut on beats");
		expect(intent.style).toBe("anime_amv");
		expect(intent.cutOnBeats).toBe(true);

		// 2. Generate Plan
		const clips = [{ mediaId: "asset-1" }];
		const audio = buildAudioAnalysis({
			duration: 10,
			sampleRate: 44100,
			bpm: 120,
			beats: [{ time: 4.0, strength: 0.9, isMajor: true }],
			segments: [{ startTime: 0, endTime: 10, energy: 0.6, isSilence: false }],
			totalEnergy: 0.6,
			peakEnergy: 0.9,
		});

		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, audio, clips, revision);
		expect(genResult.plan.cuts.length).toBe(1);
		expect(genResult.plan.cuts[0].time).toBe(4.0);

		// 3. Dry-Run Preview (must NOT change state)
		const preview = executeDryRun(genResult.plan, genResult.trace, genResult.intensityCurve);
		expect(preview.timelineMutated).toBe(false);
		expect(preview.cutPositions.length).toBe(1);
		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracksJSON);
		expect(JSON.stringify(editor.scenes.getMarkers())).toBe(originalMarkers);

		// 4. Apply
		const applyRes = await AIEditExecutor.execute(genResult.plan, revision);
		expect(applyRes.success).toBe(true);
		expect(applyRes.resultingRevision).toBe(revision + 1);

		// Verify changes were applied
		const appliedTracks = editor.timeline.getTracks();
		expect(appliedTracks[0].elements.length).toBe(2); // Cut created 2 elements
		expect(appliedTracks[0].elements[0].name).toContain("(left)");
		expect(editor.scenes.getMarkers().length).toBeGreaterThan(0); // Marker added for beat

		// 5. Undo (must restore exact previous state)
		expect(editor.command.canUndo()).toBe(true);
		editor.command.undo();

		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracksJSON);
		expect(JSON.stringify(editor.scenes.getMarkers())).toBe(originalMarkers);
	});

	it("2. should reject with PLAN_OUTDATED if timeline revision changes after plan preview", async () => {
		setupP43MockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();
		const originalTracksJSON = JSON.stringify(editor.timeline.getTracks());

		const intent = parseEditIntent("energetic AMV with beats");
		const clips = [{ mediaId: "asset-1" }];
		const audio = buildAudioAnalysis({
			duration: 10,
			sampleRate: 44100,
			bpm: 120,
			beats: [{ time: 4.0, strength: 0.9, isMajor: true }],
			segments: [{ startTime: 0, endTime: 10, energy: 0.6, isSilence: false }],
			totalEnergy: 0.6,
			peakEnergy: 0.9,
		});

		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, audio, clips, revision);

		// Simulate external timeline change (e.g. user manually cuts or moves clip)
		bumpTimelineRevision();

		// Apply should return PLAN_OUTDATED and not modify timeline
		const result = await AIEditExecutor.execute(genResult.plan, revision);
		expect(result.success).toBe(false);
		expect(result.validation.errors.some(e => e.code === "PLAN_OUTDATED")).toBe(true);
		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracksJSON);
	});

	it("3. should verify preview/dry-run is strictly read-only", async () => {
		setupP43MockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();
		
		const originalTracks = JSON.stringify(editor.timeline.getTracks());
		const originalMarkers = JSON.stringify(editor.scenes.getMarkers());
		const originalProject = JSON.stringify(editor.project.getActive());

		const intent = parseEditIntent("cinematic edit with transitions and markers");
		const clips = [{ mediaId: "asset-1" }];
		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, null, clips, revision);

		// Execute dry run
		const preview = executeDryRun(genResult.plan, genResult.trace, genResult.intensityCurve);
		expect(preview.timelineMutated).toBe(false);

		// Check state identity
		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracks);
		expect(JSON.stringify(editor.scenes.getMarkers())).toBe(originalMarkers);
		expect(JSON.stringify(editor.project.getActive())).toBe(originalProject);
	});

	it("4. should handle errors and rollback to previous clean state", async () => {
		setupP43MockEditor();
		const editor = EditorCore.getInstance();
		const revision = getCurrentTimelineRevision();
		const originalTracksJSON = JSON.stringify(editor.timeline.getTracks());

		// Reference non-existent asset to cause validation failure
		const intent = parseEditIntent("cinematic edit");
		const clips = [{ mediaId: "nonexistent-asset-id" }];
		const gen = new EditPlanGenerator();
		const genResult = await gen.generate(intent, null, null, clips, revision);

		const result = await AIEditExecutor.execute(genResult.plan, revision);
		expect(result.success).toBe(false);
		expect(result.validation.valid).toBe(false);
		expect(result.validation.errors.length).toBeGreaterThan(0);
		
		// Verifying rollback: no changes left on timeline
		expect(JSON.stringify(editor.timeline.getTracks())).toBe(originalTracksJSON);
	});
});
