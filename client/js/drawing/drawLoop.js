import { global } from "../global.js";
import { currentSettings } from "../settings.js";

const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d")
ctx.imageSmoothingEnabled = false;

const resolutionScaleMap = {
	"Very Low (35%)": 0.35,
	"Low (50%)": 0.5,
	"Medium (75%)": 0.75,
	"High (100%)": 1,
};

const drawLoop = {
	scenes: new Map(),
	_sortedScenes: [],
	_active: true,
	_lastDrawTime: null,
	fps: Infinity,
	measuredFps: 60,
	_targetFps: 60,
}
drawLoop.addScene = function(label, scene){
	drawLoop.scenes.set(label, scene);
	drawLoop.sortScenes();
}
drawLoop.removeScene = function(label){
	drawLoop.scenes.delete(label);
	drawLoop.sortScenes();
}
drawLoop.sortScenes = function(){
	drawLoop._sortedScenes = [...drawLoop.scenes.entries()].sort((a, b) => a[1].layer - b[1].layer);
}
drawLoop.start = function(){
	drawLoop._active = true;
 	requestAnimationFrame(drawLoop.drawScenes);
}
drawLoop.stop = function(){
	drawLoop._active = false;
}

drawLoop.drawScenes = function(timestamp){
 	requestAnimationFrame(drawLoop.drawScenes);
 	const now = (typeof timestamp === 'number') ? timestamp : performance.now();

	// Throttle: skip this frame if we're above the fps cap
	if(drawLoop.fps < Infinity && drawLoop._lastDrawTime !== null){
		if(now - drawLoop._lastDrawTime < 1000 / drawLoop.fps){
			return;
		}
	}

	const last = drawLoop._lastDrawTime ?? now;
	const frameDelta = now - last;
	const delta = Math.min(1, Math.max(0.05, frameDelta / (1000 / drawLoop._targetFps)));

 	if(drawLoop._active !== true){
 		if(global.debug === true) console.log('[DRAWLOOP] Not active');
		drawLoop._lastDrawTime = now;
 		return;
 	}

 	for(const [sceneLabel, scene] of drawLoop._sortedScenes){
 		if(scene.active !== true){
 			if(global.debug === true) console.log(`[DRAWLOOP] Scene ${sceneLabel} Not active`);
 			continue;
 		}
 		if(global.debug === true) console.log(`[DRAWLOOP] Drawing scene ${sceneLabel} (layer ${scene.layer})...`);
		scene.draw(delta);
 	}

	if(drawLoop._lastDrawTime !== null && frameDelta > 0){
		drawLoop.measuredFps = Math.round(1000 / frameDelta);
		drawLoop._targetFps += (drawLoop.measuredFps - drawLoop._targetFps) * 0.05;
	}

	drawLoop._lastDrawTime = now;
}
drawLoop.updateSceneSizes = function(){
	const resSetting = currentSettings?.resolutionScale?.value?.selected ?? "High (100%)";
	const resScale = resolutionScaleMap[resSetting] ?? 1;
	canvas.width = Math.round(window.innerWidth * resScale);
	canvas.height = Math.round(window.innerHeight * resScale);
	for(let [, scene] of drawLoop.scenes){
		for(let [, resizeFunct] of scene.resizeFuncts){
			resizeFunct({canvas, ctx})
		}
	}
}
window.addEventListener("resize", drawLoop.updateSceneSizes)

export { drawLoop, canvas, ctx} 