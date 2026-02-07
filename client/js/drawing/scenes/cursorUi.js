import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { mouse } from "../../controls/mouse.js";
import { lerp } from "../../lerp.js";
import { renderText } from "../text.js";
import { currentSettings } from "../../settings.js";

const cursorUi = new Scene(document.getElementById("cursorUiCanvas"));
drawLoop.scenes.set("cursorUi", cursorUi);

const TEXTBOX_CONFIG = {
	PADDING: 10,
	LINE_SPACING: 4,
	TITLE_SIZE: 24,
	DESC_SIZE: 12,
	MAX_WIDTH: 280,
	WORDS_PER_LINE: 5,
	BACKGROUND: "#2b2b2b",
	BORDER: "#1a1a1a"
}

const state = {
	textbox: {
		active: false,
		fade: 0,
		title: "Title Text",
		description: "Description Text"
	}
}

cursorUi.utilityFuncts.set("fade", ({ canvas, ctx, delta }) => {
	if(state.textbox.active === false){
		state.textbox.fade = lerp(state.textbox.fade, 0, currentSettings.menuAnimSpeed.value.number*delta)
		if(state.textbox.fade < 0.001){
			cursorUi.drawFuncts.delete("textbox");
		}
	}else{
		state.textbox.fade = lerp(state.textbox.fade, 1, currentSettings.menuAnimSpeed.value.number*delta)
		cursorUi.drawFuncts.set("textbox", textbox)
	}
})

cursorUi.drawFuncts.set("clear", ({ canvas, ctx }) => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function wrapText(text, fontSize, maxWordsPerLine) {
	const words = text.split(" ");
	const lines = [];
	for (let i = 0; i < words.length; i += maxWordsPerLine) {
		lines.push(renderText(words.slice(i, i + maxWordsPerLine).join(" "), fontSize));
	}
	return lines;
}

function textbox({ canvas, ctx, delta }) {
	const pad = TEXTBOX_CONFIG.PADDING;
	const gap = TEXTBOX_CONFIG.LINE_SPACING;

	// Render title and wrapped description lines
	const titleImg = renderText(state.textbox.title, TEXTBOX_CONFIG.TITLE_SIZE);
	const descLines = wrapText(state.textbox.description, TEXTBOX_CONFIG.DESC_SIZE, TEXTBOX_CONFIG.WORDS_PER_LINE);

	// Measure content size
	let contentWidth = titleImg.width;
	let contentHeight = titleImg.height + gap;
	for (const line of descLines) {
		if (line.width > contentWidth) contentWidth = line.width;
		contentHeight += line.height + gap;
	}

	const boxW = Math.min(contentWidth + pad * 2, TEXTBOX_CONFIG.MAX_WIDTH);
	const boxH = contentHeight + pad * 2;

	// Position: offset from cursor, clamp to canvas
	let x = mouse.x + 12;
	let y = mouse.y + 20;
	if (x + boxW > canvas.width) x = mouse.x - boxW - 4;
	if (y + boxH > canvas.height) y = mouse.y - boxH - 4;

	// Clip reveal: left-to-right based on fade
	const clipW = boxW * state.textbox.fade;
	ctx.save();
	ctx.globalAlpha = .85 * state.textbox.fade;
	ctx.beginPath();
	ctx.rect(x, y, clipW, boxH);
	ctx.clip();

	// Background
	ctx.fillStyle = TEXTBOX_CONFIG.BACKGROUND;
	ctx.fillRect(x, y, boxW, boxH);
	ctx.strokeStyle = TEXTBOX_CONFIG.BORDER;
	ctx.lineWidth = 2;
	ctx.strokeRect(x, y, boxW, boxH);

	// Title
	let drawY = y + pad;
	ctx.drawImage(titleImg, x + pad, drawY);
	drawY += titleImg.height + gap;

	// Description lines
	for (const line of descLines) {
		ctx.drawImage(line, x + pad, drawY);
		drawY += line.height + gap;
	}

	ctx.restore();
}

function showCursorTextBox(title, description){
	if(title !== undefined) state.textbox.title = title;
	if(description !== undefined) state.textbox.description = description;
	state.textbox.active = true;
}
function hideCursorTextBox(){
	state.textbox.active = false;
}
function toggleCursorTextBox(title, description){
	if(state.textbox.active === true){
		hideCursorTextBox()
	}else{
		showCursorTextBox(title, description)
	}
}

export { state as cursorUiState, showCursorTextBox, hideCursorTextBox, toggleCursorTextBox}