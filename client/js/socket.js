import { global } from "./global.js";
import { util } from "./util.js"
import { logger } from "./debug.js"
import { rewardManager } from "./achievements.js"
import { color } from "./colors.js";
import { mixColors } from "../../shared/mix_colors.js";
import { mockups } from "./mockups.js";
import { Smoothbar } from "./util.js";
import { multiplayer } from "./multiplayer.js";
import { fasttalk } from "./fasttalk.js";
import { lerp, lerpAngle } from "./lerp.js";
import { ASSET_MAGIC, loadAsset, setAsset } from "../../shared/assets.js";
import "./consoleCommands.js"
import { drawVignette } from "./drawing/vignette.js";
import { player } from "./player.js";
import { currentSettings } from "./settings.js";
import { loadingScreenState } from "./drawing/scenes/loadingScreen.js";
import { roomState } from "./state/room.js";
import { playerState } from "./state/player.js";
import { blurAllTextNumberInputs } from "./drawing/inputElements.js";
import { serverPackets, clientPackets } from "../../shared/packetIds.js";
import { gameState } from "./drawing/scenes/game.js";
import { ChatMessage, mutedSenders } from "./drawing/scenes/chat.js";

let entities = new Map();
const entitiesArr = [];
const missingEntityIds = new Set();
const laserMap = new Map();
const metrics = { _serverCpuUsage: 0, _serverMemUsage: 0 };
const socket = {
	open: false,
	onmessage: onmessage,
	send: (...e) => { multiplayer.playerPeer.send(fasttalk.encode(e)) },
}

// CONVERT //
const convert = {
	reader: {
		index: 0,
		crawlData: [],
		next: function () {
			if (convert.reader.index >= convert.reader.crawlData.length) {
				logger.norm(convert.reader.crawlData);
				console.trace()
				throw new Error("Trying to crawl past the end of the provided data!");
			} else return convert.reader.crawlData[convert.reader.index++];
		},
		current: function () {
			if (convert.reader.index >= convert.reader.crawlData.length) {
				logger.norm(convert.reader.crawlData);
				throw new Error("Trying to crawl past the end of the provided data!");
			} else return convert.reader.crawlData[convert.reader.index - 1];
		},
		take: amount => {
			convert.reader.index += amount;
			if (convert.reader.index > convert.reader.crawlData.length) {
				console.error(convert.reader.crawlData);
				throw new Error("Trying to crawl past the end of the provided data!");
			}
		},
		set: function (data, offset) {
			convert.reader.crawlData = data;
			convert.reader.index = offset;
		}
	},

	lasers: convertLasers,
	entities: convertEntities,
	fastGui: convertFastGui,
	slowGui: convertSlowGui,
};

// CONVERT DATA // 
function convertLasers() {
	for (let i = 0, len = convert.reader.next(); i < len; i++) {
		const id = convert.reader.next();
		let laser = laserMap.get(id);
		if (!laser) {
			laser = {
				id: id,
				x: convert.reader.next(),
				_x: 0,
				y: convert.reader.next(),
				_y: 0,
				x2: convert.reader.next(),
				_x2: 0,
				y2: convert.reader.next(),
				_y2: 0,
				color: convert.reader.next(),
				width: 0,
				_width: convert.reader.next(),
				maxDur: convert.reader.next(),
				dur: convert.reader.next(),
				shouldDie: 0,
				fade: 1,
			}
		} else {
			laser._x = convert.reader.next();
			laser.x = lerp(laser.x, laser._x, window.movementSmoothing)
			laser._y = convert.reader.next();
			laser.y = lerp(laser.y, laser._y, window.movementSmoothing)
			laser._x2 = convert.reader.next();
			laser.x2 = lerp(laser.x2, laser._x2, window.movementSmoothing)
			laser._y2 = convert.reader.next();
			laser.y2 = lerp(laser.y2, laser._y2, window.movementSmoothing)
			laser.color = convert.reader.next();
			laser._width = convert.reader.next();
			laser.width = lerp(laser.width, laser._width, window.movementSmoothing)
			laser.maxDur = convert.reader.next();
			laser.dur = convert.reader.next();
		}
		laser.shouldDie = 0;
		laserMap.set(id, laser);
	}

	for (let [_, laser] of laserMap) {
		laser.shouldDie++;
		if (laser.shouldDie > 1) {
			laser.fade = lerp(laser.fade, 0, window.movementSmoothing)
			if (laser.fade < 0.01) {
				laserMap.delete(laser.id);
			}
		}
	}
}

class RopePoint {
	constructor(x, y) {
		this.pos = { x: x, y: y };
		this.vel = { x: 0, y: 0 };
	}
	tick() {
		this.vel.x *= .7;
		this.vel.y *= .7;
		this.pos.x += this.vel.x;
		this.pos.y += this.vel.y;
	}
}

class ClientGun {
	constructor(skin, color, aspect, direction, offset, length, width, angle) {
		this.skin = skin;
		this.color = color;
		this.aspect = aspect;
		this.direction = direction;
		this.offset = offset;
		this.length = length;
		this.width = width;
		this.angle = angle;

		this.motion = 0;
		this.position = 0;
		this.recoverRate = .35;
		this.lastShotTime = 0;
	}
	tick() {
		this.position += this.motion;
		this.motion = lerp(this.motion, 0, this.recoverRate)
		this.position = lerp(this.position, 0, this.recoverRate)
	}
	fire(power, lastShotTime) {
		if(lastShotTime <= this.lastShotTime) return;
		this.lastShotTime = lastShotTime;
		this.motion += Math.sqrt(power) / 10;
	}
}

function parseMockup(seenIndexes) {
	const index = convert.reader.next();

	const readMockupValue = () => {
		const val = convert.reader.next();
		if (val === ASSET_MAGIC) return loadAsset(ASSET_MAGIC, convert.reader.next());
		if (typeof val === "string" && val.startsWith("[") && val.endsWith("]")) {
			try {
				const parsed = JSON.parse(val);
				if (Array.isArray(parsed)) return parsed;
			} catch (err) {
				// Fall through to raw string
			}
		}
		return val;
	};
	
	const mockup = {
		index: index,
		label: convert.reader.next(),
		shape: readMockupValue(),
		size: convert.reader.next(),
		color: 12, // Default color for rendering
		facing: 0,
		widthHeightRatio: [1, 1],
		upgrades: [],
		guns: [],
		props: [],
		turrets: [],
	};

	// Register early so recursive calls can find it
	mockups.set(index, mockup);
	if (seenIndexes) seenIndexes.add(index);

	// Parse upgrades
	const upgradeCount = convert.reader.next();
	for (let i = 0; i < upgradeCount; i++) {
		mockup.upgrades.push({
			tier: convert.reader.next(),
			index: convert.reader.next(),
		});
	}

	// Parse guns
	const gunCount = convert.reader.next();
	for (let i = 0; i < gunCount; i++) {
		mockup.guns.push({
			offset: convert.reader.next(),
			direction: convert.reader.next(),
			length: convert.reader.next(),
			width: convert.reader.next(),
			aspect: convert.reader.next(),
			angle: convert.reader.next(),
			skin: convert.reader.next(),
			color_unmix: convert.reader.next(),
		});
	}

	// Parse props
	const propCount = convert.reader.next();
	for (let i = 0; i < propCount; i++) {
		mockup.props.push({
			size: convert.reader.next(),
			x: convert.reader.next(),
			y: convert.reader.next(),
			angle: convert.reader.next(),
			layer: convert.reader.next(),
			color: readMockupValue(),
			shape: readMockupValue(),
			fill: convert.reader.next(),
			stroke: convert.reader.next(),
			borderless: convert.reader.next(),
			loop: convert.reader.next(),
			isAura: convert.reader.next(),
			rpm: convert.reader.next(),
			dip: convert.reader.next(),
			ring: convert.reader.next(),
			arclen: convert.reader.next(),
			scaleSize: convert.reader.next(),
			lockRot: convert.reader.next(),
			tankOrigin: convert.reader.next(),
		});
	}

	// Parse turret bounds
	const turretCount = convert.reader.next();
	for (let i = 0; i < turretCount; i++) {
		mockup.turrets.push({
			index: convert.reader.next(),
			bound: {
				size: convert.reader.next(),
				offset: convert.reader.next(),
				direction: convert.reader.next(),
				layer: convert.reader.next(),
				angle: convert.reader.next(),
			},
		});
	}

	// Parse turret mockups (skip duplicates already parsed in this packet)
	for (let i = 0; i < turretCount; i++) {
		const turretIndex = mockup.turrets[i].index;
		if (seenIndexes && seenIndexes.has(turretIndex)) continue;
		parseMockup(seenIndexes);
	}

	return mockup;
}

class ClientEntity {
	constructor(
		id = -1,
		isTurret = false,
		index = 0,
		name = "",
		x = 0,
		y = 0,
		size = 1,
		shape = 0,
		facing = 0,
		score = 0,
		layer = 1,
		color = 0,
		team = 0,
		health = 1,
		healthMax = 1,
		shield = 1,
		shieldMax = 1,
		alpha = 1,
		seeInvisible = false,
		nameColor = "#FFFFFF",
		label = "",
		widthHeightRatio = [1, 1],
		hideHealth = false,
		hideName = false,
		leash = false,
	) {
		this.id = id;
		this.index = index;
		this.name = name;
		this.x = x;
		this.y = y;
		this.size = size;
		this.shape = shape;
		this.facing = facing;
		this.score = score;
		this.layer = layer;
		this.color = color;
		this.team = team;
		this.health = health;
		this.maxHealth = healthMax;
		this.shield = shield;
		this.maxShield = shieldMax;
		this.alpha = alpha;
		this.seeInvisible = seeInvisible;
		this.nameColor = nameColor;
		this.label = label;
		this.widthHeightRatio = widthHeightRatio;
		this.hideName = hideName;
		this.hideHealth = hideHealth;
		this.isTurret = isTurret;

		this.leash = leash;
		if (typeof this.leash === "object") {
			this.leash = { x: this.leash.x, y: this.leash.y, points: [] };
			for (let i = 0; i < 10; i++) {
				this.leash.points.push(new RopePoint((this.x + this.leash.x) / 2, (this.y + this.leash.y) / 2))
			}
		}

		this.guns = [];
		this.turrets = [];
		this.props = [];

		this.messages = [];

		this.sizeFade = 0;
		this.hurtFade = 0;
		this.goals = {
			x: this.x,
			y: this.y
		};
	}

	setGun(index) {
		this.guns[index] = new ClientGun(
			convert.reader.next(), // skin
			convert.reader.next(), // color
			convert.reader.next(), // aspect
			convert.reader.next(), // direction
			convert.reader.next(), // offset
			convert.reader.next(), // length
			convert.reader.next(), // width
			convert.reader.next(), // angle
		);
		this.guns[index].fire(convert.reader.next(), convert.reader.next()) // power, lastShotTime
	}

	setTurret(index) {
		this.turrets[index] = convert.reader.next(); // entity id
	}

	tick() {
		this.sizeFade = lerp(this.sizeFade, 1, 0.25);
		this.hurtFade = lerp(this.hurtFade, 0, 0.25);
		for (let gun of this.guns) {
			gun.tick();
		}
		for(let goal in this.goals){
			switch(goal){
				// Lerp angle
				case "facing":
					this[goal] = lerpAngle(this[goal], this.goals[goal], .4);
				break;
				// Lerp rounded
				case "score":
					this[goal] = Math.round(lerp(this[goal], this.goals[goal], .4));
				break;
				// Lerp
				default:
					this[goal] = lerp(this[goal], this.goals[goal], .4);
				break;
			}
			if(goal === "facing"){
			}else{
			}
		}
	}
}

function newEntity(id, skipSpawnFade = false) {
	let entity = new ClientEntity(
		id, // id
		convert.reader.next(), // isTurret
		convert.reader.next(), // index
		convert.reader.next(), // name
		convert.reader.next(), // x
		convert.reader.next(), // y
		convert.reader.next(), // size
		convert.reader.next(), // shape
		convert.reader.next(), // facing
		convert.reader.next(), // score
		convert.reader.next(), // layer
		convert.reader.next(), // color
		convert.reader.next(), // team
		convert.reader.next(), // health amount
		convert.reader.next(), // health max
		convert.reader.next(), // shield amount
		convert.reader.next(), // shield max
		convert.reader.next(), // alpha
		convert.reader.next(), // seeInvisible
		convert.reader.next(), // nameColor
		convert.reader.next(), // label
		[convert.reader.next(), convert.reader.next()], // widthHeightRatio (array with 2 elements)
		convert.reader.next(), // hideHealth
		convert.reader.next(), // hideName
		convert.reader.next() ? { x: convert.reader.next(), y: convert.reader.next() } : false, // leash
	)

	let turretAmount = convert.reader.next();
	for (let i = 0; i < turretAmount; i++) {
		entity.setTurret(i);
	}

	let gunAmount = convert.reader.next();
	for (let i = 0; i < gunAmount; i++) {
		entity.setGun(i);
	}

	if (skipSpawnFade === true) {
		entity.sizeFade = 1;
	}

	entities.set(entity.id, entity)
	return entity;
}

function updateEntity(entityId, updateType) {
	let entity = entities.get(entityId);

	if(entityId === playerState.entityId){
		playerState.entity = entity;
	}

	if (updateType === -1) {
		entity = newEntity(entityId, entity !== undefined);
		return entity;
	}
	
	if (updateType === 0) {
		return entity;
	}
	
	if (updateType >= 1) {
		if (convert.reader.next()) { // "has leash?"
			if(!entity.leash){
				entity.leash = { x: convert.reader.next(), y: convert.reader.next(), points: [] };
				for (let i = 0; i < 10; i++) {
					entity.leash.points.push(new RopePoint((entity.x + leashX) / 2, (entity.y + leashY) / 2))
				}
			} else {
				entity.leash.x = convert.reader.next();
				entity.leash.y = convert.reader.next();
			}
			for (let point of entity.leash.points) {
				point.tick();
			}
		} else {
			entity.leash = false;
		}
		
		// Position data
		entity.goals.x = convert.reader.next();
		entity.goals.y = convert.reader.next();
		entity.goals.facing = convert.reader.next();
	}
	   if (updateType >= 2) { // Minimal
		   entity.goals.health = convert.reader.next();
		   entity.goals.maxHealth = convert.reader.next();
		   entity.goals.shield = convert.reader.next();
		   entity.goals.maxShield = convert.reader.next();
		   entity.goals.score = convert.reader.next();
		   entity.goals.size = convert.reader.next();
		   entity.goals.alpha = convert.reader.next();
	   }
	if (updateType >= 3) { // Visual Change
		entity.shape = convert.reader.next();
		entity.color = convert.reader.next();
		entity.team = convert.reader.next();
		entity.layer = convert.reader.next();
	}
	if (updateType >= 4) { // Text Change
		entity.name = convert.reader.next();
		entity.nameColor = convert.reader.next();
		entity.label = convert.reader.next();
	}
	// guns
	const gunAmount = convert.reader.next();
	for(let i = 0; i < gunAmount; i++){
		entity.guns[i].fire(convert.reader.next(), convert.reader.next()) // power, lastShotTime
	}
	return entity;
}

let newEntities = new Map();
let holdingVar = undefined;
function convertEntities() {
	for (let i = 0, incomingEntityAmount = convert.reader.next(); i < incomingEntityAmount; i++){
		const id = convert.reader.next();
		const updateType = convert.reader.next();
		// Existing entities or full data
		if(entities.has(id) === true || updateType === -1){
			newEntities.set(id, updateEntity(id, updateType));
		
		// New entities with incomplete data
		}else{
			missingEntityIds.add(id);
			console.log("Missing entity info for entity ID:", id);
			if (updateType >= 1) { // Leash + Position
				const hasLeash = convert.reader.next();
				if (hasLeash) {
					convert.reader.take(2); // leash x, y
				}
				convert.reader.take(3); // x, y, facing
			}
			if (updateType >= 2) { // Minimal
				convert.reader.take(7); // health.amount, health.max, shield.amount, shield.max, score, size, alpha
			}
			if (updateType >= 3) { // Visual
				convert.reader.take(4); // shape, color, team, layer
			}
			if (updateType >= 4) { // Text
				convert.reader.take(3); // name, nameColor, label
			}
			if (updateType === 0) {
				// updateType 0: no additional data (no guns) — nothing to read
			} else {
				const gunAmount = convert.reader.next();
				convert.reader.take(gunAmount * 2) // power, lastShotTime
			}
		}
	}
	
	// Send batched request for all missing entities
	if (missingEntityIds.size > 0) {
		socket.send(clientPackets.requestLiveEntityInfo, ...missingEntityIds);
	}
	
	entitiesArr.length = 0;
	const entitiesItr = newEntities.values();
	for (let entity of entitiesItr) {
		entity.tick();
		entitiesArr.push(entity);
	}
	entitiesArr.sort((a, b) => {
		return a.layer - b.layer || b.id - a.id;
	});

	holdingVar = newEntities;
	newEntities = entities;
	entities = holdingVar;
	newEntities.clear();
	missingEntityIds.clear();
};

// CONVERT GUI //
function convertFastGui() {
	playerState.level = convert.reader.next()
	playerState.gui.skills.points = convert.reader.next();
	const upgradeAmount = convert.reader.next();
	if (upgradeAmount > 0) {
		playerState.gui.upgrades.length = 0;
		for (let i = 0; i < upgradeAmount; i++) {
			playerState.gui.upgrades.push(convert.reader.next(), convert.reader.next());
		}
	}else{
		playerState.gui.upgrades.length = 0;
	}

	const skillStatChanges = convert.reader.next();
	if (skillStatChanges) {
		for (let i = 0; i < skillStatChanges; i++) {
			const skillName = convert.reader.next();
			playerState.gui.skills[skillName] = { max: convert.reader.next(), current: convert.reader.next() };
		}
	}
}

function convertSlowGui(data) {
	const m = data;
	let i = 0;

	playerState.gui.minimap.length = 0;
	let minimapPoints = m[i++];
	for (let j = 0; j < minimapPoints; j++) {
		playerState.gui.minimap.push({
			x: m[i++],
			y: m[i++],
			color: m[i++],
			size: m[i++]
			// TODO: image support 
		})
	}

	playerState.gui.leaderboard.title = m[i++];
	playerState.gui.leaderboard.entries.length = 0;
	let leaderboardEntries = m[i++];
	for (let j = 0; j < leaderboardEntries; j++) {
		playerState.gui.leaderboard.entries.push({
			score: m[i++],
			name: m[i++],
			label: m[i++],
			color: m[i++],
			nameColor: m[i++],
			index: m[i++]
		})
	}
}

// SOCKET // 
async function onmessage (message) {
	let m = fasttalk.decode(message);
	if (m === -1) {
		console.error("Malformed Packet!", message, m)
		return;
	}

	let packet = m.shift();
	let i = 0;
	switch (packet) {
		case serverPackets.mockupRequest:
			convert.reader.set(m, 0);
			const indexesInPacket = [];
			const seenIndexes = new Set();
			while(convert.reader.index < m.length){
				const mockup = parseMockup(seenIndexes);
				indexesInPacket.push(mockup.index);
				mockups.pendingMockupRequests.delete(mockup.index);
			}
			// Resolve turret references now that all mockups are parsed
			for (const idx of indexesInPacket) {
				const mockup = mockups.mockupData.get(idx);
				for (let i = 0; i < mockup.turrets.length; i++) {
					const turretRef = mockup.turrets[i];
					const turretMockup = mockups.mockupData.get(turretRef.index);
					mockup.turrets[i] = Object.assign({}, turretRef, turretMockup);
				}
			}
			break;
		case serverPackets.layerInfo:
			roomState.width = m[i++];
			roomState.height = m[i++];
			roomState.cells = JSON.parse(m[i++]);
			roomState.cellSkins = Object.assign(roomState.cellSkins, JSON.parse(m[i++]))
			roomState.serverTargetMs = m[i++]
			roomState.mapType = m[i++];
			roomState.blackout = m[i++];
			console.log("Room data recieved! Starting game...");
			break;
		case serverPackets.gameMessage:
			if(currentSettings.disableGameMessages.value.enabled) return;
			roomState.chatMessages.push(new ChatMessage(
				m[0],
				m[1],
				m[2],
				m[3]
			));
			break;
		case serverPackets.assetDownload:
			if (window.loadedAssets === undefined) window.loadedAssets = 0;
			window.loadingTextTooltip = `(${window.loadedAssets}/${m[0]})`
			if (m[0] !== 0) {
				await setAsset(m[1], m[2],
					{
						path2d: m[3],
						path2dDiv: m[4],
						image: m[5],
						p1: m[6],
						p2: m[7],
						p3: m[8],
						p4: m[9]
					})
				window.loadedAssets++;
				loadingScreenState.subtitle = `(${window.loadedAssets}/${m[0]})`
			}
			if (window.loadedAssets === m[0]) {
				window.assetLoadingPromise()
			}
			break;
		case serverPackets.chatMessage:
			if(mutedSenders.has(m[1])) return;
			const chatMessage = new ChatMessage(m[1], m[2], m[3], m[4]||false, m[0]);
			const entity = entities.get(m[0]);
			if(entity){
				let skipRemove = false;
				if (entity.messages.length >= currentSettings.inGameChatMessageLimit.value.number) {
					entity.messages.shift();
					skipRemove = true;
				}
				entity.messages.push(chatMessage);
				if(skipRemove === false){
					setTimeout(()=>{
						entity.messages.shift();
					}, currentSettings.inGameChatMessageDuration.value.number)
				}
			}
			roomState.chatMessages.push(chatMessage);
			break;
		case serverPackets.roomId:
			roomState.roomId = m[0]
			break;
		case serverPackets.viewUpdate:
			let cam = {
				x: m[0],
				y: m[1],
				FoV: m[2]
			};
			const prevPlayerEntityId = playerState.entityId;
			playerState.entityId = m[3];
			// Clear focus only when the player's entityId changed (spawn/respawn/join),
			// not on every frequent viewUpdate packet.
			if(prevPlayerEntityId !== playerState.entityId){
				blurAllTextNumberInputs();
			}
			convert.reader.set(m, 4);
			window.movementSmoothing = 1
			convert.fastGui();
			convert.lasers();
			convert.entities();
			// If the camera is slightly slower it gives the feeling that the player is moving more/faster
			// Its better if the camera is behind the real spot because it has to "react" which has a certain feel
			playerState.camera.x = lerp(playerState.camera.x, cam.x, window.movementSmoothing * .7);
			playerState.camera.y = lerp(playerState.camera.y, cam.y, window.movementSmoothing * .7);
			playerState.camera.fov = lerp(playerState.camera.fov, cam.FoV, window.movementSmoothing * .7)

			// Update inputs whenever we received a viewUpdate
			socket.send(clientPackets.inputUpdate, ...gameState.lastInput.changes)
			gameState.lastInput.changes.length = 0;
			break;
		case serverPackets.slowGuiUpdate:
			convert.slowGui(m);
			break;
		case serverPackets.vignette:
			global.vignetteScalarSocket = m[0]
			global.vignetteColorSocket = m[1]
			break;
		case serverPackets.disconnect:
			playerState.gui.disconnect.title = m[0];
			playerState.gui.disconnect.subtitle = m[1];
			multiplayer.playerPeer.destroy();
			console.log("Closed socket via packet", playerState.gui.disconnect)
			break;
		case serverPackets.deathScreen:
			console.log("TODO: Death Screen")
			break;
		case serverPackets.pepperSprayFilter:
			global.player.pepperspray.apply = m[0];
			global.player.pepperspray.blurMax = m[1];
			break;
		case serverPackets.lsdFilter:
			global.player.lsd = m[0];
			break;
		case serverPackets.displayText:
			// TODO: Display Text
			break;
		case serverPackets.propAnimations:
			roomState.propAnimations.clear();
			while (i < m.length) {
				const prev = roomState.propAnimations.get(m[i]);
				const arr = prev || [];
				if (!prev) roomState.propAnimations.set(m[i], arr)
				i++;

				const readValue = () => {
					const val = m[i++];
					return val === ASSET_MAGIC ? loadAsset(ASSET_MAGIC, m[i++]) : val;
				};

				arr.push({
					index: m[i++],
					size: m[i++],
					x: m[i++],
					y: m[i++],
					angle: m[i++],
					layer: m[i++],
					shape: readValue(),
					color: readValue()
				})
			}
			break;
		case serverPackets.serverInfo:
			metrics._serverCpuUsage = m[0]
			metrics._serverMemUsage = m[1]
			mockups.totalMockups = m[2]
			break;
		case serverPackets.log:
			console.log(m[0])
		break;
		default:
			throw new Error("Unknown serverPacketId!" + packet);
	}
}

let connectClientSocket = async function (roomId) {
	await multiplayer.joinRoom(roomId, socket);
	socket.open = true;
	socket.send("k", currentSettings.networkProtocolVersion.value.number, document.getElementById("tokenInput").value || "", 0, "its local", false);
	console.log("Token submitted to the server for validation.");
	return socket;
};

export { socket, connectClientSocket, entities, entitiesArr, ClientEntity }