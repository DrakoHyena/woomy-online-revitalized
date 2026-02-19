import { currentSettings } from "../settings.js";

const textCanvas = new OffscreenCanvas(1, 1);
const ctx = textCanvas.getContext("2d");
ctx.imageSmoothingEnabled = currentSettings.imageSmoothing.value.enabled;

const textRenders = new Map();

function renderText(text, size, renderOptions = {}, shouldStroke = true, maxWidth = 0) {
	if (textRenders.size > currentSettings.textRenderCacheSize.value.number) {
		textRenders.clear();
		console.log("Cleared text cache")
	}

	const roundedSize = Math.round(size);
	const options = {
		fillStyle: renderOptions.fillStyle || "#FFFFFF",
		strokeStyle: renderOptions.strokeStyle || "#000000",
		lineWidth: renderOptions.lineWidth || size ? roundedSize / 7 : 4,
		lineJoin: renderOptions.lineJoin || "miter",
		textBaseline: renderOptions.textBaseline || "top",
		font: renderOptions.font || size ? `${roundedSize}px Ubuntu` : '48px Ubuntu',
	}

	const saveKey = `${text}|${options.fillStyle}|${options.strokeStyle}|${options.lineWidth}|${options.textBaseline}|${options.font}|${shouldStroke}|${maxWidth}`;
	if (textRenders.has(saveKey)) return textRenders.get(saveKey);

	// Helper to split text into lines based on maxWidth
	function wrapText(ctx, text, maxWidth) {
		if (!maxWidth) return [text];
		const words = text.split(' ');
		let lines = [];
		let currentLine = words[0];
		for (let i = 1; i < words.length; i++) {
			const word = words[i];
			const width = ctx.measureText(currentLine + ' ' + word).width;
			if (width > maxWidth) {
				lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine += ' ' + word;
			}
		}
		lines.push(currentLine);
		return lines;
	}

	ctx.font = options.font;
	let lines = [text];
	if (maxWidth && maxWidth > 0) {
		lines = wrapText(ctx, text, maxWidth);
	}

	// Calculate total height and max width
	let maxLineWidth = 0;
	let ascent = 0, descent = 0;
	if (maxWidth && maxWidth > 0) {
		for (let line of lines) {
			const metrics = ctx.measureText(line);
			maxLineWidth = Math.max(maxLineWidth, metrics.width);
			ascent = Math.max(ascent, metrics.fontBoundingBoxAscent || 0);
			descent = Math.max(descent, metrics.fontBoundingBoxDescent || 0);
		}
	} else {
		const metrics = ctx.measureText(text);
		maxLineWidth = metrics.width;
		ascent = metrics.fontBoundingBoxAscent || 0;
		descent = metrics.fontBoundingBoxDescent || 0;
	}
	const totalHeight = (ascent + descent) * lines.length;

	textCanvas.width = Math.max(1, Math.ceil(maxLineWidth + options.lineWidth));
	textCanvas.height = Math.max(1, Math.ceil(totalHeight));
	ctx.imageSmoothingEnabled = currentSettings.imageSmoothing.value.enabled;

	for (let key in options) {
		ctx[key] = options[key];
	}

	// Draw each line
	for (let i = 0; i < lines.length; i++) {
		const y = i * (ascent + descent);
		if (shouldStroke === true) ctx.strokeText(lines[i], options.lineWidth / 2, y);
		ctx.fillText(lines[i], options.lineWidth / 2, y);
	}


	createImageBitmap(textCanvas, 0, 0, textCanvas.width, textCanvas.height).then(image => {
		textRenders.set(saveKey, image);
	})
	textRenders.set(saveKey, textCanvas)
	return textCanvas
}

export { renderText }