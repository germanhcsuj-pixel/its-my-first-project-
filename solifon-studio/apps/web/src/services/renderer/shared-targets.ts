import { RenderTarget } from "./render-target";

let sharedTempTarget: RenderTarget | null = null;
let sharedTargetB: RenderTarget | null = null;
let sharedTargetC: RenderTarget | null = null;

export function getSharedTargets(width: number, height: number) {
	if (!sharedTempTarget) {
		sharedTempTarget = new RenderTarget({ width, height });
	} else if (sharedTempTarget.width !== width || sharedTempTarget.height !== height) {
		sharedTempTarget.setSize(width, height);
	}

	if (!sharedTargetB) {
		sharedTargetB = new RenderTarget({ width, height });
	} else if (sharedTargetB.width !== width || sharedTargetB.height !== height) {
		sharedTargetB.setSize(width, height);
	}

	if (!sharedTargetC) {
		sharedTargetC = new RenderTarget({ width, height });
	} else if (sharedTargetC.width !== width || sharedTargetC.height !== height) {
		sharedTargetC.setSize(width, height);
	}

	return { tempTarget: sharedTempTarget, targetB: sharedTargetB, targetC: sharedTargetC };
}
