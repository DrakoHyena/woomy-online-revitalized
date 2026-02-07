import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { clickableActive } from "./clickable.js";
import { lerp } from "../../lerp.js";
import { playerState } from "../../state/player.js";
import { mockups } from "../../mockups.js";
import { TOPLEFTBUTTONS_CONFIG, topLeftButtonsState } from "./topLeftButtons.js";
import { getEntityImage } from "../entity.js";
import { renderText } from "../text.js";
import { hideCursorTextBox, showCursorTextBox } from "./cursorUi.js";
import { currentSettings } from "../../settings.js";
import { clientPackets } from "../../../../shared/packetIds.js";
import { socket } from "../../socket.js";

const UPGRADES_CONFIG = {
	PANEL_MARGIN_MULT: 0.01,
}

const state = {
	fade: 1,
	active: true,
}

const CLICK_DEBOUNCE_MS = 200;
const PANEL_SIZE_MULT = 0.09;
let lastUpgradeClickAt = 0;
let panelSize = 0;
let panelMargin = 0;


// --- Tile Management ---

const upgradeTiles = new Map();

function calculateTargetPosition(index, canvasWidth, canvasHeight) {
	const topLeftMargin = Math.round(canvasHeight * TOPLEFTBUTTONS_CONFIG.MARGIN_MULT);
	const rootX = topLeftButtonsState.width + panelMargin;
	const rootY = topLeftMargin;
	const unit = panelSize + panelMargin;
	const maxPerRow = Math.floor((canvasWidth / 2 - rootX) / unit) || 1;
	
	return {
		x: rootX + (index % maxPerRow) * unit,
		y: rootY + Math.floor(index / maxPerRow) * unit
	};
}

function syncUpgradeTiles(canvasWidth, canvasHeight) {
	const currentUpgrades = playerState.gui.upgrades;
	const currentUpgradeSet = new Set(currentUpgrades);
	
	// Mark removed upgrades for exit animation
	for (const [upgradeId, tile] of upgradeTiles) {
		if (!currentUpgradeSet.has(upgradeId) && !tile.removing) {
			tile.removing = true;
		}
	}
	
	// Add new tiles / update existing positions
	currentUpgrades.forEach((upgradeId, index) => {
		const pos = calculateTargetPosition(index, canvasWidth, canvasHeight);
		
		if (upgradeTiles.has(upgradeId)) {
			const tile = upgradeTiles.get(upgradeId);
			if (!tile.removing) {
				tile.targetX = pos.x;
				tile.targetY = pos.y;
				tile.upgradeIndex = index;
			}
		} else {
			upgradeTiles.set(upgradeId, {
				upgradeId,
				upgradeIndex: index,
				targetX: pos.x,
				targetY: pos.y,
				x: -panelSize,
				y: pos.y,
				alpha: 0,
				removing: false,
				hoverScale: 1,
				isHovering: false,
				rotation: 0,
				dimFactor: 1
			});
		}
	});
}

function updateTile(tile, delta, fadeFactor) {
	const lerpAmount = currentSettings.menuAnimSpeed.value.number * delta;
	const size = panelSize;
	
	tile.rotation += 0.0075 * delta;
	tile.hoverScale = lerp(tile.hoverScale, tile.isHovering ? 1.25 : 1, lerpAmount);
	
	if (tile.removing) {
		tile.x = lerp(tile.x, -size * 2, lerpAmount);
		tile.alpha = lerp(tile.alpha, 0, lerpAmount);
		return tile.alpha < 0.01;
	}
	
	const offScreenX = -(size + panelMargin);
	tile.x = lerp(tile.x, lerp(offScreenX, tile.targetX, fadeFactor), lerpAmount);
	tile.y = lerp(tile.y, tile.targetY, lerpAmount);
	tile.alpha = lerp(tile.alpha, fadeFactor, lerpAmount);
	return false;
}

function drawTile(tile, ctx, upgradeIndex) {
	const size = panelSize;
	const canInteract = state.fade >= .99;
	
	// Check hover
	tile.isHovering = false;
	if (canInteract && !tile.removing) {
		const click = clickableActive(upgrades, tile.x, tile.y, tile.x + size, tile.y + size);
		if (click) {
			tile.isHovering = true;
			if (click.left) {
				const now = Date.now();
				if (now - lastUpgradeClickAt >= CLICK_DEBOUNCE_MS) {
					lastUpgradeClickAt = now;
					socket.send(clientPackets.upgradeRequest, upgradeIndex);
				}
			}
		}
	}
	
	// Background
	ctx.globalAlpha = 0.8 * tile.alpha * tile.dimFactor;
	ctx.fillStyle = "#5e5e5e";
	ctx.fillRect(tile.x, tile.y, size, size);
	ctx.globalAlpha = tile.alpha * tile.dimFactor;

	// Entity mockup
	const mockup = mockups.get(tile.upgradeId);
	if (mockup && !mockup.isLoading) {
		if (playerState.entity?.color !== undefined) {
			mockup.color = playerState.entity.color;
		}
		
		const entityRender = getEntityImage(mockup, false, 1.25);
		if (entityRender) {
			const centerX = tile.x + size / 2;
			const centerY = tile.y + size / 2;
			const maxSize = size * 0.7 * tile.hoverScale;
			const scale = maxSize / Math.max(entityRender.width, entityRender.height);

			ctx.save();
			ctx.translate(centerX, centerY);
			ctx.rotate(tile.rotation);
			ctx.scale(scale, scale);
			ctx.drawImage(entityRender, -entityRender.width / 2, -entityRender.height / 2);
			ctx.restore();
		}
		
		// Label
		if (mockup.label) {
			const fontSize = size * 0.15;
			const labelText = renderText(mockup.label, fontSize);
			ctx.drawImage(labelText, tile.x + size / 2 - labelText.width / 2, tile.y + size - labelText.height - 4);
			if (canInteract && tile.isHovering) {
				showCursorTextBox(mockup.label, "Click to Upgrade")
			}
		}
	}

	// Border
	ctx.strokeStyle = "#212121";
	ctx.lineWidth = size * 0.05;
	ctx.strokeRect(tile.x, tile.y, size, size);
	
	ctx.globalAlpha = 1;
}

// --- Scene ---

const upgrades = new Scene(document.getElementById("upgradesCanvas"));
drawLoop.scenes.set("upgrades", upgrades);

function updatePanelMetrics(canvas){
	const scale = currentSettings.upgradeMenuScale?.value?.number ?? 1;
	panelSize = Math.round(canvas.height * PANEL_SIZE_MULT * scale);
	panelMargin = Math.round(canvas.height * UPGRADES_CONFIG.PANEL_MARGIN_MULT);
}


upgrades.utilityFuncts.set("fade", ({ canvas, ctx, delta }) => {
	const lerpAmount = currentSettings.menuAnimSpeed.value.number * delta;
	if (state.active) {
		state.fade = lerp(state.fade, 1, lerpAmount);
		upgrades.drawFuncts.set("drawUpgradeTiles", drawTiles);
	} else {
		state.fade = lerp(state.fade, 0, lerpAmount);
		if (state.fade < 0.001) {
			state.fade = 0;
			upgrades.drawFuncts.delete("drawUpgradeTiles");
		}
	}
});

upgrades.utilityFuncts.set("syncAndUpdate", ({ canvas, ctx, delta }) => {
	updatePanelMetrics(canvas);
	syncUpgradeTiles(canvas.width, canvas.height);
	
	for (const [upgradeId, tile] of upgradeTiles) {
		if (updateTile(tile, delta, state.fade)) {
			upgradeTiles.delete(upgradeId);
		}
	}
});

upgrades.drawFuncts.set("clear", ({ canvas, ctx }) => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function drawTiles({ canvas, ctx, delta }){
	updatePanelMetrics(canvas);
	let anyHovered = false;
	if (state.fade < 0.9) {
		hideCursorTextBox()
	}
	for (const [, tile] of upgradeTiles) {
		if (tile.isHovering){
			hideCursorTextBox()
			anyHovered = true;
			break;
		}
	}
	
	const lerpAmount = currentSettings.menuAnimSpeed.value.number * delta;
	for (const [, tile] of upgradeTiles) {
		tile.dimFactor = lerp(tile.dimFactor, (anyHovered && !tile.isHovering) ? 0.7 : 1, lerpAmount);
		drawTile(tile, ctx, tile.upgradeIndex);
	}
}

// --- Exports ---

function openUpgradeMenu() { state.active = true; }
function closeUpgradeMenu() { state.active = false; }
function toggleUpgradeMenu() { state.active = !state.active; }

export { openUpgradeMenu, closeUpgradeMenu, toggleUpgradeMenu }