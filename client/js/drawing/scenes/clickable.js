import { mouse } from "../../controls/mouse.js";
import { drawLoop } from "../drawLoop.js";
import { Scene } from "../scene.js";

const clickables = new Scene(100);
drawLoop.addScene("clickables", clickables);
clickables.drawingDisabled = true;

let areas = [];
function draw({canvas, ctx, delta}){
	ctx.fillStyle = "#AAAAAA";
	ctx.globalAlpha = .25 + .25*Math.random();
	for(let [x1, y1, x2, y2] of areas){
		ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
	}
	areas.length = 0;
}
clickables.drawFuncts.set("debug draw", draw)


function clickableActive(x1, y1, x2, y2, debug){
	if(debug === true){
		clickables.drawingDisabled = false;
		areas.push([x1, y1, x2, y2]);
	}else{
		clickables.drawingDisabled = true;
	}
	
	const pos = mouse.posRelativeToCanvas();
	if(pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2){
		return mouse.buttons
	}
	return false;
}

export { clickableActive }