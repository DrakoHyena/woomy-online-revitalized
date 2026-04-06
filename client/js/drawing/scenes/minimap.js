import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { currentSettings } from "../../settings.js";
import { chatState } from "./chat.js";
import { roomState } from "../../state/room.js";
import { entitiesArr } from "../../socket.js";
import { resolveSkinAsset, drawCellTile } from "../tileUtils.js";
import { getEntityImage } from "../entity.js";
import { getColor } from "../../colors.js";
import { lerp } from "../../lerp.js";

// --- Config ---

const ANIM_SPEED = 1; // multiplier for fade animation (combined with menuAnimSpeed)

let minimapState = {
    active: true,
    fade: 1,
    margin: 10,
    padding: 5,
    width: 1,
    height: 1
}

const minimap = new Scene(10);
drawLoop.addScene("minimap", minimap);

// Cache for the full-map minimap image
// we allocate a single offscreen canvas once and never change its size thereafter
const MAX_CACHE_SIZE = 4096; // should be large enough for any map (ppc<=4)
const offscreenCacheCanvas = document.createElement('canvas');
offscreenCacheCanvas.width = MAX_CACHE_SIZE;
offscreenCacheCanvas.height = MAX_CACHE_SIZE;
const offscreenCacheCtx = offscreenCacheCanvas.getContext('2d');

const minimapCacheData = {
    dirty: true,
    canvas: offscreenCacheCanvas,
    bitmap: null, // ImageBitmap when available
    widthCells: 0,
    heightCells: 0,
    pixelsPerCell: 1,
    animatedCells: [],
    lastSkinVersion: null
};

function invalidateMinimapCache() {
    minimapCacheData.dirty = true;
    minimapCacheData.bitmap = null;
    // keep the persistent canvas around; contents will be overwritten on rebuild
    minimapCacheData.animatedCells.length = 0;
}

async function rebuildMinimapCache() {
    if (!roomState.cells || roomState.cells.length === 0) return;
    const mapWidthCells = roomState.cells[0].length;
    const mapHeightCells = roomState.cells.length;
    // Decide pixels-per-cell based on map size (cap to keep canvas reasonable)
    const pixelsPerCell = Math.min(4, Math.max(1, Math.floor(1024 / Math.max(mapWidthCells, mapHeightCells))));
    const cachePixelWidth = mapWidthCells * pixelsPerCell;
    const cachePixelHeight = mapHeightCells * pixelsPerCell;

    // verify that our single canvas can contain the drawing area
    if (cachePixelWidth > offscreenCacheCanvas.width || cachePixelHeight > offscreenCacheCanvas.height) {
        console.warn('Minimap cache canvas too small', cachePixelWidth, cachePixelHeight, 'max', offscreenCacheCanvas.width, offscreenCacheCanvas.height);
        // clipping will occur, but we don't resize the canvas again per requirements
    }

    // clear only the region we'll be using
    offscreenCacheCtx.clearRect(0, 0, cachePixelWidth, cachePixelHeight);

    const frameTick = Math.floor(performance.now() / 16);
    minimapCacheData.animatedCells.length = 0;

    const defaultResolved = resolveSkinAsset("default", frameTick);

    for (let mapY = 0; mapY < mapHeightCells; mapY++) {
        for (let mapX = 0; mapX < mapWidthCells; mapX++) {
            const cell = roomState.cells[mapY][mapX];
            if (cell === 'edge') continue;

            const resolved = (cell && resolveSkinAsset(cell, frameTick)) || defaultResolved;
            if (!resolved) continue; // asset not ready yet

            // Draw tile into cache canvas at 1..4 px per cell
            drawCellTile(offscreenCacheCtx, resolved.skin, resolved.asset, mapX * pixelsPerCell, mapY * pixelsPerCell, pixelsPerCell, pixelsPerCell, 0, 0, 1);

            if (resolved.skin.frameInterval && resolved.skin.frameInterval > 0) {
                minimapCacheData.animatedCells.push({ x: mapX, y: mapY, key: cell });
            }
        }
    }

    // update metadata; canvas reference already set at creation
    minimapCacheData.pixelsPerCell = pixelsPerCell;
    minimapCacheData.widthCells = mapWidthCells;
    minimapCacheData.heightCells = mapHeightCells;
    minimapCacheData.dirty = false;

    // Try to create an ImageBitmap for faster blits; fallback to using the canvas directly.
    try {
        minimapCacheData.bitmap = await createImageBitmap(offscreenCacheCanvas, 0, 0, cachePixelWidth, cachePixelHeight);
    } catch (err) {
        minimapCacheData.bitmap = null;
    }
}

function drawMinimap({ canvas, ctx, delta }) {
    // update fade state (used for alpha and horizontal sliding)
    const animationSpeedDelta = currentSettings.menuAnimSpeed.value.number * delta * ANIM_SPEED;
    if (minimapState.active) {
        minimapState.fade = lerp(minimapState.fade, 1, animationSpeedDelta);
    } else {
        minimapState.fade = lerp(minimapState.fade, 0, animationSpeedDelta);
        if (minimapState.fade < 0.01) {
            minimapState.fade = 0;
            minimap.drawFuncts.delete("drawMinimap");
        }
    }

    // opacity can be controlled by setting; multiply by menu fade
    const BASE_ALPHA = currentSettings.minimapOpacity ? currentSettings.minimapOpacity.value.number : 1;
    if (BASE_ALPHA === 0 || minimapState.fade === 0) return;

    // size of minimap as fraction of screen height (default 0.2 -> height/5)
    const sizeFraction = currentSettings.minimapSize ? currentSettings.minimapSize.value.number : 0.2;
    let minimapPixelHeight = canvas.height * sizeFraction;
    let minimapPixelWidth = minimapPixelHeight;
    const baseX = canvas.width - minimapPixelWidth - minimapState.margin;
    // slide off-screen to right when fading out/in
    let posX = baseX * minimapState.fade + canvas.width * (1 - minimapState.fade);
    // account for chat menu and any popup above it
    let posY = canvas.height - minimapPixelHeight - minimapState.margin - ((chatState.height + chatState.popupHeight + minimapState.margin) * chatState.fade);

    ctx.globalAlpha = BASE_ALPHA * minimapState.fade;
    ctx.fillStyle = "#777777";
    ctx.rect(posX, posY, minimapPixelWidth, minimapPixelHeight);
    ctx.fill();
    ctx.clip();
    posX += minimapState.padding;
    posY += minimapState.padding;
    minimapPixelWidth -= minimapState.padding * 2;
    minimapPixelHeight -= minimapState.padding * 2;
    // Draw inner area (leave a visible border, no extra content padding)
    ctx.fillStyle = "#666666";
    // Use a small fixed border thickness so we only have margin + border
    const border = 2;
    ctx.fillRect(posX + border, posY + border, minimapPixelWidth - border * 2, minimapPixelHeight - border * 2);
    // Content will fill the inner rectangle directly (no extra padding)
    posX += border;
    posY += border;
    minimapPixelWidth -= border * 2;
    minimapPixelHeight -= border * 2;

    // Draw cached map (rebuild if needed)
    if (roomState.cells && roomState.cells.length > 0) {
        const mapWidthCells = roomState.cells[0].length;
        const mapHeightCells = roomState.cells.length;

        if (minimapCacheData.dirty || minimapCacheData.widthCells !== mapWidthCells || minimapCacheData.heightCells !== mapHeightCells) {
            rebuildMinimapCache();
        }

        // Draw cached bitmap (or canvas fallback) using only the portion we actually built
        const srcPixelWidth = minimapCacheData.widthCells * minimapCacheData.pixelsPerCell;
        const srcPixelHeight = minimapCacheData.heightCells * minimapCacheData.pixelsPerCell;
        if (minimapCacheData.bitmap) {
            ctx.drawImage(minimapCacheData.bitmap, 0, 0, srcPixelWidth, srcPixelHeight, posX, posY, minimapPixelWidth, minimapPixelHeight);
        } else if (minimapCacheData.canvas) {
            ctx.drawImage(minimapCacheData.canvas, 0, 0, srcPixelWidth, srcPixelHeight, posX, posY, minimapPixelWidth, minimapPixelHeight);
        }

        // Animated cell overlays (render current frame for animated skins)
        if (minimapCacheData.animatedCells.length > 0) {
            const nowFrame = Math.floor(performance.now() / 16);
            const drawCellWidth = minimapPixelWidth / mapWidthCells;
            const drawCellHeight = minimapPixelHeight / mapHeightCells;
            for (const animatedCell of minimapCacheData.animatedCells) {
                const resolved = resolveSkinAsset(animatedCell.key, nowFrame);
                if (!resolved) continue;
                const left = posX + (animatedCell.x / mapWidthCells) * minimapPixelWidth;
                const top = posY + (animatedCell.y / mapHeightCells) * minimapPixelHeight;
                // Draw the animated frame scaled to the minimap cell size
                drawCellTile(ctx, resolved.skin, resolved.asset, left, top, drawCellWidth, drawCellHeight, 0, 0, 1);
            }
        }

        // Dynamic overlays: players / moving objects
        const drawCellWidth = minimapPixelWidth / mapWidthCells;
        const drawCellHeight = minimapPixelHeight / mapHeightCells;
        const scaleEntities = currentSettings.minimapScaleEntities.value.enabled;
        ctx.globalAlpha = 1;
        for (const entity of entitiesArr) {
            if (entity.isTurret) continue;
            const normalizedX = (entity.x) / (roomState.width || 1);
            const normalizedY = (entity.y) / (roomState.height || 1);
            const drawX = posX + normalizedX * minimapPixelWidth;
            const drawY = posY + normalizedY * minimapPixelHeight;

            // compute per-entity dimensions
            let cellW = drawCellWidth;
            let cellH = drawCellHeight;
            // true size toggle
            if (scaleEntities) {
                const factor = (entity.size * .02) || 1;
                cellW *= factor;
                cellH *= factor;
            }
            // additional user-controlled multiplier (always applied)
            const userFactor = currentSettings.minimapScaleFactor.value.number;
            cellW *= userFactor;
            cellH *= userFactor;

            switch (currentSettings.minimapRenderType.value.selected) {
                case "Circle": // Circle
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    let color = entity.color;
                    if (typeof color === "number") color = getColor(color);
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(drawX, drawY, cellW / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case "Entity Image": // Entity Image
                    const img = getEntityImage(entity, false, 1);
                    const ang = entity.facing;
                    const cosA = Math.cos(ang);
                    const sinA = Math.sin(ang);
                    ctx.setTransform(cosA, sinA, -sinA, cosA, drawX, drawY);
                    ctx.drawImage(img,
                        -cellW / 2,
                        -cellH / 2,
                        cellW,
                        cellH);
                    break;

                case "Live Render": // Live Render (WHY WOULD YOU EVER DO THIS)
                    const img2 = getEntityImage(entity, true, 1);
                    const ang2 = entity.facing;
                    const cosA2 = Math.cos(ang2);
                    const sinA2 = Math.sin(ang2);
                    ctx.setTransform(cosA2, sinA2, -sinA2, cosA2, drawX, drawY);
                    ctx.drawImage(img2,
                        -cellW / 2,
                        -cellH / 2,
                        cellW,
                        cellH);
                    break;
            }
        }
    }

    ctx.globalAlpha = 1;
}

minimap.drawFuncts.set("drawMinimap", drawMinimap);

function openMinimap() {
    minimapState.active = true;
    minimap.drawFuncts.set("drawMinimap", drawMinimap)
}

function closeMinimap() {
    minimapState.active = false;
}

function toggleMinimap() {
    if (minimapState.active) {
        closeMinimap();
    } else {
        openMinimap();
    }
}

export { toggleMinimap, openMinimap, closeMinimap, invalidateMinimapCache }
