import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { clickableActive } from "./clickable.js";
import { lerp } from "../../lerp.js";
import { playerState } from "../../state/player.js";
import { mockups } from "../../mockups.js";
import { TOPLEFTBUTTONS_CONFIG, topLeftButtonsState } from "./topLeftButtons.js";
import { getEntityImage } from "../entity.js";
import { renderText } from "../text.js";

const PANEL_SIZE = 80;
const PANEL_MARGIN = 10;
const LERP_SPEED = 0.2;

const state = {
	fade: 1,
	active: true,
	hoveredTileId: null
}

// UpgradeTile class - each upgrade is its own object
class UpgradeTile {
	constructor(upgradeId, targetX, targetY) {
		this.upgradeId = upgradeId;
		this.targetX = targetX;
		this.targetY = targetY;
		// Start off-screen to the left for smooth entry animation
		this.x = -PANEL_SIZE;
		this.y = targetY;
		this.alpha = 0;
		this.removing = false;
		this.hoverScale = 1;
		this.isHovering = false;
		this.rotation = 0;
		this.dimFactor = 1;
	}

	setTarget(targetX, targetY) {
		this.targetX = targetX;
		this.targetY = targetY;
	}

	update(delta, fadeFactor) {
		const lerpAmount = LERP_SPEED * delta;
		
		// Slowly spin the upgrade
		this.rotation += 0.0075 * delta;
		
		// Smoothly lerp hover scale
		const targetHoverScale = this.isHovering ? 1.25 : 1;
		this.hoverScale = lerp(this.hoverScale, targetHoverScale, lerpAmount);
		
		if (this.removing) {
			// Animate out to the left and fade out
			this.x = lerp(this.x, -PANEL_SIZE * 2, lerpAmount);
			this.alpha = lerp(this.alpha, 0, lerpAmount);
			// Return true if fully removed
			return this.alpha < 0.01;
		} else {
			// When fading out, animate tiles off-screen (one unit over)
			const offScreenX = -(PANEL_SIZE + PANEL_MARGIN);
			const actualTargetX = lerp(offScreenX, this.targetX, fadeFactor);
			
			// Target alpha based on fade factor (fade out when menu closes)
			const targetAlpha = fadeFactor;
			
			// Smoothly lerp position towards target
			this.x = lerp(this.x, actualTargetX, lerpAmount);
			this.y = lerp(this.y, this.targetY, lerpAmount);
			this.alpha = lerp(this.alpha, targetAlpha, lerpAmount);
			return false;
		}
	}

	draw(ctx) {
		// Check hover state
		this.isHovering = false;
		if (!this.removing) {
		const click = clickableActive(upgrades, this.x, this.y, this.x + PANEL_SIZE, this.y + PANEL_SIZE);
			if (click) {
				this.isHovering = true;
				if (click.left) {
					// upgrade request
				}
			}
		}
		
		// Draw background square
		ctx.globalAlpha = .8 * this.alpha * this.dimFactor;
		ctx.fillStyle = "#5e5e5e";
		ctx.fillRect(this.x, this.y, PANEL_SIZE, PANEL_SIZE);
		ctx.globalAlpha = this.alpha * this.dimFactor;

		// Get mockup and render entity inside tile
		const mockup = mockups.get(this.upgradeId);
		if (mockup && !mockup.isLoading) {
			// Set mockup color to match player's color before rendering
			if (playerState.entity?.color !== undefined) {
				mockup.color = playerState.entity.color;
			}
			
			const entityRender = getEntityImage(mockup, false, 1.25);
			if (entityRender) {
				const centerX = this.x + PANEL_SIZE / 2;
				const centerY = this.y + PANEL_SIZE / 2;
				
				// Scale entity to fit inside the tile with some padding
				const maxSize = PANEL_SIZE * 0.7 * this.hoverScale;
				const scale = maxSize / Math.max(entityRender.width, entityRender.height);

				ctx.save();
				ctx.translate(centerX, centerY);
				ctx.rotate(this.rotation);
				ctx.scale(scale, scale);
				ctx.drawImage(entityRender, -entityRender.width / 2, -entityRender.height / 2);
				ctx.restore();
			}
			
			// Render label text inside the tile at the bottom
			if (mockup.label) {
				const fontSize = PANEL_SIZE * 0.15;
				const labelText = renderText(mockup.label, fontSize);
				const labelX = this.x + PANEL_SIZE / 2 - labelText.width / 2;
				const labelY = this.y + PANEL_SIZE - labelText.height - 4;
				ctx.drawImage(labelText, labelX, labelY);
			}
		}	

		// Render Tile border
		ctx.strokeStyle = "#212121";
		ctx.lineWidth = PANEL_SIZE * .05;
		ctx.strokeRect(this.x, this.y, PANEL_SIZE, PANEL_SIZE);
		
		ctx.globalAlpha = 1;
	}

	markForRemoval() {
		this.removing = true;
	}
}

// Map to store upgrade tile objects by their upgradeId
const upgradeTiles = new Map();

// Calculate target position for an upgrade at a given index
function calculateTargetPosition(index, canvasWidth) {
	const rootX = topLeftButtonsState.width + PANEL_MARGIN;
	const rootY = TOPLEFTBUTTONS_CONFIG.MARGIN;
	const unit = PANEL_SIZE + PANEL_MARGIN;
	const maxPerRow = Math.floor((canvasWidth / 2 - rootX) / unit) || 1;
	
	const col = index % maxPerRow;
	const row = Math.floor(index / maxPerRow);
	
	return {
		x: rootX + col * unit,
		y: rootY + row * unit
	};
}

// Sync upgrade tiles with playerState.gui.upgrades
function syncUpgradeTiles(canvasWidth) {
	const currentUpgrades = playerState.gui.upgrades;
	const currentUpgradeSet = new Set(currentUpgrades);
	
	// Mark tiles for removal if their upgrade is no longer in the list
	for (const [upgradeId, tile] of upgradeTiles) {
		if (!currentUpgradeSet.has(upgradeId) && !tile.removing) {
			tile.markForRemoval();
		}
	}
	
	// Add new tiles and update target positions for existing ones
	currentUpgrades.forEach((upgradeId, index) => {
		const targetPos = calculateTargetPosition(index, canvasWidth);
		
		if (upgradeTiles.has(upgradeId)) {
			// Update existing tile's target position
			const tile = upgradeTiles.get(upgradeId);
			if (!tile.removing) {
				tile.setTarget(targetPos.x, targetPos.y);
			}
		} else {
			// Create new tile
			const tile = new UpgradeTile(upgradeId, targetPos.x, targetPos.y);
			upgradeTiles.set(upgradeId, tile);
		}
	});
}

const upgrades = new Scene(document.getElementById("upgradesCanvas"));
drawLoop.scenes.set("upgrades", upgrades);

upgrades.utilityFuncts.set("fade", ({ canvas, ctx, delta }) => {
	const lerpAmount = 0.2 * delta;
	if (state.active === true) {
		state.fade = lerp(state.fade, 1, lerpAmount);
		upgrades.drawingDisabled = false;
	} else {
		state.fade = lerp(state.fade, 0, lerpAmount);
		if (state.fade < 0.001) {
			state.fade = 0;
			upgrades.drawingDisabled = true;
		}
	}
});

upgrades.utilityFuncts.set("syncAndUpdate", ({ canvas, ctx, delta }) => {
	// Sync tiles with current upgrade state
	syncUpgradeTiles(canvas.width);
	
	// Update all tiles and remove fully faded-out ones
	for (const [upgradeId, tile] of upgradeTiles) {
		const shouldRemove = tile.update(delta, state.fade);
		if (shouldRemove) {
			upgradeTiles.delete(upgradeId);
		}
	}
});

upgrades.drawFuncts.set("clear", ({ canvas, ctx }) => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});

upgrades.drawFuncts.set("drawUpgradeTiles", ({ canvas, ctx, delta }) => {
	// First pass: check if any tile is being hovered
	let isAnyTileHovered = false;
	for (const [upgradeId, tile] of upgradeTiles) {
		if (tile.isHovering) {
			isAnyTileHovered = true;
			break;
		}
	}
	
	const lerpAmount = LERP_SPEED * delta;
	
	// Draw all upgrade tiles
	for (const [upgradeId, tile] of upgradeTiles) {
		// Smoothly lerp dimFactor
		const targetDim = (isAnyTileHovered && !tile.isHovering) ? 0.7 : 1;
		tile.dimFactor = lerp(tile.dimFactor, targetDim, lerpAmount);
		
		tile.draw(ctx);
	}
});

function openUpgradeMenu() {
	state.active = true;
}

function closeUpgradeMenu() {
	state.active = false;
}

function toggleUpgradeMenu() {
	if (state.active === true) {
		closeUpgradeMenu();
	} else {
		openUpgradeMenu();
	}
}

export { openUpgradeMenu, closeUpgradeMenu, toggleUpgradeMenu }