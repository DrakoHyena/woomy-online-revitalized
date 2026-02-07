import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import "./upgrades.js"
import { closeSettingsMenu, openSettingsMenu, toggleSettingsMenu } from "./settings.js";
import { closeUpgradeMenu, openUpgradeMenu, toggleUpgradeMenu } from "./upgrades.js";
import { clickableActive } from "./clickable.js";
import { lerp } from "../../lerp.js";
import { currentSettings } from "../../settings.js";
import { socket } from "../../socket.js";
import { clientPackets } from "../../../../shared/packetIds.js";

const TOPLEFTBUTTONS_CONFIG = {
	MAX_FPS: 75,
	MARGIN_MULT: 0.01,
	SIZE_MULT: .045,
	CLICK_DEBOUNCE: 300,
	IMAGE_PADDING: .125
}

const buttons = [
	newButton(()=>{
		closeUpgradeMenu();
		toggleSettingsMenu();
	}, "rgb(133, 133, 133)", "#696969ff", "settingsIconBitmap"),
	newButton(()=>{
		closeSettingsMenu();
		toggleUpgradeMenu();
	}, "#a6d469", "#7fad3a", "upgradesIconBitmap"),
	newButton(()=>{
		socket.send(clientPackets.switchToBasic)
	}, "#13b6df", "#2d8fbd", "basicSwitchIconBitmap"),
]
function newButton(clickFunct, color, strokeColor, iconKey){
	return {
		clickFunct: clickFunct,
		color: color,
		strokeColor: strokeColor,
		iconKey: iconKey,
		hoverMult: 1,
		lastClick: Date.now()
	}
}

const state = {
	width: 0,
	settingsIconBitmap: null,
	upgradesIconBitmap: null,
}

// Preload and convert icons to bitmaps
const iconsToPreload = {
	settingsIconBitmap: "/resources/icons/settings-icon.png",
	upgradesIconBitmap: "/resources/icons/upgrades-icon.png",
	basicSwitchIconBitmap: "/resources/icons/basicSwitch-icon.png",
};
for(let [key, url] of Object.entries(iconsToPreload)){
	try {
		const img = new Image();
		img.src = url;
		await new Promise(resolve => img.onload = resolve);
		state[key] = await createImageBitmap(img);
	} catch(e) {
		console.error("Failed to load icon:", e);
	}
}

const topLeftButtons = new Scene(document.getElementById("topLeftButtonsCanvas"));
drawLoop.scenes.set("topLeftButtons", topLeftButtons);

topLeftButtons.drawFuncts.set("clear", ({ canvas, ctx }) => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function draw({canvas, ctx, delta}){
	const margin = Math.round(canvas.height * TOPLEFTBUTTONS_CONFIG.MARGIN_MULT);
	let x = margin;
	let y = margin;
	ctx.lineWidth = Math.max(1, margin / 2);
	state.width = 0;
	for(let button of buttons){
		const size = canvas.height * TOPLEFTBUTTONS_CONFIG.SIZE_MULT * button.hoverMult
		if(x + size > state.width) state.width = x + size;
		ctx.fillStyle = button.color;
		ctx.strokeStyle = button.strokeColor;
		ctx.beginPath();
		ctx.rect(x, y, size, size);
		ctx.fill();
		ctx.stroke();
		
		// Draw bitmap if it exists
		if(button.iconKey && state[button.iconKey]){
			ctx.drawImage(state[button.iconKey], x+size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING, y+size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING, size-(size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING*2), size-(size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING*2));
		}
		
		const btnClick = clickableActive(topLeftButtons, x, y, x+size, y+size);
		if(btnClick){
			button.hoverMult = lerp(button.hoverMult, 1.25, currentSettings.menuAnimSpeed.value.number*delta)
			if(btnClick.left && Date.now()-button.lastClick > TOPLEFTBUTTONS_CONFIG.CLICK_DEBOUNCE){
				button.lastClick = Date.now();
				button.clickFunct();
				button.hoverMult += .085;
			}
		}else{
			button.hoverMult = lerp(button.hoverMult, 1, currentSettings.menuAnimSpeed.value.number*delta)
		}
		y += size + margin;
	}
}
topLeftButtons.drawFuncts.set("drawTLButtons", draw)

function openTLButtonMenu(){}

function closeTLButtonMenu(){}

export { state as topLeftButtonsState, TOPLEFTBUTTONS_CONFIG }