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
import { mockups } from "../../mockups.js";

// --- Config ---

const ANIM_SPEED = 1; // multiplier for fade animation (combined with menuAnimSpeed)

export let minimapState = {
    x: 0,
    y: 0,
    active: true,
    fade: 1,
    margin: 10,
    padding: 5,
    width: 1,
    height: 1
};

const minimap = new Scene(10);
drawLoop.addScene("minimap", minimap);

// Cache for the full-map minimap image
const offscreenCacheCanvas = document.createElement('canvas');
const offscreenCacheCtx = offscreenCacheCanvas.getContext('2d', { willReadFrequently: true });

const minimapCacheData = {
    dirty: true,
    isRebuilding: false,
    canvas: offscreenCacheCanvas,
    bitmap: null,
    widthCells: 0,
    heightCells: 0,
    animatedCells: []
};

export function invalidateMinimapCache() {
    minimapCacheData.dirty = true;
    if (minimapCacheData.bitmap) {
        minimapCacheData.bitmap.close();
        minimapCacheData.bitmap = null;
    }
    minimapCacheData.animatedCells.length = 0;
}

async function rebuildMinimapCache() {
    if (!roomState.cells || roomState.cells.length === 0 || !roomState.cells[0] || minimapCacheData.isRebuilding) return;

    minimapCacheData.isRebuilding = true;

    const mapWidthCells = roomState.cells[0].length;
    const mapHeightCells = roomState.cells.length;

    // Removed the awful "4px clamp". We now dynamically target a high-res 1024px space 
    // to prevent browsers from distorting tiny blocks during downscaling.
    const TARGET_CACHE_DIM = 1024;
    const pixelsPerCell = TARGET_CACHE_DIM / Math.max(mapWidthCells, mapHeightCells);

    const cachePixelWidth = Math.ceil(mapWidthCells * pixelsPerCell);
    const cachePixelHeight = Math.ceil(mapHeightCells * pixelsPerCell);

    if (offscreenCacheCanvas.width !== cachePixelWidth || offscreenCacheCanvas.height !== cachePixelHeight) {
        offscreenCacheCanvas.width = cachePixelWidth;
        offscreenCacheCanvas.height = cachePixelHeight;
    } else {
        offscreenCacheCtx.clearRect(0, 0, cachePixelWidth, cachePixelHeight);
    }

    const frameTick = Math.floor(performance.now() / 16);
    minimapCacheData.animatedCells.length = 0;

    const defaultResolved = resolveSkinAsset("default", frameTick);

    for (let mapY = 0; mapY < mapHeightCells; mapY++) {
        for (let mapX = 0; mapX < mapWidthCells; mapX++) {
            const cell = roomState.cells[mapY][mapX];
            if (cell === 'edge') continue;

            const resolved = (cell && resolveSkinAsset(cell, frameTick)) || defaultResolved;
            if (!resolved) continue;

            // Proper mathematical bounds snapping to ensure absolutely zero gaps between tessellated cells
            const drawX = Math.floor(mapX * pixelsPerCell);
            const drawY = Math.floor(mapY * pixelsPerCell);
            const drawW = Math.ceil((mapX + 1) * pixelsPerCell) - drawX;
            const drawH = Math.ceil((mapY + 1) * pixelsPerCell) - drawY;

            drawCellTile(offscreenCacheCtx, resolved.skin, resolved.asset, drawX, drawY, drawW, drawH, 0, 0, 1);

            if (resolved.skin.frameInterval && resolved.skin.frameInterval > 0) {
                minimapCacheData.animatedCells.push({ x: mapX, y: mapY, key: cell });
            }
        }
    }

    minimapCacheData.widthCells = mapWidthCells;
    minimapCacheData.heightCells = mapHeightCells;
    minimapCacheData.dirty = false;

    // Free the old bitmap to prevent massive memory leaks
    if (minimapCacheData.bitmap) {
        minimapCacheData.bitmap.close();
        minimapCacheData.bitmap = null;
    }

    try {
        minimapCacheData.bitmap = await createImageBitmap(offscreenCacheCanvas);
    } catch (err) {
        minimapCacheData.bitmap = null;
    }

    minimapCacheData.isRebuilding = false;
}

function drawMinimap({ canvas, ctx, delta }) {
    const animationSpeedDelta = currentSettings.menuAnimSpeed.value.number * delta * ANIM_SPEED;

    if (minimapState.active) {
        minimapState.fade = lerp(minimapState.fade, 1, animationSpeedDelta);
    } else {
        minimapState.fade = lerp(minimapState.fade, 0, animationSpeedDelta);
        if (minimapState.fade < 0.01) {
            minimapState.fade = 0;
            minimap.drawFuncts.delete("drawMinimap");
            return;
        }
    }

    const BASE_ALPHA = currentSettings.minimapOpacity ? currentSettings.minimapOpacity.value.number : 1;
    const currentAlpha = BASE_ALPHA * minimapState.fade;

    if (currentAlpha <= 0) return;

    ctx.save();

    // 1. Establish the True Physical Map Ratio First
    let mapRatio = 1;
    if (roomState.width && roomState.height) {
        mapRatio = roomState.width / roomState.height;
    } else if (roomState.cells && roomState.cells.length > 0 && roomState.cells[0]) {
        mapRatio = roomState.cells[0].length / roomState.cells.length;
    }

    // 2. Establish Size Allowances
    const sizeFraction = currentSettings.minimapSize ? currentSettings.minimapSize.value.number : 0.2;
    const maxTotalSize = canvas.height * sizeFraction;

    const padding = minimapState.padding;
    const border = 2;
    const totalDecorations = (padding + border) * 2;

    const maxInnerSize = Math.max(1, maxTotalSize - totalDecorations);

    // 3. Size the INNER playing area accurately so it never warps/distorts
    let innerWidth = maxInnerSize;
    let innerHeight = maxInnerSize;

    if (mapRatio > 1) {
        innerHeight = maxInnerSize / mapRatio;
    } else if (mapRatio < 1) {
        innerWidth = maxInnerSize * mapRatio;
    }

    // 4. Wrap outer UI bounds around the perfect inner dimensions
    const minimapPixelWidth = innerWidth + totalDecorations;
    const minimapPixelHeight = innerHeight + totalDecorations;

    const baseX = canvas.width - minimapPixelWidth - minimapState.margin;
    let posX = baseX * minimapState.fade + canvas.width * (1 - minimapState.fade);
    let posY = canvas.height - minimapPixelHeight - minimapState.margin - ((chatState.height + chatState.popupHeight + minimapState.margin) * chatState.fade);

    // Snap outer container to absolute physical pixels for crispness
    posX = Math.round(posX);
    posY = Math.round(posY);

    minimapState.x = posX;
    minimapState.y = posY;

    ctx.globalAlpha = currentAlpha;

    // Outer Background Box
    ctx.fillStyle = "#777777";
    ctx.beginPath();
    ctx.rect(posX, posY, minimapPixelWidth, minimapPixelHeight);
    ctx.fill();
    ctx.clip();

    // Inner Playable Box area Setup
    const drawAreaX = posX + padding + border;
    const drawAreaY = posY + padding + border;

    ctx.fillStyle = "#666666";
    ctx.fillRect(drawAreaX, drawAreaY, innerWidth, innerHeight);

    if (roomState.cells && roomState.cells.length > 0 && roomState.cells[0]) {
        const mapWidthCells = roomState.cells[0].length;
        const mapHeightCells = roomState.cells.length;

        if (minimapCacheData.dirty || minimapCacheData.widthCells !== mapWidthCells || minimapCacheData.heightCells !== mapHeightCells) {
            rebuildMinimapCache();
        }

        const activeSource = minimapCacheData.bitmap || minimapCacheData.canvas;

        // 5. Draw the map!
        if (activeSource.width > 0 && activeSource.height > 0) {
            ctx.drawImage(activeSource, 0, 0, activeSource.width, activeSource.height, drawAreaX, drawAreaY, innerWidth, innerHeight);
        }

        const drawCellWidth = innerWidth / mapWidthCells;
        const drawCellHeight = innerHeight / mapHeightCells;

        // 6. Draw Animated Cells directly onto exactly proportional locations
        if (minimapCacheData.animatedCells.length > 0) {
            const nowFrame = Math.floor(performance.now() / 16);
            for (const animatedCell of minimapCacheData.animatedCells) {
                const resolved = resolveSkinAsset(animatedCell.key, nowFrame);
                if (!resolved) continue;

                const exactLeft = drawAreaX + (animatedCell.x / mapWidthCells) * innerWidth;
                const exactTop = drawAreaY + (animatedCell.y / mapHeightCells) * innerHeight;

                drawCellTile(ctx, resolved.skin, resolved.asset, exactLeft, exactTop, drawCellWidth, drawCellHeight, 0, 0, 1);
            }
        }

        // 7. Dynamic Entities
        ctx.globalAlpha = 1;

        const scaleEntities = currentSettings.minimapScaleEntities.value.enabled;
        const userFactor = currentSettings.minimapScaleFactor.value.number;
        const renderType = currentSettings.minimapRenderType.value.selected;

        const roomW = roomState.width || 1;
        const roomH = roomState.height || 1;

        for (const entity of entitiesArr) {
            if (entity.isTurret) continue;

            const drawX = drawAreaX + (entity.x / roomW) * innerWidth;
            const drawY = drawAreaY + (entity.y / roomH) * innerHeight;

            let cellW = drawCellWidth * userFactor;
            let cellH = drawCellHeight * userFactor;

            if (scaleEntities) {
                const factor = (entity.size * 0.02) || 1;
                cellW *= factor;
                cellH *= factor;
            }

            ctx.save();
            ctx.translate(drawX, drawY);

            if (renderType === "Circle") {
                let color = entity.color;
                if (typeof color === "number") color = getColor(color);
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(cellW, cellH) / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                const isLive = (renderType === "Live Render");
                const img = getEntityImage(entity, isLive, 1);
                ctx.rotate(entity.facing);
                ctx.drawImage(img, -cellW / 2, -cellH / 2, cellW, cellH);
            }

            ctx.restore();
        }
    }

    ctx.restore();
}

minimap.drawFuncts.set("drawMinimap", drawMinimap);

export function openMinimap() {
    minimapState.active = true;
    minimap.drawFuncts.set("drawMinimap", drawMinimap);
}

export function closeMinimap() {
    minimapState.active = false;
}

export function toggleMinimap() {
    minimapState.active ? closeMinimap() : openMinimap();
}
