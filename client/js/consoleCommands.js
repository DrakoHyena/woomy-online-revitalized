import { socket } from "./socket.js"
import { logger } from "./debug.js"

window["help"] = function () {
	logger.info("Here is a list of commands and their usages:");
	logger.norm(" � broadcast('message')");
	logger.norm(" � setColor(colorID)");
	logger.norm(" � setSkill(amount)");
	logger.norm(" � setScore(score)");
	logger.norm(" � setSize(size)");
	logger.norm(" � setTank('exportName')");
	logger.norm(" � setDevKey(1-9 (numpad), <'exportName' or '()=>{code}>', <if code set this to true>)");
	logger.norm(" � getDevKeyData()");
	logger.norm(" � loadDevKeyData([devKeyData])");
	logger.norm(" � setStat('statName', value)");
	logger.norm(" � spawnEntity('exportName', x, y, teamID, colorID, size, score)");
	logger.norm(" � teleport(x, y)");
	logger.norm(" � setChildren(amount)");
	logger.norm(" � setInvisible(fadeInValue, fadeOutValue, limit)");
	logger.norm(" � setFOV(fov)");
	logger.norm(" � setSpinSpeed(speed)");
	logger.norm(" � setEntity('exportName, spawnAmount, size, isMinion = false')");
	logger.norm(" � clearChildren()");
	logger.norm(" � setTeam(teamID)");
	logger.norm(" � skillSet(atk, hlt, spd, str, pen, dam, rld, rgn, shi)");
	logger.norm(" � rainbowSpeed(speed)");
	logger.norm(" � setControl(amount)");
	logger.norm(" � setRoomLayer(layer number, layerless boolean)");
	logger.warn("To use any of the above commands, you need to have beta-tester level 2!");
};
window["broadcast"] = function (message, hex) {
	if (!hex) hex = color.black;
	socket.send("D", 0, message, hex);
	logger.info("Broadcasting your message to all players.");
};
window["setSkill"] = function (amount) {
	if (isNaN(amount) || amount < 0) return logger.warn("Please specify a valid amount of stats! Note that the amount can't be below 0 or above 90.");
	socket.send("D", 2, amount);
	logger.info("Set your amount of skill points to " + amount + ".");
};
window["setScore"] = function (score) {
	if (isNaN(score)) return logger.warn("Please specify a valid score!");
	socket.send("D", 3, score);
	logger.info("Set your score to " + score + ".");
};
window["setSize"] = function (size) {
	if (isNaN(size) || size < 0 || size > 3000) return logger.warn("Please specify a valid size value!");
	socket.send("D", 4, size);
	logger.info("Set your size to " + size + ".");
};
window["setTank"] = function (tank) {
	if (!tank) return logger.warn("Please specify a valid tank!");
	socket.send("D", 5, tank);
	logger.info("Set your tank to " + tank + ".");
};
window["setDevKey"] = function (num, tank, isCode) {
	if (num < 1 || num > 9) return logger.warn("Please specify a valid dev key (1-9)")
	if (!tank) return logger.warn("Please specify a valid tank or valid code");
	localStorage.setItem(`DEV_KEY_${num}`, JSON.stringify([tank, isCode]))
	logger.info(`Set DEV_KEY_${num}. Use numpad${num} to change to that tank or run that code.`)
}
window["getDevKeyData"] = function () {
	let arr = [null]
	for (let i = 1; i < 10; i++) {
		arr[i] = JSON.stringify(localStorage.getItem(`DEV_KEY_${i}`) || null)
	}
	console.log(JSON.stringify(arr))
	logger.info("Copy that text and use it in loadDevKeyData. loadDevKeyData only accepts arrays.")
}
window["loadDevKeyData"] = function (arr = "") {
	if (typeof arr === "string" || !arr.length) {
		logger.warn("Provided value must be an array")
		return
	}
	if (arr.length !== 10) {
		logger.warn("Provided value must be of length 10")
		return
	}
	for (let i = 1; i < 10; i++) {
		arr[i] = JSON.parse(arr[i])
		if (!arr[i]) continue;
		localStorage.setItem(`DEV_KEY_${i}`, arr[i])
	}
	logger.info("Loaded dev key data!")
}
window["setStat"] = function (stat, value) {
	if (stat !== "weapon_speed" && stat !== "weapon_reload" && stat !== "move_speed" && stat !== "max_health" && stat !== "body_damage" && stat !== "weapon_damage" && stat !== "names") return logger.warn("Invalid stat name! Input setStat('names') for a list of stats.");
	if (stat == "names") return logger.info("Stat Names: weapon_speed, weapon_reload, move_speed, max_health, body_damage, weapon_damage."), value = 0;
	if (isNaN(value) || (stat == "weapon_reload" && value <= 0)) return logger.warn("Please specify a valid value for this stat!");
	socket.send("D", 6, stat, value);
	logger.info("Set " + stat + " to " + value + ".");
};
window["spawnEntity"] = function (entity, x, y, team, color, size, value) {
	if (!entity || !isNaN(entity)) return logger.warn("Please specify a valid entity!");
	if (!x || !y || (isNaN(x) && x !== "me" || isNaN(y) && y !== "me")) return logger.warn("Please specify a valid (X,Y) position!");
	if (!team || (isNaN(team) && team !== "me")) return logger.warn("Please specify a valid team!");
	if (color < 0 || (isNaN(color) && color !== "rainbow" && color !== "default")) return logger.warn("Please specify a valid color ID!");
	socket.send("D", 7, entity, x, y, team, color, size, value);
	logger.info("Spawned " + entity + " at (" + x + ", " + y + ") with the team ID " + team + ", a color ID of " + color + ", a size of " + size + ", and a value of " + value);
};
window["setChildren"] = function (amount) {
	if (!amount || amount < 0 || isNaN(amount)) return logger.warn("Please specify a valid maxChildren value!");
	socket.send("D", 8, amount);
	logger.info("Set your maxChildren to " + amount + ".");
};
window["teleport"] = function (x, y) {
	if (isNaN(x) || isNaN(x)) return logger.warn("Please specify a valid (X, Y) position!");
	socket.send("D", 9, x, y);
	logger.info("Teleported to (" + x + ", " + y + ").");
};
window["setFOV"] = function (fov) {
	if (!fov || fov < 0 || fov > 500 || isNaN(fov)) return logger.warn("Please specify a valid FoV value!");
	socket.send("D", 11, fov);
	logger.info("Set your FoV to " + fov + ".");
};
window["setSpinSpeed"] = function (speed) {
	if (!speed || isNaN(speed)) return logger.warn("Please specify a valid speed value!");
	socket.send("D", 12, speed);
	logger.info("Set your autospin speed to " + speed + ".");
};
window["setEntity"] = function (entity, spawnAmount=1, size = 0, isMinion = false) {
	if (!entity || !isNaN(entity)) return logger.warn("Please specify a valid entity!");
	if (isNaN(size)) return logger.warn("Please specify a valid size, or do not provide one at all.");
	socket.send("D", 13, entity, spawnAmount, size, isMinion);
	logger.info("Set the F key entity to " + entity + ".");
};
window["clearChildren"] = function () {
	socket.send("D", 14);
	logger.info("Cleared all children entities.");
};
window["setTeam"] = function (teamID) {
	if (isNaN(teamID)) return logger.warn("Please specify a valid team ID!");
	socket.send("D", 15, teamID);
	logger.info("Set your team ID to " + teamID + ".");
};
window["skillSet"] = function (s1, s2, s3, s4, s5, s6, s7, s8, s9, s10) { // Simplify?
	let s = function (skill) {
		return skill < 0 || isNaN(skill);
	};
	if (s(s1) || s(s2) || s(s3) || s(s4) || s(s5) || s(s6) || s(s7) || s(s8) || s(s9) || s(s10)) return logger.warn("Please specify a valid skill-set array!");
	socket.send("D", 17, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10);
	logger.info("Changed your skill-set to [" + s1 + ", " + s2 + ", " + s3 + ", " + s4 + ", " + s5 + ", " + s6 + ", " + s7 + ", " + s8 + ", " + s9 + ", " + s10 + "].");
};
window["rainbowSpeed"] = function (speed) {
	if (isNaN(speed)) return logger.warn("Please specify a valid rainbow speed value!");
	socket.send("D", 18, speed);
	logger.info("Set your rainbow color change speed to " + speed + ".");
};
window["setControl"] = function (amount) {
	if (isNaN(amount) || amount < 0) return logger.warn("Please specify a valid amount of entities to control!");
	socket.send("D", 19, amount);
};
window["setRoomLayer"] = function(layer, layerless) {
	socket.send("D", 23, layer, layerless)
}
window["addController"] = function (ioType) {
	socket.send("D", 20, ioType);
}
window["removeController"] = function (ioType) {
	socket.send("D", 21, ioType);
}
window["clearControllers"] = function () {
	socket.send("D", 22);
}