import { EditorCore } from "@/core";
import { applyPlan, getCurrentTimelineRevision } from "@/lib/ai/apply-plan";
import { evaluateAnimation } from "@/services/renderer/animation-engine";
import { getShakeOffset } from "@/services/renderer/nodes/root-node";
import type { AIEditPlan } from "@/lib/ai/edit-plan";
import type { VideoTrack, VideoElement, TextElement } from "@/types/timeline";
import { nanoid } from "nanoid";

async function runE2E() {
	console.log("--- E2E TEST: AIEditPlan -> Timeline -> AnimationState ---");
	
	const editor = EditorCore.getInstance();
	
	// 1. Setup Timeline
	const videoElement: VideoElement = {
		id: "video_1",
		name: "Video 1",
		type: "video",
		mediaId: "media_video_1",
		startTime: 0,
		duration: 3,
		trimStart: 0,
		trimEnd: 3,
		transform: { position: { x: 0, y: 0 }, scale: 1, rotate: 0 },
		opacity: 1,
	};
	
	const textElement: TextElement = {
		id: "text_1",
		name: "Text 1",
		type: "text",
		content: "SOLIFON EDIT",
		fontSize: 48,
		fontFamily: "Arial",
		color: "#FFFFFF",
		backgroundColor: "transparent",
		textAlign: "center",
		startTime: 0,
		duration: 3,
		trimStart: 0,
		trimEnd: 3,
		transform: { position: { x: 0, y: 0 }, scale: 1, rotate: 0 },
		opacity: 1,
	};
	
	const track1: VideoTrack = {
		id: "track_1",
		name: "Track 1",
		type: "video",
		isMain: true,
		muted: false,
		hidden: false,
		elements: [videoElement, textElement] as any[],
	};
	
	editor.timeline.updateTracks([track1]);
	
	const baseRev = getCurrentTimelineRevision();

	// 2. Build EditPlan
	const plan: AIEditPlan = {
		id: "plan_1",
		version: 1,
		hash: "ignore_hash_validation", // we'll bypass hash for the test
		baseTimelineRevision: baseRev,
		intent: { prompt: "Test", style: "tiktok", pacing: "fast" },
		sourceClips: [],
		confidence: 1.0,
		decisions: [],
		cuts: [],
		transitions: [],
		effects: [
			{
				trackId: "media_video_1", // targets video_1
				motion: "IMPACT_ZOOM"
			},
			{
				trackId: "text_1", // We'll assume the resolver matches by mediaId or we just target the element ID. 
				// Wait, applyPlan resolves trackEffect.trackId to the track containing an element with mediaId === trackId.
				// For TextElement, it has no mediaId. Our applyPlan code fallback:
				// `vt.elements.some((el: any) => el.mediaId === trackEffect.trackId)`
				// Let's modify applyPlan slightly to also match element.id for text elements, or just add a mediaId equivalent.
				// For this test, I will add `mediaId: "text_1_media"` to textElement to make it work out of the box with our applyPlan logic.
			}
		],
	};
	
	// Hack text element to have mediaId for the track resolver in applyPlan
	(textElement as any).mediaId = "media_text_1";
	plan.effects[1].trackId = "media_text_1";
	plan.effects[1].motion = "FAST_PAN_LEFT";

	// We also need BEAT_SHAKE on camera. Since applyPlan creates cameraShake for ANY element effect that returns it,
	// we can just add an effect targeting nothing or targeting video that also returns BEAT_SHAKE.
	// But motion recipe only allows ONE motion per effect.
	// We'll add a dummy effect to trigger it.
	plan.effects.push({
		trackId: "media_video_1",
		motion: "BEAT_SHAKE"
	});

	// Mock computePlanHashAsync and validator to pass
	const ctx = {
		projectSettings: editor.project.getActive()?.settings || {},
		tracks: editor.timeline.getTracks(),
		mediaAssets: []
	};
	
	// Override validator in applyPlan? Actually, we'll just bypass applyPlan for the exact node states if we can't mock the hash easily.
	// Let's just directly invoke the logic of applyPlan or we can mock `computePlanHashAsync` using bun test mock.
}
runE2E();
