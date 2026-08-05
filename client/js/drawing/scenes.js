import { global } from "../global.js";
import { ctx, drawBar, drawGUIPolygon, drawGuiCircle, drawGuiLine, drawGuiRect, drawGuiRoundRect, drawText, measureText, _clearScreen } from "./canvas.js"
import { mockups, getEntityImageFromMockup } from "../mockups.js";
import { color } from "../colors.js"
import { mixColors } from "../../shared/mix_colors.js";
import { drawEntity } from "./drawEntity.js";
import { socket } from "../socket.js";
import { bounceyLerp, expLerp } from "../lerp.js";
import { util } from "../util.js";

const gameDrawDead = function() {
    let getKillIcon = function() {
        let finalKills = [Math.round(global.finalKills[0].get()), Math.round(global.finalKills[1].get()), Math.round(global.finalKills[2].get())];
        let b = finalKills[0] + .5 * finalKills[1] + 3 * finalKills[2];
        return (0 === b ? "🌼" : 4 > b ? "🎯" : 8 > b ? "💥" : 15 > b ? "💢" : 25 > b ? "🔥" : 50 > b ? "💣" : 75 > b ? "👺" : 100 > b ? "🌶️" : "💯") + (finalKills[0] || finalKills[1] || finalKills[2] ? " " + (finalKills[0] ? finalKills[0] + " kill" + (1 === finalKills[0] ? "" : "s") : "") + (finalKills[0] && finalKills[1] ? " and " : "") + (finalKills[1] ? finalKills[1] + " assist" + (1 === finalKills[1] ? "" : "s") : "") + ((finalKills[0] || finalKills[1]) && finalKills[2] ? " and " : "") + (finalKills[2] ? finalKills[2] + " boss" + (1 === finalKills[2] ? "" : "es") + " defeated" : "") : " A true pacifist") + ".";
    };
    let getDeathIcon = function getDeath() {
        let txt = "🔪 Succumbed to";
        if (global.finalKillers.length) {
            for (let i = 0; i < global.finalKillers.length; i++) txt += " " + util._addArticle(mockups.get(global.finalKillers[i]).name) + " and";
            txt = txt.slice(0, -4) + ".";
        } else txt += " natural causes";
        return txt;
    };
    return function() {
        if (!global.finalScore) return;
        let glideDuration = 750
        let glide;
        let getGlide;
        let getAlpha;
        if (global._deathScreenState === 0) {// FADE IN
            glide = (Date.now() - (global._diedAt - 3000)) / glideDuration
            let glideSuber = 0
            getGlide = function() {
                glideSuber += 0.025
                return bounceyLerp.out(Math.min(glide + glideSuber, 1))
            }
            let alphaEquation = (Math.min(1, Math.min(1, glide) + 0.25)) // Broooo litterally meeeeee
            getAlpha = function() {
                return alphaEquation
            }
            _clearScreen(color.black, 0.3 * alphaEquation);
        } else if (global._deathScreenState === 1) {// FADE OUT
            if (Date.now() - global._diedAt > glideDuration) {
                return;
            }
            glide = (Date.now() - (global._diedAt)) / glideDuration
            let glideSuber = 0
            getGlide = function() {
                glideSuber += 0.025
                return 1 + expLerp.in(Math.min(glide + glideSuber, 1))
            }
            let alphaEquation = (1 - (Math.min(1, glide))) // Sammeee onggg 🙏🙏🙏🙏
            getAlpha = function() {
                return alphaEquation
            }
            _clearScreen(color.black, .3 * alphaEquation);
        }

        socket.controls.reset()
        let x = global._screenWidth / 2,
            y = global._screenHeight / 2 - 50,
            picture = getEntityImageFromMockup(_gui._type, _gui._color),
            len = 140,
            position = mockups.get(_gui._type).position,
            scale = len / position.axis,
            xx = global._screenWidth / 2 - scale * position.middle.x * .707,
            yy = global._screenHeight / 2 - 35 + scale * position.middle.x * .707,
            delay = Math.ceil((global._diedAt - Date.now()) / 1000);
        global.player.pepperspray.apply = false;
        global.player.lsd = false;
        // Mini render - death
        drawEntity(xx - 190 - len / 2, (yy - 10) * getGlide(), picture, 1.5, getAlpha(), .5 * scale / picture.realSize, -Math.PI / 4);
        ctx.globalAlpha = getAlpha()
        drawText(global._deathSplashOverride || global._deathSplash[global._deathSplashChoice], x, (y - 80) * getGlide(), 10, color.guiwhite, "center");
        drawText("Level " + _gui._skill.getLevel() + " " + global.player._label, x - 170, (y - 30) * getGlide(), 24, color.guiwhite);
        drawText("Final Score: " + util._formatLargeNumber(Math.round(global.finalScore.get())), (x - 170), (y + 25) * getGlide(), 50, color.guiwhite);
        drawText("⌛ Survived for " + util._formatTime(Math.round(global.finalLifetime.get())) + ".", (x - 170), (y + 55) * getGlide(), 16, color.guiwhite);
        drawText(getKillIcon(), (x - 170), (y + 77) * getGlide(), 16, color.guiwhite);
        drawText(getDeathIcon(), (x - 170), (y + 99) * getGlide(), 16, color.guiwhite);
        drawText("⌚ Died on " + global.deathDate, (x - 170), (y + 121) * getGlide(), 16, color.guiwhite);
        drawText(delay > 0 ? "You may respawn in " + delay + " second" + (delay === 1 ? "" : "s") + "." : "Press enter to respawn!", x, (y + 147) * getGlide(), 16, color.guiwhite, "center");
        global._forceTwiggle = false;
    };
}();

let gameDrawDisconnected = function() {
    return function() {
        let alphaColor = global._arenaClosed ? color.yellow : color.red,
            offset = global._died ? 120 : 0;
        _clearScreen(mixColors(alphaColor, color.guiblack, .3), .25);
        drawText("💀 Disconnected 💀", global._screenWidth / 2, global._screenHeight / 2 + offset, 30, color.guiwhite, "center");
        drawText(global.message, global._screenWidth / 2, global._screenHeight / 2 + 30 + offset, 15, alphaColor, "center");
        if (global._arenaClosed) drawText(global.closingSplash || "", global._screenWidth / 2, global._screenHeight / 2 + 45 + offset, 15, alphaColor, "center");
    };
}();

let gameDrawError = function(error) {
    console.error(error);
    console.error(error.stack)
    let offset = global._died ? 120 : 0;
    _clearScreen(mixColors(color.orange, color.guiblack, .3), .25);
    drawText("Client Error", global._screenWidth / 2, global._screenHeight / 2 + offset, 30, color.red, "center");
    drawText(error, global._screenWidth / 2, global._screenHeight / 2 + 30 + offset, 15, color.red, "center");
    drawText("Please take a screenshot and report this to a dev", global._screenWidth / 2, global._screenHeight / 2 + 45 + offset, 15, color.red, "center");
};

let gameDrawServerStatusText = function() {
    _clearScreen(color.white, 1);
    drawText(window.loadingTextStatus || "", global._screenWidth / 2, global._screenHeight / 2, 30, color.guiwhite, "center");
    drawText(window.loadingTextTooltip || "", global._screenWidth / 2, global._screenHeight / 2 + 75, 15, color.guiwhite, "center");
};

let gameDrawLoadingMockups = function() {
    _clearScreen(color.white, 1);
    drawText("Loading mockups...", global._screenWidth / 2, global._screenHeight / 2, 30, color.guiwhite, "center");
    drawText("This may take a while depending on your device and internet speed!", global._screenWidth / 2, global._screenHeight / 2 + 75, 15, color.guiwhite, "center");
};

export { gameDrawDead, gameDrawDisconnected, gameDrawError, gameDrawServerStatusText, gameDrawLoadingMockups }
