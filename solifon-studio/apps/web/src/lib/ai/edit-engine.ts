/**
 * AI Edit Engine — Public API
 *
 * Import everything from here. Do NOT import individual modules directly
 * unless you need a specific type that's not re-exported here.
 *
 * GOLDEN RULE: LLM NEVER MUTATES TIMELINE DIRECTLY.
 * Use applyPlan() as the only entry point from AI to timeline mutations.
 */

// Core types
export type { AIEditPlan, EditDecision, Cut, Transition, TrackEffect, SourceClip, SemanticCaptionConfig, MusicSyncConfig } from "./edit-plan";
export type { EditStyleId, EditStyle } from "./style-presets";

// Validation
export { EditPlanValidator, computePlanHash, computePlanHashAsync } from "./edit-plan-validator";
export type { ValidationResult, ValidationError, ValidationWarning, AutoFix, ValidatorContext } from "./edit-plan-validator";

// Apply (the ONLY timeline mutation entrypoint)
export { applyPlan, getCurrentTimelineRevision, bumpTimelineRevision } from "./apply-plan";
export type { ApplyPlanResult } from "./apply-plan";

// Smart Edit Core
export { SmartEditCore } from "./smart-edit-core";
export type { EditIntent, EditMode, InterestScore } from "./smart-edit-core";

// Audio Analysis
export { analyzeAudio, decodeAudioFile, decodeAudioFromUrl } from "./audio-analyzer";
export type { AudioAnalysisResult, Beat, AudioSegment } from "./audio-analyzer";

// Video Analysis (client-side wrapper)
export { analyzeVideo } from "./video-analyzer-client";
export type { VideoAnalyzerOptions } from "./video-analyzer-client";

// Semantic Captions
export { SemanticCaptionBuilder, captionToTextElement } from "./semantic-captions";
export type { SemanticCaption, SemanticWord, CaptionStyle, CaptionPosition, WhisperSegment, TranscriptSource } from "./semantic-captions";

// AI Checkpoints + Refinement + Diff
export { AICheckpointManager, buildRefinementPrompt, diffPlans, summarizePlan } from "./ai-checkpoints";
export type { AICheckpoint, EditDiff, DiffEntry, RefinementFeedback, RefinementRequest } from "./ai-checkpoints";
