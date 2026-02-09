import { global, resizeEvent } from "../client/js/global.js";
import { util, getWOSocketId } from "../client/js/util.js";
import { socket } from "../client/js/socket.js";
import { color } from "../client/js/colors.js"
import { currentSettings } from "../client/js/settings.js";
import { player } from "../client/js/player.js";

global.mobileClickables = [function () { // Toggle menu
	let clickdata = global.clickables.mobileClicks.get()
	if (!global._mobileOptions) {
		for (let i = 1; i < clickdata.length; i++) {
			clickdata[i].setActive(i <= 6 ? 1 : 0)
		}
		global._mobileOptions = true;
	} else {
		for (let i = 1; i < clickdata.length; i++) {
			clickdata[i].setActive(i >= 7 ? 1 : 0)
		}
		global._mobileOptions = false;
	}
}, function () { // Level Up
	for (let i = 0; i < 75; i++) {
		setTimeout(() => socket.talk('L'), i * 25);
	}
}, function () { // Testbed
	socket.talk("T", 0);
}, function () { // Override
	socket.talk("t", 2);
}, function () { // Reset Tank
	socket.talk("CTB");
}, function () { // Fullscreen
	if (document.body.requestFullScreen)
		document.body.requestFullScreen();
	else if (document.body.webkitRequestFullScreen)
		document.body.webkitRequestFullScreen();
	else if (document.body.mozRequestFullScreen)
		document.body.mozRequestFullScreen();
	resizeEvent()
}, function () { // Chat
	let chatbox = document.getElementById("chatBox")
	if (!chatbox) {
		global._mobileChatText = "Chat"
		global._canvas._cv.dispatchEvent(new KeyboardEvent('keydown', {
			'keyCode': global.KEY_CHAT
		}));
	} else {
		global._mobileChatText = "Chat"
		chatbox.dispatchEvent(new KeyboardEvent('keydown', {
			'keyCode': 13
		}));
	}

}, function () { // Firing modes
	socket.controls.commands[global._mobileFiring[0]] = 0;
	if (global._mobileFiring[0] === 4) {
		global._mobileFiring[0] = 6
		if (global._mobileFiring[1]) socket.controls.commands[global._mobileFiring[0]] = 1;
		return
	}
	global._mobileFiring[0] = 4
	if (global._mobileFiring[1]) socket.controls.commands[global._mobileFiring[0]] = 1;
}, function () {
	socket.talk("X");
}];
global.clickables = function () {
	let Region = function () {
		function Clickable() {
			let region = {
				_x: 0,
				_y: 0,
				_w: 0,
				_h: 0
			},
				active = 0;
			return {
				set: function (x, y, w, h) {
					region._x = x;
					region._y = y;
					region._w = w;
					region._h = h;
					active = 1;
				},
				check: function (target) {
					let dx = Math.round(target.x - region._x),
						dy = Math.round(target.y - region._y);
					return active && dx >= 0 && dy >= 0 && dx <= region._w && dy <= region._h;
				},
				setActive: function (v) {
					active = v;
				}
			};
		}
		return function (size) {
			let data = [];
			for (let i = 0; i < size; i++) data.push(Clickable());
			return {
				place: function (index, ...a) {
					if (index >= data.length) {
						logger.norm(index);
						logger.norm(data);
						throw new Error("Trying to reference a clickable outside a region!");
					}
					data[index].set(...a);
				},
				hide: function () {
					for (let r of data) r.setActive(0);
				},
				get: function () {
					return data
				},
				check: function (x) {
					return data.findIndex(function (r) {
						return r.check(x);
					});
				}
			};
		};
	}();
	return {
		stat: Region(10),
		upgrade: Region(40),
		hover: Region(1),
		skipUpgrades: Region(1),
		mobileClicks: Region(global.mobileClickables.length),
	};
}();

global._canvas = new (class Canvas {
	constructor() {
		let mobile = global.mobile;
		this.mobile = mobile;
		this._directionLock = 0;
		this._reenviar = 1;
		this._directions = [];
		this._maxStats = false;
		let self = this;
		this._cv = document.getElementById("gameCanvas");
		this._cv.width = global._screenWidth;
		this._cv.height = global._screenHeight;
		this.vignetteCanvas = document.getElementById("vignetteCanvas");
		this.vignetteCanvas.width = this._cv.width;
		this.vignetteCanvas.height = this._cv.height;
		if (mobile) {
			this._initMobile();
		} else {
			this._cv.addEventListener('mousedown', this._mouseDown, false);
			this._cv.addEventListener('mousemove', this._gameInput, false);
			this._cv.addEventListener('mouseup', this._mouseUp, false);
			this._cv.addEventListener("touchstart", window._internalmobiletouchinit = () => {
				global.mobile = true;
				this._cv.removeEventListener("mousedown", this._mouseDown);
				this._cv.removeEventListener("mousemove", this._gameInput);
				this._cv.removeEventListener("mouseup", this._mouseUp);
				this._cv.removeEventListener("touchstart", window._internalmobiletouchinit);
				this._initMobile();
			});
		}
		this._cv.addEventListener('keydown', this._keyboardDown, false);
		this._cv.addEventListener('keyup', this._keyboardUp, false);
		this._cv.parent = self;
		this._cv.mouse = {
			x: 0,
			y: 0,
			down: false
		};
	}
	_initMobile() {
		this.controlTouch = null;
		this.movementTouch = null;
		this.movementTop = false;
		this.movementBottom = false;
		this.movementLeft = false;
		this.movementRight = false;
		this.lastTap = 0;
		this._cv.addEventListener('touchstart', this._touchStart, false);
		this._cv.addEventListener('touchmove', this._touchMove, false);
		this._cv.addEventListener('touchend', this._touchEnd, false);
		this._cv.addEventListener('touchcancel', this._touchEnd, false);
	}
	_keyboardDown(event) {
		if(!this.lastKeyRepeat === undefined) this.lastKeyRepeat = Date.now();
		if(event.repeat && Date.now()-this.lastKeyRepeat < 100) return;
		this.lastKeyRepeat = Date.now();
		if (!global._gameStart) return;
		if (event.location === 3) {
			let number = event.code.substring(6)
			if (global["DEV_KEY_" + number]) {
				let value = JSON.parse(localStorage.getItem("DEV_KEY_" + number))
				if (!value[0]) {
					global._sendMessageToClient(`To use DEV_KEY_${number} you must do setDevKey in the console`)
					return
				} else if (value[1]) {
					eval(value[0])(global, socket)
				} else {
					socket.talk("D", 5, value[0]);
				}
			}
			return
		}
		if (event.keyCode == global.KEY_UPGRADE_STR) {
			event.preventDefault()
		}
		switch (event.keyCode) {
			case global.KEY_UP_ARROW:
				socket.controls.commands[0] = 1;
				break;
			case global.KEY_DOWN_ARROW:
				socket.controls.commands[1] = 1;
				break;
			case global.KEY_LEFT_ARROW:
				socket.controls.commands[2] = 1;
				break;
			case global.KEY_RIGHT_ARROW:
				socket.controls.commands[3] = 1;
				break;
			// Beta-tester keys
			case global.KEY_COLOR_CHANGE:
				socket.talk("B", 0);
				break;
			case global.KEY_SPAWN_SHAPES:
				socket.talk("B", 2);
				break;
			case global.KEY_TELEPORT:
				socket.talk("B", 3);
				break;
			case global.KEY_POWER_CYCLE_FIREFOX:
			case global.KEY_POWER_CYCLE:
				socket.talk("B", 4);
				break;
			case global.KEY_BAN_PLAYER:
				socket.talk("banSocket")
				break;
			case global.KEY_KILL_WITH_MOUSE:
				socket.talk("B", 9);
				break;
			case global.KEY_STEALTH:
				socket.talk("B", 10);
				break;
			case global.KEY_CHAT:
				let chatBox = document.getElementById("chatBox");
				if (!chatBox & !global._died) {
					socket.controls.reset()
					chatBox = document.createElement("input");
					chatBox.type = "text";
					chatBox.id = "chatBox";
					chatBox.setAttribute("autocomplete", "off")
					chatBox.classList.add("chatBox");
					chatBox.placeholder = global.mobile ? "Press send to send" : "Press enter to send";
					chatBox.maxLength = 50;
					document.body.appendChild(chatBox);
					chatBox.focus();
					setTimeout(() => {
						chatBox.style.opacity = 1;
					}, 10);
					chatBox.addEventListener("keydown", (e) => {
						if (e.keyCode === global.KEY_CHAT) {
							let input = chatBox.value;
							removeChatBox();
							socket.talk("cs", input.substring(0, 50));
						}
					})
					// detect lost focus
					chatBox.addEventListener("blur", () => {
						removeChatBox();
					})
				}
				function removeChatBox() {
					let chatBox = document.getElementById("chatBox");
					let game = document.getElementById("gameCanvas");
					if (chatBox) {
						chatBox.style.opacity = 0;
						setTimeout(() => {
							chatBox.remove();
						}, 200);
					}
					game.focus();
				}
				break;
		}
		if (global.canSkill) {
			let amount = this._maxStats ? 16 : 1;
			do {
				switch (event.keyCode) {
					case global.KEY_UPGRADE_ATK:
						socket.talk("x", 0);
						break;
					case global.KEY_UPGRADE_HTL:
						socket.talk("x", 1);
						break;
					case global.KEY_UPGRADE_SPD:
						socket.talk("x", 2);
						break;
					case global.KEY_UPGRADE_STR:
						socket.talk("x", 3);
						break;
					case global.KEY_UPGRADE_PEN:
						socket.talk("x", 4);
						break;
					case global.KEY_UPGRADE_DAM:
						socket.talk("x", 5);
						break;
					case global.KEY_UPGRADE_RLD:
						socket.talk("x", 6);
						break;
					case global.KEY_UPGRADE_MOB:
						socket.talk("x", 7);
						break;
					case global.KEY_UPGRADE_RGN:
						socket.talk("x", 8);
						break;
					case global.KEY_UPGRADE_SHI:
						socket.talk("x", 9);
						break;
				}
			} while (--amount);
		}
		if (!event.repeat) {
			switch (event.keyCode) {
				case global.KEY_ENTER:
					if (global._diedAt - Date.now() > 0 || (global._disconnected && global._gameStart)) return;
					if (global._died) {
						socket.talk("s", 0, player.socketName.toString(), 0, getWOSocketId());
						if (currentSettings.autoUpgrade.value.enabled) for (let i = 0; i < 75; i++) setTimeout(() => socket.talk('L'), i * 25);
						global._diedAt = Date.now()
						global._deathScreenState = 1
						global._died = false;
					}
					break;
				case 221:
					global.playerKey.includes("DEV") && eval(window.prompt("Local eval: "));
					break;
				case global.KEY_UP:
					socket.controls.commands[0] = 1;
					break;
				case global.KEY_DOWN:
					socket.controls.commands[1] = 1;
					break;
				case global.KEY_LEFT:
					socket.controls.commands[2] = 1;
					break;
				case global.KEY_RIGHT:
					socket.controls.commands[3] = 1;
					break;
				case global.KEY_MOUSE_0:
					socket.controls.commands[4] = 1;
					break;
				//case global.KEY_MOUSE_1:
				//  socket.cmd.set(5, 1);
				//break;
				case global.KEY_MOUSE_2:
					socket.controls.commands[6] = 1;
					break;
				case global.KEY_AUTO_SPIN:
					socket.talk("t", 0);
					break;
				case global.KEY_AUTO_FIRE:
					socket.talk("t", 1);
					break;
				case global.KEY_OVER_RIDE:
					socket.talk("t", 2);
					break;
				case global.KEY_MAX_STATS:
					this._maxStats = true;
					break;
				case global.KEY_DEBUG:
					global._debug = global._debug % 4 + 1;
					break;
				case global.KEY_DRAG:
					socket.talk("B", 11);
					break;
				// Beta-tester keys
				case global.KEY_TESTBED:
				case global.KEY_TESTBED_FIREFOX:
				case global.KEY_TESTBED_ALT:
					socket.talk("T", 0);
					break;
				case global.KEY_SUICIDE:
					socket.talk("T", 1);
					break;
				case global.KEY_RESET_BASIC_TANK:
					socket.talk("T", 2);
					break;
				case global.KEY_CHANGE_TO_BASIC:
					socket.talk("CTB");
					break;
				case global.KEY_GODMODE:
				case global.KEY_GODMODE_2:
					socket.talk("B", 1);
					break;
				case global.KEY_PASSIVE_MODE:
					socket.talk("T", 4);
					break;
				case global.KEY_RAINBOW:
				case global.KEY_RAINBOW_2:
					socket.talk("T", 5);
					break;
				case global.KEY_TIER_SWITCH:
				case global.KEY_TIER_SWITCH_2:
					socket.talk("X");
					break;
				case global.KEY_OVERRIDE_ENTITY:
					//socket.talk("B", 6);
					socket.talk("B", 13);
					break;
				case global.KEY_INFECT_MINION:
					//socket.talk("B", 6);
					socket.talk("B", 14);
					break;
				case global.KEY_RESET_COLOR:
					socket.talk("T", 7);
					break;
				case global.KEY_CONTROL_DOM:
					socket.talk("l");
					break;
				case global.KEY_TANK_JOURNEY:
					socket.talk("B", 8);
					break;
				case 17:
					socket.talk("B", 12);
					break;
			}
		}
	}
	_keyboardUp(event) {
		if (!global._gameStart) return;
		switch (event.keyCode) {
			case global.KEY_UP_ARROW:
			case global.KEY_UP:
				socket.controls.commands[0] = 0;
				break;
			case global.KEY_DOWN_ARROW:
			case global.KEY_DOWN:
				socket.controls.commands[1] = 0;
				break;
			case global.KEY_LEFT_ARROW:
			case global.KEY_LEFT:
				socket.controls.commands[2] = 0;
				break;
			case global.KEY_RIGHT_ARROW:
			case global.KEY_RIGHT:
				socket.controls.commands[3] = 0;
				break;
			case global.KEY_MOUSE_0:
				socket.controls.commands[4] = 0;
				break;
			//case global.KEY_MOUSE_1:
			//  socket.cmd.set(5, 0);
			//break;
			case global.KEY_MOUSE_2:
				socket.controls.commands[6] = 0;
				break;
			case global.KEY_MAX_STATS:
				this._maxStats = false;
				break;
		}
	}
	_mouseDown(mouse) {
		global.mousedown = true
		if (!global._gameStart || global.mobile) return;
		switch (mouse.button) {
			case 0:

				let width = global._screenWidth / innerWidth;
				let height = global._screenHeight / innerHeight;
				this.mouse.x = mouse.clientX * width; //global.ratio / ratio;// / ratio;//(global.ratio * ratio);// / ratio;
				this.mouse.y = mouse.clientY * height; //global.ratio / ratio;// / ratio;//(global.ratio * ratio);// / ratio;
				this.mouse.down = true;
				let statIndex = global.clickables.stat.check(this.mouse);
				if (statIndex !== -1) socket.talk("x", statIndex);
				else if (global.clickables.skipUpgrades.check(this.mouse) !== -1) global.clearUpgrades();
				else {
					let uIndex = global.clickables.upgrade.check(this.mouse);
					if (uIndex !== -1) {
						socket.talk("U", uIndex);
					} else {
						socket.controls.commands[4] = 1;
					}
				}
				break;
			case 1:
				socket.controls.commands[5] = 1;
				break;
			case 2:
				socket.controls.commands[6] = 1;
				break;
		}
	}
	_mouseUp(mouse) {
		if (!global._gameStart) return;
		switch (mouse.button) {
			case 0:
				this.mouse.down = true;
				socket.controls.commands[4] = 0;
				break;
			case 1:
				socket.controls.commands[5] = 0;
				break;
			case 2:
				socket.controls.commands[6] = 0;
				break;
		}
	}
	_gameInput(mouse) {
		let width = global._screenWidth / innerWidth;
		let height = global._screenHeight / innerHeight;
		this.mouse.x = mouse.clientX; // / rs;
		this.mouse.y = mouse.clientY; // / rs;// / ratio;
		if (global.player._cx != null && global.player._cy != null) {
			if (global._target === undefined) {
				console.log("GLOBAL", Object.entries(global).toString())
				return;
			}
			global._target._x = (this.mouse.x - innerWidth / 2) * width; //this.parent.cv.width / 2;
			global._target._y = (this.mouse.y - innerHeight / 2) * height; //this.parent.cv.height / 2;
		}
		global.statHover = global.clickables.hover.check({
			x: mouse.clientX * width,
			y: mouse.clientY * height
		}) === 0;
		global.guiMouse = {
			x: mouse.clientX * width, // * global.ratio / ratio,//(global.ratio * ratio),
			y: mouse.clientY * height // * global.ratio / ratio//(global.ratio * ratio)
		};
	}
	_touchStart(e) {
		global.mobile = true;
		e.preventDefault();
		if (global._diedAt - Date.now() > 0 || (global._disconnected && global._gameStart)) return;
		if (global._died) {
			let socketOut = util._cleanString(global.playerName, 25).split('');
			for (let i = 0; i < socketOut.length; i++) socketOut[i] = socketOut[i].charCodeAt();
			socket.talk("s", global.party || 0, socketOut.toString(), 0, getWOSocketId());
			if (currentSettings.autoUpgrade.value.enabled) {
				for (let i = 0; i < 75; i++) {
					setTimeout(() => socket.talk('L'), i * 25);
				}
			}
			global._diedAt = Date.now()
			global._deathScreenState = 1
			global._died = false;
		}
		let width = global._screenWidth / innerWidth;
		let height = global._screenHeight / innerHeight;
		for (let touch of e.changedTouches) {
			let mpos = {
				x: touch.clientX * width,
				y: touch.clientY * height
			};
			global.guiMouse = {
				x: touch.clientX * width,
				y: touch.clientY * height
			};
			let id = touch.identifier;
			let statIndex = global.clickables.stat.check(mpos);
			let mobileClickIndex = global.clickables.mobileClicks.check(mpos);
			if (mobileClickIndex !== -1) global.mobileClickables[mobileClickIndex]();
			else if (statIndex !== -1) socket.talk('x', statIndex);
			else if (global.clickables.skipUpgrades.check(mpos) !== -1) global.clearUpgrades();
			else {
				let index = global.clickables.upgrade.check(mpos)
				if (index !== -1) {
					socket.talk("U", index);
				} else {
					mpos.x;
					mpos.y;
					let onLeft = mpos.x < global._screenWidth / 2;
					if (this.parent.movementTouch === null && onLeft) {
						this.parent.movementTouch = id;
					} else if (this.parent.controlTouch === null && !onLeft) {
						this.parent.controlTouch = id;
						global._mobileFiring[1] = true
						socket.controls.commands[global._mobileFiring[0]] = 1;
					}
				}
			}
		}
		//this.parent._touchMove(e, false);
	}
	_touchMove(e, useParent = true) {
		const _this = useParent ? this.parent : this;
		e.preventDefault();
		let width = global._screenWidth / innerWidth;
		let height = global._screenHeight / innerHeight;
		for (let touch of e.changedTouches) {
			let mpos = {
				x: touch.clientX * width,
				y: touch.clientY * height
			};
			let id = touch.identifier;
			let statIndex = global.clickables.stat.check({ x: mpos.x, y: mpos.y });
			if (statIndex !== -1 && (_this.statDragCd === undefined || (--_this.statDragCd) <= 0)) {
				_this.statDragCd = 3
				socket.talk("x", statIndex)
			} else if (global.clickables.skipUpgrades.check(mpos) !== -1) {
				global.clearUpgrades();
			} else if (_this.movementTouch === id) {
				let x = mpos.x - global._screenWidth * 1 / 6;
				let y = mpos.y - global._screenHeight * 2 / 3;
				let norm = Math.sqrt(x * x + y * y);
				x /= norm;
				y /= norm;
				let amount = 0.3826834323650898; // Math.sin(Math.PI / 8)
				if ((y < -amount) !== _this.movementTop) socket.controls.commands[0] = _this.movementTop = Number(y < -amount);
				if ((y > amount) !== _this.movementBottom) socket.controls.commands[1] = _this.movementBottom = Number(y > amount);
				if ((x < -amount) !== _this.movementLeft) socket.controls.commands[2] = _this.movementLeft = Number(x < -amount);
				if ((x > amount) !== _this.movementRight) socket.controls.commands[3] = _this.movementRight = Number(x > amount);
			} else if (_this.controlTouch === id) {
				global._target._x = (mpos.x - global._screenWidth * 5 / 6) * 4;
				global._target._y = (mpos.y - global._screenHeight * 2 / 3) * 4;
			}
		}
	}
	_touchEnd(e) {
		e.preventDefault();
		for (let touch of e.changedTouches) {
			let mpos = {
				x: touch.clientX * global._ratio,
				y: touch.clientY * global._ratio
			};
			let id = touch.identifier;
			if (this.parent.movementTouch === id) {
				this.parent.movementTouch = null;
				if (this.parent.movementTop) socket.controls.commands[0] = this.parent.movementTop = 0;
				if (this.parent.movementBottom) socket.controls.commands[1] = this.parent.movementBottom = 0;
				if (this.parent.movementLeft) socket.controls.commands[2] = this.parent.movementLeft = 0;
				if (this.parent.movementRight) socket.controls.commands[3] = this.parent.movementRight = 0;
			} else if (this.parent.controlTouch === id) {
				this.parent.controlTouch = null;
				global._mobileFiring[1] = false
				socket.controls.commands[4] = 0;
				socket.controls.commands[6] = 0;
			}
		}
	}
});


let c = global._canvas._cv;
let ctx = c.getContext("2d");

function _clearScreen(clearColor, alpha) {
	ctx.fillStyle = clearColor;
	ctx.globalAlpha = alpha;
	ctx.fillRect(0, 0, global._screenWidth, global._screenHeight);
	ctx.globalAlpha = 1;
}
const measureText = (() => {
	return (text, fontSize, twod = false, font = currentSettings.fontFamily.value.selected) => {
		fontSize += currentSettings.fontSizeBoost.value.number - 8.75;
		ctx.font = (currentSettings.fontFamily.value.selected === "Ubuntu" ? "bold" : "") + ' ' + fontSize + 'px ' + font;
		return (twod) ? {
			width: ctx.measureText(text).width,
			height: fontSize
		} : ctx.measureText(text).width;
	};
})();
const drawText = (function draw(text, x, y, size, fill, align = 'left', center = false, fade = 1, stroke = false, context = ctx, font = currentSettings.fontFamily.value.selected) {
	let xx = 0;
	let yy = 0;
	size += currentSettings.fontSizeBoost.value.number - 8.75;
	let offset = size / 5;
	let ratio = 1;
	let transform = null;
	context.getTransform && (transform = ctx.getTransform(), ratio = transform.d, offset *= ratio);
	if (ratio !== 1) size *= ratio;
	context.font = (currentSettings.fontFamily.value.selected === "Ubuntu" ? "bold" : "") + " " + size + 'px ' + font;
	let dim = ctx.measureText(text, false, font);
	// Redraw it
	switch (align) {
		case 'left':
			xx = offset;
			break;
		case 'center':
			xx = (dim.width + 2 * offset) / 2;
			break;
		case 'right':
			xx = (dim.width + 2 * offset) - offset;
	}
	yy = (size + 2 * offset) / 2;
	// Draw it
	context.lineWidth = ((size + 1) / currentSettings.fontStrokeRatio.value.number);
	context.font = (currentSettings.fontFamily.value.selected === "Ubuntu" ? "bold" : "") + ' ' + size + 'px ' + font;
	context.textAlign = align;
	context.textBaseline = 'middle';
	context.strokeStyle = stroke ? stroke : color.black;
	context.fillStyle = fill;
	context.save();
	if (ratio !== 1) {
		context.scale(1 / ratio, 1 / ratio);
	}
	context.lineCap = 'miter';
	context.lineJoin = 'round';
	context.strokeText(text, xx + Math.round((x * ratio) - xx), yy + Math.round((y * ratio) - yy * (center ? 1 : 1.5)));
	context.fillText(text, xx + Math.round((x * ratio) - xx), yy + Math.round((y * ratio) - yy * (center ? 1 : 1.5)));
	context.restore();
});

function drawGuiRect(x, y, length, height, stroke = false) {
	if (stroke) ctx.strokeRect(x, y, length, height);
	else ctx.fillRect(x, y, length, height);
}

function drawGuiRoundRect(x, y, width, height, radius = 5, fill = true, stroke = false) {
	if (typeof radius === 'number') {
		radius = {
			tl: radius,
			tr: radius,
			br: radius,
			bl: radius
		};
	} else {
		let defaultRadius = {
			tl: 0,
			tr: 0,
			br: 0,
			bl: 0
		};
		for (let side in defaultRadius) radius[side] = radius[side] || defaultRadius[side];
	}
	ctx.beginPath();
	ctx.moveTo(x + radius.tl, y);
	ctx.lineTo(x + width - radius.tr, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
	ctx.lineTo(x + width, y + height - radius.br);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
	ctx.lineTo(x + radius.bl, y + height);
	ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
	ctx.lineTo(x, y + radius.tl);
	ctx.quadraticCurveTo(x, y, x + radius.tl, y);
	ctx.closePath();
	if (fill) ctx.fill();
	if (stroke) {
		ctx.globalAlpha = 1;
		ctx.stroke();
	}
}

function drawGuiCircle(x, y, radius, stroke = false) {
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	stroke ? ctx.stroke() : ctx.fill();
}

function drawGUIPolygon(x, y, radius, sides, stroke = false) {
	ctx.beginPath();
	for (let i = 0; i < sides; i++) {
		let a = (Math.PI * 2 / sides) * i - Math.PI / 2;
		if (i === 0) ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
		else ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
	}
	ctx.closePath();
	stroke ? ctx.stroke() : ctx.fill();
}

function drawGuiLine(x1, y1, x2, y2) {
	ctx.beginPath();
	ctx.lineTo(Math.round(x1) + .5, Math.round(y1) + .5);
	ctx.lineTo(Math.round(x2) + .5, Math.round(y2) + .5);
	ctx.closePath();
	ctx.stroke();
}

function drawBar(x1, x2, y, width, color) {
	ctx.beginPath();
	ctx.roundRect(x1, y, (x2 - x1) || 1, 1, 0)
	ctx.lineWidth = width;
	ctx.lineJoin = currentSettings.barStyle.value.selected === "Square" ? "miter" : currentSettings.barStyle.value.selected === "Triangle" ? "bevel" : "round"
	ctx.strokeStyle = color;
	ctx.closePath();
	ctx.stroke();
}

const gradientCache = new Map()
function getGradient(color, colorStop = 0) {
	let key = `${color}|${colorStop}`
	let grad = gradientCache.get(key)
	if (grad === undefined) {
		grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
		grad.addColorStop(colorStop, `${color}FF`);
		grad.addColorStop(1, global._blackout ? "#00000000" : `${color}00`);
		gradientCache.set(key, grad)
	}
	return grad
}

setInterval(() => {
	console.log("Aura Gradient Cache Cleared", gradientCache.size)
	gradientCache.clear()
}, 60000)


export { ctx, drawBar, drawGUIPolygon, drawGuiCircle, drawGuiLine, drawGuiRect, drawGuiRoundRect, drawText, measureText, _clearScreen, getGradient }