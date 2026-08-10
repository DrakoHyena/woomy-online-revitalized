import { util, Smoothbar } from "../util.js";
import { global } from "../global.js";
import { ctx, drawBar, drawGUIPolygon, drawGuiCircle, drawGuiLine, drawGuiRect, drawGuiRoundRect, drawText, measureText, _clearScreen, getGradient } from "./canvas.js"
import { color, getColor, getZoneColor, hslToColor, getColorDark } from "../colors.js"
import { mixColors } from "../../shared/mix_colors.js";
import { config } from "../config.js";
import { lerp, lerpAngle } from "../lerp.js";
import { drawEntity } from "./drawEntity.js";
import { drawHealth } from "./drawHealth.js";
import { mockups, getEntityImageFromMockup } from "../mockups.js";
import { rewardManager } from "../achievements.js";

let upgradeBarSpeed = 0.4;
let statMenu = Smoothbar(0, 0.075),
    upgradeMenu = Smoothbar(0, 0.25),
    statBars = [Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed), Smoothbar(0, upgradeBarSpeed)]

let compensation = function() {
    return function() {
        let strength = metrics._rendergap / (1000 / 30);
        return {
            predict: (p1, p2, v1, v2) => lerp(p1 + v1, p2 + v2, config.movementSmoothing, false),
            predictFacing: (a1, a2) => lerpAngle(a1, a2, config.movementSmoothing, false),
            //predictExtrapolate: (p1, p2, v1, v2) => lerp(p1 + v1, p2 + v2, config.movementSmoothing, 1),
            //predictFacingExtrapolate: (a1, a2) => lerpAngle(a1, a2, .12, 1),
            getPrediction: () => strength
        }
    };
}();

let ska = function() {
    function make(x) {
        return Math.log(4 * x + 1) / Math.log(5);
    }
    let a = [];
    for (let i = 0; i < config.expectedMaxSkillLevel * 2; i++) a.push(make(i / config.expectedMaxSkillLevel));
    return function(x) {
        return a[x];
    };
}();

let gameDraw = function(ratio) {
    renderTimes++;
    let motion = compensation();
    global.player._renderx = motion.predict(global.player._renderx, global.player._cx, 0, 0);
    global.player._rendery = motion.predict(global.player._rendery, global.player._cy, 0, 0);
    let px = ratio * global.player._renderx;
    let py = ratio * global.player._rendery;
    _clearScreen(mixColors(color.white, color.guiblack, 0.15), 1);
    ctx.globalAlpha = 1;
    const TAU = Math.PI * 2;

    // MAP
    if (global._mapType !== 1) {
        let W = roomSetup[0].length,
            H = roomSetup.length,
            i = 0;
        ctx.globalAlpha = 1;
        for (let j = 0; j < roomSetup.length; j++) {
            let row = roomSetup[j],
                k = 0;
            for (let l = 0; l < row.length; l++) {
                let cell = row[l],
                    left = Math.max(0, ratio * k * global._gameWidth / W - px + global._screenWidth / 2),
                    top = Math.max(0, ratio * i * global._gameHeight / H - py + global._screenHeight / 2),
                    right = Math.min(global._screenWidth, ratio * (k + 1) * global._gameWidth / W - px + global._screenWidth / 2),
                    bottom = Math.min(global._screenHeight, ratio * (i + 1) * global._gameHeight / H - py + global._screenHeight / 2);
                k++;
                if (cell === "edge") continue;
                ctx.fillStyle = mixColors(color.white, getZoneColor(cell, 1), 0.3, 0);
                ctx.fillRect(left - 1, top - 1, right - left + 2, bottom - top + 2);
            }
            i++;
        }
    } else if (global._mapType === 1) {
        const xx = -px + global._screenWidth / 2 + ratio * global._gameWidth / 2;
        const yy = -py + global._screenHeight / 2 + ratio * global._gameHeight / 2;
        const radius = ratio * global._gameWidth / 2;
        ctx.fillStyle = color.white;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(xx, yy, radius, 0, TAU);
        ctx.closePath();
        ctx.fill();
    }

    // GRID
    ctx.lineWidth = 1;
    ctx.strokeStyle = color.guiblack;
    ctx.globalAlpha = 0.05;
    let gridsize = 30 * ratio;//(Math.min(global._gameWidth, global._gameHeight) / roomSetup.length / 14 * ratio);
    for (let x = (global._screenWidth / 2 - px) % gridsize; x < global._screenWidth; x += gridsize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, global._screenHeight | 0);
        ctx.stroke();
    }
    for (let y = (global._screenHeight / 2 - py) % gridsize; y < global._screenHeight; y += gridsize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(global._screenWidth, y);
        ctx.stroke();
    };

    // ENTITIES
    ctx.globalAlpha = 1;
    let frameplate = [];
    ctx.translate(global._screenWidth / 2, global._screenHeight / 2);
    for (let i = 0; i < entityArr.length; i++) {
        let instance = entityArr[i]
        if (!instance.render.draws) continue;
        let motion = compensation();
        let isMe = instance.id === _gui._playerid;
        instance.render.x = motion.predict(instance.render.x, instance.x, 0, 0);
        instance.render.y = motion.predict(instance.render.y, instance.y, 0, 0);

        let x = ratio * instance.render.x - px;
        let y = ratio * instance.render.y - py;
        if (isMe) {
            global.player.x = x;
            global.player.y = y;
            global.player.rendershiftx = x
            global.player.rendershifty = y
            global.player.instance = instance;
            global.player.team = instance.team;

            if (config.clientSideAim === true) {
                instance.render.facing = (!instance.twiggle && !global._died && !global._forceTwiggle) ? Math.atan2(global._target._y - y, global._target._x - x) : motion.predictFacing(instance.render.facing, instance.facing);
            } else {
                instance.render.facing = motion.predictFacing(instance.render.facing, instance.facing);
            }

            // Save information about the player
            global.player._nameColor = instance.nameColor
            //console.log(mockups[instance.index])
            global.player._name = instance.name == null ? mockups.get(instance.index).name : instance.name;
            global.player._label = instance.label
            global.player._canSeeInvisible = instance.seeInvisible;
            if (instance.alpha < 0.1) rewardManager.unlockAchievement("sneak_100");
        } else {
            instance.render.facing = motion.predictFacing(instance.render.facing, instance.facing);
        }

        ctx.globalAlpha = 1;
        instance.render.size = config.lerpSize ? lerp(instance.render.size, instance.size, 0.3) : instance.size;
        // Empty bars
        if (instance.render.status.getFade(instance.size) !== 1) {
            instance.render.health.set(0);
            instance.render.shield.set(0);
        }
        drawEntity(x, y, instance, ratio, global.player._canSeeInvisible ? instance.alpha + .5 : instance.alpha, 1.1, instance.render.facing);
        if (!config.screenshotMode) frameplate.push([x, y, instance, ratio, global.player._canSeeInvisible ? instance.alpha + .5 : instance.alpha]);
        ctx.globalAlpha = 1;
    };

    // LASERS
    for (let [id, laser] of laserMap) {
        let shakeAmount = -2.5 + 5 * Math.random()
        const lx1 = ratio * (laser.x + shakeAmount * Math.random()) - px;
        const ly1 = ratio * (laser.y + shakeAmount * Math.random()) - py;
        const lx2 = ratio * (laser.x2 + shakeAmount * Math.random()) - px;
        const ly2 = ratio * (laser.y2 + shakeAmount * Math.random()) - py;

        const dx = lx2 - lx1;
        const dy = ly2 - ly1;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len === 0) continue;

        const laserColor = getColor(laser.color);
        const darkColor = getColorDark(laserColor);
        const angle = Math.atan2(dy, dx);
        let width = laser.width * ratio * laser.fade;

        ctx.save();
        ctx.translate(lx1, ly1);
        ctx.rotate(angle);
        if (config.performanceMode === false && config.animatedLasers === true) {
            const layers = 6;
            for (let i = 0; i < layers; i++) {
                const t = i / (layers - 1);
                const layerWidth = (width * (1 + (i / layers) * Math.random())) * (1 - t * 0.7);
                let lcolor;
                if (t < 0.5) {
                    const blend = Math.min(1, (t * 2) / (config.borderChunk / 4));
                    lcolor = mixColors(darkColor, color.white, blend);
                } else {
                    const blend = (t - 0.5) * 2;
                    lcolor = mixColors(color.white, laserColor, blend);
                }

                ctx.fillStyle = lcolor;
                ctx.globalAlpha = .25 + 1 / layers
                ctx.beginPath();
                ctx.arc(len, 0, layerWidth / 1.75, 0, Math.PI * 2);
                ctx.arc(0, 0, layerWidth / 1.25, 0, Math.PI * 2);
                ctx.rect(0, -layerWidth / 2, len, layerWidth);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = laserColor
            ctx.globalAlpha = 0.35;
            ctx.beginPath()
            ctx.rect(0, -width / 2, len, width);
            ctx.arc(len, 0, width / 1.5, 0, Math.PI * 2);
            ctx.arc(0, 0, width, 0, Math.PI * 2)
            ctx.fill();
        }
        ctx.restore();
    }

    // NAME PLATES
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    for (let i = 0; i < frameplate.length; i++) {
        drawHealth(...frameplate[i]);
        ctx.globalAlpha = 1;
    };

    // BLACKOUT
    if (global._blackout) {
        const divisor = 1;
        //overlay
        if (!window.darknessCanvas) window.darknessCanvas = new OffscreenCanvas(1, 1);
        darknessCanvas.width = global._screenWidth / divisor;
        darknessCanvas.height = global._screenHeight / divisor;
        if (!window.darknessCtx) window.darknessCtx = darknessCanvas.getContext("2d", { alpha: true, desynchronized: true, willReadFrequently: false });
        darknessCtx.clearRect(0, 0, darknessCanvas.width, darknessCanvas.height);
        darknessCtx.globalCompositeOperation = "source-over";
        darknessCtx.fillStyle = "#000000";
        darknessCtx.fillRect(0, 0, darknessCanvas.width, darknessCanvas.height);
        darknessCtx.globalCompositeOperation = "lighter";
        darknessCtx.translate(global._screenWidth / 2 / divisor, global._screenHeight / 2 / divisor);

        for (let [id, laser] of laserMap) {
            const lx1 = ratio * laser.x - px;
            const ly1 = ratio * laser.y - py;
            const lx2 = ratio * laser.x2 - px;
            const ly2 = ratio * laser.y2 - py;
            const laserColor = getColor(laser.color);
            const ran = Math.random();
            darknessCtx.save();
            darknessCtx.lineCap = "round";
            darknessCtx.lineJoin = "round";
            darknessCtx.lineWidth = (laser.width * (1.25 + .1 * ran)) * ratio * laser.fade;
            darknessCtx.strokeStyle = laserColor;
            darknessCtx.globalAlpha = .08 + .01 * ran
            darknessCtx.beginPath();
            darknessCtx.arc(lx1, ly1, darknessCtx.lineWidth / 1.5, 0, Math.PI * 2);
            darknessCtx.moveTo(lx1, ly1);
            darknessCtx.lineTo(lx2, ly2);
            darknessCtx.arc(lx2, ly2, darknessCtx.lineWidth, 0, Math.PI * 2);
            darknessCtx.stroke();
            darknessCtx.restore();
        }

        for (let i = 0; i < entityArr.length; i++) {
            let instance = entityArr[i],
                x = ratio * instance.render.x - px,
                y = ratio * instance.render.y - py,
                fade = instance.render.status.getFade(instance.size),
                size = (((Math.min(120 + instance.size * 5, instance.size + 280)) * fade) * ratio / divisor) * 1.25,
                darknessGrad = getGradient(getColor(entityArr[i].color))

            // auras
            let mockup = mockups.get(instance.index)
            for (let prop of mockup.props) {
                if (prop.isAura) {
                    let size = Math.round(instance.size * prop.size * ratio) / divisor
                    let xx = prop.x + x;
                    let yy = prop.y + y;
                    darknessCtx.save()
                    darknessCtx.translate(xx / divisor, yy / divisor);
                    darknessCtx.scale(size * fade, size * fade)
                    darknessCtx.fillStyle = darknessGrad;
                    darknessCtx.beginPath()
                    darknessCtx.arc(0, 0, 1, 0, 2 * Math.PI)
                    darknessCtx.closePath()
                    darknessCtx.fill()
                    darknessCtx.restore()
                }
            }

            // entities
            if (instance.team !== global.player.team) continue;
            darknessCtx.save()
            darknessCtx.translate(x / divisor, y / divisor);
            darknessCtx.scale(size, size)
            darknessCtx.globalAlpha = (instance.size / 50) * fade
            darknessCtx.fillStyle = darknessGrad;
            darknessCtx.beginPath()
            darknessCtx.arc(0, 0, 1, 0, 2 * Math.PI)
            darknessCtx.closePath()
            darknessCtx.fill()
            darknessCtx.restore()

            // if player scoping
            if (instance.id === _gui._playerid && global.isScoping) {
                x = 0
                y = 0
                darknessCtx.save()
                darknessCtx.translate(x / divisor, y / divisor)
                darknessCtx.scale(size, size)
                darknessCtx.globalAlpha = (instance.size / 100) * fade
                darknessCtx.fillStyle = darknessGrad;
                darknessCtx.beginPath()
                darknessCtx.arc(0, 0, 1, 0, 2 * Math.PI)
                darknessCtx.closePath()
                darknessCtx.fill()
                darknessCtx.restore()
            }
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (global.player._canSeeInvisible) {
            ctx.globalAlpha = .8
        } else {
            ctx.globalAlpha = 1;
        }
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(darknessCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
    }

    // SKILL BARS
    ctx.translate(global._screenWidth / -2, global._screenHeight / -2);
    ratio = util._getScreenRatio() * config.uiScale;
    let scaleScreenRatio = (by, unset) => {
        global._screenWidth /= by;
        global._screenHeight /= by;
        ctx.scale(by, by);
        if (!unset) ratio *= by;
    };
    scaleScreenRatio(ratio, true);

    let alcoveSize = 200 / ratio; // / drawRatio * global.screenWidth;
    let spacing = 20;
    if (!config.screenshotMode) {
        scaleScreenRatio(ratio, true);
        _gui._skill.update();
        {
            if (!global.mobile) {
                global.canSkill = !!_gui._points && _gui._skills.some(skill => skill.amount < skill.cap);
                let active = (global.canSkill || global._died || global.statHover)
                statMenu.set(0 + active);
                global.clickables.stat.hide();
                let spacing = 4,
                    height = 15,
                    gap = 35,
                    len = alcoveSize,
                    savedLen = len,
                    save = len * statMenu.get(),
                    ticker = 11,
                    namedata = _gui._getStatNames(mockups.get(_gui._type).statnames || -1);
                let y = global._screenHeight - 20 - height
                let x = -20 - 2 * len + statMenu.get() * (2 * 20 + 2 * len)
                _gui._skills.forEach(function drawSkillBar(skill) {
                    ticker--;
                    let name = namedata[ticker - 1],
                        level = skill.amount,
                        col = color[skill.color],
                        cap = skill.softcap,
                        maxLevel = skill.cap;
                    statBars[ticker - 1].set(ska(level))
                    if (cap) {
                        len = save;
                        let _max = config.expectedMaxSkillLevel,
                            extension = cap > _max,
                            blocking = cap < maxLevel;
                        if (extension) _max = cap;
                        drawBar(x + height / 2, x - height / 2 + len * ska(cap), y + height / 2, height - 3 + config.barChunk, color.black);
                        drawBar(x + height / 2, x + height / 2 + (len - gap) * ska(cap), y + height / 2, height - 3, color.grey);
                        drawBar(x + height / 2, x + height / 2 + ((len - gap) * statBars[ticker - 1].get()), y + height / 2, height - 3.5, col);
                        if (blocking) {
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = color.grey;
                            for (let i = cap + 1; i < _max; i++) drawGuiLine(x + (len - gap) * ska(i), y + 1.5, x + (len - gap) * ska(i), y - 3 + height);
                        }
                        ctx.strokeStyle = color.black;
                        ctx.lineWidth = 1;
                        for (let i = 1; i < level + 1; i++) drawGuiLine(x + (len - gap) * ska(i), y + 1.5, x + (len - gap) * ska(i), y - 3 + height);
                        len = save * ska(_max);
                        let textcolor = level == maxLevel ? col : !_gui._points || cap !== maxLevel && level == cap ? color.grey : color.guiwhite;
                        drawText(name, Math.round(x + len / 2) + .5, y + height / 2, height - 5, textcolor, "center", 1);
                        drawText("[" + ticker % 10 + "]", Math.round(x + len - height * .25) - 1.5, y + height / 2, height - 5, textcolor, "right", 1);
                        if (textcolor === color.guiwhite) global.clickables.stat.place(ticker - 1, x, y, len, height);
                        if (level) drawText(textcolor === col ? "MAX" : "+" + level, Math.round(x + len + 4) + .5, y + height / 2, height - 5, col, "left", 1);
                        y -= height + spacing;
                    }
                });
                global.clickables.hover.place(0, 0, y, .8 * savedLen, .8 * (global._screenHeight - y));
                if (_gui._points !== 0) drawText("x" + _gui._points, Math.round(x + len - 2) + .5, Math.round(y + height - 4) + .5, 20, color.guiwhite, "right");
            }

            // BOTTOM PLATE
            {
                let spacing = 4,
                    len = alcoveSize * 2,
                    height = 25,
                    x = (global._screenWidth - len) / 2,
                    y = global._screenHeight - 20 - height,
                    max = _gui._leaderboard._display.length ? _gui._leaderboard._display[0].score : false,
                    level = _gui._skill.getLevel();
                ctx.lineWidth = 1;
                drawBar(x, x + len, y + height / 2, height - 3 + config.barChunk, color.black);
                drawBar(x, x + len, y + height / 2, height - 3, color.grey);
                drawBar(x, x + len * (level > 59 ? 1 : _gui._skill.getProgress()), y + height / 2, height - 3.5, color.gold);
                drawText("Level " + level + " " + global.player._label, x + len / 2, y + height / 2, height - 4, color.guiwhite, "center", 1);
                height = 14;
                y -= height + spacing;
                drawBar(x + len * .1, x + len * .9, y + height / 2, height - 3 + config.barChunk, color.black);
                drawBar(x + len * .1, x + len * .9, y + height / 2, height - 3, color.grey);
                drawBar(x + len * .1, x + len * (0.1 + .8 * (max ? Math.min(1, _gui._skill.getScore() / max) : 1)), y + height / 2, height - 3.5, color.green);
                drawText("Score: " + util._formatLargeNumber(Math.round(_gui._skill.getScore())), x + len / 2, y + height / 2, height - 2, color.guiwhite, "center", 1);
                ctx.lineWidth = 4;
                if (global.player._nameColor) {
                    if (global.player._nameColor.charAt("0") !== "!") {
                        let nameColor = global.player._nameColor || "#FFFFFF";
                        drawText(global.player._name, Math.round(x + len / 2) + .5, Math.round(y - 10 - spacing) + .5, 32, nameColor, "center");
                    } else {
                        let [fill, stroke, font, size] = util._getSpecialNameInfoById(Number(global.player._nameColor.substring(1)));
                        drawText(global.player._name, Math.round(x + len / 2) + .5, Math.round(y - 10 - spacing) + .5, 32, fill, "center", false, 1, stroke, ctx, font);
                    }
                }
                if (global.displayTextUI.enabled) {
                    drawText(global.displayTextUI.text, Math.round(x + len / 2) + .5, Math.round(y - 55 - spacing), 16, global.displayTextUI.color, "center", true);
                }
            }

            // MINIMAP/BOTTOM RIGHT
            {
                let len = alcoveSize,
                    height = len / global._gameWidth * global._gameHeight,
                    rawRatio = [global._gameWidth > global._gameHeight, global._gameWidth / global._gameHeight, global._gameHeight / global._gameWidth];
                if (global._gameWidth > global._gameHeight || global._gameHeight > global._gameWidth) {
                    let ratio = [global._gameWidth / global._gameHeight, global._gameHeight / global._gameWidth];
                    len /= ratio[1] * 1.5;
                    height /= ratio[1] * 1.5;
                    if (len > alcoveSize * 2) {
                        ratio = len / (alcoveSize * 2);
                    } else if (height > alcoveSize * 2) {
                        ratio = height / (alcoveSize * 2);
                    } else {
                        ratio = 1;
                    }
                    len /= ratio;
                    height /= ratio;
                }
                let x = global.mobile ? spacing : global._screenWidth - len - 20,
                    y = global.mobile ? spacing : global._screenHeight - height - 20,
                    y2 = 66,
                    w = roomSetup[0].length,
                    h = roomSetup.length,
                    i = 0;
                ctx.globalAlpha = .6;
                if (global._mapType !== 1) {
                    for (let j = 0; j < roomSetup.length; j++) {
                        let row = roomSetup[j],
                            k = 0;
                        for (let m = 0; m < row.length; m++) {
                            ctx.fillStyle = getZoneColor(row[m], 0, Math.min(1, (Math.abs(roomSetup.length / 2 - j) / (roomSetup.length / 2)) * .5 + (Math.abs(row.length / 2 - m) / (row.length / 2)) * .5));
                            drawGuiRect(x + k++ * len / w, y + i * height / h, len / w, height / h);
                        }
                        i++;
                    }
                }
                ctx.fillStyle = mixColors(color.grey, "#000000", 0.1);
                let box = [x, y, len, height];
                global._mapType === 1 ? drawGuiCircle(box[0] + box[2] / 2, box[1] + box[2] / 2, box[2] / 2, 0) : drawGuiRect(...box);
                _gui._minimap._display.length = 0;
                for (let real of _gui._minimap._server) {
                    let index = _gui._minimap._display.findIndex(old => real.id === old.id);
                    if (index === -1) {
                        _gui._minimap._display.push(real);
                    } else {
                        // Update it
                        let old = _gui._minimap._display[index];
                        old.type = real.type;
                        old.x = lerp(old.x, real.x, .1, false);
                        old.y = lerp(old.y, real.y, .1, false);
                        old.color = real.color;
                        old.size = real.size;
                        old.width = real.width;
                        old.height = real.height;
                        _gui._minimap._display[index] = old;
                    }
                }
                for (let entity of _gui._minimap._display) {
                    ctx.fillStyle = mixColors(getColor(entity.color), color.black, 0.3);
                    ctx.globalAlpha = 1; //entity.alpha;
                    switch (entity.type) {
                        case 192: // Warfront
                            ctx.globalAlpha = .3;

                            ctx.fillStyle = getColor(10);
                            ctx.fillRect(x, y, (entity.x / global._gameWidth) * len, height);
                            ctx.fillStyle = getColor(12);
                            ctx.fillRect(x + (entity.x / global._gameWidth) * len, y, (1 - (entity.x / global._gameWidth)) * len, height);

                            ctx.globalAlpha = .25;
                            const txtSize = height * .4;
                            drawText(`${((entity.x / global._gameWidth) * 100).toFixed(2)}%`, x + txtSize * .5, y + txtSize + height * .25, txtSize, "#FFFFFF", "left");
                            drawText(`${((1 - (entity.x / global._gameWidth)) * 100).toFixed(2)}%`, x + len - txtSize * .5, y + txtSize + height * .25, txtSize, "#FFFFFF", "right");

                            ctx.globalAlpha = 1;
                            ctx.fillStyle = color.black;
                            ctx.fillRect(x + (entity.x / global._gameWidth) * len, y, 3, height);
                            break;
                        case 3: {
                            const size = 3;
                            drawGuiRect(x + ((entity.x - size) / global._gameWidth) * len, y + ((entity.y - size) / global._gameHeight) * height, size, size);
                        }
                            break;
                        case 2: {
                            const width = entity.size * (entity.width || 1);
                            const hgt = entity.size * (entity.height || 1);
                            drawGuiRect(x + ((entity.x - width) / global._gameWidth) * len - 0.4, y + ((entity.y - hgt) / global._gameHeight) * height - 1, ((2 * width) / global._gameWidth) * len + 0.2, ((2 * hgt) / global._gameWidth) * len + 0.2);
                        }
                            break;
                        case 1: {
                            drawGuiCircle(x + (entity.x / global._gameWidth) * len, y + (entity.y / global._gameHeight) * height, (entity.size / global._gameWidth) * len + 0.2);
                        }
                            break;
                        case 0: {
                            if (entity.id !== _gui._playerid) drawGuiCircle(x + (entity.x / global._gameWidth) * len, y + (entity.y / global._gameHeight) * height, 2);
                        }
                            break;
                    }
                }
                ctx.globalAlpha = 1;
                ctx.lineWidth = 1;
                ctx.strokeStyle = color.black;

                ctx.fillStyle = color.guiblack;
                if (!global._died) {
                    const xr = (global.player._cx * (rawRatio[0] ? 1 : rawRatio[2])) / global._gameWidth
                    const yr = (global.player._cy * (rawRatio[0] ? rawRatio[1] : 1)) / global._gameWidth
                    let xAdder = xr * len - 1
                    let yAdder = yr * height - 1
                    if (xr > 0 && yr > 0 && xr < 1 && yr < 1) {
                        drawGuiCircle(x + xAdder, y + yAdder, 2);
                    }
                }
                if (global.mobile) {
                    x = global._screenWidth - len - spacing;
                    y = global._screenHeight - spacing;
                }
                y -= 8;
                drawText("Room ID: " + window.selectedRoomId, x + len, y, 18, "#B6E57C", "right");
                y -= 18;
                if (global._debug > 1) {
                    const clientFpsTime =
                        drawText("ClientFPS: " + metrics._rendertime, x + len, y, 14, metrics._rendertime > 15 ? color.guiwhite : color.orange, "right");
                    y -= 16;
                    drawText("Latency: " + metrics._latency + "ms", x + len, y, 14, metrics._latency < 375 ? color.guiwhite : color.orange, "right");
                    y -= 16;
                    if (global._debug > 2) {
                        drawText((global._died ? "Server Speed (Standby): " : "Server Speed: ") + _gui._fps.toFixed(1) + "mspt", x + len, y, 14, _gui._fps < 30 ? color.guiwhite : color.orange, "right");
                        y -= 16;
                        drawText(`Bandwidth: ${global._bandwidth._in} in, ${global._bandwidth._out} out`, x + len, y, 14, color.guiwhite, "right");
                        y -= 16;
                        drawText("Update Rate: " + metrics._updatetime + "Hz", x + len, y, 14, color.guiwhite, "right");
                        if (global._debug > 3) {
                            y -= 16
                            drawText(`${mockups.fetchedMockups}/${mockups.totalMockups} (${((mockups.fetchedMockups / mockups.totalMockups) * 100).toFixed(2)}%) Mockups`, x + len, y, 14, color.guiwhite, "right")
                            y -= 16
                            drawText(`Movement Smoothing: ${config.movementSmoothing.toFixed(3)}`, x + len, y, 14, color.guiwhite, "right")
                        }
                    }
                }
                ctx.lineWidth = 4;
                ctx.strokeStyle = color.black;
                switch (global._mapType) {
                    case 1:
                        drawGuiCircle(box[0] + box[2] / 2, box[1] + box[2] / 2, box[2] / 2, 1)
                        break;
                    case 3:
                        drawGUIPolygon(box[0] + box[2] / 2, box[1] + box[2] / 2, box[2] / 2, 3, 1);
                        break;
                    default:
                        drawGuiRect(...box, 1);
                }
            }

            // LEADERBOARD
            { // Draw leaderboard
                let vspacing = 4;
                let len = 200;
                let height = 15;
                let x = global._screenWidth - len - spacing;
                let y = spacing + height + 7;
                drawText("Leaderboard", Math.round(x + len / 2) + 0.5, Math.round(y - 6) + 0.5, height + 4, color.guiwhite, 'center');
                _gui._leaderboard._display = _gui._leaderboard._display.filter(entry => _gui._leaderboard._server.findIndex(real => real.id === entry.id) > -1);
                for (let real of _gui._leaderboard._server) {
                    let index = _gui._leaderboard._display.findIndex(old => real.id === old.id);
                    if (index === -1) {
                        _gui._leaderboard._display.push(_gui._leaderboard._publish({
                            score: 0
                        }, real));
                    } else {
                        // Update it
                        _gui._leaderboard._display[index] = _gui._leaderboard._publish(_gui._leaderboard._display[index], real);
                    }
                }
                _gui._leaderboard._display = _gui._leaderboard._display.sort((a, b) => b.score - a.score);
                for (let i = 0; i < _gui._leaderboard._display.length && (!global.mobile || i < 6); i++) {
                    let entry = _gui._leaderboard._display[i];
                    drawBar(x, x + len, y + height / 2, height - 3 + config.barChunk, color.black);
                    drawBar(x, x + len, y + height / 2, height - 3, color.grey);
                    let shift = Math.min(1, entry.score / _gui._leaderboard._display[0].score);
                    drawBar(x, x + len * shift, y + height / 2, height - 3.5, entry.barColor);
                    // Leadboard name + score
                    let nameColor = entry.nameColor;
                    if (nameColor.charAt(0) !== "!") {
                        drawText(entry.label + (': ' + util._handleLargeNumber(Math.round(entry.score))), x + len / 2, y + height / 2, height - 5, nameColor, 'center', true);
                    } else {
                        let [fill, stroke, font, size] = util._getSpecialNameInfoById(Number(nameColor.substring(1)));
                        // With stroke its too hard to read xd
                        stroke = 0;
                        drawText(entry.label + (': ' + util._handleLargeNumber(Math.round(entry.score))), x + len / 2, y + height / 2, height - 5, fill, 'center', true, 1, stroke, ctx, font);
                    }
                    // Mini render
                    let scale = height / entry.position.axis,
                        xx = x - 1.5 * height - scale * entry.position.middle.x * 0.707,
                        yy = y + 0.5 * height + scale * entry.position.middle.x * 0.707;
                    drawEntity(xx, yy, entry.image, 1 / scale, 1, scale * scale / entry.image.size, -Math.PI / 4, true);
                    // Move down
                    y += vspacing + height;
                }
            }

            // GAME/SYSTEM MESSAGES
            {
                if (!config.disableGameMessages) {
                    let vspacing = 4,
                        height = 18,
                        x = global._screenWidth / 2,
                        y = 20,
                        fill;
                    if (global.mobile) y += (global.canSkill ? ((alcoveSize / 3 + spacing) / 1.4) * statMenu.get() : 0) + (global.canUpgrade ? ((alcoveSize / 2 + spacing) / 1.4) * upgradeMenu.get() : 0);
                    for (let i = global.messages.length - 1; i >= 0; i--) {
                        let msg = global.messages[i],
                            txt = msg.text,
                            text = txt;
                        msg.len = measureText(text, height - 4);
                        ctx.globalAlpha = .5 * msg.alpha;
                        fill = msg.color === "rainbow" ? hslToColor((Date.now() % 2520) / 7, 100, 50) : msg.color;
                        drawBar(x - msg.len / 2, x + msg.len / 2, y + height / 2, height, fill);
                        ctx.globalAlpha = Math.min(1, msg.alpha);
                        drawText(text, x, y + height / 2, height - 4, color.guiwhite, "center", 1);
                        y += vspacing + height;
                        if (msg.status > 1) y -= (vspacing + height) * (1 - Math.sqrt(msg.alpha));
                        if (msg.status > 1) {
                            msg.status -= .05;
                            msg.alpha += .05;
                        } else if (i === 0 && (global.messages.length > 6 || Date.now() - msg.time > 1e4)) {
                            let mult = global.messages.length > 15 ? 5 : 1;
                            msg.status -= .05 * mult;
                            msg.alpha -= .05 * mult;
                            if (msg.alpha <= 0 || global.messages.length > 40) {
                                global.messages.splice(0, 1);
                            }
                        }
                    }
                }
            }

            // TANK UPGRADES
            {
                upgradeMenu.set(0 + (global.canUpgrade || global.upgradeHover));
                let glide = upgradeMenu.get();
                global.clickables.upgrade.hide();
                if (_gui._upgrades.length > 0) {
                    global.canUpgrade = 1;
                    let spacing = 10,
                        x = 20,
                        tankColor = global._tankMenuColor,//global._tankMenuColor,
                        i = 0,
                        y = 20,
                        x2 = x,
                        x3 = 0,
                        y2 = y,
                        ticker = 0,
                        len = alcoveSize * .45, //100
                        height = len;
                    upgradeSpin += .0025
                    for (let model of _gui._upgrades) {
                        if (y > y2) y2 = y - 60;
                        x3 = x * 2 + 105;
                        x *= glide
                        y *= glide
                        global.clickables.upgrade.place(i++, y, x, len, height);
                        ctx.globalAlpha = .5;
                        ctx.fillStyle = tankColor;
                        config.roundUpgrades ? drawGuiRoundRect(y, x, len, height, 10) : drawGuiRect(y, x, len, height);
                        ctx.fillStyle = mixColors(tankColor, color.white, .5);
                        config.roundUpgrades ? drawGuiRoundRect(y, x, len, .6 * height, 4) : drawGuiRect(y, x, len, .6 * height);
                        ctx.fillStyle = "black";
                        ctx.globalAlpha = .25;
                        if (!global._died && !global._disconnected) {
                            let tx = Math.pow((global.guiMouse.x) - (y + height / 2), 2),
                                ty = Math.pow((global.guiMouse.y) - (x + len / 2), 2);
                            if (Math.sqrt(tx + ty) < height * .55) {
                                config.roundUpgrades ? drawGuiRoundRect(y, x, len, height, 10) : drawGuiRect(y, x, len, height);
                            }
                        }
                        ctx.globalAlpha = 1;
                        let picture = getEntityImageFromMockup(model, tankColor),
                            position = mockups.get(model).position,
                            scale = .6 * len / position.axis,
                            xx = y + .5 * height - scale * position.middle.x * Math.cos(upgradeSpin),
                            yy = x + .5 * len - scale * position.middle.x * Math.sin(upgradeSpin);
                        // Mini render
                        drawEntity(xx, yy, picture, 1, 1, scale / picture.size, upgradeSpin, 1);
                        drawText(picture.name, y + len / 2, x + height - 6, height / 8 - 3, color.guiwhite, "center");
                        ctx.strokeStyle = color.black;
                        ctx.globalAlpha = 1;
                        ctx.lineWidth = 3;
                        config.roundUpgrades ? drawGuiRoundRect(y, x, len, height, 10, false, true) : drawGuiRect(y, x, len, height, true);
                        if (++ticker % (global.mobile ? 3 : 4) === 0) {
                            x = x2;
                            y += height + spacing;
                        } else {
                            x += (len + spacing);
                        }
                    }
                    let h = 14,
                        txt = "Ignore",
                        m = measureText(txt, h - 3) + 10,
                        xx = y2 + height + spacing,
                        yy = (x3 + len + spacing + x2 - 15) / 2;
                    drawBar(xx - m / 2, xx + m / 2, yy + h / 2, h + config.barChunk, color.black);
                    drawBar(xx - m / 2, xx + m / 2, yy + h / 2, h, color.white);
                    drawText(txt, xx, yy + h / 2, h - 2, color.guiwhite, "center", 1);
                    global.clickables.skipUpgrades.place(0, xx - m / 2, yy, m, h);
                } else {
                    global.canUpgrade = 0;
                    global.clickables.upgrade.hide();
                    global.clickables.skipUpgrades.hide();
                }
            }

            // MOBILE SKILL BARS
            {
                if (global.mobile) {
                    global.canSkill = _gui._points > 0 && _gui._skills.some(skill => skill.amount < skill.cap) && !global.canUpgrade;
                    statMenu.set(0 + (global.canSkill || global._died));
                    let glide = statMenu.get();
                    global.clickables.stat.hide();
                    let internalSpacing = 14;
                    let width = alcoveSize / 2.5;
                    let height = alcoveSize / 2.5;
                    let x = 2 * internalSpacing - internalSpacing;
                    let y = internalSpacing;
                    let index = 0;
                    let namedata = _gui._getStatNames(mockups.get(_gui._type).statnames || -1);
                    if (global.canSkill) {
                        _gui._skills.forEach((skill, ticker) => {
                            let skillCap = skill.softcap;
                            if (skillCap <= 0) return;
                            let skillAmount = skill.amount;
                            let skillColor = color[skill.color];
                            let skillMax = skill.cap;
                            let skillNameParts = namedata[9 - ticker].split(/\s+/);
                            let skillNameCut = Math.floor(skillNameParts.length / 2);
                            let [skillNameTop, skillNameBottom] = skillNameParts.length === 1 ? [skillNameParts, null] : [
                                skillNameParts.slice(0, skillNameCut),
                                skillNameParts.slice(skillNameCut)
                            ];
                            // Draw box
                            ctx.globalAlpha = 0.9;
                            ctx.fillStyle = skillColor;
                            drawGuiRect(x, y, width, (height * 2) / 3);
                            ctx.globalAlpha = 0.1;
                            ctx.fillStyle = color.black;
                            drawGuiRect(x, y + (((height * 2) / 3) * 2) / 3, width, (((height * 2) / 3) * 1) / 3);
                            ctx.globalAlpha = 1;
                            ctx.fillStyle = color.guiwhite;
                            drawGuiRect(x, y + (height * 2) / 3, width, (height * 1) / 3);
                            ctx.fillStyle = skillColor;
                            drawGuiRect(x, y + (height * 2) / 3, (width * skillAmount) / skillCap, (height * 1) / 3);
                            // Dividers
                            ctx.strokeStyle = color.black;
                            ctx.lineWidth = 1;
                            for (let j = 1; j < skillMax; j++) {
                                let xPos = x + width * (j / skillCap);
                                drawGuiLine(xPos, y + (height * 2) / 3, xPos, y + height);
                            }
                            // Upgrade name
                            if (skillAmount !== skillMax && _gui._points && (skillCap === skillMax || skillAmount !== skillCap)) {
                                global.clickables.stat.place(9 - ticker, x, y, width, height);
                            }
                            if (skillNameBottom) {
                                drawText(skillNameBottom, x + width / 2, y + height * 0.55, height / 6, color.guiwhite, "center");
                                drawText(skillNameTop, x + width / 2, y + height * 0.3, height / 6, color.guiwhite, "center");
                            } else {
                                drawText(skillNameTop, x + width / 2, y + height * 0.425, height / 6, color.guiwhite, "center");
                            }
                            if (skillAmount > 0) {
                                drawText(skillAmount >= skillCap ? "MAX" : "+" + skillAmount, Math.round(x + width / 2) + 0.5, y + height * 1.3, height / 4, skillColor, "center");
                            }
                            // Border
                            ctx.strokeStyle = color.black;
                            ctx.globalAlpha = 1;
                            ctx.lineWidth = 3;
                            drawGuiLine(x, y + (height * 2) / 3, x + width, y + (height * 2) / 3);
                            drawGuiRect(x, y, width, height, true);
                            x += (width + internalSpacing);
                            y *= glide
                            index++;
                        });
                        if (_gui._points > 1) {
                            drawText("x" + _gui._points, Math.round(x) + 0.5, Math.round(y + 20) + 0.5, 20, color.guiwhite, "left");
                        }
                    }
                }
            }

            { // MOBILE JOYSTICKS
                if (global.mobile) {
                    {
                        let radius = Math.min(global._screenWidth * 0.6, global._screenHeight * 0.12);
                        ctx.globalAlpha = 0.3;
                        ctx.fillStyle = "#ffffff";
                        ctx.beginPath();
                        ctx.arc((global._screenWidth * 1) / 6, (global._screenHeight * 2) / 3, radius, 0, 2 * Math.PI);
                        ctx.arc((global._screenWidth * 5) / 6, (global._screenHeight * 2) / 3, radius, 0, 2 * Math.PI);
                        ctx.fill();
                        for (let i = 0; i < 4; i++) {
                            const angle = Math.PI * 2 / 4 * i;
                            ctx.strokeStyle = "#dddddd";
                            ctx.lineWidth = radius * 0.125;
                            ctx.beginPath();
                            ctx.save();
                            ctx.translate((global._screenWidth * 1) / 6, (global._screenHeight * 2) / 3);
                            ctx.moveTo(Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.2);
                            ctx.lineTo(Math.cos(angle) * radius * 0.8, Math.sin(angle) * radius * 0.8);
                            ctx.restore();
                            ctx.closePath();
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.save();
                            ctx.translate((global._screenWidth * 5) / 6, (global._screenHeight * 2) / 3);
                            ctx.moveTo(Math.cos(angle) * radius * 0.2, Math.sin(angle) * radius * 0.2);
                            ctx.lineTo(Math.cos(angle) * radius * 0.8, Math.sin(angle) * radius * 0.8);
                            ctx.restore();
                            ctx.closePath();
                            ctx.stroke();
                        }
                    }

                    // MOBILE MINI MENU
                    const size = spacing * 2;
                    drawMobileButton(0, spacing, global._screenHeight - spacing - size, size, size, global._mobileOptions ? "X" : "+");
                    if (global._mobileOptions) {
                        const offX = spacing + (size * 2);
                        const offY = spacing + size;
                        const x = spacing * 2 + size;
                        const y = global._screenHeight - spacing - size;
                        drawMobileButton(1, x, y - offY, size * 2, size, "Level Up");
                        drawMobileButton(2, x + offX, y - offY, size * 2, size, "Testbed");
                        drawMobileButton(3, x, y, size * 2, size, "Override");
                        drawMobileButton(4, x + offX, y, size * 2, size, "Reset Tank");
                        drawMobileButton(5, x + offX * 2, y, size * 2, size, "Full Screen");
                        drawMobileButton(6, x + offX * 2, y - offY, size * 2, size, global._mobileChatText);
                    } else {
                        let x = spacing + size * 1.5
                        let y = global._screenHeight - spacing - size
                        drawMobileButton(7, x, y, size * 2, size, global._mobileFiring[0] === 4 ? "Main Firing" : "Alt Firing");
                        drawMobileButton(8, x * 2.25, y, size, size, "Q");
                    }

                    // AIM INDICATOR
                    if (global._mobileFiring[1]) {
                        global.aimAlpha = Math.min(0.3, global.aimAlpha + 0.03)
                    } else {
                        global.aimAlpha = Math.max(0, global.aimAlpha - 0.02)
                    }
                    if (!global._died && global.aimAlpha > 0) {
                        const alphaFade = global.aimAlpha / .3
                        ctx.strokeStyle = color.guiwhite;
                        ctx.lineWidth = 2 * alphaFade;
                        ctx.globalAlpha = global.aimAlpha;
                        drawGuiLine(global.player.x + global._screenWidth / 2, global.player.y + global._screenHeight / 2, (global._target._x * alphaFade) + global._screenWidth / 2, (global._target._y * alphaFade) + global._screenHeight / 2);
                        drawGuiCircle((global._target._x * alphaFade) + global._screenWidth / 2, (global._target._y * alphaFade) + global._screenHeight / 2, 4 * alphaFade);
                        ctx.globalAlpha = 1;
                    }
                }
            }
            ;
            scaleScreenRatio(1 / ratio, true);
        }
    }

    // EFFECTS
    if (global.player.pepperspray.apply || global.player.pepperspray.blurMax > 0) {
        ctx.filter = `blur(${global.player.pepperspray.blurAmount}px)`;
        ctx.drawImage(global._canvas._cv, 0, 0, global._screenWidth, global._screenHeight);
        ctx.filter = "none";
        if (!global.player.pepperspray.apply && global.player.pepperspray.blurAmount != 0) {
            global.player.pepperspray.blurAmount--
            if (global.player.pepperspray.blurAmount == 0) global.player.pepperspray.blurMax = 0;
        } else if (global.player.pepperspray.blurAmount < global.player.pepperspray.blurMax) global.player.pepperspray.blurAmount++;
    }

    if (global.player.lsd) {
        ctx.filter = `hue-rotate(${Math.sin(Date.now() / 600) * 360}deg)`;
        ctx.drawImage(global._canvas._cv, 0, 0, global._screenWidth, global._screenHeight);
        ctx.filter = "none";
    }

    if (global.drawPoint) {
        ctx.fillStyle = "red"
        ctx.globalAlpha = 0.5
        drawGuiCircle(global.drawPoint.x, global.drawPoint.y, 25)
    }

    // FILTERS
    ctx.filter = ["none", "contrast(1000%)", "grayscale(100%)", "grayscale(28%)", "invert(100%)", "sepia(75%)"][["Disabled", "Saturated", "Grayscale", "Dramatic", "Inverted", "Sepia"].indexOf(config.filter)];
    if (ctx.filter !== "none") ctx.drawImage(global._canvas._cv, 0, 0, global._screenWidth, global._screenHeight);
    ctx.filter = "none";
    metrics._lastrender = getNow();
};

function drawMobileButton(i, x, y, w, h, text) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.translate(x, y);
    ctx.fillStyle = getColor(i ? 7 : 11);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = .1;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, h / 2, w, h / 2);
    ctx.globalAlpha = .4;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    drawText(text, w / 2, h / 2, 14, color.guiwhite, "center", true);
    global.clickables.mobileClicks.place(i, x, y, w, h);
    ctx.restore();
}

export { gameDraw }
