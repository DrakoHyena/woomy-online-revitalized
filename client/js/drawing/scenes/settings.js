import { lerp } from "../../lerp.js";
import { currentSettings } from "../../settings.js";
import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { renderText } from "../text.js";
import { renderInput } from "./inputElements.js";
import { topLeftButtonsState } from "./topLeftButtons.js";
import { mouse } from "../../controls/mouse.js";
import { clickableActive } from "./clickable.js";
import { showTextBox, hideTextBox } from "./cursorUi.js";

const SETTINGS_CONFIG = {
	MARGIN: 10,
	PADDING: 10,
	BACKGROUND: "#c2c9c1",
	BORDER: "#959c94ff",
	TITLE_TEXT_SIZE: 35,
	HEADER_TEXT_SIZE: 25,
	SETTING_TEXT_SIZE: 20
}

const state = {
	open: false,
	showEntityEditor: false,
	fade: 0
}

const settings = new Scene(document.getElementById("settingsCanvas"));
drawLoop.scenes.set("settings", settings);

settings.utilityFuncts.set("fade", ({ canvas, ctx, delta }) => {
	if(state.open === true){
		state.fade = lerp(state.fade, 1, 0.2*delta);
	}else{
		state.fade = lerp(state.fade, 0, .2);
		if(state.fade <= 0.001){
			state.fade = 0;
			settings.active = false;
			ctx.clearRect(0, 0, canvas.width, canvas.height)
		}
	}
});

settings.drawFuncts.set("clear", ({canvas, ctx}) => {
	ctx.clearRect(0, 0, canvas.width, canvas.height)
})

let yOffset = 0;
let lastMouseY = 0;
let lowestY = 0;
settings.drawFuncts.set("settingsMenu", ({ canvas, ctx, delta }) => {
	const borderWidth = 5;
	const width = 500;
	const height = 800;
	let x = topLeftButtonsState.width+SETTINGS_CONFIG.MARGIN + (-width*.5) * (1-state.fade)
	let y = SETTINGS_CONFIG.MARGIN
	let text = undefined;

	const lineMargin = 10;
	ctx.lineCap = "round";
	function renderLine(x1, y1, x2, y2){
		const oldAlpha = ctx.globalAlpha;
		ctx.globalAlpha = .5*state.fade;
		ctx.strokeStyle = SETTINGS_CONFIG.BORDER;
		ctx.beginPath();
		ctx.moveTo(x1+lineMargin, y1);
		ctx.lineTo(x2-lineMargin, y2);
		ctx.stroke();
		ctx.globalAlpha = oldAlpha;
	}

	ctx.fillStyle = SETTINGS_CONFIG.BACKGROUND;
	ctx.strokeStyle = SETTINGS_CONFIG.BORDER;
	ctx.lineWidth = borderWidth;
	ctx.globalAlpha = .85*state.fade;
	ctx.beginPath();
	ctx.rect(x, y, width, height);
	ctx.stroke();
	ctx.fill();

	ctx.save();
	let path = new Path2D();
	path.rect(0, y, canvas.width, height);
	ctx.clip(path);

	let click = clickableActive(settings, x, y, x+width, y+height)
	if(click.left === true){
		yOffset -= lastMouseY - mouse.y;
	}
	yOffset -= mouse.scrollY;

	if(yOffset > 0) {
		yOffset = lerp(yOffset, 0, Math.min(1, (yOffset/height) * 1.5) * delta)
	}
	if(lowestY < height) {
		yOffset = lerp(yOffset, yOffset+(height-lowestY), Math.min(1, ((height-lowestY)/height) * 1.5) * delta)
	}
	lastMouseY = mouse.y;
	y += yOffset;

	ctx.globalAlpha = 1*state.fade;

	text = renderText("Gameplay", SETTINGS_CONFIG.TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x+width/2-text.width/2, y)
	y += text.height*.5;
	renderLine(x, y, x+width/2-text.width/2, y)
	renderLine(x+width/2+text.width/2, y, x+width, y)
	y += text.height*.5;

	text = renderText("Auto Upgrade", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("autoUpgrade", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.autoUpgrade.value.enabled, ()=>{
		currentSettings.autoUpgrade.value.enabled = !currentSettings.autoUpgrade.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Show FPS", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("showFps", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.showFps.value.enabled, ()=>{
		currentSettings.showFps.value.enabled = !currentSettings.showFps.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("FPS Cap", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("fpsCap", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.fpsCap.value.number, (newNumber)=>{
		currentSettings.fpsCap.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Client Side Aim", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("clientSideAim", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.clientSideAim.value.enabled, ()=>{
		currentSettings.clientSideAim.value.enabled = !currentSettings.clientSideAim.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Input Buffer Size", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("inputBufferSize", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.inputBufferSize.value.number, (newNumber)=>{
		currentSettings.inputBufferSize.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Shield Bars", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("shieldbars", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.shieldbars.value.enabled, ()=>{
		currentSettings.shieldbars.value.enabled = !currentSettings.shieldbars.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Lerp Size", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("lerpSize", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.lerpSize.value.enabled, ()=>{
		currentSettings.lerpSize.value.enabled = !currentSettings.lerpSize.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Death Animations", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("deathAnimations", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.deathAnimations.value.enabled, ()=>{
		currentSettings.deathAnimations.value.enabled = !currentSettings.deathAnimations.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	
	text = renderText("Performance", SETTINGS_CONFIG.TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x+width/2-text.width/2, y)
	y += text.height*.5;
	renderLine(x, y, x+width/2-text.width/2, y)
	renderLine(x+width/2+text.width/2, y, x+width, y)
	y += text.height*.5;

	text = renderText("Performance Mode", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("performanceMode", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.performanceMode.value.enabled, ()=>{
		currentSettings.performanceMode.value.enabled = !currentSettings.performanceMode.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Hide Mini Renders", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("hideMiniRenders", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.hideMiniRenders.value.enabled, ()=>{
		currentSettings.hideMiniRenders.value.enabled = !currentSettings.hideMiniRenders.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Resolution Scale", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("resolutionScale", "dropdown", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*6, y, text.height*6, text.height, currentSettings.resolutionScale.value.selected, (newValue)=>{
		currentSettings.resolutionScale.value.selected = newValue;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Animated Lasers", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("animatedLasers", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.animatedLasers.value.enabled, ()=>{
		currentSettings.animatedLasers.value.enabled = !currentSettings.animatedLasers.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING


	text = renderText("Misc.", SETTINGS_CONFIG.TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x+width/2-text.width/2, y)
	y += text.height*.5;
	renderLine(x, y, x+width/2-text.width/2, y)
	renderLine(x+width/2+text.width/2, y, x+width, y)
	y += text.height*.5;

	text = renderText("Screenshot Mode", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("screenshotMode", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.screenshotMode.value.enabled, ()=>{
		currentSettings.screenshotMode.value.enabled = !currentSettings.screenshotMode.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Disable Game Messages", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("disableGameMessages", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.disableGameMessages.value.enabled, ()=>{
		currentSettings.disableGameMessages.value.enabled = !currentSettings.disableGameMessages.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	// mainMenuStyle
	text = renderText("Dark Mode Menu", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("darkModeMenu", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.darkModeMenu.value.enabled, ()=>{
		currentSettings.darkModeMenu.value.enabled = !currentSettings.darkModeMenu.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Chat Message Duration", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("chatMessageDuration", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.chatMessageDuration.value.number, (newNumber)=>{
		currentSettings.chatMessageDuration.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING


	text = renderText("Visuals", SETTINGS_CONFIG.TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x+width/2-text.width/2, y)
	y += text.height*.5;
	renderLine(x, y, x+width/2-text.width/2, y)
	renderLine(x+width/2+text.width/2, y, x+width, y)
	y += text.height*.5;

	text = renderText("Style", SETTINGS_CONFIG.HEADER_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	y += text.height*.5;
	renderLine(x+text.width+lineMargin, y, x+width, y);
	y += text.height*.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Round Upgrades", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("roundUpgrades", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.roundUpgrades.value.enabled, ()=>{
		currentSettings.roundUpgrades.value.enabled = !currentSettings.roundUpgrades.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Pointy", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("pointy", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.pointy.value.enabled, ()=>{
		currentSettings.pointy.value.enabled = !currentSettings.pointy.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("UI Scale", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("uiScale", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.uiScale.value.number, (newNumber)=>{
		currentSettings.uiScale.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Font Stroke Ratio", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("fontStrokeRatio", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.fontStrokeRatio.value.number, (newNumber)=>{
		currentSettings.fontStrokeRatio.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Font Size Boost", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("fontSizeBoost", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.fontSizeBoost.value.number, (newNumber)=>{
		currentSettings.fontSizeBoost.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Vignette Strength", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("vignetteStrength", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.vignetteStrength.value.number, (newNumber)=>{
		currentSettings.vignetteStrength.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Bar Width", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("barWidth", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.barWidth.value.number, (newNumber)=>{
		currentSettings.barWidth.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Bar Style", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("barStyle", "dropdown", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.barStyle.value.selected, (newValue)=>{
		currentSettings.barStyle.value.selected = newValue;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Font Family", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("fontFamily", "dropdown", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*5, y, text.height*5, text.height, currentSettings.fontFamily.value.selected, (newValue)=>{
		currentSettings.fontFamily.value.selected = newValue;
	})
	y += text.height + SETTINGS_CONFIG.PADDING


	text = renderText("Colors", SETTINGS_CONFIG.HEADER_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	y += text.height*.5;
	renderLine(x+text.width+lineMargin, y, x+width, y);
	y += text.height*.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Theme", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("theme", "dropdown", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*5, y, text.height*5, text.height, currentSettings.theme.value.selected, (newValue)=>{
		currentSettings.theme.value.selected = newValue;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Shaders", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("shaders", "dropdown", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*5, y, text.height*5, text.height, currentSettings.shaders.value.selected, (newValue)=>{
		currentSettings.shaders.value.selected = newValue;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Filter", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("filter", "dropdown", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*4, y, text.height*4, text.height, currentSettings.filter.value.selected, (newValue)=>{
		currentSettings.filter.value.selected = newValue;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Neon Mode", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("neonMode", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.neonMode.value.enabled, ()=>{
		currentSettings.neonMode.value.enabled = !currentSettings.neonMode.value.enabled
	}, () => {
		showTextBox("Neon Mode", "For a Neon Experience")
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Glass Mode", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("glassMode", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.glassMode.value.enabled, ()=>{
		currentSettings.glassMode.value.enabled = !currentSettings.glassMode.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Tinted Damage", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("tintedDamage", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.tintedDamage.value.enabled, ()=>{
		currentSettings.tintedDamage.value.enabled = !currentSettings.tintedDamage.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Tinted Health", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("tintedHealth", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.tintedHealth.value.enabled, ()=>{
		currentSettings.tintedHealth.value.enabled = !currentSettings.tintedHealth.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Colored Health Bars", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("coloredHealthBars", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.coloredHealthBars.value.enabled, ()=>{
		currentSettings.coloredHealthBars.value.enabled = !currentSettings.coloredHealthBars.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING


	text = renderText("Borders", SETTINGS_CONFIG.HEADER_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	y += text.height*.5;
	renderLine(x+text.width+lineMargin, y, x+width, y);
	y += text.height*.5 + SETTINGS_CONFIG.PADDING;


	text = renderText("No Borders", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("noBorders", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.noBorders.value.enabled, ()=>{
		currentSettings.noBorders.value.enabled = !currentSettings.noBorders.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Dark Borders", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("darkBorders", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.darkBorders.value.enabled, ()=>{
		currentSettings.darkBorders.value.enabled = !currentSettings.darkBorders.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("RGB Borders", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("rgbBorders", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.rgbBorders.value.enabled, ()=>{
		currentSettings.rgbBorders.value.enabled = !currentSettings.rgbBorders.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Inverse Border Color", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("inverseBorderColor", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.inverseBorderColor.value.enabled, ()=>{
		currentSettings.inverseBorderColor.value.enabled = !currentSettings.inverseBorderColor.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Border Width", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("borderWidth", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.borderWidth.value.number, (newNumber)=>{
		currentSettings.borderWidth.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Advanced Settings", SETTINGS_CONFIG.TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x+width/2-text.width/2, y)
	y += text.height*.5;
	renderLine(x, y, x+width/2-text.width/2, y)
	renderLine(x+width/2+text.width/2, y, x+width, y)
	y += text.height*.5;

	if(state.showEntityEditor){
		text = renderText("Entity Editor", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
		ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
		renderInput("debugInputElements", "button", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, "Open", ()=>{
			window.open("/editor.html", "_blank", "width=600,height=400,top=0,left=0");
		})
		y += text.height + SETTINGS_CONFIG.PADDING
	}

	text = renderText("Debug Input Elements", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("debugInputElements", "checkbox", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height, y, text.height, text.height, currentSettings.debugInputElements.value.enabled, ()=>{
		currentSettings.debugInputElements.value.enabled = !currentSettings.debugInputElements.value.enabled
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	text = renderText("Input Elements Cache Interval", SETTINGS_CONFIG.SETTING_TEXT_SIZE)
	ctx.drawImage(text, x+SETTINGS_CONFIG.PADDING, y);
	renderInput("inputElementsCacheInterval", "number", settings, (x+width)-SETTINGS_CONFIG.PADDING-text.height*3, y, text.height*3, text.height, currentSettings.inputElementsCacheInterval.value.number, (newNumber)=>{
		currentSettings.inputElementsCacheInterval.value.number = newNumber;
	})
	y += text.height + SETTINGS_CONFIG.PADDING

	hideTextBox();
	lowestY = y;
	ctx.restore();
})

function openSettingsMenu() {
	state.open = true;
	settings.active = true;
}

function closeSettingsMenu() {
	state.open = false;
}

function toggleSettingsMenu(){
	if(state.open === false){
		openSettingsMenu();
	}else{
		closeSettingsMenu();
	}
}

export { openSettingsMenu, closeSettingsMenu, toggleSettingsMenu, state as settingsState }