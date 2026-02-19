import { global } from "../global.js";

const keyboard = {
	locked: false,
	keys: {
		shift: false,
		alt: false,
		ctrl: false,
	},
	keyChangeFuncts: new Map()
}
keyboard._updateSpecialKeys = function(keyUpDownEvent){
	keyboard.keys.shift = keyUpDownEvent.shiftKey;
	keyboard.keys.alt = keyUpDownEvent.altKey;
	keyboard.keys.ctrl = keyUpDownEvent.ctrlKey;
}
keyboard._updateKeyDown = function(keyDownEvent){
	keyboard._updateSpecialKeys(keyDownEvent);
	keyboard.keys[keyDownEvent.key] = true;
}
keyboard._updateKeyUp = function(keyUpEvent){
	keyboard._updateSpecialKeys(keyUpEvent);
	keyboard.keys[keyUpEvent.key] = false;
}

window.addEventListener("keydown", keyboard._updateKeyDown)
window.addEventListener("keyup", keyboard._updateKeyUp)

export { keyboard };