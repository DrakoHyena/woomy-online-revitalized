import { rewardManager } from "../../achievements.js";
import { lerp, lerpAngle } from "../../lerp.js";
import { multiplayer } from "../../multiplayer.js";
import { playerState } from "../../state/player.js";
import { connectClientSocket, socket } from "../../socket.js";
import { getWOSocketId, util } from "../../util.js";
import { drawLoop } from "../drawLoop.js";
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
import { clientPackets } from "../../../../shared/packetIds.js";
import { mockups } from "../../mockups.js";

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

const main = new Scene(document.getElementById("mainCanvas"));
drawLoop.scenes.set("main", main);

function onInputTrue(key){
	switch(key){
		case "n":
			socket.send(clientPackets.levelUp)
		break;
	}
}

function onInputFalse(key){

}

main.utilityFuncts.set("mockups", ({ canvas, ctx, delta }) => {
	mockups.flushPending();
})

main.utilityFuncts.set("gameInput", ({ canvas, ctx, delta }) => {
	if(state.lastInput.changes.length > currentSettings.inputBufferSize.value.number) state.lastInput.changes.length = 0;
	
	//console.log(playerState.entity)
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
	for(let key in keyboard.keys){
		const newVal = keyboard.keys[key]
		const oldVal = state.lastInput.keyboard[key];
		if(newVal !== oldVal){
			state.lastInput.keyboard[key] = newVal;
			state.lastInput.changes.push(key, newVal)
			if(newVal === true){
				onInputTrue(key);
			}else{
				onInputFalse(key);
			}
		}
	}
	state.lastInput.changes.push(-1) // end of block flag
})

main.drawFuncts.set("clear", ({ canvas, ctx, delta }) => {
	ctx.globalAlpha = 1;
	ctx.fillStyle = "#a0a0a0";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Update screenScale based on FOV each frame
	const fov = playerState.camera.fov || 1;
	state.screenScale = Math.max(canvas.width / fov, canvas.height / fov / 9 * 16);
})

main.drawFuncts.set("background", ({ canvas, ctx, delta }) => {
	if (roomState.mapType !== 1) {
		const W = roomState.cells[0].length;
		const H = roomState.cells.length;
		const cellWidth = roomState.width / W;
		const cellHeight = roomState.height / H;
    
		const scaledCellWidth = state.screenScale * cellWidth;
		const scaledCellHeight = state.screenScale * cellHeight;
		const offsetX = canvas.width / 2 - state.screenScale * playerState.camera.x;
		const offsetY = canvas.height / 2 - state.screenScale * playerState.camera.y;

		state.frame++;

		// Render in-bounds cells
		for (let y = 0; y < H; y++) {
			const top = state.screenScale * y * cellHeight + offsetY;
			const bottom = top + scaledCellHeight;
			if (bottom < 0 || top > canvas.height) continue;

			const row = roomState.cells[y];
			for (let x = 0; x < W; x++) {
				const left = state.screenScale * x * cellWidth + offsetX;
				const right = left + scaledCellWidth;
				if (right < 0 || left > canvas.width) continue;

				const cell = row[x];
				if (cell === "edge") continue;

				// Use cell skin if available, else fallback to default
				let cellSkin = null, asset = null;
				if (cell && roomState.cellSkins[cell] && Array.isArray(roomState.cellSkins[cell].assets) && roomState.cellSkins[cell].assets.length > 0) {
					cellSkin = roomState.cellSkins[cell];
					const assetIndex = (!cellSkin.frameInterval || cellSkin.frameInterval === 0) ? 0 : Math.floor(state.frame / cellSkin.frameInterval) % cellSkin.assets.length;
					const assetObj = getAsset(cellSkin.assets[assetIndex]);
					asset = assetObj && assetObj.data ? assetObj.data : null;
				} else if (roomState.cellSkins["default"] && Array.isArray(roomState.cellSkins["default"].assets) && roomState.cellSkins["default"].assets.length > 0) {
					cellSkin = roomState.cellSkins["default"];
					const assetIndex = (!cellSkin.frameInterval || cellSkin.frameInterval === 0) ? 0 : Math.floor(state.frame / cellSkin.frameInterval) % cellSkin.assets.length;
					const assetObj = getAsset(cellSkin.assets[assetIndex]);
					asset = assetObj && assetObj.data ? assetObj.data : null;
				}

				if (!cellSkin || !asset) continue;

				if (cellSkin.repeat) {
					const pattern = ctx.createPattern(asset, "repeat");
					ctx.save();
					ctx.fillStyle = pattern;
					ctx.translate(offsetX, offsetY);
					ctx.scale(state.screenScale, state.screenScale);
					ctx.fillRect((left - 1 - offsetX) / state.screenScale, (top - 1 - offsetY) / state.screenScale, (scaledCellWidth + 2) / state.screenScale, (scaledCellHeight + 2) / state.screenScale);
					ctx.restore();
				} else if (cellSkin.stretch) {
					ctx.drawImage(asset, left - 1, top - 1, scaledCellWidth + 2, scaledCellHeight + 2);
				}
			}
		}

		// Calculate visible cell range
		const minX = Math.floor((-offsetX) / scaledCellWidth) - 1;
		const maxX = Math.ceil((canvas.width - offsetX) / scaledCellWidth) + 1;
		const minY = Math.floor((-offsetY) / scaledCellHeight) - 1;
		const maxY = Math.ceil((canvas.height - offsetY) / scaledCellHeight) + 1;

		// Get boundary cell skin and asset, with safety checks
		const boundaryCellSkin = roomState.cellSkins["boundary"];
		let boundaryAsset = null;
		if (boundaryCellSkin && Array.isArray(boundaryCellSkin.assets) && boundaryCellSkin.assets.length > 0) {
			const boundaryAssetIndex = (!boundaryCellSkin.frameInterval || boundaryCellSkin.frameInterval === 0) ? 0 : Math.floor(state.frame / boundaryCellSkin.frameInterval) % boundaryCellSkin.assets.length;
			const assetObj = getAsset(boundaryCellSkin.assets[boundaryAssetIndex]);
			if (assetObj && assetObj.data) {
				boundaryAsset = assetObj.data;
			}
		}

		// Render out-of-bounds (boundary) cells
		for (let y = minY; y < maxY; y++) {
			const top = state.screenScale * y * cellHeight + offsetY;
			const bottom = top + scaledCellHeight;
			if (bottom < 0 || top > canvas.height) continue;

			for (let x = minX; x < maxX; x++) {
				// Only draw if out of bounds
				if (y >= 0 && y < H && x >= 0 && x < W) continue;

				const left = state.screenScale * x * cellWidth + offsetX;
				const right = left + scaledCellWidth;
				if (right < 0 || left > canvas.width) continue;

				if (!boundaryCellSkin || !boundaryAsset) continue;

				if (boundaryCellSkin.repeat) {
					const pattern = ctx.createPattern(boundaryAsset, "repeat");
					ctx.save();
					ctx.fillStyle = pattern;
					ctx.translate(offsetX, offsetY);
					ctx.scale(state.screenScale, state.screenScale);
					ctx.fillRect((left - 1 - offsetX) / state.screenScale, (top - 1 - offsetY) / state.screenScale, (scaledCellWidth + 2) / state.screenScale, (scaledCellHeight + 2) / state.screenScale);
					ctx.restore();
				} else if (boundaryCellSkin.stretch) {
					ctx.drawImage(boundaryAsset, left - 1, top - 1, scaledCellWidth + 2, scaledCellHeight + 2);
				}
			}
		}
	}
	// TODO: Circle Map
	// } else if (roomState.mapType === 1) {
	// 	const xx = -px + global._screenWidth / 2 + ratio * global._gameWidth / 2;
	// 	const yy = -py + global._screenHeight / 2 + ratio * global._gameHeight / 2;
	// 	const radius = ratio * global._gameWidth / 2;
	// 	ctx.fillStyle = color.white;
	// 	ctx.globalAlpha = 1;
	// 	ctx.beginPath();
	// 	ctx.arc(xx, yy, radius, 0, TAU);
	// 	ctx.closePath();
	// 	ctx.fill();
	// }
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

		const render = getEntityImage(entity, true, 1.25); // Add padding to accomadate border width and other misc things
		const screenX = state.screenScale * entity.x + offsetX;
		const screenY = state.screenScale * entity.y + offsetY;
		const entitySize = entity.size || 1;
		const scale = state.screenScale * render.upscaleVal

		ctx.save();
		ctx.translate(screenX, screenY);
		ctx.scale(scale, scale);
		ctx.globalAlpha = entity.alpha;

		let scoreText = { height: 0 };
		let nameText = { height: 0};
		if(entity.score){
			scoreText = renderText(entity.score, entitySize*2);
			ctx.drawImage(scoreText, -scoreText.width/2, -render.height/2 - scoreText.height/2);
		}
		if(entity.name){
			nameText = renderText(entity.name, entitySize*3);
			ctx.drawImage(nameText, -nameText.width/2, -render.height/2 - scoreText.height - nameText.height/2)
		}
	
		ctx.rotate(entity.facing);
		ctx.drawImage(render, -render.width / 2, -render.height / 2);
		ctx.restore();
	};

	if(currentSettings.showFps.value.enabled){
		ctx.globalAlpha = .25;
		const text = renderText(`${drawLoop.fps}FPS`);
		ctx.drawImage(text, canvas.width/2-text.width/2, canvas.height/2-text.height/2)
		ctx.globalAlpha = 1;
	}
})

async function startGame(gamemodeCode, joinRoomId, maxPlayers, maxBots){
	drawLoop.start();

    document.getElementById("startMenuWrapper").remove();
	document.getElementById("legalDisclaimer").remove()
    document.getElementById("mainWrapper").remove()
    
	playerState.name = util._cleanString(document.getElementById("nameInput").value || "", 25)
    playerState.socketName = playerState.name.split('').map(x=>x.charCodeAt());
    if (playerState.name === "") rewardManager.unlockAchievement("anonymous");

    if (window.creatingRoom === true) { // Create game
		openLoadingScreen("Downloading Server...", "")
        window.serverWorker = new Worker("./server/server.js", {type:"module"});
		window.serverWorker.onerror = function(err){
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
    await connectClientSocket(joinRoomId).catch((err)=>{
		openLoadingScreen("Connection Timed Out", "There was an issue connecting to this player. Try a different room or make your own and play alone for the time being.")
		throw err;
	})
	
	openLoadingScreen("Loading Assets...", "(0/0)")
	await new Promise((res, rej)=>{
		window.assetLoadingPromise = res;
		socket.send("as");
	})
	
	openLoadingScreen("Loading Room...", "")
    console.log(socket)
    socket.send("s", 0, playerState.socketName.toString(), 1, getWOSocketId());
    window.selectedRoomId = joinRoomId;

    document.getElementById("gameCanvas").focus();
	closeLoadingScreen("Have Fun", ":)")
	closeLoadingScreen()
}

export { startGame, state as gameState }