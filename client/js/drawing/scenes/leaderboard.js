import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { lerp } from "../../lerp.js";
import { playerState } from "../../state/player.js";
import { mockups } from "../../mockups.js";
import { getEntityImage } from "../entity.js";
import { renderText, suffixNum } from "../text.js";
import { currentSettings } from "../../settings.js";
import { getColor } from "../../colors.js";
import { drawBar } from "../bar.js";

// --- Config ---
const ROW_HEIGHT_MULT = 0.028;
const ROW_MARGIN = 2.5;
const BAR_WIDTH_MULT = 0.27; // fraction of canvas height used for bar width
const BASE_MARGIN = 5;
const BASE_PADDING = 5;
const ANIM_SPEED = 0.8;

export const leaderboardState = {
    active: true,
    fade: 1,
    contentH: 0 // animated content height (lerps to fit lowest entry)
};

const leaderboard = new Scene(30);
drawLoop.addScene("leaderboard", leaderboard);

// Keyed by stable composite (name|label|entityIndex)
const leaderboardTiles = new Map();

function calculateMetrics(canvas, scale, borderMult) {
    const rowHeight = Math.round(canvas.height * ROW_HEIGHT_MULT * scale);
    const barWidth = Math.round(canvas.height * BAR_WIDTH_MULT * scale);

    const titleText = playerState.gui?.leaderboard?.title || "";
    const titleSize = titleText ? Math.round(rowHeight * 0.85) : 0;
    const titleSpacing = titleText ? Math.round(rowHeight * 0.25) : 0;

    const margin = BASE_MARGIN * scale;
    const padding = BASE_PADDING * scale;

    // compute border thickness once
    const borderBase = (canvas.width + canvas.height) / 2;
    const border = borderBase * 0.005 * borderMult * scale;

    const rootX = Math.round(canvas.width - margin - border - barWidth - 2 * padding);
    const top = margin + border + 2 * padding + titleSize + titleSpacing;

    return { rowHeight, rootX, barWidth, top, titleSize, titleSpacing, margin, padding, border };
}

function drawBars({ canvas, ctx, delta }) {
    // 1. Evaluate and cache all settings once per frame to prevent expensive proxy loop lookups
    const config = {
        animSpeed: currentSettings.menuAnimSpeed.value.number * ANIM_SPEED * delta,
        scale: currentSettings.leaderboardSize?.value.number ?? 1,
        borderMult: currentSettings.leaderboardBorderSize?.value.number ?? 1,
        alpha: currentSettings.leaderboardAlpha?.value.number ?? 1,
        bgAlpha: currentSettings.leaderboardBackgroundAlpha?.value.number ?? 1,
        squareBars: currentSettings.squareLeaderboardBars.value.enabled
    };

    // Fade logic
    if (leaderboardState.active) {
        leaderboardState.fade = lerp(leaderboardState.fade, 1, config.animSpeed);
    } else {
        leaderboardState.fade = lerp(leaderboardState.fade, 0, config.animSpeed);
        if (leaderboardState.fade < 0.01) {
            leaderboardState.fade = 0;
            leaderboard.drawFuncts.delete("drawBars");
            return; // Prevent invisible rendering execution
        }
    }

    const metrics = calculateMetrics(canvas, config.scale, config.borderMult);
    const entries = playerState.gui?.leaderboard?.entries || [];

    // Offset applied to the base X coordinates to handle sliding
    const slideOffset = metrics.barWidth * (1 - leaderboardState.fade);
    const currentRootX = metrics.rootX + slideOffset;

    // 2. Sync Tiles (Unified Pass)
    let topScore = 1;
    for (let i = 0; i < entries.length; i++) {
        if (entries[i].score > topScore) topScore = entries[i].score;
    }

    // Flag all existing tiles for removal
    for (const tile of leaderboardTiles.values()) {
        tile.removing = true;
    }

    const activeKeys = new Set();
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const entryKey = `${entry.name || ""}|${entry.label || ""}|${entry.index}`;
        activeKeys.add(entryKey);

        const targetY = metrics.top + i * (metrics.rowHeight + ROW_MARGIN);
        const targetWidth = Math.round((entry.score / topScore) * metrics.barWidth);

        let existing = leaderboardTiles.get(entryKey);
        if (existing) {
            existing.removing = false;
            existing.targetX = metrics.rootX;
            existing.targetY = targetY;
            existing.targetWidth = targetWidth;
            existing.score = entry.score;
            existing.name = entry.name;
            existing.label = entry.label;
            existing.nameColor = entry.nameColor || "#FFFFFF";
            existing.color = entry.color ?? 10;
            existing.entityIndex = entry.index;
            existing.rank = i;
        } else {
            leaderboardTiles.set(entryKey, {
                key: entryKey,
                entityIndex: entry.index,
                score: entry.score,
                displayScore: entry.score,
                name: entry.name,
                label: entry.label,
                nameColor: entry.nameColor || "#FFFFFF",
                color: entry.color ?? 10,
                targetY,
                y: targetY,
                x: canvas.width + 40,
                targetX: metrics.rootX,
                width: 0,
                targetWidth,
                alpha: 0,
                removing: false,
                rank: i
            });
        }
    }

    // 3. Update active tiles & measure dynamic layout height
    let maxBottom = -Infinity;
    for (const [key, tile] of leaderboardTiles) {
        if (tile.removing) {
            tile.x = lerp(tile.x, canvas.width + 50, config.animSpeed);
            tile.alpha = lerp(tile.alpha, 0, config.animSpeed);
            tile.width = lerp(tile.width, 0, config.animSpeed);
            if (tile.alpha < 0.01) {
                leaderboardTiles.delete(key);
                continue; // Skip height calculation mapping
            }
        } else {
            // Incorporate fade sliding into target lerp continuously 
            const dynamicTargetX = tile.targetX + slideOffset;
            tile.x = lerp(tile.x, dynamicTargetX, config.animSpeed);
            tile.y = lerp(tile.y, tile.targetY, config.animSpeed);
            tile.width = lerp(tile.width, tile.targetWidth, config.animSpeed);
            tile.alpha = lerp(tile.alpha, 1, config.animSpeed);
            tile.displayScore = lerp(tile.displayScore, tile.score, config.animSpeed);

            // Snap minor residuals
            if (Math.abs(tile.x - dynamicTargetX) < 0.5) tile.x = dynamicTargetX;
            if (Math.abs(tile.y - tile.targetY) < 0.5) tile.y = tile.targetY;
            if (Math.abs(tile.width - tile.targetWidth) < 0.5) tile.width = tile.targetWidth;

            maxBottom = Math.max(maxBottom, tile.y + metrics.rowHeight);
        }
    }

    // 4. Update Container Size
    const actualListH = maxBottom === -Infinity ? 0 : Math.max(0, maxBottom - metrics.top);
    const desiredContentH = metrics.titleSize + metrics.titleSpacing + actualListH;

    leaderboardState.contentH = lerp(leaderboardState.contentH, desiredContentH, config.animSpeed);
    if (Math.abs(leaderboardState.contentH - desiredContentH) < 0.5) leaderboardState.contentH = desiredContentH;

    // Save global canvas state to prevent visual leaks affecting other UI elements
    ctx.save();

    // 5. Draw Background Containers
    const outerX = currentRootX - 2 * metrics.padding - metrics.border;
    const outerY = metrics.margin;
    const outerW = metrics.barWidth + 4 * metrics.padding + 2 * metrics.border;
    const outerH = leaderboardState.contentH + 4 * metrics.padding + 2 * metrics.border;

    ctx.globalAlpha = leaderboardState.fade * config.alpha * config.bgAlpha;
    ctx.fillStyle = "#777777";
    ctx.fillRect(outerX, outerY, outerW, outerH);

    ctx.fillStyle = "#444444";
    ctx.fillRect(
        outerX + metrics.border + metrics.padding,
        outerY + metrics.border + metrics.padding,
        metrics.barWidth + 2 * metrics.padding,
        leaderboardState.contentH + 2 * metrics.padding
    );

    ctx.globalAlpha = leaderboardState.fade * config.alpha;

    // 6. Draw Title
    const titleText = playerState.gui?.leaderboard?.title || "";
    if (titleText) {
        const bmp = renderText(titleText, metrics.titleSize, { fillStyle: "#FFFFFF" }, true, metrics.barWidth - 8);
        ctx.drawImage(
            bmp,
            currentRootX + Math.round((metrics.barWidth - bmp.width) / 2),
            metrics.margin + metrics.border + 2 * metrics.padding
        );
    }

    // --- Tile Drawing Helper Function ---
    const drawSingleTile = (tile) => {
        const tileAlpha = tile.alpha * leaderboardState.fade * config.alpha;
        if (tileAlpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = tileAlpha;

        const pad = Math.max(6, Math.round(metrics.rowHeight * 0.12));
        const fillW = Math.max(0, Math.round(tile.width));
        const color = typeof tile.color === "string" ? tile.color : getColor(tile.color);

        const fillScalar = metrics.barWidth > 0 ? Math.max(0, fillW) / metrics.barWidth : 0;
        drawBar(ctx, tile.x, tile.y, metrics.barWidth, metrics.rowHeight, 4, color, "black", fillScalar, config.squareBars ? "square" : "round");

        // Mockup Icon
        if (tile.entityIndex !== undefined) {
            const mockup = mockups.get(tile.entityIndex);
            if (mockup && !mockup.isLoading) {
                mockup.color = color;
                const img = getEntityImage(mockup, false, 1.25);
                if (img) {
                    const maxSize = metrics.rowHeight;
                    const imgScale = maxSize / Math.max(img.width, img.height);

                    ctx.save();
                    ctx.translate(tile.x + Math.round(metrics.rowHeight / 2), tile.y + Math.round(metrics.rowHeight / 2));
                    ctx.scale(imgScale, imgScale);
                    ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    ctx.restore();
                }
            }
        }

        // Context Names and Labels
        const nameX = tile.x + metrics.rowHeight + pad;
        if (currentSettings.compactLeaderboard.value.enabled) {
            const nameBmp = renderText(tile.name || "", metrics.rowHeight * 0.6, { fillStyle: tile.nameColor });

            if (tile.label) {
                const labelPad = 25;
                const labelBmp = renderText(tile.label, metrics.rowHeight * 0.6, { fillStyle: "#CCCCCC" });
                const nameW = (metrics.barWidth * .65 - labelBmp.width) || 1
                ctx.drawImage(nameBmp, 0, 0, nameW - labelPad, nameBmp.height, nameX, Math.round(tile.y + (metrics.rowHeight - nameBmp.height) / 2), (nameW - labelPad), nameBmp.height);
                ctx.drawImage(labelBmp, nameX + nameW, Math.round(tile.y + (metrics.rowHeight - labelBmp.height) / 2));
            } else {
                ctx.drawImage(nameBmp, 0, 0, nameX, nameBmp.height, nameX, Math.round(tile.y + (metrics.rowHeight - nameBmp.height) / 2));
            }
        } else {
            const nameBmp = renderText(tile.name || "", metrics.rowHeight * 0.4, { fillStyle: tile.nameColor });
            if (tile.label) {
                const labelBmp = renderText(tile.label, metrics.rowHeight * 0.3, { fillStyle: "#CCCCCC" });
                const spacing = Math.max(2, Math.round(metrics.rowHeight * 0.015));
                const combinedH = nameBmp.height + spacing + labelBmp.height;
                const baseY = Math.round(tile.y + (metrics.rowHeight - combinedH) / 2);

                ctx.drawImage(nameBmp, nameX, baseY);
                ctx.drawImage(labelBmp, nameX, baseY + nameBmp.height);
            } else {
                ctx.drawImage(nameBmp, nameX, Math.round(tile.y + (metrics.rowHeight - nameBmp.height) / 2));
            }
        }

        // Target Score
        const scoreBmp = renderText(currentSettings.leaderboardRawScores.value.enabled ? `${Math.round(tile.displayScore)}` : suffixNum(tile.displayScore), metrics.rowHeight * 0.45, { fillStyle: "#FFFFFF" });

        ctx.drawImage(
            scoreBmp,
            Math.round(tile.x + metrics.barWidth - scoreBmp.width - pad),
            Math.round(tile.y + (metrics.rowHeight - scoreBmp.height) / 2)
        );

        ctx.restore();
    };

    // 7. Render Active Entries First (Native Z-Indexing Server Order)
    for (const entryKey of activeKeys) {
        const tile = leaderboardTiles.get(entryKey);
        if (tile) drawSingleTile(tile);
    }

    // 8. Render Exiting Tiles Behind/Afterwards
    for (const [key, tile] of leaderboardTiles) {
        if (!activeKeys.has(key)) drawSingleTile(tile);
    }

    ctx.restore(); // Clean up context block scope
}

leaderboard.drawFuncts.set("drawBars", drawBars);

export function openLeaderboard() {
    leaderboardState.active = true;
    leaderboard.drawFuncts.set("drawBars", drawBars);
}

export function closeLeaderboard() {
    leaderboardState.active = false;
}

export function toggleLeaderboard() {
    leaderboardState.active ? closeLeaderboard() : openLeaderboard();
}
