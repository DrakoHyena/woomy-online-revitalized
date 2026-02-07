import { currentSettings } from "../settings.js";

const textCanvas = new OffscreenCanvas(1, 1);
const ctx = textCanvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const textRenders = new Map();

function renderText(text, size, renderOptions={}, shouldStroke=true){
	if(textRenders.size > currentSettings.textRenderCacheSize.value.number){
		textRenders.clear();
		console.log("Cleared text cache")
	}

	const roundedSize = Math.round(size);
	const options = {
		fillStyle: renderOptions.fillStyle||"#FFFFFF",
		strokeStyle: renderOptions.strokeStyle||"#000000",
		lineWidth: renderOptions.lineWidth||size?roundedSize/7:4,
		lineJoin: renderOptions.lineJoin||"miter",
		textBaseline: renderOptions.textBaseline||"top",
		font: renderOptions.font||size?`${roundedSize}px Ubuntu`:'48px Ubuntu',
	}

	const saveKey = `${text}|${options.fillStyle}|${options.strokeStyle}|${options.lineWidth}|${options.textBaseline}|${options.font}|${shouldStroke}`
	if(textRenders.has(saveKey)) return textRenders.get(saveKey);
	ctx.font = options.font;
	const {width, fontBoundingBoxDescent, fontBoundingBoxAscent } = ctx.measureText(text);
	textCanvas.width = width+options.lineWidth;
	textCanvas.height = fontBoundingBoxDescent+fontBoundingBoxAscent;
	for(let key in options){
		ctx[key] = options[key];
	}
	if(shouldStroke === true) ctx.strokeText(text, options.lineWidth/2, 0);
	ctx.fillText(text, options.lineWidth/2, 0);
	createImageBitmap(textCanvas, 0, 0, textCanvas.width, textCanvas.height).then(image=>{
		textRenders.set(saveKey, image);
	})
	textRenders.set(saveKey, textCanvas)
	return textCanvas
}

export { renderText }