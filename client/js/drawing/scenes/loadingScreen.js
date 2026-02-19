import { lerp } from "../../lerp.js";
import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";
import { renderText } from "../text.js";

const loadingScreen = new Scene(50);
drawLoop.addScene("loadingScreen", loadingScreen);
loadingScreen.active = false;

const state = {
	title: "",
	subtitle: "",
	active: false,
	fade: 0
}

loadingScreen.utilityFuncts.set("fade", ({ canvas, ctx, delta })=>{
	if(state.active === false){
		state.fade = lerp(state.fade, 0, 0.2*delta);
		if(state.fade < 0.001){
			loadingScreen.active = false;
		}
	}else if(state.active === true){
		state.fade = lerp(state.fade, 1, 0.2*delta);
	}
})

loadingScreen.drawFuncts.set("loadingScreen", ({ canvas, ctx }) => {
	ctx.globalAlpha = state.fade;
	ctx.fillStyle = "#2b2b2b";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	let text = renderText(state.title, 64);
	ctx.drawImage(text, canvas.width/2 - text.width/2, canvas.height/2 - text.height/2);

	text = renderText(state.subtitle, 24);
	ctx.drawImage(text, canvas.width/2 - text.width/2, canvas.height/2 + text.height*2)
});

function openLoadingScreen(title, subtitle){
	state.active = loadingScreen.active = true;
	state.title = title;
	state.subtitle = subtitle;
}

function closeLoadingScreen(){
	state.active = false;
}

export { openLoadingScreen, closeLoadingScreen, state as loadingScreenState }