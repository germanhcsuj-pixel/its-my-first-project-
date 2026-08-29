import { textMeasurer, TextMeasureSpec } from "./text-measurer";
import { fontRegistry } from "./font-registry";

export interface TextLayoutInput {
	text: string;
	fontFamily: string;
	fontSize: number;
	fontWeight?: string | number;
	fontStyle?: string;
	letterSpacing?: number; // pixels (added after measurement theoretically, or via tracking if supported, but Canvas 2D letterSpacing is tricky across browsers. We will assume we can set letterSpacing on the context or calculate width manually)
	lineHeight?: number; // multiplier e.g. 1.2
	textAlign?: "left" | "center" | "right";
	maxWidth?: number;
	direction?: "ltr" | "rtl" | "auto";
}

export interface TextLayoutLine {
	text: string;
	width: number;
	y: number; // Y offset relative to the block
	baseline: number; // Baseline offset relative to the block
}

export interface TextLayoutWord {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
	lineIndex: number;
	wordIndex: number;
}

export interface TextLayoutCharacter {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
	lineIndex: number;
	wordIndex: number;
	characterIndex: number;
	normalizedIndex: number;
}

export interface TextLayoutResult {
	lines: TextLayoutLine[];
	words: TextLayoutWord[];
	characters: TextLayoutCharacter[];
	width: number;
	height: number;
	lineHeightPx: number;
}

export class TextLayout {
	private static instance: TextLayout;
	private cache = new Map<string, TextLayoutResult>();

	private constructor() {}

	public static getInstance(): TextLayout {
		if (!TextLayout.instance) {
			TextLayout.instance = new TextLayout();
		}
		return TextLayout.instance;
	}

	public getCacheKey(input: TextLayoutInput): string {
		const weight = input.fontWeight ?? "normal";
		const style = input.fontStyle ?? "normal";
		const fontKey = fontRegistry.getFontKey({ family: input.fontFamily, weight, style });
		
		return JSON.stringify({
			text: input.text,
			fontKey,
			fontSize: input.fontSize,
			letterSpacing: input.letterSpacing ?? 0,
			lineHeight: input.lineHeight ?? 1.2,
			textAlign: input.textAlign ?? "center",
			maxWidth: input.maxWidth ?? -1,
			direction: input.direction ?? "auto",
		});
	}

	public measure(input: TextLayoutInput): TextLayoutResult {
		const cacheKey = this.getCacheKey(input);
		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey)!;
		}

		const result = this.performLayout(input);
		this.cache.set(cacheKey, result);
		return result;
	}

	private performLayout(input: TextLayoutInput): TextLayoutResult {
		const { text, fontSize, letterSpacing = 0, lineHeight = 1.2, textAlign = "center", maxWidth = -1, direction = "auto" } = input;
		
		const fontSpec: TextMeasureSpec = {
			fontFamily: input.fontFamily,
			fontSize: input.fontSize,
			fontWeight: input.fontWeight,
			fontStyle: input.fontStyle,
		};

		// Helper to measure a chunk of text with letterSpacing approximation
		const measureString = (str: string) => {
			const m = textMeasurer.measureText(str, fontSpec);
			// Very basic approximation for letterSpacing width
			const lsWidth = Math.max(0, str.length - 1) * letterSpacing;
			return m.width + lsWidth;
		};

		const paragraphs = text.split("\n");
		const lines: { text: string; width: number }[] = [];
		let maxLineWidth = 0;

		for (const paragraph of paragraphs) {
			if (paragraph === "") {
				lines.push({ text: "", width: 0 });
				continue;
			}

			// Word wrap
			if (maxWidth > 0) {
				const words = paragraph.split(" ");
				let currentLine = words[0] || "";
				let currentWidth = measureString(currentLine);

				for (let i = 1; i < words.length; i++) {
					const word = words[i];
					const testLine = currentLine + " " + word;
					const testWidth = measureString(testLine);

					if (testWidth > maxWidth && currentLine !== "") {
						lines.push({ text: currentLine, width: currentWidth });
						maxLineWidth = Math.max(maxLineWidth, currentWidth);
						currentLine = word;
						currentWidth = measureString(word);
					} else {
						currentLine = testLine;
						currentWidth = testWidth;
					}
				}
				if (currentLine !== "") {
					lines.push({ text: currentLine, width: currentWidth });
					maxLineWidth = Math.max(maxLineWidth, currentWidth);
				}
			} else {
				// No wrapping
				const w = measureString(paragraph);
				lines.push({ text: paragraph, width: w });
				maxLineWidth = Math.max(maxLineWidth, w);
			}
		}

		const lhPx = fontSize * lineHeight;
		const totalHeight = lines.length * lhPx;
		const blockWidth = maxWidth > 0 ? maxWidth : maxLineWidth;

		const layoutLines: TextLayoutLine[] = [];
		const layoutWords: TextLayoutWord[] = [];
		const layoutCharacters: TextLayoutCharacter[] = [];
		let currentY = 0;
		let globalWordIndex = 0;
		let globalCharIndex = 0;
		const totalCharacters = typeof Intl !== 'undefined' && Intl.Segmenter
			? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)).length
			: text.length;

		const spaceWidth = measureString(" ");

		// Create segmenters
		let wordSegmenter: Intl.Segmenter | null = null;
		let graphemeSegmenter: Intl.Segmenter | null = null;
		if (typeof Intl !== 'undefined' && Intl.Segmenter) {
			wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
			graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
		}

		for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
			const line = lines[lineIdx];
			const yOffset = currentY + lhPx / 2;
			const baseline = currentY + fontSize * 0.8;
			
			const finalY = yOffset - totalHeight / 2;
			const finalBaseline = baseline - totalHeight / 2;

			layoutLines.push({
				text: line.text,
				width: line.width,
				y: finalY,
				baseline: finalBaseline
			});

			let startX = 0;
			if (textAlign === "left") {
				startX = maxWidth > 0 ? -maxWidth / 2 : -blockWidth / 2;
			} else if (textAlign === "right") {
				startX = (maxWidth > 0 ? maxWidth / 2 : blockWidth / 2) - line.width;
			} else {
				startX = -line.width / 2;
			}
			
			let currentX = direction === "rtl" ? startX + line.width : startX;

			const processWord = (wordText: string, isWordLike: boolean) => {
				const wordWidth = measureString(wordText);
				const wordX = direction === "rtl" ? currentX - wordWidth : currentX;
				
				if (isWordLike) {
					const wordInfo = {
						text: wordText,
						x: wordX,
						y: finalBaseline,
						width: wordWidth,
						height: lhPx,
						lineIndex: lineIdx,
						wordIndex: globalWordIndex++
					};
					layoutWords.push(wordInfo);

					// Process graphemes for this word
					if (graphemeSegmenter) {
						const graphemes = Array.from(graphemeSegmenter.segment(wordText));
						let charX = direction === "rtl" ? wordX + wordWidth : wordX;
						
						for (const g of graphemes) {
							const gWidth = measureString(g.segment);
							if (direction === "rtl") charX -= gWidth;
							
							layoutCharacters.push({
								text: g.segment,
								x: charX,
								y: finalBaseline,
								width: gWidth,
								height: lhPx,
								lineIndex: lineIdx,
								wordIndex: wordInfo.wordIndex,
								characterIndex: globalCharIndex++,
								normalizedIndex: globalCharIndex / Math.max(1, totalCharacters)
							});
							
							if (direction !== "rtl") charX += gWidth;
						}
					} else {
						// Fallback to simple split
						let charX = direction === "rtl" ? wordX + wordWidth : wordX;
						for (const char of wordText) {
							const cWidth = measureString(char);
							if (direction === "rtl") charX -= cWidth;
							layoutCharacters.push({
								text: char,
								x: charX,
								y: finalBaseline,
								width: cWidth,
								height: lhPx,
								lineIndex: lineIdx,
								wordIndex: wordInfo.wordIndex,
								characterIndex: globalCharIndex++,
								normalizedIndex: globalCharIndex / Math.max(1, totalCharacters)
							});
							if (direction !== "rtl") charX += cWidth;
						}
					}
				} else {
					// We still want to process whitespace/punctuation as characters so they animate!
					// But they are not "words"
					if (graphemeSegmenter) {
						const graphemes = Array.from(graphemeSegmenter.segment(wordText));
						let charX = direction === "rtl" ? wordX + wordWidth : wordX;
						for (const g of graphemes) {
							const gWidth = measureString(g.segment);
							if (direction === "rtl") charX -= gWidth;
							layoutCharacters.push({
								text: g.segment,
								x: charX,
								y: finalBaseline,
								width: gWidth,
								height: lhPx,
								lineIndex: lineIdx,
								wordIndex: globalWordIndex, // associates with the next word index
								characterIndex: globalCharIndex++,
								normalizedIndex: globalCharIndex / Math.max(1, totalCharacters)
							});
							if (direction !== "rtl") charX += gWidth;
						}
					}
				}

				if (direction === "rtl") {
					currentX -= wordWidth;
				} else {
					currentX += wordWidth;
				}
			};

			if (wordSegmenter) {
				const segments = Array.from(wordSegmenter.segment(line.text));
				// If RTL, process segments in reverse?
				// Native bidi algorithm reorders words. A true RTL layout would reorder them.
				// For P3.4 minimum viability, we lay them out in string order but right-to-left spatially if direction="rtl".
				for (const segment of segments) {
					processWord(segment.segment, segment.isWordLike || false);
				}
			} else {
				// Fallback
				const words = line.text.split(" ");
				for (let wIdx = 0; wIdx < words.length; wIdx++) {
					const word = words[wIdx];
					if (word.length > 0) {
						processWord(word, true);
					}
					if (wIdx < words.length - 1) {
						processWord(" ", false);
					}
				}
			}

			currentY += lhPx;
		}

		return {
			lines: layoutLines,
			words: layoutWords,
			characters: layoutCharacters,
			width: blockWidth,
			height: totalHeight,
			lineHeightPx: lhPx
		};
	}
}

export const textLayout = TextLayout.getInstance();
