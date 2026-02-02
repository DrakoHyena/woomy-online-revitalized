import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import "./upgrades.js"
import { closeSettingsMenu, openSettingsMenu, toggleSettingsMenu } from "./settings.js";
import { closeUpgradeMenu, openUpgradeMenu, toggleUpgradeMenu } from "./upgrades.js";
import { clickableActive } from "./clickable.js";
import { lerp } from "../../lerp.js";

const TOPLEFTBUTTONS_CONFIG = {
	MAX_FPS: 75,
	MARGIN: 10,
	SIZE_MULT: .045,
	HOVER_LERP: .2,
	CLICK_DEBOUNCE: 300
}

const buttons = [
	newButton(()=>{
		closeUpgradeMenu();
		toggleSettingsMenu();
	}, "#797979ff", "#696969ff"),
	newButton(()=>{
		closeSettingsMenu();
		toggleUpgradeMenu();
	}, "#a6d469", "#749f34"),

]
function newButton(clickFunct, color, strokeColor){
	return {
		clickFunct: clickFunct,
		color: color,
		strokeColor: strokeColor,
		hoverMult: 1,
		lastClick: Date.now()
	}
}

const state = {
	width: 0,
}

const topLeftButtons = new Scene(document.getElementById("topLeftButtonsCanvas"));
drawLoop.scenes.set("topLeftButtons", topLeftButtons);

topLeftButtons.drawFuncts.set("clear", ({ canvas, ctx }) => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function draw({canvas, ctx, delta}){
	let x = TOPLEFTBUTTONS_CONFIG.MARGIN;
	let y = TOPLEFTBUTTONS_CONFIG.MARGIN;
	ctx.lineWidth = TOPLEFTBUTTONS_CONFIG.MARGIN/2;
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
		const btnClick = clickableActive(topLeftButtons, x, y, x+size, y+size);
		if(btnClick){
			button.hoverMult = lerp(button.hoverMult, 1.25, TOPLEFTBUTTONS_CONFIG.HOVER_LERP*delta)
			if(btnClick.left && Date.now()-button.lastClick > TOPLEFTBUTTONS_CONFIG.CLICK_DEBOUNCE){
				button.lastClick = Date.now();
				button.clickFunct();
				button.hoverMult += .085;
			}
		}else{
			button.hoverMult = lerp(button.hoverMult, 1, TOPLEFTBUTTONS_CONFIG.HOVER_LERP*delta)
		}
		y += size + TOPLEFTBUTTONS_CONFIG.MARGIN;
	}
}
topLeftButtons.drawFuncts.set("drawTLButtons", draw)

function openTLButtonMenu(){}

function closeTLButtonMenu(){}

export { state as topLeftButtonsState, TOPLEFTBUTTONS_CONFIG }