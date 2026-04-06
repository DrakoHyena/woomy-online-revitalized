import { multiplayer } from "../../multiplayer.js";
import { playerState } from "../../state/player.js";
import { connectClientSocket, socket } from "../../socket.js";
import { getWOSocketId, util } from "../../util.js";
import { canvas, drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { renderText } from "../text.js";
import { closeLoadingScreen, openLoadingScreen } from "./loadingScreen.js";
import { settingsState } from "./settings.js";
import { roomState } from "../../state/room.js";
import { ASSET_MAGIC, getAsset, loadAsset } from "../../../../shared/assets.js";
import { getEntityImage } from "../entity.js";
import { currentSettings } from "../../settings.js";
import { entitiesArr } from "../../socket.js";
import { keyboard } from "../../controls/keyboard.js";
import { mouse } from "../../controls/mouse.js";
import { mockups } from "../../mockups.js";
import "./nameplate.js"
import { resolveSkinAsset, drawCellTile } from "../tileUtils.js";

const state = {
    renderingStarted: false,
    screenScale: 1,
    fovScale: 1,
    frame: 0,
    lastInput: {
        keyboard: {},
        changes: []
    }
}

const main = new Scene(0);
drawLoop.addScene("main", main);

main.utilityFuncts.set("mockups", ({ canvas, ctx, delta }) => {
    mockups.flushPending();
})

main.utilityFuncts.set("gameInput", ({ canvas, ctx, delta }) => {
    if (state.lastInput.changes.length > currentSettings.inputBufferSize.value.number) state.lastInput.changes.length = 0;

    // Compute target inline relative to the camera (mouse offset from canvas center, scaled)
    const rect = canvas.getBoundingClientRect();
    const posX = (mouse.x - rect.left) * (canvas.width / rect.width);
    const posY = (mouse.y - rect.top) * (canvas.height / rect.height);
    const ss = state.screenScale || 1;
    const targetX = (posX - canvas.width / 2) / ss;
    const targetY = (posY - canvas.height / 2) / ss;

    state.lastInput.changes.push(
        targetX,
        targetY,
        mouse.buttons.left,
        mouse.buttons.middle,
        mouse.buttons.right,
        mouse.scrollY
    )
    for (let key in keyboard.keys) {
        const newVal = keyboard.locked ? false : keyboard.keys[key]
        const oldVal = !!state.lastInput.keyboard[key];
        if (newVal !== oldVal) {
            state.lastInput.keyboard[key] = newVal;
            state.lastInput.changes.push(key, newVal)
        }
    }
    state.lastInput.changes.push(-1) // end of block flag
})

main.drawFuncts.set("clear", ({ canvas, ctx, delta }) => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#a0a0a0";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update screenScale based on FOV each frame
    const fov = playerState.camera.fov || 1;
    state.screenScale = Math.max(canvas.width / fov, canvas.height / fov / 9 * 16);
})



main.drawFuncts.set("background", ({ canvas, ctx, delta }) => {
    if (roomState.mapType === 1) return;

    // ── Grid dimensions & camera transform ──────────────────────────
    const W = roomState.cells[0].length;
    const H = roomState.cells.length;
    const cellW = roomState.width / W;
    const cellH = roomState.height / H;

    const scale = state.screenScale;
    const scaledW = scale * cellW;
    const scaledH = scale * cellH;
    const offsetX = canvas.width / 2 - scale * playerState.camera.x;
    const offsetY = canvas.height / 2 - scale * playerState.camera.y;

    state.frame++;

    // ── Pre-resolve the "default" fallback skin once ────────────────
    const defaultResolved = resolveSkinAsset("default", state.frame);

    // ── Render in-bounds cells ──────────────────────────────────────
    for (let y = 0; y < H; y++) {
        const top = scale * y * cellH + offsetY;
        if (top + scaledH < 0 || top > canvas.height) continue;

        const row = roomState.cells[y];
        for (let x = 0; x < W; x++) {
            const left = scale * x * cellW + offsetX;
            if (left + scaledW < 0 || left > canvas.width) continue;

            const cell = row[x];
            if (cell === "edge") continue;

            // Resolve skin: cell-specific → default fallback
            const resolved = (cell && resolveSkinAsset(cell, state.frame)) || defaultResolved;

            drawCellTile(ctx, resolved.skin, resolved.asset, left, top, scaledW, scaledH, offsetX, offsetY, scale);
        }
    }

    // ── Render out-of-bounds (boundary) cells ───────────────────────
    const boundaryResolved = resolveSkinAsset("boundary", state.frame);
    if (!boundaryResolved) return;

    const minX = Math.floor(-offsetX / scaledW) - 1;
    const maxX = Math.ceil((canvas.width - offsetX) / scaledW) + 1;
    const minY = Math.floor(-offsetY / scaledH) - 1;
    const maxY = Math.ceil((canvas.height - offsetY) / scaledH) + 1;

    for (let y = minY; y < maxY; y++) {
        const top = scale * y * cellH + offsetY;
        if (top + scaledH < 0 || top > canvas.height) continue;

        for (let x = minX; x < maxX; x++) {
            if (y >= 0 && y < H && x >= 0 && x < W) continue; // skip in-bounds

            const left = scale * x * cellW + offsetX;
            if (left + scaledW < 0 || left > canvas.width) continue;

            drawCellTile(ctx, boundaryResolved.skin, boundaryResolved.asset, left, top, scaledW, scaledH, offsetX, offsetY, scale);
        }
    }
})

main.drawFuncts.set("entities", ({ canvas, ctx, delta }) => {
    const offsetX = canvas.width / 2 - state.screenScale * playerState.camera.x;
    const offsetY = canvas.height / 2 - state.screenScale * playerState.camera.y;

    for (let i = 0; i < entitiesArr.length; i++) {
        const entity = entitiesArr[i];
        if (entity.isTurret) continue;

        if (entity.id === playerState.entityId) {
            playerState.entity = entity;
            playerState.gameName = entity.name == null ? mockups.get(entity.index).name : entity.name;
        }

        const render = getEntityImage(entity, false, 1.25); // Add padding to accomadate border width and other misc things
        if (!render) continue; // ImageBitmap not ready yet, skip this frame

        const screenX = state.screenScale * entity.x + offsetX;
        const screenY = state.screenScale * entity.y + offsetY;
        const entitySize = entity.size || 1;
        const scale = state.screenScale * render.upscaleVal;

        ctx.globalAlpha = entity.alpha;

        // Draw entity image (rotated) using setTransform
        const cos = Math.cos(entity.facing) * scale;
        const sin = Math.sin(entity.facing) * scale;
        ctx.setTransform(cos, sin, -sin, cos, screenX, screenY);
        ctx.drawImage(render, -render.width / 2, -render.height / 2);

        // Draw text (scaled with entity, but not rotated)
        let scoreText = { height: 0 };
        let nameText = { height: 0 };
        if (entity.score || entity.name) {
            ctx.setTransform(1, 0, 0, 1, screenX, screenY);
            const baseTextSize = state.screenScale * entitySize * .75;
            const textYOffset = -(render.height * scale) * .5;
            if (entity.score) {
                scoreText = renderText(entity.score.toString(), baseTextSize || 1);
                if (scoreText) ctx.drawImage(scoreText, -scoreText.width / 2, textYOffset - scoreText.height);
            }
            if (entity.name) {
                nameText = renderText(entity.name, baseTextSize || 1, { fillStyle: entity.nameColor || "#FFFFFF" }, true, render.width);
                if (nameText) ctx.drawImage(nameText, -nameText.width / 2, textYOffset - nameText.height - scoreText.height);
            }
        }
    };

    // Reset transform and alpha after entity loop
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    if (currentSettings.showFps.value.enabled) {
        ctx.globalAlpha = .25;
        const text = renderText(`${drawLoop.measuredFps}FPS|${drawLoop._targetFps | 0}`);
        ctx.drawImage(text, canvas.width / 2 - text.width / 2, canvas.height / 2 - text.height / 2)
        ctx.globalAlpha = 1;
    }
})
async function startGame(gamemodeCode, joinRoomId, maxPlayers, maxBots) {
    drawLoop.start();

    document.getElementById("startMenuWrapper").remove();
    document.getElementById("legalDisclaimer").remove()
    document.getElementById("mainWrapper").remove()

    playerState.name = util._cleanString(document.getElementById("nameInput").value || "", 25)
    playerState.socketName = playerState.name.split('').map(x => x.charCodeAt());

    if (window.creatingRoom === true) { // Create game
        openLoadingScreen("Downloading Server...", "")
        window.serverWorker = new Worker("./server/server.js", { type: "module" });
        window.serverWorker.onerror = function(err) {
            openLoadingScreen("Failed to Start Server", "Please reload the page and try again")
            console.error(err)
        }
        openLoadingScreen("Starting Server...", "")
        console.log("Starting server...")
        await multiplayer.startServerWorker(gamemodeCode, undefined, undefined, maxPlayers, maxBots)
        console.log("...Server started!")
        window.serverWorker.onerror = undefined;
        await multiplayer.wrmHost()
        joinRoomId = await multiplayer.getHostRoomId();
        settingsState.showEntityEditor = true;
    }

    openLoadingScreen("Joining Server...", "")
    await connectClientSocket(joinRoomId).catch((err) => {
        openLoadingScreen("Connection Timed Out", "There was an issue connecting to this player. Try a different room or make your own and play alone for the time being.")
        throw err;
    })

    openLoadingScreen("Loading Assets...", "(0/0)")
    await new Promise((res, rej) => {
        window.assetLoadingPromise = res;
        socket.send("as");
    })

    openLoadingScreen("Loading Room...", "")
    console.log(socket)
    socket.send("s", 0, playerState.socketName.toString(), 1, getWOSocketId());
    window.selectedRoomId = joinRoomId;

    closeLoadingScreen("Have Fun", ":)")
}

export { startGame, state as gameState }
