import { global } from "../global.js";
import { canvas, ctx } from "./drawLoop.js";

class Scene{
	constructor(layer){
		this.active = true;
		this.drawingDisabled = false;
		this.utilityFuncts = new Map();
		this.resizeFuncts = new Map();
		this.drawFuncts = new Map();
		this.layer = layer || 0;
	}
	draw(delta){
		for(let [utilityFunctLabel, utilityFunct] of this.utilityFuncts){
			if(global.debug === true){
				console.log(`[SCENE] Utilizing ${utilityFunctLabel}...`)
			}
			utilityFunct({canvas: canvas, ctx: ctx, delta: delta});
		}
		if(this.drawingDisabled === true){
			if(global.debug === true){
				console.log(`[SCENE] Drawing disabled`)
			}
			return;
		}
		for(let [drawFunctLabel, drawFunct] of this.drawFuncts){
			if(global.debug === true){
				console.log(`[SCENE] Drawing ${drawFunctLabel} (${delta} delta)...`)
			}
			ctx.save();
			drawFunct({canvas: canvas, ctx: ctx, delta: delta})
			ctx.restore();
		}
	}
}

export { Scene }