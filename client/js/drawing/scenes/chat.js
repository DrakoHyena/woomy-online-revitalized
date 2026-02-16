import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { renderInput } from "../inputElements.js";
import { roomState } from "../../state/room.js";
import { socket } from "../../socket.js";
import { clientPackets } from "../../../../shared/packetIds.js";
import { renderText } from "../text.js";
import { currentSettings } from "../../settings.js";
import { clickableActive } from "./clickable.js";
import { mouse } from "../../controls/mouse.js";
import { lerp } from "../../lerp.js";
import { hideCursorTextBox, showCursorTextBox } from "./cursorUi.js";

/*
TODO:
- Isolate input capture
- 
*/


const state = {
	messagePadding: 5,
	padding: 5,
	margin: 10,
	fade: .5,
	active: true,
}

const chat = new Scene(40);
drawLoop.addScene("chat", chat);

class ChatMessage{
	constructor(sender, content, textColor, backgroundColor="transparent", entityId=false){
		this.sender = sender;
		this.content = content;
		this.textColor = textColor;
		this.backgroundColor = backgroundColor;
		this.entityId = entityId;
		this.creationStamp = performance.now();
		this.alphaFade = 0;
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
	if(state.active){
		state.fade = lerp(state.fade, .5, currentSettings.menuAnimSpeed.value.number*delta);
	}else{
		state.fade = lerp(state.fade, 0, currentSettings.menuAnimSpeed.value.number*delta);
		if(state.fade < 0.001){
			chat.drawFuncts.delete("drawchat")
		}
	}

	const WIDTH = canvas.height/2;
	const HEIGHT = canvas.height/3.5;

	let padding = state.padding;

	state.x = (canvas.width - WIDTH - state.margin) * (state.fade+.5) + canvas.width * (.5 - state.fade);
	state.y = canvas.height - HEIGHT - state.margin;
	const x = state.x;
	const y = state.y;

	if(selectedMessage.fade !== 0 || selectedMessage.active){
		drawSelectedMessage(canvas, ctx, delta)
	}

	ctx.globalAlpha = state.fade;
	ctx.fillStyle = ACCENT;
	ctx.fillRect(x, y, WIDTH, HEIGHT);
	ctx.fillStyle = BACKGROUND;
	const boxInputRatio = .88;
	ctx.fillRect(x + padding, y + padding, WIDTH - padding * 2, HEIGHT * boxInputRatio - padding); 
	padding *= 3;
	renderInput("chatInput",
		"text",
		chat,
		x + padding,
		y + HEIGHT * boxInputRatio + padding/2,
		WIDTH - padding * 2,
		HEIGHT * (1 - boxInputRatio) - padding,
		"Type here to chat",
		(val)=>{
			if(val === "Type here to chat") return;
			const lengthLimit = roomState.chatMessageLimit;
			for(let i = 0; i < val.length; i += lengthLimit){
				socket.send(clientPackets.chatMessage, val.substring(i, lengthLimit))
			}
		}
	)
	padding /= 3;

	if(roomState.chatMessages.length > currentSettings.messageHistoryLimit.value.number) roomState.chatMessages.shift();
	let cx = x + padding;
	let cy = y + padding;
	const height = HEIGHT * boxInputRatio - padding * 2;
	const maxWidth = WIDTH - padding * 2;
	const textSize = HEIGHT * (1 - boxInputRatio) - padding;
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
		const chatMessageFade = Math.min(1, (performance.now() - chatMessage.creationStamp) / 200);
		ctx.globalAlpha = state.fade * chatMessageFade;

		const senderText = chatMessage.getSenderRender(textSize / 3, maxWidth);
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
			chatMessage.alphaFade = lerp(chatMessage.alphaFade, 2, currentSettings.menuAnimSpeed.value.number*delta)
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
	const height = canvas.height/13;
	const width = canvas.height/2;
	let x = state.x;
	let y = (state.y - state.margin - height) * (selectedMessage.fade) + canvas.height * (1 - selectedMessage.fade);

	if(selectedMessage.active){
		selectedMessage.fade = lerp(selectedMessage.fade, 1, currentSettings.menuAnimSpeed.value.number*delta);
	}else{
		selectedMessage.fade = lerp(selectedMessage.fade, 0, currentSettings.menuAnimSpeed.value.number*delta);
		if(selectedMessage.fade < .001){
			selectedMessage.fade = 0;
		}
	}

	ctx.globalAlpha = state.fade*selectedMessage.fade;
	ctx.fillStyle = ACCENT;
	ctx.fillRect(x, y, width - state.margin + state.padding*2, height);
	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(x + state.padding, y + state.padding, width - state.margin, height - state.padding*2);
    x += state.padding * 2;

	const boxSize = height / 1.5;
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
	ctx.drawImage(closeIcon, x + state.padding, y + (height/2) - (boxSize/2) + state.padding, boxSize - state.padding*2, boxSize-state.padding*2)
	x += boxSize + state.margin;
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
	ctx.drawImage(muteIcon, x + state.padding, y + (height/2) - (boxSize/2) + state.padding, boxSize - state.padding*2, boxSize - state.padding*2);
	x += boxSize + state.margin;

	const text = renderText(selectedMessage.author, height/3, {}, true, width-(x-state.x));
	ctx.drawImage(text,x  + state.padding, y + (height/2) - text.height/2)
}
chat.drawFuncts.set("drawchat", draw)

function openChatMenu(){
	state.active = true;
	chat.drawFuncts.set("drawchat", draw)
}

function closeChatMenu(){
	state.active = false;
}

function toggleChatMenu(){
	if(state.active){
		closeChatMenu();
	}else{
		openChatMenu();
	}
}

export { toggleChatMenu, openChatMenu, closeChatMenu, state as chatState, ChatMessage, mutedSenders }