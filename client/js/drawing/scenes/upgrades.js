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
	// The server sends upgrades as a flat array of pairs: [upgradeId, level, upgradeId, level, ...]
	const raw = playerState.gui.upgrades || [];
	const parsed = [];
	for (let i = 0; i < raw.length; i += 2) {
		const id = raw[i];
		const level = raw[i + 1];
		if (id !== undefined && id !== null) parsed.push({ id, level });
	}

	const currentUpgradeSet = new Set(parsed.map(u => u.id));

	// Mark removed upgrades for exit animation
	for (const [upgradeId, tile] of upgradeTiles) {
		if (!currentUpgradeSet.has(upgradeId) && !tile.removing) {
			tile.removing = true;
		}
	}

	// Add new tiles / update existing positions
	parsed.forEach((entry, index) => {
		const upgradeId = entry.id;
		const level = entry.level;
		const pos = calculateTargetPosition(index, canvasWidth, canvasHeight);

		if (upgradeTiles.has(upgradeId)) {
			const tile = upgradeTiles.get(upgradeId);
			if (!tile.removing) {
				tile.targetX = pos.x;
				tile.targetY = pos.y;
				tile.upgradeIndex = index;
				tile.level = level; // update level
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
				dimFactor: 1,
				lockAlpha: (level <= playerState.level ? 0 : 1),
				level: level // store level on tile
			});
		}
	});
}

function updateTile(tile, delta, fadeFactor) {
	const unlocked = tile.level <= playerState.level;
	const lerpAmount = currentSettings.menuAnimSpeed.value.number * delta;
	const size = panelSize;
	
	tile.rotation += 0.0075 * delta;
	tile.hoverScale = lerp(tile.hoverScale, tile.isHovering && unlocked ? 1.25 : 1, lerpAmount);
	// animate locked-overlay alpha so it fades out when the tile becomes unlocked
	tile.lockAlpha = lerp(tile.lockAlpha ?? (unlocked ? 0 : 1), unlocked ? 0 : 1, lerpAmount);
	
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

let lockedImg = new Image();
lockedImg.src = "/resources/icons/upgradelocked-icon.png";
lockedImg.onload = () => {
	createImageBitmap(lockedImg).then(bmp => {
		lockedImg = bmp
	})
}

function drawTile(tile, ctx, upgradeIndex) {
	const size = panelSize;
	const unlocked = tile.level <= playerState.level;
	const canInteract = state.fade >= .99;

	// Check hover
	tile.isHovering = false;
	if (canInteract && !tile.removing) {
		const click = clickableActive(tile.x, tile.y, tile.x + size, tile.y + size);
		if (click) {
			tile.isHovering = true;
			if (unlocked && click.left) {
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

			const cos = Math.cos(tile.rotation) * scale;
			const sin = Math.sin(tile.rotation) * scale;
			ctx.setTransform(cos, sin, -sin, cos, centerX, centerY);
			ctx.drawImage(entityRender, -entityRender.width / 2, -entityRender.height / 2);
			ctx.setTransform(1, 0, 0, 1, 0, 0);
		}
		
		// Label
		if (mockup.label) {
			const fontSize = size * 0.15;
			const labelText = renderText(unlocked ? mockup.label : "?".repeat(mockup.label.length), fontSize);
			ctx.drawImage(labelText, tile.x + size / 2 - labelText.width / 2, tile.y + size - labelText.height - 4);
			if (canInteract && tile.isHovering) {
				if(unlocked){
					showCursorTextBox(mockup.label, "Click to Upgrade")
				} else {
					showCursorTextBox("?".repeat(mockup.label.length), `Reach level ${tile.level} to unlock this tank.`)
				}
			}
		}
	}

	// Border
	ctx.strokeStyle = "#212121";
	ctx.lineWidth = size * 0.05;
	ctx.strokeRect(tile.x, tile.y, size, size);
	
	// Level badge (show the level sent from the server as the second value per upgrade)
	// Draw the locked overlay and icon — it now fades out via tile.lockAlpha when the tile becomes unlocked.
	if (tile.lockAlpha > 0.001) {
		ctx.globalAlpha = 0.5 * tile.alpha * tile.dimFactor * tile.lockAlpha;
		ctx.fillStyle = "black";
		ctx.fillRect(tile.x, tile.y, size, size);
		const padding = size * .15 * tile.lockAlpha;
		ctx.drawImage(lockedImg, tile.x + padding, tile.y + padding, size - padding * 2, size - padding * 2);
	}

	ctx.globalAlpha = 1;
}

// --- Scene ---

const upgrades = new Scene(60);
drawLoop.addScene("upgrades", upgrades);

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

function drawTiles({ canvas, ctx, delta }){
	updatePanelMetrics(canvas);
	syncUpgradeTiles(canvas.width, canvas.height);
	
	for (const [upgradeId, tile] of upgradeTiles) {
		if (updateTile(tile, delta, state.fade)) {
			upgradeTiles.delete(upgradeId);
		}
	}

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