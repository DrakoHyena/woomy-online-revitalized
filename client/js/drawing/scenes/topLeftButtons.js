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
import { toggleChatMenu } from "./chat.js";
import { toggleLeaderboard } from "./leaderboard.js";
import { toggleStatsMenu } from "./stats.js";
import { openMinimap, closeMinimap, toggleMinimap } from "./minimap.js";

const TOPLEFTBUTTONS_CONFIG = {
	MARGIN_MULT: 0.01,
	SIZE_MULT: .04,
	CLICK_DEBOUNCE: 300,
	IMAGE_PADDING: .125,
	IDLE_FADE_DELAY: 3000,
	IDLE_MIN_ALPHA: 0
}

function newButton(clickFunct, color, strokeColor, iconKey){
	return {
		clickFunct: clickFunct,
		color: color,
		strokeColor: strokeColor,
		iconKey: iconKey,
		hoverMult: 1,
		lastClick: Date.now(),
		x: 0,
		y: 0,
		targetX: 0,
		targetY: 0,
		alpha: 1,
		lastHoverTime: Date.now()
	}
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
		toggleStatsMenu()
	}, "#0066aa", "#004e81", "skillstoggleIconBitmap"),
	newButton(()=>{
		toggleChatMenu();
	}, "#bd9869", "#b17d4d", "chattoggleIconBitmap"),
	newButton(()=>{
		toggleLeaderboard();
	}, "#3ed8b7", "#3ba38d", "leaderboardtoggleIconBitmap"),
	newButton(()=>{
		socket.send(clientPackets.switchToBasic)
	}, "#13b6df", "#2d8fbd", "basicSwitchIconBitmap"),
	newButton(()=>{
		state.menuOpen = !state.menuOpen;
		if(!state.menuOpen){
			closeSettingsMenu();
			closeUpgradeMenu();
		}
	}, "#cc5555", "#a14848", "menutoggleIconBitmap"),
]

const state = {
	width: 0,
	settingsIconBitmap: null,
	upgradesIconBitmap: null,
	menuOpen: true,
}

// Preload and convert icons to bitmaps
const iconsToPreload = {
	settingsIconBitmap: "/resources/icons/settings-icon.png",
	upgradesIconBitmap: "/resources/icons/upgrades-icon.png",
	skillstoggleIconBitmap: "/resources/icons/skillstoggle-icon.png",
	basicSwitchIconBitmap: "/resources/icons/basicSwitch-icon.png",
	menutoggleIconBitmap: "/resources/icons/menutoggle-icon.png",
	chattoggleIconBitmap: "/resources/icons/chattoggle-icon.png",
	leaderboardtoggleIconBitmap: "/resources/icons/leaderboardtoggle-icon.png",
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

const topLeftButtons = new Scene(80);
drawLoop.addScene("topLeftButtons", topLeftButtons);

function draw({canvas, ctx, delta}){
	const margin = Math.round(canvas.height * TOPLEFTBUTTONS_CONFIG.MARGIN_MULT);
	const baseSize = canvas.height * TOPLEFTBUTTONS_CONFIG.SIZE_MULT;
	const lerpSpeed = currentSettings.menuAnimSpeed.value.number * delta;
	ctx.lineWidth = Math.max(1, margin / 2);
	state.width = 0;

	const closeButtonIndex = buttons.length - 1;

	// Calculate target positions for each button
	let targetY = margin;
	for(let i = 0; i < buttons.length; i++){
		const button = buttons[i];
		const size = baseSize * button.hoverMult;
		const isCloseButton = i === closeButtonIndex;

		if(isCloseButton){
			// Close button always targets the margin position (top)
			button.targetX = margin;
			button.targetY = margin;
		} else if(state.menuOpen){
			// Regular buttons stack from top when open
			button.targetX = margin;
			button.targetY = targetY;
		} else {
			// Regular buttons go off-screen upward when closed
			button.targetX = margin;
			button.targetY = -(baseSize + margin) * (buttons.length - i);
		}

		if(!isCloseButton){
			targetY += size + margin;
		}
	}

	// The close button goes after all regular buttons when open
	if(state.menuOpen){
		buttons[closeButtonIndex].targetX = margin;
		buttons[closeButtonIndex].targetY = targetY;
	}

	// Lerp and draw each button
	for(let i = 0; i < buttons.length; i++){
		const button = buttons[i];
		const isCloseButton = i === closeButtonIndex;

		// Lerp positions
		button.x = lerp(button.x, button.targetX, lerpSpeed);
		button.y = lerp(button.y, button.targetY, lerpSpeed);

		const size = baseSize * button.hoverMult;
		if(button.x + size > state.width) state.width = button.x + size;

		// Fade logic for close button when menu is closed
		if(isCloseButton && !state.menuOpen){
			const isHovered = !!clickableActive(button.x, button.y, button.x + size, button.y + size);
			if(isHovered){
				button.lastHoverTime = Date.now();
				button.alpha = lerp(button.alpha, 1, lerpSpeed);
			} else {
				const timeSinceHover = Date.now() - button.lastHoverTime;
				if(timeSinceHover > TOPLEFTBUTTONS_CONFIG.IDLE_FADE_DELAY){
					button.alpha = lerp(button.alpha, TOPLEFTBUTTONS_CONFIG.IDLE_MIN_ALPHA, lerpSpeed);
				}
			}
		} else {
			button.alpha = lerp(button.alpha, 1, lerpSpeed);
			button.lastHoverTime = Date.now();
		}

		// Skip drawing if fully off-screen
		if(button.y + size < 0) {
			button.hoverMult = lerp(button.hoverMult, 1, lerpSpeed);
			continue;
		}

		// Draw button
		ctx.globalAlpha = button.alpha;
		ctx.fillStyle = button.color;
		ctx.strokeStyle = button.strokeColor;
		ctx.beginPath();
		ctx.rect(button.x, button.y, size, size);
		ctx.fill();
		ctx.stroke();

		// Draw bitmap if it exists
		if(button.iconKey && state[button.iconKey]){
			ctx.drawImage(state[button.iconKey], button.x+size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING, button.y+size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING, size-(size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING*2), size-(size*TOPLEFTBUTTONS_CONFIG.IMAGE_PADDING*2));
		}
		ctx.globalAlpha = 1;

		// Interaction: only allow clicks on regular buttons when menu is mostly open
		const canClick = isCloseButton || (state.menuOpen && (Math.abs(button.targetY-button.y) < 10));
		if(canClick){
			const btnClick = clickableActive(button.x, button.y, button.x + size, button.y + size);
			if(btnClick){
				button.hoverMult = lerp(button.hoverMult, 1.25, lerpSpeed);
				if(btnClick.left && Date.now() - button.lastClick > TOPLEFTBUTTONS_CONFIG.CLICK_DEBOUNCE){
					button.lastClick = Date.now();
					button.clickFunct();
					button.hoverMult += .085;
				}
			} else {
				button.hoverMult = lerp(button.hoverMult, 1, lerpSpeed);
			}
		} else {
			button.hoverMult = lerp(button.hoverMult, 1, lerpSpeed);
		}
	}
}
topLeftButtons.drawFuncts.set("drawTLButtons", draw)

export { state as topLeftButtonsState, TOPLEFTBUTTONS_CONFIG }