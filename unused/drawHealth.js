import { ctx, drawBar, drawText, measureText, _clearScreen } from "./canvas.js"
import { mockups } from "../client/js/mockups.js";
import {
	getColor,
	color,
	hslToColor
} from "../client/js/colors.js"
import { mixColors } from "../../shared/mix_colors.js";
import { util } from "../client/js/util.js";
import { global } from "../client/js/global.js";
import { currentSettings } from "../client/js/settings.js";

function drawHealth(x, y, instance, ratio, alpha) {
	let health = instance.render.health.get(),
		shield = instance.render.shield.get();
	let fade = instance.render.status.getFade(instance.size);
	ctx.globalAlpha = fade;
	let size = instance.render.size * ratio,
		m = mockups.get(instance.index),
		realSize = size / m.size * m.realSize;
	if (health * shield < .99) {
		let yy = y + 1.1 * realSize + 22;
		ctx.globalAlpha = (1 - (health * shield - 0.96) / 0.04) * (alpha*fade)*(health === 0?0:1);
		size *= 1.1;
		let mixc = currentSettings.coloredHealthBars.value.enabled ? mixColors(getColor(instance.color), color.guiwhite, .5) : currentSettings.tintedHealth.value.enabled ? mixColors(color.lgreen, color.red, 1 - health) : color.lgreen;
		if (currentSettings.shieldbars.value.enabled) {
			drawBar(x - size, x + size, yy, 6 + currentSettings.barWidth.value.number, color.black);
			if (shield) {
				if (health > 0.01) drawBar(x - size, x - size + 2 * size * health, yy + 1.5, 3, mixc);
				ctx.globalAlpha *= 0.7;
				if (shield > 0.01) drawBar(x - size, x - size + 2 * size * shield, yy - 1.5, 3, currentSettings.coloredHealthBars.value.enabled ? mixColors(getColor(instance.color), color.dgrey, .8) : color.dgrey);
			} else {
				if (health > 0.01) drawBar(x - size, x - size + 2 * size * health, yy, 4, mixc);
			}
		} else {
			drawBar(x - size, x + size, yy, 3 + currentSettings.barWidth.value.number, color.black);
			if (health > 0.01) drawBar(x - size, x - size + 2 * size * health, yy, 3, mixc);
			if (shield) {
				ctx.globalAlpha *= 0.7;
				if (shield > 0.01) drawBar(x - size, x - size + 2 * size * shield, yy, 3, currentSettings.coloredHealthBars.value.enabled ? mixColors(getColor(instance.color), color.dgrey, .8) : color.dgrey);
				ctx.globalAlpha = 1;
			}
		}
	}

	

	if (instance.nameplate) {
		let fill = instance.nameColor;
		let nameRatio = ((ratio * instance.size) / 20)*fade;
		let imageRatio = 1;
		let stroke = undefined;
		let font = undefined;
		ctx.globalAlpha = alpha * fade;
		drawText(instance.score > 0 ? util._handleLargeNumber(instance.score) : "", x, y - realSize - 16 * nameRatio, 8 * nameRatio, "#E4EBE7", "center", false, 1, stroke, ctx, font);
		switch (fill.charAt(0)) {
			case "!":
				let data = util._getSpecialNameInfoById(Number(instance.nameColor.substring(1)));
				fill = data[0];
				stroke = data[1];
				font = data[2];
				imageRatio = data[3];
				break;
		}

		drawText(instance.name, x, y - realSize - 30 * nameRatio, 16 * nameRatio, fill, "center", false, 1, stroke, ctx, font);
		ctx.globalAlpha = 1;
	}

	// draw chat messages
	let messages = global.chatMessages.get(instance.id)
	const msgFadeTime = currentSettings.inGameChatMessageDuration.value.number*1000*.025
	if (messages) {
		let nameRatio = ((ratio * instance.size) / 20)*fade;
		let nameplateOffset = y - 6 - (instance.nameplate&&instance.name!==""?30 * nameRatio:0)
		let stroke = undefined;
		let font = undefined;
		ctx.globalAlpha = alpha;
		let offset = 1;
		let padding = 5
		let size = 20
		let height = size * nameRatio;
		let vspacing = padding + 3
		for (let i = 0; i < 3; i++ ) {
			if(i === messages.length) return;
			const msg = messages[messages.length-i-1]
			offset++
			const color = getColor(instance.color);
			const len = measureText(msg[0], (size * nameRatio) - padding);

			let msgFade = performance.now()-msg[1]
			if(msgFade < msgFadeTime){
				msgFade /= msgFadeTime
			}else if((currentSettings.inGameChatMessageDuration.value.number*1000)-msgFade < msgFadeTime ){
				msgFade = ((currentSettings.inGameChatMessageDuration.value.number*1000)-msgFade)/msgFadeTime
			}else{
				msgFade = 1
			}
			ctx.globalAlpha = 0.5*msgFade;
			let fill = color === "rainbow"
				? hslToColor((Date.now() % 2520) / 7, 100, 50)
				: color;
			let barY = ((-height - vspacing) * offset + nameplateOffset + vspacing)
			drawBar(x - len / 2, x + len / 2, barY, height, fill);
			ctx.globalAlpha = .15*msgFade
			drawBar(x - len / 2, x + len / 2, barY, height, "#000000");
			ctx.globalAlpha = 1*msgFade


			ctx.fillStyle = "#000000";
			drawText(msg[0], x, barY + ((height - padding) * 0.35), (size * nameRatio) - padding, "#E4EBE7", "center", false, 1, stroke, ctx, font);

			ctx.globalAlpha = 1;
		}
	}
}

export { drawHealth }