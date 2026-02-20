import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { lerp } from "../../lerp.js";
import { currentSettings } from "../../settings.js";
import { statMenuState } from "./stats.js";
import { playerState } from "../../state/player.js";
import { renderText } from "../text.js";
import { drawBar } from "../bar.js";

// --- Config ---

let state = {
	active : true,
	fade: 1,
	margin: 10,
	padding: 5,
	width: 1,
	height: 1
}

const nameplate = new Scene(10);
drawLoop.addScene("nameplate", nameplate);

function drawNameplate({ canvas, ctx, delta }) {
	const ANIM_SPEED = currentSettings.menuAnimSpeed.value.number * delta
	const BASE_ALPHA = currentSettings.nameplateOpacity.value.number;
	if(BASE_ALPHA === 0) return;

	let height = state.height;
	let width = state.width;
	let x = state.margin - width * (1 - state.fade);
	let y = canvas.height - height - state.margin - ((statMenuState.height+state.margin) * statMenuState.fade);

	ctx.globalAlpha = BASE_ALPHA * state.fade;
	ctx.fillStyle = "#777777";
	ctx.fillRect(x, y, width, height);
	x += state.padding;
	y += state.padding;
	width -= state.padding * 2;
	height -= state.padding * 2;
	ctx.fillStyle = "#666666";
	ctx.fillRect(x, y, width, height);
	x += state.padding;
	y += state.padding;

	let contentWidth = 0;
	let contentHeight = 0;
	const baseTextSize = canvas.height / 65;

	let text = renderText(playerState.entity.name, baseTextSize, { fillStyle: playerState.entity.nameColor || "#FFFFFF"});
	ctx.drawImage(text, x, y)
	y += text.height;
	contentWidth = text.width;
	contentHeight += text.height;

	text = renderText(`Level ${playerState.level} ${playerState.entity.label}`, baseTextSize);
	ctx.drawImage(text, x, y)
	if(text.width > contentWidth) contentWidth = text.width;
	y += text.height;
	contentHeight += text.height;

	drawBar(ctx, x, y, contentWidth, baseTextSize/6, 1, "lightgreen", "black", playerState.levelProgress, currentSettings.squareNameplateBars.value.enabled?"square":"round")
	y += baseTextSize/6 + state.padding;
	contentHeight += baseTextSize/6 + state.padding;
	drawBar(ctx, x, y, contentWidth, baseTextSize, state.padding * .75, "lightgreen", "black", playerState.entity.health/playerState.entity.maxHealth, currentSettings.squareNameplateBars.value.enabled?"square":"round")
	ctx.globalAlpha *= .8;
	drawBar(ctx, x, y, contentWidth, baseTextSize, 0, "white", "black", playerState.entity.shield/playerState.entity.maxShield, currentSettings.squareNameplateBars.value.enabled?"square":"round")
	y += baseTextSize;
	contentHeight += baseTextSize;

	state.width = lerp(state.width, contentWidth + state.padding*4, ANIM_SPEED);
	state.height = lerp(state.height, contentHeight + state.padding*4, ANIM_SPEED);
}

nameplate.drawFuncts.set("drawNameplate", drawNameplate);

nameplate.drawFuncts.set("fade", ({canvas, ctx, delta})=>{
	const ANIM_SPEED = currentSettings.menuAnimSpeed.value.number * delta
	if(currentSettings.linkNameplateToStats.value.enabled){
		state.fade = statMenuState.fade;
		state.active = statMenuState.active;
	}

	if (state.active) {
		state.fade = lerp(state.fade, 1, ANIM_SPEED);
		nameplate.drawFuncts.set("drawNameplate", drawNameplate)
	} else {
		state.fade = lerp(state.fade, 0, ANIM_SPEED);
		if (state.fade < 0.01) {
			state.fade = 0;
			nameplate.drawFuncts.delete("drawNameplate");
		}
	}
})

function openNameplate(){
	state.active = true;
	nameplate.drawFuncts.set("drawNameplate", drawNameplate)
}

function closeNameplate(){
	state.active = false;
}

function toggleNameplate(){
	if(state.active){
		closeNameplate();
	}else{
		openNameplate();
	}
}

export { toggleNameplate }