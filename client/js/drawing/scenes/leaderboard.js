import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { lerp } from "../../lerp.js";
import { playerState } from "../../state/player.js";
import { mockups } from "../../mockups.js";
import { getEntityImage } from "../entity.js";
import { renderText } from "../text.js";
import { currentSettings } from "../../settings.js";
import { getColor } from "../../colors.js";
import { drawBar } from "../bar.js";

// --- Config ---
const ROW_HEIGHT_MULT = 0.028;
const ROW_MARGIN = 2.5;
const BAR_WIDTH_MULT = 0.27; // fraction of canvas height used for bar width
// base constants for margin/padding; will be scaled below
const BASE_MARGIN = 5;
const BASE_PADDING = 5;
const ANIM_SPEED = .8;

let state = {
	active : true,
	fade: 1,
	contentH: 0, // animated content height (lerps to fit lowest entry)
}

const leaderboard = new Scene(30);
drawLoop.addScene("leaderboard", leaderboard);

// Keyed by stable composite (name|label|entityIndex) — score is excluded as it changes every frame.
const leaderboardTiles = new Map();

function calculateMetrics(canvas) {
	const scale = currentSettings.leaderboardSize ? currentSettings.leaderboardSize.value.number : 1;
	const rowHeight = Math.round(canvas.height * ROW_HEIGHT_MULT * scale);
	const barWidth  = Math.round(canvas.height * BAR_WIDTH_MULT * scale);

	const titleText    = playerState.gui?.leaderboard?.title || "";
	const titleSize    = titleText ? Math.round(rowHeight * 0.85) : 0;
	const titleSpacing = titleText ? Math.round(rowHeight * 0.25) : 0;

	const margin = BASE_MARGIN * scale;
	const padding = BASE_PADDING * scale;
	// compute border thickness once so the layout can take it into account
	const borderMult = currentSettings.leaderboardBorderSize ? currentSettings.leaderboardBorderSize.value.number : 1;
	// use average dim so border scales with canvas size, times global scale (same formula used later)
	const borderBase = (canvas.width + canvas.height) / 2;
	const border = borderBase * 0.005 * borderMult * scale;

	// Anchor to top-right; content is inset by padding inside the outer box.
	// rootX is the x-coordinate where the bars themselves begin.  When a border
	// is present we need to shift the whole panel left by that amount so the
	// right margin remains constant.  (previous implementation ignored the
	// border, causing the border to “eat” into the margin.)
	const rootX = Math.round(canvas.width - margin - border - barWidth - 2 * padding);
	// Add border to the top offset so entries and title move down when the
	// border grows; without this the vertical margin would shrink.
	const top   = margin + border + 2 * padding + titleSize + titleSpacing;

	return { rowHeight, rootX, barWidth, top, titleSize, titleSpacing, margin, padding, scale, border };
}

function makeEntryKey(entry) {
	return `${entry.name || ""}|${entry.label || ""}|${entry.index}`;
}

function syncLeaderboardTiles(canvas, metrics) {
	const entries = playerState.gui?.leaderboard?.entries || [];
	const { rowHeight, rootX, barWidth, top } = metrics;

	let topScore = 1;
	for (let i = 0; i < entries.length; i++) {
		if (entries[i].score > topScore) topScore = entries[i].score;
	}

	// Mark removed tiles for exit animation.
	const keys = new Set();
	for (let i = 0; i < entries.length; i++) keys.add(makeEntryKey(entries[i]));
	for (const [key, tile] of leaderboardTiles) {
		if (!keys.has(key)) tile.removing = true;
	}

	// Add new tiles or update existing ones.
	for (let i = 0; i < entries.length; i++) {
		const entry       = entries[i];
		const entryKey    = makeEntryKey(entry);
		const targetY     = top + i * (rowHeight + ROW_MARGIN);
		const targetWidth = Math.round((entry.score / topScore) * barWidth);

		const existing = leaderboardTiles.get(entryKey);
		if (existing) {
			if (!existing.removing) {
				existing.targetX     = rootX + barWidth * (1 - state.fade);
				existing.targetY     = targetY;
				existing.targetWidth = targetWidth;
				existing.score       = entry.score;
				existing.name        = entry.name;
				existing.label       = entry.label;
				existing.nameColor   = entry.nameColor || "#FFFFFF";
				existing.color       = entry.color ?? 10;
				existing.entityIndex = entry.index;
			}
			existing.rank = i;
		} else {
			leaderboardTiles.set(entryKey, {
				key: entryKey,
				entityIndex:  entry.index,
				score:        entry.score,
				displayScore: entry.score,
				name:         entry.name,
				label:        entry.label,
				nameColor:    entry.nameColor || "#FFFFFF",
				color:        entry.color ?? 10,
				targetY,
				y:            targetY,
				x:            canvas.width + 40, // enter from off-screen right
				targetX:      rootX,
				width:        0,
				targetWidth,
				alpha:        0,
				removing:     false,
				rank:         i,
			});
		}
	}
}

// Returns true when the tile has finished its exit animation and can be deleted.
function updateTile(tile, delta, canvas) {
	const t = currentSettings.menuAnimSpeed.value.number * ANIM_SPEED * delta;

	if (tile.removing) {
		tile.x     = lerp(tile.x,     canvas.width + 50, t);
		tile.alpha = lerp(tile.alpha, 0,                 t);
		tile.width = lerp(tile.width, 0,                 t);
		return tile.alpha < 0.01;
	}

	tile.x            = lerp(tile.x,            tile.targetX,     t);
	tile.y            = lerp(tile.y,            tile.targetY,     t);
	tile.width        = lerp(tile.width,        tile.targetWidth, t);
	tile.alpha        = lerp(tile.alpha,        1,                t);
	tile.displayScore = Math.round(lerp(tile.displayScore, tile.score, t));

	// Snap small residuals to prevent infinite micro-lerp.
	if (Math.abs(tile.x     - tile.targetX)     < 0.5) tile.x     = tile.targetX;
	if (Math.abs(tile.y     - tile.targetY)     < 0.5) tile.y     = tile.targetY;
	if (Math.abs(tile.width - tile.targetWidth) < 0.5) tile.width = tile.targetWidth;

	return false;
}

function drawTile(tile, ctx, metrics) {
	const { rowHeight, barWidth } = metrics;
	const pad   = Math.max(6, Math.round(rowHeight * 0.12));
	const fillW = Math.max(0, Math.round(tile.width));
	const color = typeof tile.color === "string" ? tile.color : getColor(tile.color);

	ctx.globalAlpha = currentSettings.leaderboardAlpha.value.number * tile.alpha * state.fade;

	// Background + filled score bar (use shared drawBar helper)
	const fillScalar = barWidth > 0 ? Math.max(0, fillW) / barWidth : 0;
	drawBar(ctx, tile.x, tile.y, barWidth, rowHeight, 4, color, "black", fillScalar, currentSettings.squareLeaderboardBars.value.enabled ? "square" : "round");

	// Entity mockup icon on the left.
	if (tile.entityIndex !== undefined) {
		const mockup = mockups.get(tile.entityIndex);
		if (mockup && !mockup.isLoading) {
			mockup.color = color;
			const img = getEntityImage(mockup, false, 1.25);
			if (img) {
				const maxSize = rowHeight;
				const scale   = maxSize / Math.max(img.width, img.height);
				ctx.setTransform(scale, 0, 0, scale, tile.x + Math.round(rowHeight / 2), tile.y + Math.round(rowHeight / 2));
				ctx.drawImage(img, -img.width / 2, -img.height / 2);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
			}
		}
	}

	// Cached text bitmaps.
	const nameBmp  = renderText(tile.name || "",               rowHeight * 0.45, { fillStyle: tile.nameColor });
	const scoreBmp = renderText(String(tile.displayScore || 0), rowHeight * 0.45, { fillStyle: "#FFFFFF" });

	// Name (and optional label) left-aligned after the icon.
	const nameX = tile.x + rowHeight + pad;
	if (tile.label) {
		const labelBmp  = renderText(tile.label, rowHeight * 0.28, { fillStyle: "#CCCCCC" });
		const spacing   = Math.max(2, Math.round(rowHeight * 0.03));
		const combinedH = nameBmp.height + spacing + labelBmp.height;
		const baseY     = Math.round(tile.y + (rowHeight - combinedH) / 2) + spacing;
		ctx.drawImage(nameBmp,  nameX, baseY);
		ctx.drawImage(labelBmp, nameX, baseY + nameBmp.height);
	} else {
		ctx.drawImage(nameBmp, nameX, Math.round(tile.y + (rowHeight - nameBmp.height) / 2));
	}

	// Score right-aligned.
	ctx.drawImage(
		scoreBmp,
		Math.round(tile.x + barWidth - scoreBmp.width - pad),
		Math.round(tile.y + (rowHeight - scoreBmp.height) / 2),
	);

	ctx.globalAlpha = 1;
}

function drawBars({ canvas, ctx, delta }) {
	// fade in/out
	if (state.active) {
		state.fade = lerp(state.fade, 1, currentSettings.menuAnimSpeed.value.number * ANIM_SPEED * delta);
	} else {
		state.fade = lerp(state.fade, 0, currentSettings.menuAnimSpeed.value.number * ANIM_SPEED * delta);
		if (state.fade < 0.01) {
			state.fade = 0;
			leaderboard.drawFuncts.delete("drawBars");
		}
	}

	const metrics = calculateMetrics(canvas);
	const entries = playerState.gui?.leaderboard?.entries || [];

	// Ensure tiles exist/are synced for current entries before measuring/animating panel height
	syncLeaderboardTiles(canvas, metrics);

	// Update tiles first so their y-positions reflect this frame
	for (const [key, tile] of leaderboardTiles) {
		if (updateTile(tile, delta, canvas)) leaderboardTiles.delete(key);
	}

	// Determine desired content height from the lowest visible (non-removing) tile
	let maxBottom = -Infinity;
	const entryKeys = new Set(entries.map(e => makeEntryKey(e)));
	for (const [key, tile] of leaderboardTiles) {
		if (entryKeys.has(key) && !tile.removing) {
			maxBottom = Math.max(maxBottom, tile.y + metrics.rowHeight);
		}
	}
	const actualListH = maxBottom === -Infinity ? 0 : Math.max(0, maxBottom - metrics.top);
	const desiredContentH = metrics.titleSize + metrics.titleSpacing + actualListH;

	// Lerp an animated content height stored in state (collapses to 0 when closed)
	const t = currentSettings.menuAnimSpeed.value.number * delta;
	const targetContentH = desiredContentH;
	state.contentH = lerp(state.contentH, targetContentH, t);
	if (Math.abs(state.contentH - targetContentH) < 0.5) state.contentH = targetContentH;

	const rootX = metrics.rootX + metrics.barWidth * (1 - state.fade);

	// Outer and inner background panels (use animated state.contentH)
	// already computed in calculateMetrics so the layout knows about it
	const border = metrics.border;
	ctx.globalAlpha = state.fade * currentSettings.leaderboardAlpha.value.number * currentSettings.leaderboardBackgroundAlpha.value.number;
	// adjust rootX according to fade (slide animation)
	const outerX = rootX - 2 * metrics.padding - border + metrics.barWidth * (1 - state.fade);
	// keep the top margin constant regardless of border thickness
	const outerY = metrics.margin;
	const outerW = metrics.barWidth + 4 * metrics.padding + 2 * border;
	const outerH = state.contentH + 4 * metrics.padding + 2 * border;
	ctx.fillStyle = "#777777";
	ctx.fillRect(outerX, outerY, outerW, outerH);
	ctx.fillStyle = "#444444";
	ctx.fillRect(outerX + border + metrics.padding, outerY + border + metrics.padding, metrics.barWidth + 2 * metrics.padding, state.contentH + 2 * metrics.padding);
	ctx.globalAlpha = state.fade * currentSettings.leaderboardAlpha.value.number;

	// Title.
	const titleText = playerState.gui?.leaderboard?.title || "";
	if (titleText) {
		const bmp = renderText(titleText, metrics.titleSize, { fillStyle: "#FFFFFF" }, true, metrics.barWidth - 8);
		// shift title down by border so it stays inside the outer panel
		ctx.drawImage(
			bmp,
			rootX + Math.round((metrics.barWidth - bmp.width) / 2),
			metrics.margin + metrics.border + 2 * metrics.padding
		);
	}

	// Draw active tiles in server order, then any still-exiting tiles.
	const drawn = new Set();
	for (const entry of entries) {
		const key = makeEntryKey(entry);
		const tile = leaderboardTiles.get(key);
		if (tile) { drawTile(tile, ctx, metrics); drawn.add(key); }
	}
	for (const [key, tile] of leaderboardTiles) {
		if (!drawn.has(key)) drawTile(tile, ctx, metrics);
	}

}

leaderboard.drawFuncts.set("drawBars", drawBars);

function openLeaderboard(){
	state.active = true;
	leaderboard.drawFuncts.set("drawBars", drawBars)
}

function closeLeaderboard(){
	state.active = false;
}

function toggleLeaderboard(){
	if(state.active){
		closeLeaderboard();
	}else{
		openLeaderboard();
	}
}

export { state as leaderboardState, openLeaderboard, closeLeaderboard, toggleLeaderboard }