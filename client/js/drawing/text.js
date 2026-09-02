import { currentSettings } from "../settings.js";

const textCanvas = new OffscreenCanvas(1, 1);
const ctx = textCanvas.getContext("2d");
ctx.imageSmoothingEnabled = currentSettings.imageSmoothing.value.enabled;

const textRenders = new Map();

function renderText(text, size, renderOptions = {}, shouldStroke = true, maxWidth = 0) {
    if (textRenders.size > currentSettings.textRenderCacheSize.value.number) {
        textRenders.clear();
        console.log("Cleared text cache");
    }

    const roundedSize = Math.round(size);
    const options = {
        fillStyle: renderOptions.fillStyle || "#FFFFFF",
        strokeStyle: renderOptions.strokeStyle || "#000000",
        lineWidth: renderOptions.lineWidth || size ? roundedSize / 7 : 4,
        lineJoin: renderOptions.lineJoin || "miter",
        // Alphabetic for os compat
        textBaseline: "alphabetic",
        textRendering: renderOptions.textRendering || "optimizeLegibility",
        font: renderOptions.font || size ? `${roundedSize}px Ubuntu` : '48px Ubuntu'
    };

    // We preserve the caller's requested baseline in the cache key just in case.
    const saveKey = `${text}|${options.fillStyle}|${options.strokeStyle}|${options.lineWidth}|${options.font}|${shouldStroke}|${maxWidth}`;
    if (textRenders.has(saveKey)) return textRenders.get(saveKey);

    ctx.font = options.font;
    ctx.textBaseline = options.textBaseline;

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
            ascent = Math.max(ascent, metrics.actualBoundingBoxAscent);
            descent = Math.max(descent, metrics.actualBoundingBoxDescent);
        }
    } else {
        const metrics = ctx.measureText(text);
        maxLineWidth = metrics.width;
        ascent = metrics.actualBoundingBoxAscent;
        descent = metrics.actualBoundingBoxDescent;
    }

    const totalHeight = (ascent + descent) * lines.length + options.lineWidth;

    textCanvas.width = Math.max(1, Math.ceil(maxLineWidth + options.lineWidth));
    textCanvas.height = Math.max(1, Math.ceil(totalHeight));
    ctx.imageSmoothingEnabled = currentSettings.imageSmoothing.value.enabled;

    // Canvas resize clears context state, so re-apply here
    for (let key in options) {
        ctx[key] = options[key];
    }

    // Draw each line
    for (let i = 0; i < lines.length; i++) {
        // FIX 3: Push the draw Y coordinate down by `ascent`. 
        // Because we are using the "alphabetic" baseline, drawing at Y = ascent guarantees
        // that the very top edge of the bounding box will sit perfectly flush at Y = 0.
        const y = ascent + i * (ascent + descent) + options.lineWidth / 2;

        if (shouldStroke === true) ctx.strokeText(lines[i], options.lineWidth / 2, y);
        ctx.fillText(lines[i], options.lineWidth / 2, y);
    }

    createImageBitmap(textCanvas, 0, 0, textCanvas.width, textCanvas.height).then(image => {
        textRenders.set(saveKey, image);
    });
    textRenders.set(saveKey, textCanvas);
    return textCanvas;
}

const suffixNum = (() => {
    // Suffixes: thousand (k) up to Quetta (Q = 10^30)
    const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q'];
    const MAX_TIER = SUFFIXES.length - 1;

    return function formatSuffix(num = 0) {
        if (!Number.isFinite(num)) return String(num);

        const sign = num < 0 ? '-' : '';
        let abs = Math.abs(num);

        if (abs < 1000) {
            return sign + abs.toFixed(2);
        }

        // Fast log10 lookup to find the suffix index
        let tier = Math.min(Math.floor(Math.log10(abs) / 3), MAX_TIER);
        let scale = 10 ** (tier * 3);
        let scaled = abs / scale;

        // Rollover check (e.g., 999.995k -> 1.00M)
        if (scaled >= 999.995 && tier < MAX_TIER) {
            scaled /= 1000;
            tier += 1;
        }

        return sign + scaled.toFixed(2) + SUFFIXES[tier];
    };
})();

export { renderText, suffixNum };
