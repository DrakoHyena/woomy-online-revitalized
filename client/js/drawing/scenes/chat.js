import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { renderInput } from "../inputElements.js";
import { focusInput } from "../inputElements.js";
import { roomState } from "../../state/room.js";
import { socket } from "../../socket.js";
import { clientPackets } from "../../../../shared/packetIds.js";
import { renderText } from "../text.js";
import { currentSettings } from "../../settings.js";
import { clickableActive } from "./clickable.js";
import { mouse } from "../../controls/mouse.js";
import { keyboard } from "../../controls/keyboard.js";
import { isTextOrNumberFocused, blurAllTextNumberInputs, isElementFocused } from "../inputElements.js";
import { lerp } from "../../lerp.js";
import { hideCursorTextBox, showCursorTextBox } from "./cursorUi.js";
import { getColor } from "../../colors.js";

const state = {
	messagePadding: 5,
	padding: 5,
	margin: 10,
	fade: 0,
	active: false,
	x: 0, 
	y: 0,
	width: 0, 
	height: 0,
	// amount of vertical space taken by the selected-message popup (including its margin)
	popupHeight: 0
}

const chat = new Scene(40);
drawLoop.addScene("chat", chat);

const chatEnterDebounce = 200;
let lastEnterPress = 0;
let _prevEnterDown = false;
chat.utilityFuncts.set("enterToChat", ()=>{
	// trigger on Enter **down** edge only (prevents hold/first-frame issues)
	const enterDown = !!keyboard.keys["Enter"];
	if (enterDown && !_prevEnterDown && Date.now() - lastEnterPress > chatEnterDebounce) {
		lastEnterPress = Date.now();

		// If the chat input is already focused, let renderInput handle Enter (submit) — do nothing here
		if (isElementFocused && isElementFocused("chatInput")){
			// intentionally empty: allow normal submit flow
		} else {
			// If another text/number input is focused, blur it so chat opens with one Enter press
			if (isTextOrNumberFocused()) {
				blurAllTextNumberInputs();
			}

			if (!state.active) {
				openChatMenu();
				state._openedByEnter = true;
			}
			focusInput("chatInput", { initialValue: "Type here to chat" });
		}
	}
	_prevEnterDown = enterDown;
})

class ChatMessage{
	constructor(sender, content, textColor, backgroundColor, entityId=false){
		this.sender = sender;
		this.content = content;
		this.textColor = textColor;
		this.backgroundColor = typeof backgroundColor === "number" ? getColor(backgroundColor) : backgroundColor || "transparent";
		this.entityId = entityId;
		this.creationStamp = performance.now();
		// start visible (alphaFade used for hover boost/fade) — new messages already use creationStamp-based fade
		this.alphaFade = 1;
	}
	getSenderRender(size, maxWidth){
		return renderText(`${this.sender}:`, size, {
			fillStyle: this.textColor
		}, true, maxWidth);
	}
	getContentRender(size, maxWidth){
		return renderText(this.content, size, {
			fillStyle: this.textColor
		}, true, maxWidth);
	}
}

let closeIcon = new Image();
closeIcon.src = "/resources/icons/chatclose-icon.png";
closeIcon.onload = ()=>{
	createImageBitmap(closeIcon).then((bmp)=>{
		closeIcon = bmp;
	})
}

let muteIcon = new Image();
muteIcon.src = "/resources/icons/chatmute-icon.png";
muteIcon.onload = ()=>{
	createImageBitmap(muteIcon).then((bmp)=>{
		muteIcon = bmp;
	})
}

const mutedSenders = new Set();
const ACCENT = "#414141";
const BACKGROUND = "#5e5e5e";
let yOffset = 0;
let lastMouseY = 0;
let lowestY = 0;
let selectedMessage = {
	author: "None",
	content: "",
	entityId: -1,
	active: false,
	fade: 0
}
function draw({canvas, ctx, delta}){
	// update popup height every frame so other systems (minimap) can query it
	(function updatePopupHeight(){
		// same math used in drawSelectedMessage for consistency
		const scale = currentSettings.chatSize.value.number;
		const baseHeight = (canvas.height/15) * scale;
		const borderMult = currentSettings.chatBorderSize.value.number;
		const baseSize = Math.min(canvas.width, canvas.height);
		const border = baseSize * 0.005 * borderMult * scale;
		const popupFullHeight = baseHeight + border * 2 + state.margin;
		state.popupHeight = popupFullHeight * selectedMessage.fade;
	})();

	if(state.active){
		state.fade = lerp(state.fade, 1, currentSettings.menuAnimSpeed.value.number*delta);
		if(state.fade > .999){
			chat.drawFuncts.delete("drawNewChats")
		}
	}else{
		state.fade = lerp(state.fade, 0, currentSettings.menuAnimSpeed.value.number*delta);
		if(state.fade < 0.001){
			chat.drawFuncts.delete("drawchat")
		}
	}

	// overall scale and layout
	const scale = currentSettings.chatSize ? currentSettings.chatSize.value.number : 1;
	const baseWidth = (canvas.height/2.8) * scale;
	const baseHeight = (canvas.height/4) * scale;

	let padding = state.padding * scale;
	const margin = state.margin * scale;

	// compute border thickness (depends on canvas size & user multiplier)
	const borderMult = currentSettings.chatBorderSize ? currentSettings.chatBorderSize.value.number : 1;
	const baseSize = Math.min(canvas.width, canvas.height);
	const border = baseSize * 0.005 * borderMult * scale;

	// include border in the overall dimensions so increasing it pushes outward
	const WIDTH = baseWidth + border * 2;
	const HEIGHT = baseHeight + border * 2;

	state.width = WIDTH;
	state.height = HEIGHT;
	// position: interpolate from off-screen/right (fade=0) to final X (fade=1)
	state.x = (canvas.width - WIDTH - margin) * state.fade + canvas.width * (1 - state.fade);
	state.y = canvas.height - HEIGHT - margin;
	const x = state.x;
	const y = state.y;

	if(selectedMessage.fade !== 0 || selectedMessage.active){
		drawSelectedMessage(canvas, ctx, delta)
	}

	// `state.fade` is now 0..1 so chatAlpha 1 => fully visible, 0 => hidden
	ctx.globalAlpha = currentSettings.chatAlpha.value.number * state.fade;
	ctx.fillStyle = ACCENT;
	// draw border box (thickness scales with canvas size)
	ctx.fillRect(x, y, WIDTH, HEIGHT);
	ctx.fillStyle = BACKGROUND;
	const boxInputRatio = .88;
	// inner area dimensions (independent of border)
	const innerWidth = baseWidth - padding * 2;
	const innerHeight = baseHeight * boxInputRatio - padding;
	ctx.fillRect(x + border + padding, y + border + padding, innerWidth, innerHeight);
	padding *= 1.5;
	// chat input sits below the inner message box (within border/padding)
	renderInput("chatInput",
		"text",
		chat,
		x + border + padding,
		y + border + baseHeight * boxInputRatio + padding/2,
		baseWidth - padding*2,
		baseHeight * (1 - boxInputRatio) - padding,
		"Type here to chat",
		(val)=>{
			if(val === "" || val === "Type here to chat") return;
			const lengthLimit = roomState.chatMessageLimit;
			for(let i = 0; i < val.length; i += lengthLimit){
				socket.send(clientPackets.chatMessage, val.substring(i, lengthLimit))
			}
			lastEnterPress = Date.now();
			if(state._openedByEnter){
				closeChatMenu();
				state._openedByEnter = false;
				return false; // tell renderInput to blur the field
			}
			return false;
		}
	)
	padding /= 1.5;

	if(roomState.chatMessages.length > currentSettings.messageHistoryLimit.value.number) roomState.chatMessages.shift();
	let cx = x + border + padding; // start inside border + outer padding
	let cy = y + border + padding;
	const height = innerHeight - padding * 2;
	const maxWidth = innerWidth - padding * 2;
	const textSize = baseHeight * (1 - boxInputRatio) - padding;
	ctx.save();
	let path = new Path2D();
	path.rect(cx, cy, maxWidth, height);
	ctx.clip(path);
	let click = clickableActive(cx, cy, cx + maxWidth, cy + height)
	if(click.left === true){
		mouse.scrollY += (lastMouseY - mouse.y)*.44;
	}
	if(click) yOffset -= mouse.scrollY*.3;
	if(lowestY - (cy+height) > 0) {
		yOffset -= 1 + (lowestY-(cy+height)) * .03;
	} else if(Math.ceil(lowestY - (cy+height)) !== 0){
		yOffset += 1 + ((cy+height)-lowestY) * .03;
	}
	lastMouseY = mouse.y;
	cy += yOffset;

	for (let chatMessage of roomState.chatMessages) {
		const chatMessageFade = Math.min(1, (performance.now() - chatMessage.creationStamp) / Math.max(1, 500*(1-currentSettings.menuAnimSpeed.value.number)));
		ctx.globalAlpha = currentSettings.chatAlpha.value.number * state.fade * chatMessageFade;

		const senderText = chatMessage.getSenderRender(textSize / 2.5, maxWidth);
		const contentText = chatMessage.getContentRender(textSize / 2, maxWidth);

		const totalHeight = senderText.height + contentText.height + state.messagePadding;
		const layoutIncrement = state.messagePadding / 2 + 2 + (senderText.height + contentText.height) * chatMessageFade;

		const clipTop = y - padding;
		const clipBottom = clipTop + height+padding;
		const msgTop = cy;
		const msgBottom = cy + totalHeight;

		// Skip expensive drawing if the whole message is outside the clipped view
		if (msgBottom < clipTop || msgTop > clipBottom) {
			cy += layoutIncrement;
			continue;
		}

		click = clickableActive(cx, msgTop, cx+maxWidth, msgBottom);
		if(click){
			// subtle hover boost (avoid clamping the canvas alpha by keeping this close to 1)
			chatMessage.alphaFade = lerp(chatMessage.alphaFade, 1.25, currentSettings.menuAnimSpeed.value.number*delta)
			if(click.left){
				selectedMessage.author = chatMessage.sender;
				selectedMessage.content = chatMessage.content;
				selectedMessage.entityId = chatMessage.entityId;
				selectedMessage.active = true;
			}
		} else {
			chatMessage.alphaFade = lerp(chatMessage.alphaFade, 1, currentSettings.menuAnimSpeed.value.number*delta)
		}
		ctx.globalAlpha *= chatMessage.alphaFade;

		ctx.fillStyle = chatMessage.backgroundColor;
		ctx.fillRect(cx, cy, maxWidth, totalHeight);
		cy += state.messagePadding / 2;
		ctx.drawImage(senderText, cx, cy + state.messagePadding / 2);
		cy += 2 + senderText.height * chatMessageFade;
		ctx.drawImage(contentText, cx, cy);
		cy += contentText.height * chatMessageFade;
	}
	lowestY = cy;
	ctx.restore();
}
let hadMuteFocus = false;
let lastClick = 0;
let clickDebounce = 200;
function drawSelectedMessage(canvas, ctx, delta){
	const scale = currentSettings.chatSize ? currentSettings.chatSize.value.number : 1;
	const baseWidth = (canvas.height/2.8) * scale;
	const baseHeight = (canvas.height/15) * scale;

	// compute border thickness (same formula used elsewhere)
	const borderMult = currentSettings.chatBorderSize ? currentSettings.chatBorderSize.value.number : 1;
	const baseSize = Math.min(canvas.width, canvas.height);
	const border = baseSize * 0.005 * borderMult * scale;

	const width = baseWidth + border * 2;
	const height = baseHeight + border * 2;

	// update popupHeight so minimap stays in sync even while this popup is animating
	state.popupHeight = (height + state.margin) * selectedMessage.fade;

	let x = state.x + width * (1 - selectedMessage.fade);
	let y = (state.y - state.margin - height)

	if(selectedMessage.active){
		selectedMessage.fade = lerp(selectedMessage.fade, 1, currentSettings.menuAnimSpeed.value.number*delta);
	}else{
		selectedMessage.fade = lerp(selectedMessage.fade, 0, currentSettings.menuAnimSpeed.value.number*delta);
		if(selectedMessage.fade < .001){
			selectedMessage.fade = 0;
		}
	}

	ctx.globalAlpha = currentSettings.chatAlpha.value.number * state.fade * selectedMessage.fade;
	ctx.fillStyle = ACCENT;
	const pad = state.padding * scale;
	ctx.fillRect(x, y, width - state.margin + pad*2, height);
	ctx.fillStyle = BACKGROUND;
	// calculate inner content area (without border)
	const innerW = baseWidth - pad * 2;
	const innerH = baseHeight - pad * 2;
	ctx.fillRect(x + border + pad, y + border + pad, innerW, innerH);
    x += pad * 2;

	const boxSize = height / 1.5;
	const marg = state.margin * scale;
	ctx.fillStyle = "#E02121";
	let click = clickableActive(x, y + (height/2) - (boxSize/2), x+boxSize, y + (height/2) - (boxSize/2) + boxSize);
	if(click){
		ctx.globalAlpha *= 1.3;
		if(click.left && (Date.now()-lastClick)>clickDebounce){
			lastClick = Date.now();
			ctx.globalAlpha *= .8;
			selectedMessage.active = false;
		}
	}
	ctx.fillRect(x, y + (height/2) - (boxSize/2), boxSize, boxSize);
	ctx.drawImage(closeIcon, x + pad, y + (height/2) - (boxSize/2) + pad, boxSize - pad*2, boxSize-pad*2)
	x += boxSize + marg;
	ctx.globalAlpha = state.fade * selectedMessage.fade;
	ctx.fillStyle = "#878787";
	click = clickableActive(x, y + (height/2) - (boxSize/2), x + boxSize, y + (height/2) - (boxSize/2) + boxSize);
	if(hadMuteFocus && !click){
		hadMuteFocus = false;
		hideCursorTextBox();
	}
	if(click){
		ctx.globalAlpha = 1;
		if(mutedSenders.has(selectedMessage.author)){
			showCursorTextBox("Unmute Sender", "Allows all incoming messages from this user in the global chat for the rest of the session")
		}else{
			showCursorTextBox("Mute Sender", "Blocks all incoming messages from this user in the global chat for the rest of the session")
		}
		hadMuteFocus = true;
		if(click.left && (Date.now()-lastClick)>clickDebounce){
			lastClick = Date.now();
			if(mutedSenders.has(selectedMessage.author)){
				mutedSenders.delete(selectedMessage.author);
			}else{
				mutedSenders.add(selectedMessage.author);
			}
		}
	}
	ctx.fillRect(x, y + (height/2) - (boxSize/2), boxSize, boxSize);
	ctx.drawImage(muteIcon, x + pad, y + (height/2) - (boxSize/2) + pad, boxSize - pad*2, boxSize - pad*2);
	x += boxSize + marg;

	const text = renderText(selectedMessage.author, height/3, {}, true, width-(x-state.x));
	ctx.drawImage(text,x  + pad, y + (height/2) - text.height/2)
}

function drawNewChats({canvas, ctx, delta}){
	// compute scaled padding for layout (matches main chat box calculations)
	const scale = currentSettings.chatSize ? currentSettings.chatSize.value.number : 1;
	const pad = state.padding * scale;

	const fade = 1 - state.fade;
	let newChatAlpha = currentSettings.chatAlpha.value.number;
	let y = canvas.height - state.margin;
	const maxWidth = canvas.height / 2.8;
	let x = canvas.width - state.margin + maxWidth*(1-fade);
	const maxDur = currentSettings.closedMessageShowDuration.value.number;
	const fadeTime = Math.max(1, 400 * (1 - currentSettings.menuAnimSpeed.value.number))

	if(maxDur === 0) return;

	for(let i = roomState.chatMessages.length-1; i >= 0; i--){
		const chatMessage = roomState.chatMessages[i];
		const tDiff = (performance.now()-chatMessage.creationStamp);
		if(tDiff > maxDur){
			return;
		}
		if(tDiff < fadeTime){
			ctx.globalAlpha = Math.min(newChatAlpha, newChatAlpha * tDiff / fadeTime);
		} else if(tDiff > maxDur - fadeTime){
			ctx.globalAlpha = Math.max(0, newChatAlpha * (maxDur - tDiff) / fadeTime);
		}else {
			ctx.globalAlpha = newChatAlpha;
		}
		ctx.globalAlpha *= fade;

		// render sender to the left of the message rect and keep content at full maxWidth
		const senderText = chatMessage.getSenderRender(canvas.height / 60, maxWidth);
		const contentText = chatMessage.getContentRender(canvas.height / 60, maxWidth);

		// visibility 0..1 during fade-in only; remain at 1 during steady and fade-out
		let vis = 1;
		if (tDiff < fadeTime) {
			vis = Math.max(0, Math.min(1, tDiff / fadeTime));
		}

		// compute message height (center both texts vertically)
		const msgHeight = Math.max(senderText.height, contentText.height);
		const rectLeft = x - maxWidth;
		const rectTop = y - msgHeight * vis;

		ctx.globalAlpha *= .5;
		ctx.fillStyle = chatMessage.backgroundColor;

		// position content right-aligned in the rect and place sender immediately to its left
		const contentX = rectLeft + maxWidth - pad - contentText.width;
		const senderX = contentX - state.messagePadding - senderText.width;
		// include sender area to the left of the content rect in the background
		const bgLeft = Math.min(senderX - pad, rectLeft);
		const bgRight = rectLeft + maxWidth;
		const bgWidth = bgRight - bgLeft;
		ctx.fillRect(bgLeft, rectTop, bgWidth, msgHeight * vis);
		ctx.globalAlpha *= 2;

		// draw sender to the left of the rect (now inside the background) and content inside the rect
		const senderY = rectTop + (msgHeight * vis - senderText.height) / 2;
		ctx.drawImage(senderText, senderX, senderY);

		const contentY = rectTop + (msgHeight * vis - contentText.height) / 2;
		ctx.drawImage(contentText, contentX, contentY);

		// move up by the (possibly scaled) message height
		y -= msgHeight * vis ;
	}
}

chat.drawFuncts.set("drawchat", draw)

function openChatMenu(){
	state.active = true;
	chat.drawFuncts.set("drawchat", draw)
}

function closeChatMenu(){
	state.active = false;
	chat.drawFuncts.set("drawNewChats", drawNewChats)
	// ensure programmatic focus is cleared when chat closes
	blurAllTextNumberInputs();
	// prevent Enter-down from immediately re-opening the chat
	lastEnterPress = Date.now();
}

function toggleChatMenu(){
	if(state.active){
		closeChatMenu();
	}else{
		openChatMenu();
	}
}

export { toggleChatMenu, openChatMenu, closeChatMenu, state as chatState, ChatMessage, mutedSenders }