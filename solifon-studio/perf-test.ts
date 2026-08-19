// Mock document for canvas before anything else
if (typeof global.document === 'undefined') {
	global.document = {
		createElement: () => ({
			getContext: () => ({
				measureText: (text: string) => ({ width: text.length * 10 }),
				font: '',
                save: () => {},
                restore: () => {},
                translate: () => {},
                scale: () => {},
                rotate: () => {},
                beginPath: () => {},
                rect: () => {},
                clip: () => {},
                fillText: () => {},
                strokeText: () => {}
			}),
			width: 1,
			height: 1
		})
	} as any;
}

const { TextNode } = require("./apps/web/src/services/renderer/nodes/text-node");
const { RenderTarget } = require("./apps/web/src/services/renderer/render-target");

function createTextOfLength(n: number) {
    let t = "";
    for(let i=0; i<n; i++) {
        t += (i % 5 === 0 ? " " : "A");
    }
    return t.trim();
}

const tests = [
    { name: "50 chars OFF", chars: 50, kinetic: undefined },
    { name: "50 chars WORD", chars: 50, kinetic: { scope: "word", type: "fade-stagger", staggerDelay: 0.1 } },
    { name: "50 chars CHAR", chars: 50, kinetic: { scope: "character", type: "fade-stagger", staggerDelay: 0.1 } },
    { name: "100 chars CHAR", chars: 100, kinetic: { scope: "character", type: "fade-stagger", staggerDelay: 0.1 } },
    { name: "200 chars CHAR", chars: 200, kinetic: { scope: "character", type: "fade-stagger", staggerDelay: 0.1 } },
    { name: "50 chars CHAR REVEAL", chars: 50, kinetic: { scope: "character", type: "reveal", staggerDelay: 0.1 } }
];

async function run() {
    const target = new RenderTarget({ width: 1920, height: 1080 });
    const frames = 300;

    for (const t of tests) {
        const text = createTextOfLength(t.chars);
        const node = new TextNode({
            id: "test",
            name: "test",
            type: "text",
            content: text,
            startTime: 0,
            duration: 10,
            fontSize: 48,
            fontFamily: "Inter",
            color: "white",
            textAlign: "center",
            kinetic: t.kinetic as any
        });

        // Pre-warm layout (layout shouldn't be counted in per-frame render overhead if it's cached)
        node.render(target.context, 0, target);

        const start = performance.now();
        for (let frame = 0; frame < frames; frame++) {
            const time = (frame / 60); // Simulate 60fps localTime
            node.render(target.context, time, target);
        }
        const end = performance.now();
        const durationMs = end - start;
        const msPerFrame = durationMs / frames;
        console.log(`${t.name}: Total ${durationMs.toFixed(2)}ms for ${frames} frames. Average: ${msPerFrame.toFixed(4)}ms/frame`);
    }
}

run();
