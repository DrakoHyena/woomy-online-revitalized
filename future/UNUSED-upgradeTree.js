/*
I've decided that Im not going to be using this however, when I finished writting it, it was essentially complete.
Perhaps it should be added as a togglable menu in the future?
*/

import { global } from "../client/js/global.js";
import { lerp } from "../client/js/lerp.js";
import { drawLoop } from "../client/js/drawing/drawLoop.js";
import { Scene } from "../client/js/drawing/scene.js";
import { player } from "../client/js/player.js";
import { keyboard } from "../client/js/controls/keyboard.js";
import { drawEntity } from "../client/js/drawing/drawEntity.js";
import { drawText } from "../client/js/drawing/canvas.js";
import { socket } from "../client/js/socket.js";
import { CanvasCache } from "../client/js/utils/cache.js";
import { mouse } from "../client/js/controls/mouse.js";

// CONFIGURATION
const UPGRADETREE_CONFIG = {
	// Timing
	FADE_DEBOUNCE_MS: 300,          // Delay between fade toggle presses
	CLICK_COOLDOWN_MS: 200,         // Delay between upgrade clicks

	// Rendering
	RENDER_TIER_DEPTH: 2,           // How many tiers deep to render children
	NODE_SIZE_MULT: 0.08,            // Base node size as fraction of canvas width
	DISTANCE_DIVISOR: 3,            // Controls spacing between tiers (higher = closer)

	// Interaction
	HOVER_SIZE_MULT: 1.25,          // Scale multiplier when hovering a node
	BASE_ALPHA: 0.75,               // Default opacity for nodes
	HOVERED_ALPHA: 1.0,             // Opacity when hovering

	// Animation
	SIZE_LERP_FACTOR: 0.1,          // How fast size changes (0-1, higher = faster)
	ALPHA_LERP_FACTOR: 0.45,         // How fast alpha changes (0-1, higher = faster)
	FADE_LERP_FACTOR: 0.3,          // How fast menu fades in/out
	ROTATION_SPEED: 0.001,          // Speed of tier rotation (radians per frame)
	TIER_SPIN_MULTIPLIER: 0.85,     // How much faster each tier spins

	// Fade-in for new/reappearing nodes
	INITIAL_SIZE_MULT: 1,       // Starting size multiplier for fade-in
	INITIAL_ALPHA_MULT: 0.001,      // Starting alpha multiplier for fade-in

	// Labels
	LABEL_OFFSET_MULT: 0.38,        // Label distance from node center
	LABEL_SIZE_MULT: 0.35,          // Label size relative to node
	CENTER_LABEL_SIZE_MULT: 0.35,   // Center node label size
	CENTER_LABEL_OFFSET_MULT: 0.45, // Center label vertical offset

	// Gradient background
	GRADIENT_STOPS: [
		{ pos: 0,    color: "rgba(200,200,200,0.4)" },
		{ pos: .35,  color: "rgba(0,0,0,0.1)" },
		{ pos: 1, 	 color: "rgba(0,0,0,0.4)" },
	],

	// Input
	TOGGLE_KEY: "m",                // Key to toggle upgrade tree visibility
};

// PRECOMPUTED CONSTANTS (do not modify)
const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI * 0.5;
const THREE_HALF_PI = Math.PI * 1.5;
const NEG_QUARTER_PI = -Math.PI * 0.25;

// RUNTIME STATE
const frameCache = {
	cx: 0,
	cy: 0,
	baseDist: 0,
	baseNodeSize: 0,
	mx: 0,
	my: 0,
	hasMousePos: false
};

const state = {
	fade: 0,
	fadeGoal: 0,
	lastFadePress: 0,
	lastClickTime: 0,
	gradient: null,
	mainNode: null,
	lastMockup: null,
	lastUpgrade: null,
	rotationAngle: 0,
	hoveredNode: null,
	closestNodeDistSq: Infinity
};

// INITIALIZATION
const tankImgCache = new CanvasCache("upgradeIcons");
const upgradeTree = new Scene(document.getElementById("upgradeTreeCanvas"));
drawLoop.scenes.set("upgradeTree", upgradeTree);
upgradeTree.drawingDisabled = true;

// UPGRADE TREE NODE CLASS
class UpgradeTreeNode {
	constructor(mockup, upgradeIndex) {
		this.mockup = mockup.upgrades[upgradeIndex]?.index ?? mockup.upgrades[upgradeIndex];
		this.upgradeIndex = upgradeIndex;
		this.sizeMulti = UPGRADETREE_CONFIG.INITIAL_SIZE_MULT;
		this.alphaMulti = UPGRADETREE_CONFIG.INITIAL_ALPHA_MULT;
		this.children = [];        // For ring nodes: their upgrade options
		this.centerUpgrades = [];  // For center only: current tank's available upgrades
		this.x = 0;
		this.y = 0;
		this.size = 0;
		this.tier = 0;
		this.angle = 0;
		this.baseAlpha = UPGRADETREE_CONFIG.BASE_ALPHA;
		this.image = null;
		this.flip = false;
		this.wasVisible = false;
	}

	// Ensure target array matches upgrade count from image
	syncChildren(target = this.children) {
		const count = this.image?.upgrades?.length ?? 0;
		if (count === target.length) return;
		target.length = Math.min(target.length, count);
		for (let i = target.length; i < count; i++) {
			target.push(new UpgradeTreeNode(this.image, i));
		}
	}

	// Check if mouse is hovering this node
	checkHover() {
		if (!frameCache.hasMousePos) return;
		const dx = frameCache.mx - this.x, dy = frameCache.my - this.y;
		const distSq = dx * dx + dy * dy;
		const radiusSq = this.size * this.size * 0.25;
		if (distSq < radiusSq && distSq / radiusSq < state.closestNodeDistSq) {
			state.hoveredNode = this;
			state.closestNodeDistSq = distSq / radiusSq;
		}
	}

	// Prepare node position and state
	prepare(angle, tier) {
		this.tier = tier;
		this.angle = angle;
		if (!this.image || this.image.isLoading) {
			this.image = undefined//getEntityImageFromMockup(this.mockup, global._tankMenuColor);
		}
		this.baseAlpha = tier > 1 ? 0.25 + 0.75 / tier : UPGRADETREE_CONFIG.BASE_ALPHA;

		const dist = frameCache.baseDist * tier;
		this.x = frameCache.cx + dist * Math.cos(angle);
		this.y = frameCache.cy + dist * Math.sin(angle);
		this.size = frameCache.baseNodeSize * (tier > 0 ? 1 / (1 + tier * 0.1) : 1);

		// Flip label if on left side
		let norm = angle % TWO_PI;
		if (norm < 0) norm += TWO_PI;
		this.flip = norm > HALF_PI && norm < THREE_HALF_PI;

		this.checkHover();
		if (tier < UPGRADETREE_CONFIG.RENDER_TIER_DEPTH) this.syncChildren();
	}

	// Prepare center node (no angle/distance)
	prepareCenter() {
		this.tier = 0;
		if (!this.image || this.image.isLoading) {
			this.image = undefined//getEntityImageFromMockup(this.mockup, global._tankMenuColor);
		}
		this.x = frameCache.cx;
		this.y = frameCache.cy;
		this.size = frameCache.baseNodeSize;
		this.checkHover();
		this.syncChildren(this.centerUpgrades); // Sync center's own upgrades separately
	}

	// Animate node (fade in/out, hover effects)
	animate(visible, delta) {
		// Reset on becoming visible
		if (visible && !this.wasVisible) {
			this.sizeMulti = this.tier <= 1 ? UPGRADETREE_CONFIG.INITIAL_SIZE_MULT : 1;
			this.alphaMulti = UPGRADETREE_CONFIG.INITIAL_ALPHA_MULT;
		}
		this.wasVisible = visible;

		const isHovered = state.hoveredNode === this;
		const targetSize = visible && this.tier <= 1 && isHovered ? UPGRADETREE_CONFIG.HOVER_SIZE_MULT : 1;
		const targetAlpha = visible ? (isHovered ? UPGRADETREE_CONFIG.HOVERED_ALPHA : this.baseAlpha) : 0;

		delta = Math.min(1, delta)
		this.sizeMulti = lerp(this.sizeMulti, targetSize, UPGRADETREE_CONFIG.SIZE_LERP_FACTOR * delta);
		this.alphaMulti = lerp(this.alphaMulti, targetAlpha, UPGRADETREE_CONFIG.ALPHA_LERP_FACTOR * delta);
	}

	// Draw node and label
	draw(ctx, isCenter = false) {
		if (this.alphaMulti < 0.01) return;

		const drawAlpha = state.fade * this.alphaMulti;
		const cached = tankImgCache.get(this.image.name, this.image.index, this.image.color, this.size|0);

		if (cached) {
			ctx.globalAlpha = drawAlpha;
			ctx.setTransform(this.sizeMulti, 0, 0, this.sizeMulti, this.x, this.y);
			ctx.drawImage(cached, -(cached.tankCenterX ?? cached.width * 0.5), -(cached.tankCenterY ?? cached.height * 0.5));
		} else {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			drawEntity(this.x, this.y, this.image, 1, drawAlpha, 1, NEG_QUARTER_PI, true, ctx, undefined, undefined, this.size,
				tankImgCache.new(this.image.name, this.image.index, this.image.color, this.size|0));
			ctx.globalAlpha = drawAlpha;
		}

		// Draw label
		const drawSize = this.size * this.sizeMulti;
		if (isCenter) {
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			drawText(this.image.name, this.x, this.y - drawSize * UPGRADETREE_CONFIG.CENTER_LABEL_OFFSET_MULT,
				drawSize * UPGRADETREE_CONFIG.CENTER_LABEL_SIZE_MULT, "white", "center", true, drawAlpha, false, ctx);
		} else {
			const labelOffset = drawSize * UPGRADETREE_CONFIG.LABEL_OFFSET_MULT;
			ctx.setTransform(1, 0, 0, 1, this.x + labelOffset * Math.cos(this.angle), this.y + labelOffset * Math.sin(this.angle));
			ctx.rotate(this.flip ? this.angle - Math.PI : this.angle);
			drawText(this.image.name, 0, 0, drawSize * UPGRADETREE_CONFIG.LABEL_SIZE_MULT / (this.tier + 1),
				"white", this.flip ? "right" : "left", true, drawAlpha, false, ctx);
		}
	}

	// Prepare entire ring for hover detection (first pass)
	prepareRing(baseAngle, span, tier, centered) {
		const len = this.children.length;
		if (!len || tier > UPGRADETREE_CONFIG.RENDER_TIER_DEPTH) return;

		const step = span / len;
		const startAngle = centered ? baseAngle - ((len - 1) * 0.5) * step : baseAngle * UPGRADETREE_CONFIG.TIER_SPIN_MULTIPLIER * tier;

		for (let i = 0; i < len; i++) {
			const child = this.children[i];
			const angle = startAngle + step * i;

			child.prepare(angle, tier);
			child.prepareRing(angle, tier <= 1 ? TWO_PI : step / Math.max(1, tier - 1), tier + 1, tier > 1);
		}
	}

	// Animate and draw entire ring (second pass, after hover is determined)
	drawRing(ctx, baseAngle, span, tier, centered, visible, delta) {
		const len = this.children.length;
		if (!len || tier > UPGRADETREE_CONFIG.RENDER_TIER_DEPTH) return;

		const step = span / len;
		const startAngle = centered ? baseAngle - ((len - 1) * 0.5) * step : baseAngle * UPGRADETREE_CONFIG.TIER_SPIN_MULTIPLIER * tier;

		for (let i = 0; i < len; i++) {
			const child = this.children[i];
			const angle = startAngle + step * i;

			const childVisible = visible && (tier !== 1 || state.hoveredNode === child);
			child.drawRing(ctx, angle, tier <= 1 ? TWO_PI : step / Math.max(1, tier - 1), tier + 1, tier > 1, childVisible, delta);
			child.animate(visible, delta);
			child.draw(ctx);
		}
	}

	// Prepare center's own upgrades for hover detection (first pass)
	prepareCenterUpgrades(baseAngle) {
		const len = this.centerUpgrades.length;
		if (!len) return;

		const step = TWO_PI / len;
		const startAngle = baseAngle * UPGRADETREE_CONFIG.TIER_SPIN_MULTIPLIER * 2;

		for (let i = 0; i < len; i++) {
			const child = this.centerUpgrades[i];
			const angle = startAngle + step * i;

			child.prepare(angle, 2);
		}
	}

	// Animate and draw center's own upgrades (second pass)
	drawCenterUpgrades(ctx, baseAngle, visible, delta) {
		const len = this.centerUpgrades.length;
		if (!len) return;

		for (let i = 0; i < len; i++) {
			const child = this.centerUpgrades[i];
			child.animate(visible, delta);
			child.draw(ctx);
		}
	}
}

// NODE TREE MANAGEMENT
function rebuildNodeTree() {
	if (global.debug) console.log("[UPGRADETREE] Rebuilding Node Tree");
	state.mainNode = new UpgradeTreeNode(player, 0);
	for (let i = 1; i < player.upgrades.length; i++) {
		state.mainNode.children.push(new UpgradeTreeNode(player, i));
	}
	state.lastMockup = player.mockup;
	state.lastUpgrade = player.upgrades[player.upgrades.length - 1];
}

// SCENE SETUP
upgradeTree.drawFuncts.set("clear", ({ canvas, ctx }) => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
});

upgradeTree.utilityFuncts.set("fade", ({ canvas, ctx, delta }) => {
	const now = performance.now();
	if (now - state.lastFadePress > UPGRADETREE_CONFIG.FADE_DEBOUNCE_MS && keyboard.keys[UPGRADETREE_CONFIG.TOGGLE_KEY]) {
		state.lastFadePress = performance.now();
		toggleUpgradeMenu()
	}

	state.fade = lerp(state.fade, state.fadeGoal, UPGRADETREE_CONFIG.FADE_LERP_FACTOR * delta);
	if (state.fade !== 0 && state.fade < 0.001 && !state.fadeGoal) {
		state.fade = 0;
		upgradeTree.drawingDisabled = true;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
});

upgradeTree.resizeFuncts.set("gradient", ({ canvas, ctx }) => {
	const cx = canvas.width * 0.5;
	const cy = canvas.height * 0.5;
	const r = Math.max(canvas.width, canvas.height) * 0.5;
	const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
	for (const stop of UPGRADETREE_CONFIG.GRADIENT_STOPS) {
		g.addColorStop(stop.pos, stop.color);
	}
	state.gradient = g;
});

upgradeTree.drawFuncts.set("gradient", ({ canvas, ctx }) => {
	if (!state.gradient) {
		upgradeTree.resizeFuncts.get("gradient")({ canvas, ctx });
	}
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = Math.min(1, state.fade);
	ctx.fillStyle = state.gradient;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
});

upgradeTree.drawFuncts.set("nodes", ({ canvas, ctx, delta }) => {
	const upgradeLen = player.upgrades.length;

	// Rebuild tree if mockup or upgrades changed
	if (player.mockup !== state.lastMockup || player.upgrades[upgradeLen - 1] !== state.lastUpgrade) {
		rebuildNodeTree();
		if(player.upgrades.length === 1) state.fadeGoal = 0;
	}

	if (!upgradeLen) {
		state.fadeGoal = 0;
		return;
	}

	state.rotationAngle += UPGRADETREE_CONFIG.ROTATION_SPEED * delta;
	state.hoveredNode = null;
	state.closestNodeDistSq = Infinity;

	// Update frame cache
	const h = canvas.height;
	frameCache.cx = canvas.width * 0.5;
	frameCache.cy = h * 0.5;
	frameCache.baseDist = (h / UPGRADETREE_CONFIG.DISTANCE_DIVISOR / UPGRADETREE_CONFIG.RENDER_TIER_DEPTH) * state.fade;
	frameCache.baseNodeSize = h * UPGRADETREE_CONFIG.NODE_SIZE_MULT * state.fade;

	const mousePos = mouse.posRelativeToScene(upgradeTree);
	frameCache.mx = mousePos.x;
	frameCache.my = mousePos.y;
	frameCache.hasMousePos = true;

	// Prepare center and detect hover first (needed for visibility decisions)
	state.mainNode.prepareCenter();

	// First pass: prepare all nodes and detect hover
	state.mainNode.prepareRing(state.rotationAngle, TWO_PI, 1, false);
	state.mainNode.prepareCenterUpgrades(state.rotationAngle);

	// Second pass: animate and draw with final hover state
	// Process ring 1 (player's upgrade path) and their children (ring 2+) - always visible
	state.mainNode.drawRing(ctx, state.rotationAngle, TWO_PI, 1, false, true, delta);

	// Process center's own upgrades (shown when center hovered)
	const centerHovered = state.hoveredNode === state.mainNode;
	state.mainNode.drawCenterUpgrades(ctx, state.rotationAngle, centerHovered, delta);

	// Handle upgrade click
	if (state.hoveredNode && mouse.buttons.left) {
		const now = performance.now();
		if (now - state.lastClickTime > UPGRADETREE_CONFIG.CLICK_COOLDOWN_MS) {
			state.lastClickTime = now;
			socket.talk("U", state.hoveredNode.upgradeIndex);
		}
	}

	// Draw center node last (on top)
	state.mainNode.animate(true, delta);
	state.mainNode.draw(ctx, true);

	ctx.setTransform(1, 0, 0, 1, 0, 0);
});

function openUpgradeMenu() {
	if(player.upgrades.length === 0) return; 
	state.fadeGoal = 1;
	upgradeTree.drawingDisabled = false;
}

function closeUpgradeMenu() {
	state.fadeGoal = 0;
}

function toggleUpgradeMenu(){
	console.log()
	if(state.fadeGoal === 0){
		openUpgradeMenu();
	}else{
		closeUpgradeMenu();
	}
}

export { toggleUpgradeMenu, openUpgradeMenu, closeUpgradeMenu, UPGRADETREE_CONFIG };