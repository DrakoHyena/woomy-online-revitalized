import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { lerp } from "../../lerp.js";
import { currentSettings } from "../../settings.js";
import { chatState } from "./chat.js";
import { roomState } from "../../state/room.js";
import { playerState } from "../../state/player.js";
import { entitiesArr } from "../../socket.js";
import { getColor } from "../../colors.js";
import { resolveSkinAsset, drawCellTile } from "../tileUtils.js";

// --- Config ---

let state = {
	active : true,
	fade: 1,
	margin: 10,
	padding: 5,
	width: 1,
	height: 1
}

const minimap = new Scene(10);
drawLoop.addScene("minimap", minimap);

// Cache for the full-map minimap image
const minimapCache = {
	dirty: true,
	canvas: null,
	bitmap: null, // ImageBitmap when available
	widthCells: 0,
	heightCells: 0,
	pixelsPerCell: 1,
	animatedCells: [],
	lastSkinVersion: null
};

function invalidateMinimapCache(){
	minimapCache.dirty = true;
	minimapCache.bitmap = null;
	minimapCache.canvas = null;
	minimapCache.animatedCells.length = 0;
}

async function rebuildMinimapCache(){
	if(!roomState.cells || roomState.cells.length === 0) return;
	const W = roomState.cells[0].length;
	const H = roomState.cells.length;
	// Decide pixels-per-cell based on map size (cap to keep canvas reasonable)
	const ppc = Math.min(4, Math.max(1, Math.floor(1024 / Math.max(W, H))));
	const cw = W * ppc;
	const ch = H * ppc;

	const c = document.createElement('canvas');
	c.width = Math.max(1, cw);
	c.height = Math.max(1, ch);
	const cctx = c.getContext('2d');

	const frameNow = Math.floor(performance.now() / 16);
	minimapCache.animatedCells.length = 0;

	const defaultResolved = resolveSkinAsset("default", frameNow);

	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const cell = roomState.cells[y][x];
			if (cell === 'edge') continue;

			const resolved = (cell && resolveSkinAsset(cell, frameNow)) || defaultResolved;
			if (!resolved) continue; // asset not ready yet

			// Draw tile into cache canvas at 1..4 px per cell
			drawCellTile(cctx, resolved.skin, resolved.asset, x * ppc, y * ppc, ppc, ppc, 0, 0, 1);

			if (resolved.skin.frameInterval && resolved.skin.frameInterval > 0) {
				minimapCache.animatedCells.push({ x, y, key: cell });
			}
		}
	}

	minimapCache.canvas = c;
	minimapCache.pixelsPerCell = ppc;
	minimapCache.widthCells = W;
	minimapCache.heightCells = H;
	minimapCache.dirty = false;
	
	// Try to create an ImageBitmap for faster blits; fallback to using the canvas directly.
	try {
		minimapCache.bitmap = await createImageBitmap(c);
	} catch (err) {
		minimapCache.bitmap = null;
	}
}

function drawMinimap({ canvas, ctx, delta }) {
	const ANIM_SPEED = currentSettings.menuAnimSpeed.value.number * delta
	const BASE_ALPHA = 1;
	if(BASE_ALPHA === 0) return;

	let height = canvas.height / 4;
	let width = height;
	let x = canvas.width - width - state.margin;
	let y = canvas.height - height - state.margin - ((chatState.height+state.margin) * chatState.fade);

	ctx.globalAlpha = BASE_ALPHA * state.fade;
	ctx.fillStyle = "#777777";
	ctx.fillRect(x, y, width, height);
	x += state.padding;
	y += state.padding;
	width -= state.padding * 2;
	height -= state.padding * 2;
	ctx.fillStyle = "#666666";
	ctx.fillRect(x, y, width, height);
	x += state.padding;
	y += state.padding;

	// Draw cached map (rebuild if needed)
	if (roomState.cells && roomState.cells.length > 0) {
		const W = roomState.cells[0].length;
		const H = roomState.cells.length;

		if (minimapCache.dirty || minimapCache.widthCells !== W || minimapCache.heightCells !== H) {
			rebuildMinimapCache();
		}

		// Draw cached bitmap (or canvas fallback)
		if (minimapCache.bitmap) {
			ctx.drawImage(minimapCache.bitmap, x, y, width, height);
		} else if (minimapCache.canvas) {
			ctx.drawImage(minimapCache.canvas, x, y, width, height);
		} else {
			// Fallback: draw a coarse grid if cache isn't ready yet
			const cellW = width / Math.max(1, W);
			const cellH = height / Math.max(1, H);
			const defaultResolved = resolveSkinAsset("default", 0);
			for (let yy = 0; yy < H; yy++) {
				for (let xx = 0; xx < W; xx++) {
					const cell = roomState.cells[yy][xx];
					if (cell === 'edge') continue;
					const resolved = (cell && resolveSkinAsset(cell, 0)) || defaultResolved;
					if (!resolved) continue;
					ctx.fillStyle = resolved.skin.tintColor || '#666';
					ctx.fillRect(x + xx * cellW, y + yy * cellH, cellW, cellH);
				}
			}
		}

		// Animated cell overlays (render current frame for animated skins)
		if (minimapCache.animatedCells.length > 0) {
			const nowFrame = Math.floor(performance.now() / 16);
			const cellDrawW = width / W;
			const cellDrawH = height / H;
			for (const ac of minimapCache.animatedCells) {
				const resolved = resolveSkinAsset(ac.key, nowFrame);
				if (!resolved) continue;
				const left = x + (ac.x / W) * width;
				const top  = y + (ac.y / H) * height;
				// Draw the animated frame scaled to the minimap cell size
				drawCellTile(ctx, resolved.skin, resolved.asset, left, top, cellDrawW, cellDrawH, 0, 0, 1);
			}
		}

		// Dynamic overlays: players / moving objects
		const cellDrawW = width / Math.max(1, W);
		const cellDrawH = height / Math.max(1, H);
		for (let i = 0; i < entitiesArr.length; i++) {
			const e = entitiesArr[i];
			if (!e) continue;
			const nx = (e.x) / (roomState.width || 1);
			const ny = (e.y) / (roomState.height || 1);
			const px = x + nx * width;
			const py = y + ny * height;
			ctx.beginPath();
			ctx.fillStyle = e.nameColor || getColor(e.color);
			ctx.arc(px, py, Math.max(1, Math.min(cellDrawW, cellDrawH) * 0.45), 0, Math.PI * 2);
			ctx.fill();
			if (e.id === playerState.entityId) {
				ctx.lineWidth = 1;
				ctx.strokeStyle = '#FFFFFF';
				ctx.stroke();
			}
		}
	}

	ctx.globalAlpha = 1;
}

minimap.drawFuncts.set("drawMinimap", drawMinimap);

function openMinimap(){
	state.active = true;
	minimap.drawFuncts.set("drawMinimap", drawMinimap)
}

function closeMinimap(){
	state.active = false;
}

function toggleMinimap(){
	if(state.active){
		closeMinimap();
	}else{
		openMinimap();
	}
}

export { toggleMinimap, openMinimap, closeMinimap, invalidateMinimapCache }