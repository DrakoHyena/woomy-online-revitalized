import { lerp } from "../../lerp.js";
import { currentSettings } from "../../settings.js";
import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { renderText } from "../text.js";
import { renderInput } from "../inputElements.js";
import { topLeftButtonsState } from "./topLeftButtons.js";
import { mouse } from "../../controls/mouse.js";
import { clickableActive } from "./clickable.js";
import { showCursorTextBox, hideCursorTextBox } from "./cursorUi.js";

const SETTINGS_CONFIG = {
	MARGIN: 10,
	PADDING: 10,
	BACKGROUND: "#c2c9c1",
	BORDER: "#959c94ff"
};

const state = {
	open: false,
	fade: 0
};

const settings = new Scene(70);
drawLoop.addScene("settings", settings);

settings.utilityFuncts.set("fade", ({ canvas, ctx, delta }) => {
	if (state.open === true) {
		state.fade = lerp(
			state.fade,
			1,
			currentSettings.menuAnimSpeed.value.number * delta
		);
	} else {
		state.fade = lerp(
			state.fade,
			0,
			currentSettings.menuAnimSpeed.value.number * delta
		);
		if (state.fade <= 0.01) {
			state.fade = 0;
			settings.active = false;
		}
	}
});

let yOffset = 0;
let lastMouseY = 0;
let lowestY = 0;
settings.drawFuncts.set("settingsMenu", ({ canvas, ctx, delta }) => {
	const borderWidth = 5;
	const width = canvas.height / 2;
	const height = canvas.height / 1.66;
	const TITLE_TEXT_SIZE = height / 20;
	const HEADER_TEXT_SIZE = height / 25;
	const SETTING_TEXT_SIZE = height / 30;
	let x =
		topLeftButtonsState.width +
		SETTINGS_CONFIG.MARGIN +
		-width * 0.5 * (1 - state.fade);
	let y = SETTINGS_CONFIG.MARGIN;
	let text = undefined;

	const lineMargin = 10;
	ctx.lineCap = "round";
	function renderLine(x1, y1, x2, y2) {
		const oldAlpha = ctx.globalAlpha;
		ctx.globalAlpha = 0.5 * state.fade;
		ctx.strokeStyle = SETTINGS_CONFIG.BORDER;
		ctx.beginPath();
		ctx.moveTo(x1 + lineMargin, y1);
		ctx.lineTo(x2 - lineMargin, y2);
		ctx.stroke();
		ctx.globalAlpha = oldAlpha;
	}

	ctx.fillStyle = SETTINGS_CONFIG.BACKGROUND;
	ctx.strokeStyle = SETTINGS_CONFIG.BORDER;
	ctx.lineWidth = borderWidth;
	ctx.globalAlpha = 0.85 * state.fade;
	ctx.beginPath();
	ctx.rect(x, y, width, height);
	ctx.stroke();
	ctx.fill();

	ctx.save();
	let path = new Path2D();
	path.rect(0, y, canvas.width, height);
	ctx.clip(path);

	let click = clickableActive(x, y, x + width, y + height);
	if (click.left === true) {
		mouse.scrollY += (lastMouseY - mouse.y) * 0.4;
	}
	if (click) yOffset -= mouse.scrollY * 0.2;

	if (yOffset > 0) {
		yOffset = lerp(yOffset, 0, Math.min(1, (yOffset / height) * 4) * delta);
	}
	if (lowestY < height) {
		yOffset = lerp(
			yOffset,
			yOffset + (height - lowestY),
			Math.min(1, ((height - lowestY) / height) * 4) * delta
		);
	}
	lastMouseY = mouse.y;
	y += yOffset;

	ctx.globalAlpha = 1 * state.fade;

	text = renderText("Gameplay", TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x + width / 2 - text.width / 2, y);
	y += text.height * 0.5;
	renderLine(x, y, x + width / 2 - text.width / 2, y);
	renderLine(x + width / 2 + text.width / 2, y, x + width, y);
	y += text.height * 0.5;

	text = renderText("Entities", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Shield Bars", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"shieldbars",
		"checkbox",
		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.shieldbars.value.enabled,
		() => {
			currentSettings.shieldbars.value.enabled =
				!currentSettings.shieldbars.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Animated Lasers", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"animatedLasers",
		"checkbox",
		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.animatedLasers.value.enabled,
		() => {
			currentSettings.animatedLasers.value.enabled =
				!currentSettings.animatedLasers.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Entity Resolution", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"entityResolution",
		"number",
		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.entityResolution.value.number,
		(newValue) => {
			currentSettings.entityResolution.value.number = newValue;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Misc.", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("FPS Cap", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"fpsCap",
		"number",
		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.fpsCap.value.number,
		(newNumber) => {
			currentSettings.fpsCap.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"FPS Cap",
				"The target FPS to achieve. Note: your browser will likely limit your fps to your display's refresh rate."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Auto Upgrade", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"autoUpgrade",
		"checkbox",
		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.autoUpgrade.value.enabled,
		() => {
			currentSettings.autoUpgrade.value.enabled =
				!currentSettings.autoUpgrade.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Auto Upgrade",
				"Upon spawning or respawning, send a level up request"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Performance Mode", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"performanceMode",
		"checkbox",
		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.performanceMode.value.enabled,
		() => {
			currentSettings.performanceMode.value.enabled =
				!currentSettings.performanceMode.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Performance Mode",
				"An extreme performance toggle that will sacrifice as much as possible to increase performance. Note: This takes priority over other settings."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Controls", TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x + width / 2 - text.width / 2, y);
	y += text.height * 0.5;
	renderLine(x, y, x + width / 2 - text.width / 2, y);
	renderLine(x + width / 2 + text.width / 2, y, x + width, y);
	y += text.height * 0.5;

	text = renderText("Client Side Aim", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"clientSideAim",
		"checkbox",
		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.clientSideAim.value.enabled,
		() => {
			currentSettings.clientSideAim.value.enabled =
				!currentSettings.clientSideAim.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Client Side Aim",
				"When enabled, forces your tank to always face your mouse. When disabled, uses the server's facing value. Note: This is purely visual, in reality, you are always bound to the server facing value"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Input Buffer Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"inputBufferSize",
		"number",
		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.inputBufferSize.value.number,
		(newNumber) => {
			currentSettings.inputBufferSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Input Buffer Size",
				" Input buffering saves your inputs if they happen faster than they could be sent, ensuring all of them are processed. This setting determines how much space there is for input packets to be buffered at one time. Exceeding this value will clear the buffered inputs. Making this value too large will result in degraded network performance."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("GUI", TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x + width / 2 - text.width / 2, y);
	y += text.height * 0.5;
	renderLine(x, y, x + width / 2 - text.width / 2, y);
	renderLine(x + width / 2 + text.width / 2, y, x + width, y);
	y += text.height * 0.5;

	text = renderText("General", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Menu Animations Speed", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"menuAnimSpeed",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.menuAnimSpeed.value.number,
		(newNumber) => {
			currentSettings.menuAnimSpeed.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Menu Animations Speed",
				"How fast most menu animations should take to complete, 0 being infinte and 1 being instant."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// mainMenuStyle
	text = renderText("Dark Mode Menu", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"darkModeMenu",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.darkModeMenu.value.enabled,
		() => {
			currentSettings.darkModeMenu.value.enabled =
				!currentSettings.darkModeMenu.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Dark Mode Menu",
				"Switches most menus to a darker theme."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Screenshot Mode", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"screenshotMode",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.screenshotMode.value.enabled,
		() => {
			currentSettings.screenshotMode.value.enabled =
				!currentSettings.screenshotMode.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Screenshot Mode",
				"Hides most UI elements including health and names."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Chat", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Disable Game Messages", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"disableGameMessages",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.disableGameMessages.value.enabled,
		() => {
			currentSettings.disableGameMessages.value.enabled =
				!currentSettings.disableGameMessages.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Disable Game Messages",
				"Hides all messages from the game (i.e. kill messages, upgrading messages, etc.)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("In-Game Chat Duration", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"inGameChatMessageDuration",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.inGameChatMessageDuration.value.number,
		(newNumber) => {
			currentSettings.inGameChatMessageDuration.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"In-Game Chat Duration",
				"How long in milliseconds chat messages linger above entities after they're sent."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("In-Game Chat Limit", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"inGameChatMessageLimit",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.inGameChatMessageLimit.value.number,
		(newNumber) => {
			currentSettings.inGameChatMessageLimit.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"In-Game Chat Limit",
				"How many chat messages can be above an entity at one time."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("New Chat Duration", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"closedMessageShowDuration",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.closedMessageShowDuration.value.number,
		(newNumber) => {
			currentSettings.closedMessageShowDuration.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"New Chat Duration",
				"How long in milliseconds new chats will linger on the side with the chat menu closed."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Message History Limit", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"messageHistoryLimit",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.messageHistoryLimit.value.number,
		(newNumber) => {
			currentSettings.messageHistoryLimit.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Message History Limit",
				"How many messages will render in the chatbox. Note: Higher values can impact performance"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// chat menu scaling
	text = renderText("Chat Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"chatSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.chatSize.value.number,
		(newNumber) => {
			currentSettings.chatSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Chat Size",
				"Scale factor applied to chat menu width and height (0.1–5)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// chat border multiplier
	text = renderText("Chat Border Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"chatBorderSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.chatBorderSize.value.number,
		(newNumber) => {
			currentSettings.chatBorderSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Chat Border Size",
				"Multiplier for the chat UI border thickness (0.01–5)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// existing chat opacity setting
	text = renderText("Chat Opacity", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"chatAlpha",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.chatAlpha.value.number,
		(newNumber) => {
			currentSettings.chatAlpha.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Chat Opacity",
				"Controls overall opacity of the chat UI (0.0 - 2.0)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// Leaderboard settings
	text = renderText("Leaderboard", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Leaderboard Opacity", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"leaderboardAlpha",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.leaderboardAlpha.value.number,
		(newNumber) => {
			currentSettings.leaderboardAlpha.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Leaderboard Opacity",
				"Controls overall opacity of the leaderboard UI (0.0 - 1.0)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Leaderboard Background Opacity", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"leaderboardBackgroundAlpha",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.leaderboardBackgroundAlpha.value.number,
		(newNumber) => {
			currentSettings.leaderboardBackgroundAlpha.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Leaderboard Opacity",
				"Controls the opacity of the leaderboard UI background (0.0 - 1.0)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// new border size setting
	text = renderText("Leaderboard Border Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"leaderboardBorderSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.leaderboardBorderSize.value.number,
		(newNumber) => {
			currentSettings.leaderboardBorderSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Leaderboard Border Size",
				"Multiplier for border thickness (0.01–5)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// new overall size scale setting
	text = renderText("Leaderboard Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"leaderboardSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.leaderboardSize.value.number,
		(newNumber) => {
			currentSettings.leaderboardSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Leaderboard Size",
				"Overall scale multiplier for leaderboard dimensions"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Square Leaderboard Bars", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"squareLeaderboardBars",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.squareLeaderboardBars.value.enabled,
		() => {
			currentSettings.squareLeaderboardBars.value.enabled =
				!currentSettings.squareLeaderboardBars.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Square Leaderboard Bars",
				"Toggles the leaderboard bars to be squared instead of rounded."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Upgrade Menu", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Upgrade Menu Scale", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"upgradeMenuScale",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.upgradeMenuScale.value.number,
		(newNumber) => {
			currentSettings.upgradeMenuScale.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Upgrade Menu Scale",
				"A multiplier for the upgrade menu size."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// minimap GUI settings subsection
	text = renderText("Minimap", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	// minimap size
	text = renderText("Minimap Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"minimapSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.minimapSize.value.number,
		(newValue) => {
			currentSettings.minimapSize.value.number = newValue;
		},
		() => {
			showCursorTextBox(
				"Minimap Size",
				"Determines the height of the minimap as a fraction of screen height (0.05 - 0.5)."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// minimap opacity
	text = renderText("Minimap Opacity", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"minimapOpacity",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.minimapOpacity.value.number,
		(newValue) => {
			currentSettings.minimapOpacity.value.number = newValue;
		},
		() => {
			showCursorTextBox(
				"Minimap Opacity",
				"Adjusts the transparency of the minimap (0.0 - 1.0)."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// true size toggle
	text = renderText("True Size on Minimap", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"minimapScaleEntities",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.minimapScaleEntities.value.enabled,
		() => {
			currentSettings.minimapScaleEntities.value.enabled =
				!currentSettings.minimapScaleEntities.value.enabled;
		},
		() => {
			showCursorTextBox(
				"True Size on Minimap",
				"When enabled, entities on the minimap will be drawn scaled according to their in-game size."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Minimap Scale Factor", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"minimapScaleFactor",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.minimapScaleFactor.value.number,
		(newValue) => {
			currentSettings.minimapScaleFactor.value.number = newValue;
		},
		() => {
			showCursorTextBox(
				"Minimap Scale Factor",
				"Applies an additional multiplier to entity sizes on the minimap (0.001‑5)."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// render type dropdown
	text = renderText("Render Type", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"minimapRenderType",
		"dropdown",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 5,
		y,
		text.height * 5,
		text.height,
		currentSettings.minimapRenderType.value.selected,
		(newValue) => {
			currentSettings.minimapRenderType.value.selected = newValue;
		},
		() => {
			showCursorTextBox(
				"Render Type",
				"Choose how entities are drawn on the minimap."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// Stats settings
	text = renderText("Stats", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Stats Opacity", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"statsAlpha",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.statsAlpha.value.number,
		(newNumber) => {
			currentSettings.statsAlpha.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Stats Opacity",
				"Controls overall opacity of the stats UI (0.0 - 1.0)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Stats Background Opacity", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"statsBackgroundAlpha",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.statsBackgroundAlpha.value.number,
		(newNumber) => {
			currentSettings.statsBackgroundAlpha.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Stats Background Opacity",
				"Controls the opacity of the stats UI background (0.0 - 1.0)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// new border size control
	text = renderText("Stats Border Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"statsBorderSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.statsBorderSize.value.number,
		(newNumber) => {
			currentSettings.statsBorderSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Stats Border Size",
				"Multiplier for border thickness (0.01–5)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// new overall size control
	text = renderText("Stats Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"statsSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.statsSize.value.number,
		(newNumber) => {
			currentSettings.statsSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Stats Size",
				"Overall scale multiplier for stats UI dimensions"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Square Stats Bars", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"squareStatsBars",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.squareStatsBars.value.enabled,
		() => {
			currentSettings.squareStatsBars.value.enabled =
				!currentSettings.squareStatsBars.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Square Stats Bars",
				"Toggles the stats segments to be squared instead of rounded."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Nameplate", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Link To Stats Menu", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"linkNameplateToStats",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.linkNameplateToStats.value.enabled,
		() => {
			currentSettings.linkNameplateToStats.value.enabled =
				!currentSettings.linkNameplateToStats.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Link To Stats Menu",
				"Toggles it so that the nameplate is only active when the stats menu is active."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Square Nameplate Bars", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"squareNameplateBars",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.squareNameplateBars.value.enabled,
		() => {
			currentSettings.squareNameplateBars.value.enabled =
				!currentSettings.squareNameplateBars.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Square Nameplate Bars",
				"Toggles the health, shield, and score bars to be squared instead of rounded."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// new border size control
	text = renderText("Nameplate Border Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"nameplateBorderSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.nameplateBorderSize.value.number,
		(newNumber) => {
			currentSettings.nameplateBorderSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Nameplate Border Size",
				"Multiplier for border thickness (0.01–5)"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	// new overall size control
	text = renderText("Nameplate Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"nameplateSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.nameplateSize.value.number,
		(newNumber) => {
			currentSettings.nameplateSize.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Nameplate Size",
				"Overall scale multiplier for nameplate UI dimensions"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Nameplate Opacity", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"nameplateOpacity",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.nameplateOpacity.value.number,
		(newNumber) => {
			currentSettings.nameplateOpacity.value.number = newNumber;
		},
		() => {
			showCursorTextBox(
				"Nameplate Opacity",
				"Controls the opacity of the nameplate"
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Visuals", TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x + width / 2 - text.width / 2, y);
	y += text.height * 0.5;
	renderLine(x, y, x + width / 2 - text.width / 2, y);
	renderLine(x + width / 2 + text.width / 2, y, x + width, y);
	y += text.height * 0.5;

	text = renderText("Image Smoothing", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"imageSmoothing",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.imageSmoothing.value.enabled,
		() => {
			currentSettings.imageSmoothing.value.enabled =
				!currentSettings.imageSmoothing.value.enabled;
		},
		() => {
			showCursorTextBox(
				"Image Smoothing",
				"Toggles image smoothing. Note: This might affect performance on some devices and could lead to blurriness or other visual artifacts. Takes effect when restarting/resizing."
			);
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Style", HEADER_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Round Upgrades", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"roundUpgrades",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.roundUpgrades.value.enabled,
		() => {
			currentSettings.roundUpgrades.value.enabled =
				!currentSettings.roundUpgrades.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Pointy", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"pointy",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.pointy.value.enabled,
		() => {
			currentSettings.pointy.value.enabled =
				!currentSettings.pointy.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("UI Scale", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"uiScale",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.uiScale.value.number,
		(newNumber) => {
			currentSettings.uiScale.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Font Stroke Ratio", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"fontStrokeRatio",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.fontStrokeRatio.value.number,
		(newNumber) => {
			currentSettings.fontStrokeRatio.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Font Size Boost", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"fontSizeBoost",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.fontSizeBoost.value.number,
		(newNumber) => {
			currentSettings.fontSizeBoost.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Vignette Strength", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"vignetteStrength",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.vignetteStrength.value.number,
		(newNumber) => {
			currentSettings.vignetteStrength.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Bar Width", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"barWidth",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.barWidth.value.number,
		(newNumber) => {
			currentSettings.barWidth.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Bar Style", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"barStyle",
		"dropdown",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.barStyle.value.selected,
		(newValue) => {
			currentSettings.barStyle.value.selected = newValue;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Font Family", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"fontFamily",
		"dropdown",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 5,
		y,
		text.height * 5,
		text.height,
		currentSettings.fontFamily.value.selected,
		(newValue) => {
			currentSettings.fontFamily.value.selected = newValue;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Colors", TITLE_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("Theme", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"theme",
		"dropdown",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 5,
		y,
		text.height * 5,
		text.height,
		currentSettings.theme.value.selected,
		(newValue) => {
			currentSettings.theme.value.selected = newValue;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Shaders", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"shaders",
		"dropdown",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 5,
		y,
		text.height * 5,
		text.height,
		currentSettings.shaders.value.selected,
		(newValue) => {
			currentSettings.shaders.value.selected = newValue;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Filter", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"filter",
		"dropdown",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 4,
		y,
		text.height * 4,
		text.height,
		currentSettings.filter.value.selected,
		(newValue) => {
			currentSettings.filter.value.selected = newValue;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Neon Mode", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"neonMode",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.neonMode.value.enabled,
		() => {
			currentSettings.neonMode.value.enabled =
				!currentSettings.neonMode.value.enabled;
		},
		() => {
			showCursorTextBox("Neon Mode", "For a Neon Experience");
		},
		hideCursorTextBox
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Glass Mode", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"glassMode",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.glassMode.value.enabled,
		() => {
			currentSettings.glassMode.value.enabled =
				!currentSettings.glassMode.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Tinted Damage", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"tintedDamage",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.tintedDamage.value.enabled,
		() => {
			currentSettings.tintedDamage.value.enabled =
				!currentSettings.tintedDamage.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Tinted Health", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"tintedHealth",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.tintedHealth.value.enabled,
		() => {
			currentSettings.tintedHealth.value.enabled =
				!currentSettings.tintedHealth.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Colored Health Bars", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"coloredHealthBars",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.coloredHealthBars.value.enabled,
		() => {
			currentSettings.coloredHealthBars.value.enabled =
				!currentSettings.coloredHealthBars.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Borders", TITLE_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	y += text.height * 0.5;
	renderLine(x + text.width + lineMargin, y, x + width, y);
	y += text.height * 0.5 + SETTINGS_CONFIG.PADDING;

	text = renderText("No Borders", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"noBorders",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.noBorders.value.enabled,
		() => {
			currentSettings.noBorders.value.enabled =
				!currentSettings.noBorders.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Dark Borders", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"darkBorders",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.darkBorders.value.enabled,
		() => {
			currentSettings.darkBorders.value.enabled =
				!currentSettings.darkBorders.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("RGB Borders", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"rgbBorders",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.rgbBorders.value.enabled,
		() => {
			currentSettings.rgbBorders.value.enabled =
				!currentSettings.rgbBorders.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Inverse Border Color", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"inverseBorderColor",
		"checkbox",

		x + width - SETTINGS_CONFIG.PADDING - text.height,
		y,
		text.height,
		text.height,
		currentSettings.inverseBorderColor.value.enabled,
		() => {
			currentSettings.inverseBorderColor.value.enabled =
				!currentSettings.inverseBorderColor.value.enabled;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Border Width", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"borderWidth",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.borderWidth.value.number,
		(newNumber) => {
			currentSettings.borderWidth.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Advanced Settings", TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x + width / 2 - text.width / 2, y);
	y += text.height * 0.5;
	renderLine(x, y, x + width / 2 - text.width / 2, y);
	renderLine(x + width / 2 + text.width / 2, y, x + width, y);
	y += text.height * 0.5;

	text = renderText("Input Elements Cache Interval", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"inputElementsCacheInterval",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.inputElementsCacheInterval.value.number,
		(newNumber) => {
			currentSettings.inputElementsCacheInterval.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Text Render Cache Size", SETTING_TEXT_SIZE);
	ctx.drawImage(text, x + SETTINGS_CONFIG.PADDING, y);
	renderInput(
		"textRenderCacheSize",
		"number",

		x + width - SETTINGS_CONFIG.PADDING - text.height * 3,
		y,
		text.height * 3,
		text.height,
		currentSettings.textRenderCacheSize.value.number,
		(newNumber) => {
			currentSettings.textRenderCacheSize.value.number = newNumber;
		}
	);
	y += text.height + SETTINGS_CONFIG.PADDING;

	text = renderText("Setting Profiles", TITLE_TEXT_SIZE);
	y += SETTINGS_CONFIG.PADDING;
	ctx.drawImage(text, x + width / 2 - text.width / 2, y);
	y += text.height * 0.5;
	renderLine(x, y, x + width / 2 - text.width / 2, y);
	renderLine(x + width / 2 + text.width / 2, y, x + width, y);
	y += text.height * 0.5;

	lowestY = y;
	ctx.restore();
});

function openSettingsMenu() {
	state.open = true;
	settings.active = true;
}

function closeSettingsMenu() {
	state.open = false;
}

function toggleSettingsMenu() {
	if (state.open === false) {
		openSettingsMenu();
	} else {
		closeSettingsMenu();
	}
}

export {
	openSettingsMenu,
	closeSettingsMenu,
	toggleSettingsMenu,
	state as settingsState
};
