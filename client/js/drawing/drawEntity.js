import { ctx, getGradient } from "./canvas.js";
import { mockups } from "../mockups.js";
import { config } from "../config.js";
import { getColor, color, setColors, setColorsUnmixB, setColorsUnmix, specialColors } from "../colors.js"
import { mixColors } from "../../shared/mix_colors.js";
import { lerpAngle, lerp, expLerp } from "../lerp.js"
import { imageCache } from "../assets.js";
import { global } from "../global.js";

const canvas2 = new OffscreenCanvas(1,1);
const ctx2 = canvas2.getContext("2d")

const gunCache = new Map()
const path2dCache = new Map();


let drawEntity = function () {
	function drawPoly(context, centerX, centerY, radius, sides, widthHeightRatio, ratio, scale) {
		let angle = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : 0,
			fill = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : 1;
		if (sides === -4000) return 0;
		if (sides instanceof ImageBitmap){
			context.save();
			context.translate(centerX, centerY);
			context.rotate(angle);
			context.drawImage(sides, -radius * sides.p1, -radius * sides.p2, radius * sides.p3, radius * sides.p4);
			context.restore();
			return;
		} else if(sides instanceof Path2D){
			let radiusDiv = sides.path2dDiv
			radius /= radiusDiv;
			context.save();
			context.translate(centerX, centerY);
			context.scale(radius, radius);
			context.lineWidth /= radius;
			context.rotate(angle);
			context.stroke(sides);
			if (fill) context.fill(sides);
			context.restore();
		} else if (typeof sides === "object") {
			if (!sides[2]) { // svg
				let radiusDiv = sides[1] || 1
				let path = new Path2D(sides[0])
				radius /= radiusDiv;
				context.save();
				context.translate(centerX, centerY);
				context.scale(radius, radius);
				context.lineWidth /= radius;
				context.rotate(angle);
				context.stroke(path);
				if (fill) context.fill(path);
				context.restore();
				return
			} else {// dot-to-dot
				context.save()
				context.beginPath();
				let xDirection = Math.cos(angle),
					yDirection = Math.sin(angle);
				for (let [x, y] of sides) {
					context.lineTo(centerX + radius * (x * xDirection - y * yDirection), centerY + radius * (y * xDirection + x * yDirection));
				}
				context.closePath()
				context.stroke()
				context.fill()
				context.restore();
				return;
			}
		}
		if (!Array.isArray(sides)) angle += sides % 2 ? 0 : Math.PI / sides;
		context.beginPath();
		switch (sides) {
			case 0:
				context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
				break;
			case 102:
				for (let [scale, theta] of [
					[1, 0],
					[1, .4 * Math.PI],
					[1, .8 * Math.PI],
					[-0.1, 0],
					[1, 1.2 * Math.PI],
					[1, 1.6 * Math.PI]
				]) context.lineTo(centerX + radius * scale * Math.cos((angle - .025) + theta), centerY + radius * scale * Math.sin((angle - .025) + theta));
				break;
			case 103:
				for (let i = 0; i < 360; i++) {
					let theta = (i / 360) * 2 * Math.PI,
						x = centerX + radius * Math.cos(theta + angle),
						y = centerY + radius * Math.sin(theta + angle);
					if (i === 135) {
						x = centerX;
						y = centerY;
					} else if (i > 135) {
						x = centerX + radius * Math.cos(((((i + 90) / 360) * 2) * Math.PI) + angle);
						y = centerY + radius * Math.sin(((((i + 90) / 360) * 2) * Math.PI) + angle);
					}
					context.lineTo(x, y);
				}
				break;
			default:
				if (sides < 0) { // Trap
					let dip = 1 - 6 / sides / sides;
					sides = -sides;
					context.moveTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
					for (let i = 0; i < sides; i++) {
						let theta = (i + 1) / sides * 2 * Math.PI,
							htheta = (i + .5) / sides * 2 * Math.PI,
							c = {
								x: centerX + radius * dip * Math.cos(htheta + angle),
								y: centerY + radius * dip * Math.sin(htheta + angle)
							},
							p = {
								x: centerX + radius * Math.cos(theta + angle),
								y: centerY + radius * Math.sin(theta + angle)
							};
						context.quadraticCurveTo(c.x, c.y, p.x, p.y);
					}
				} else if (sides > 0 && sides < 102) { // Polygon
					if (sides === 4 && widthHeightRatio != null && (widthHeightRatio[0] !== 1 && widthHeightRatio[1] !== 1)) {
						for (let [x, y] of [widthHeightRatio, [-widthHeightRatio[0], widthHeightRatio[1]],
							[-widthHeightRatio[0], -widthHeightRatio[1]],
							[widthHeightRatio[0], -widthHeightRatio[1]]
						]) {
							let xx = centerX + (radius) * (x * Math.cos(angle)) + (x - 1) * ratio * scale * 1.1;
							let yy = centerY + (radius) * (y * Math.sin(angle)) + (y - 1) * ratio * scale * 1.1;
							context.lineTo(xx, yy);
						}
					} else {
						for (let i = 0; i < sides; i++) {
							let theta = i / sides * 2 * Math.PI,
								x = centerX + radius * Math.cos(theta + angle),
								y = centerY + radius * Math.sin(theta + angle);
							context.lineTo(x, y);
						}
					}
				} else if (sides === 102) { } else if (sides === 998) {
					context.arc(centerX, centerY, radius, 0, Math.PI);
				} else if (sides === 999) {
					context.arc(centerX, centerY, radius, 0, Math.PI, 1);
				} else if (sides === 103) { // Aquamarine Body Type
				} else if (sides === 104) { // Star
					let dip = .25;
					context.moveTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
					for (let i = 0; i < 6; i++) {
						let theta = (i + 1) / 6 * 2 * Math.PI,
							htheta = (i + .5) / 6 * 2 * Math.PI,
							c = {
								x: centerX + radius * dip * Math.cos(htheta + angle),
								y: centerY + radius * dip * Math.sin(htheta + angle)
							},
							p = {
								x: centerX + radius * Math.cos(theta + angle),
								y: centerY + radius * Math.sin(theta + angle)
							};
						context.quadraticCurveTo(c.x, c.y, p.x, p.y);
					}
				} else if (sides === 105) { // Nautica shell shape
					for (let i = 0; i < 16; i++) {
						let theta = (i / 16) * 2 * Math.PI,
							x = centerX + radius * Math.cos(theta + angle + .4),
							y = centerY + radius * Math.sin(theta + angle + .4);
						if (i === 1 || i === 5 || i === 9 || i === 13) {
							x = centerX;
							y = centerY;
						}
						context.lineTo(x, y);
					}
				} else if (sides === 106) { // Flash Crasher
					for (let [scale, theta] of [
						[1, 0],
						[1, .4 * Math.PI],
						[1, .8 * Math.PI],
						[0.36, Math.PI / 2],
						[0.36, -(Math.PI / 2)],
						[1, 1.2 * Math.PI],
						[1, 1.6 * Math.PI]
					]) context.lineTo(centerX + radius * scale * Math.cos((angle - .025) + theta), centerY + radius * scale * Math.sin((angle - .025) + theta));
				} else if (sides === 107) { // Crusher
					for (let [scale, theta] of [
						[1, 0],
						[1, .286 * Math.PI],
						[1, .571 * Math.PI],
						[0.36, Math.PI / 2],
						[-0.75, 0],
						[0.36, -(Math.PI / 2)],
						[1, 1.429 * Math.PI],
						[1, 1.714 * Math.PI]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + theta), centerY + radius * scale * Math.sin(angle + theta));
				} else if (sides === 108) { // Tri-Blade
					for (let i = 0; i < 12; i++) {
						let theta = (i / 12) * 2 * Math.PI,
							x = centerX + radius * Math.cos(theta + (angle - .025)),
							y = centerY + radius * Math.sin(theta + (angle - .025));
						if (i === 2 || i === 10 || i === 6) {
							x = centerX + (radius / 2) * Math.cos(theta + (angle - .025));
							y = centerY + (radius / 2) * Math.sin(theta + (angle - .025));
						}
						if (i === 0 || i === 4 || i === 8) {
							x = centerX + (radius * 1.25) * Math.cos(theta + (angle - .025));
							y = centerY + (radius * 1.25) * Math.sin(theta + (angle - .025));
						}
						context.lineTo(x, y);
					}
				} else if (sides === 109) { // Phaser
					for (let i = 0; i < 4; i++) {
						let theta = (i / 3) * 2 * Math.PI,
							x = centerX + radius * Math.cos(theta + angle),
							y = centerY + radius * Math.sin(theta + angle);
						if (i === 2) {
							x = centerX + (radius * -0.25) * Math.cos(angle);
							y = centerY + (radius * -0.25) * Math.sin(angle);
						} else if (i > 2) {
							theta = (i - 1 / 3) * 2 * Math.PI;
							x = centerX + radius * Math.cos(theta + angle);
							y = centerY + radius * Math.sin(theta + angle);
						}
						context.lineTo(x, y);
					}
				} else if (sides === 111) { // Diamond
					for (let i = 0; i < 4; i++) {
						let theta = (i / 4) * 2 * Math.PI,
							x = centerX + radius * Math.cos(theta + angle),
							y = centerY + radius * Math.sin(theta + angle);
						if (i === 2) {
							x = centerX + (radius * -1.5) * Math.cos(angle);
							y = centerY + (radius * -1.5) * Math.sin(angle);
						} else if (i === 0 || i === 4) {
							x = centerX + (radius * 1.5) * Math.cos(angle);
							y = centerY + (radius * 1.5) * Math.sin(angle);
						}
						context.lineTo(x, y);
					}
				} else if (sides === 112) { // Destroyer
					for (let [scale, theta] of [
						[1, 0],
						[1, Math.PI / 2],
						[-1.16, -1.047],
						[-1.3, -0.3],
						[-0.425, -1.047],
						[-0.425, 1.047],
						[-1.3, .3],
						[-1.16, 1.047],
						[-1, Math.PI / 2] // [1, (3 / 2) * Math.PI],
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .025)), centerY + radius * scale * Math.sin(angle + (theta - .025)));
				} else if (sides === 113) { // Waller
					for (let [scale, theta] of [
						[1, .611],
						[1, 1.571],
						[-1.25, -0.698],
						[-0.5, -0.698],
						[-0.5, .698],
						[-1.25, .698],
						[1, -1.571],
						[1, -0.611]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + theta), centerY + radius * scale * Math.sin(angle + theta));
				} else if (sides === 114) { // Vis Destructia
					for (let [scale, theta] of [
						[0.25, .611],
						[-1, -0.838],
						[-0.5, -0.436],
						[0, 0],
						[-0.5, .436],
						[-1, .838],
						[0.25, -0.611]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .025)), centerY + radius * scale * Math.sin(angle + (theta - .025)));
				} else if (sides === 115) { // Grouper
					for (let [scale, theta] of [
						[1, .489],
						[-1, -1.257],
						[-0.5, -0.96],
						[-0.75, 0],
						[-0.5, .96],
						[-1, 1.257],
						[1, -0.489]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + theta), centerY + radius * scale * Math.sin(angle + theta));
				} else if (sides === 116) { // Rodrigo's Destroyer Ship
					for (let [scale, theta] of [
						[1.5, .14],
						[1.1, .335],
						[0.75, .593],
						[0.475, 1.047],
						[0.517, 1.466],
						[-0.55, -1.187],
						[-0.55, -0.838],
						[-1, -0.419],
						[-1.2, -0.312],
						[-1.375, -0.192],
						[-1.45, -0.087],
						[-1.45, .087],
						[-1.375, .192],
						[-1.2, .312],
						[-1, .419],
						[-0.55, .838],
						[-0.55, 1.187],
						[0.517, -1.466],
						[0.475, -1.047],
						[0.75, -0.593],
						[1.1, -0.335],
						[1.5, -0.14]
					]) context.lineTo(centerX + radius * (scale * 1.5) * Math.cos(angle + (theta - .0261)), centerY + radius * (scale * 1.5) * Math.sin(angle + (theta - .0261)));
				} else if (sides === 117) { // Frigate
					for (let [scale, theta] of [
						[1.95, 0],
						[0.95, .578],
						[-1, -0.82],
						[-1.12, -0.715],
						[-1.32, -0.873],
						[-2.155, -0.489],
						[-2.155, .489],
						[-1.32, .873],
						[-1.12, .715],
						[-1, .82],
						[0.95, -0.578]
					]) context.lineTo(centerX + radius * (scale * .9) * Math.cos(angle + theta), centerY + radius * (scale * .9) * Math.sin(angle + theta));
				} else if (sides === 118) { // Blue Runner
					for (let [scale, theta] of [
						[0.9, 0],
						[0.625, .698],
						[-0.35, -1.361],
						[-0.75, -1.204],
						[-1, -0.453],
						[-0.563, -0.559],
						[-0.563, .559],
						[-1, .453],
						[-0.75, 1.204],
						[-0.35, 1.361],
						[0.625, -0.698]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 119) { // Varp
					for (let [scale, theta] of [
						[1, 0],
						[0.75, .559],
						[-1, -0.89],
						[-0.938, -0.262],
						[-0.5, -0.681],
						[-0.312, 0],
						[-0.5, .681],
						[-0.938, .262],
						[-1, .89],
						[0.75, -0.559]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 120) { // Spiked Runner
					for (let [scale, theta] of [
						[0.625, 0],
						[1, .489],
						[0.313, .576],
						[0.5, 1.518],
						[-0.875, -1.03],
						[-0.375, -0.768],
						[-0.938, 0],
						[-0.375, .768],
						[-0.875, 1.03],
						[0.5, -1.518],
						[0.313, -0.576],
						[1, -0.489]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 121) { // Clutter
					for (let [scale, theta] of [
						[0.438, 0],
						[1, .681],
						[0.625, 1.047],
						[0.438, 1.065],
						[-0.5, -1.1],
						[-0.34, -0.698],
						[-0.75, 0],
						[-0.34, .698],
						[-0.5, 1.1],
						[0.438, -1.065],
						[0.625, -1.047],
						[1, -0.681]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 122) {
					for (let [scale, theta] of [
						[1, 0],
						[1.315, .331613],
						[1.315, .715585],
						[1, 1.0472],
						[1.315, 1.37881],
						[1.315, 1.76278],
						[1, 2.0944],
						[1.315, 2.42601],
						[1.315, 2.80998],
						[1, 3.14159],
						[1.315, -2.80998],
						[1.315, -2.42601],
						[1, -2.0944],
						[1.315, -1.76278],
						[1.315, -1.37881],
						[1, -1.0472],
						[1.315, -0.715585],
						[1.315, -0.331613],
						[1, 0]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + theta + 1.5447), centerY + radius * scale * Math.sin(angle + theta + 1.5447));
				} else if (sides === 123) { // Golden Rectangle
					for (let [scale, theta] of [
						[1, .541],
						[-1, -0.541],
						[-1, .541],
						[1, -0.541]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + theta + 1.5447), centerY + radius * scale * Math.sin(angle + theta + 1.5447));
				} else if (sides === 124) { // Ring
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
					context.arc(centerX, centerY, radius / 1.15, 0, 2 * Math.PI, false);
				} else if (sides === 125) { // Caravan
					context.save();
					context.translate(centerX, centerY);
					context.rotate(angle);
					let borderRadius = 0.4, // 0 = square, 1 = circle
						centerAway = radius * (1 - borderRadius),
						scaleRadius = radius * borderRadius;
					context.arc(centerAway, centerAway, scaleRadius, 0, .5 * Math.PI);
					context.arc(-centerAway, centerAway, scaleRadius, .5 * Math.PI, Math.PI);
					context.arc(-centerAway, -centerAway, scaleRadius, Math.PI, 1.5 * Math.PI);
					context.arc(centerAway, -centerAway, scaleRadius, -0.5 * Math.PI, 0);
					context.restore();
				} else if (sides === 126) { // Cool When You Spin Shape
					let borderRadius = .4,
						centerAway = radius * (1 - borderRadius),
						scaleRadius = radius * borderRadius;
					context.arc(centerX + centerAway, centerY + centerAway, scaleRadius, angle, .5 * Math.PI + angle);
					context.arc(centerX - centerAway, centerY + centerAway, scaleRadius, .5 * Math.PI + angle, Math.PI + angle);
					context.arc(centerX - centerAway, centerY - centerAway, scaleRadius, Math.PI + angle, 1.5 * Math.PI + angle);
					context.arc(centerX + centerAway, centerY - centerAway, scaleRadius, -0.5 * Math.PI + angle, angle);
				} else if (sides === 127) { // Triangle With Round Edges
					context.save();
					context.translate(centerX, centerY);
					context.rotate(angle);
					let borderRadius = .4,
						centerAway = radius * (1 - borderRadius),
						scaleRadius = radius * borderRadius;
					context.arc(centerAway, 0, scaleRadius, -0.272 * Math.PI, .272 * Math.PI);
					context.arc(-centerAway, centerAway, scaleRadius, .272 * Math.PI, Math.PI);
					context.arc(-centerAway, -centerAway, scaleRadius, Math.PI, 1.544 * Math.PI);
					context.restore();
				} else if (sides === 128) { // Triangle (Rotated)
					let realShape = 3;
					for (let i = 0; i < realShape; i++) {
						let theta = i / realShape * 2 * Math.PI,
							x = centerX + radius * 1.5 * Math.cos(theta + angle + 45),
							y = centerY + radius * 1.5 * Math.sin(theta + angle + 45);
						context.lineTo(x, y);
					}
				} else if (sides === 129) { // TK-3 Minion Shape
					let realShape = -3,
						dip = 1 - 8 / realShape / realShape;
					realShape = -realShape;
					context.moveTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
					for (let i = 0; i < realShape; i++) {
						let theta = (i + 1) / realShape * 2 * Math.PI,
							htheta = (i + .5) / realShape * 2 * Math.PI,
							c = {
								x: centerX + radius * dip * Math.cos(htheta + angle),
								y: centerY + radius * dip * Math.sin(htheta + angle)
							},
							p = {
								x: centerX + radius * Math.cos(theta + angle),
								y: centerY + radius * Math.sin(theta + angle)
							};
						context.quadraticCurveTo(c.x, c.y, p.x, p.y);
					}
				} else if (sides === 130) { // exports.genericEntity
					let realShape = -11,
						dip = 1 - 6 / realShape / realShape;
					realShape = -realShape;
					context.moveTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
					for (let i = 0; i < realShape; i++) {
						let theta = (i + 1) / realShape * Math.PI,
							htheta = (i + .5) / realShape * Math.PI,
							c = {
								x: centerX + radius * dip * Math.cos(htheta + angle),
								y: centerY + radius * dip * Math.sin(htheta + angle)
							},
							p = {
								x: centerX + radius * Math.cos(theta + angle),
								y: centerY + radius * Math.sin(theta + angle)
							};
						context.quadraticCurveTo(c.x, c.y, p.x, p.y);
					}
					context.lineJoin = "miter";
				} else if (sides === 131) { // Minesweeper Ring
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
					context.arc(centerX, centerY, radius / 1.05, 0, 2 * Math.PI, false);
				} else if (sides === 132) { // Glass Smasher Body
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
					context.arc(centerX, centerY, radius / 1.5, 0, 2 * Math.PI, false);
				} else if (sides === 133) { // Hendecagon (Rotated)
					for (let i = 0; i < 11; i++) {
						let theta = i / 11 * 2 * Math.PI,
							x = centerX + radius * 1.5 * Math.cos((180 / 11) + theta + angle + 1.635),
							y = centerY + radius * 1.5 * Math.sin((180 / 11) + theta + angle + 1.635);
						context.lineTo(x, y);
					}
				} else if (sides === 134) { // Square (Rotated)
					let realShape = 4;
					for (let i = 0; i < realShape; i++) {
						let theta = i / realShape * 2 * Math.PI,
							x = centerX + radius * 1.5 * Math.cos((180 / 4) + theta + angle + .52),
							y = centerY + radius * 1.5 * Math.sin((180 / 4) + theta + angle + .52);
						context.lineTo(x, y);
					}
				} else if (sides === 135) { // Hexagon (Rotated)
					for (let i = 0; i < 6; i++) {
						let theta = i / 6 * 2 * Math.PI,
							x = centerX + radius * 1.1 * Math.cos((180 / 6) + theta + angle + .385),
							y = centerY + radius * 1.1 * Math.sin((180 / 6) + theta + angle + .385);
						context.lineTo(x, y);
					}
				} else if (sides === 136) { // Revolutionist
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
					context.arc(centerX, centerY, radius * .999999, 0, 2 * Math.PI, false);
				} else if (sides === 137) { // Vanguard
					for (let [scale, theta] of [
						[1, 0],
						[-1, -0.959],
						[-0.125, 0],
						[-1, .959]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 138) { // Trapperzoid
					for (let [scale, theta] of [
						[0.75, .768],
						[-1, -1.282],
						[-1, 1.292],
						[0.75, -0.768]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 139) { // Tri-Seeker
					for (let [scale, theta] of [
						[1, .139],
						[1, 1.954],
						[1, 2.234],
						[1, -2.234],
						[1, -1.954],
						[1, -0.139]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 140) {
					context.arc(centerX, centerY, radius * 1.45, 0, 2 * Math.PI);
				} else if (sides === 141) { // Plasma Rocket
					for (let i = 0; i < 4; i++) {
						let theta = (i / 4) * 2 * Math.PI,
							x = centerX + radius * Math.cos(theta + angle),
							y = centerY + radius * Math.sin(theta + angle);
						if (i === 0) {
							x = centerX + (radius * 1.7) * Math.cos(angle);
							y = centerY + (radius * 1.7) * Math.sin(angle);
						}
						context.lineTo(x, y);
					}
				} else if (sides === 142) { // Boss Shape
					for (let [scale, theta] of [
						[1, 0],
						[1, 72],
						[1, 90],
						[0.8, 120],
						[0.6, 125],
						[0.5, 144],
						[1, 170],
						[0.9, 180],
						[1, 190],
						[0.5, 216],
						[0.6, 235],
						[0.8, 240],
						[1, 270],
						[1, 288]
					]) context.lineTo(centerX + radius * scale * Math.cos((theta * Math.PI) / 180 + angle), centerY + radius * scale * Math.sin((theta * Math.PI) / 180 + angle));
				} else if (sides === 143) { // Boss Shape 2
					for (let [scale, theta] of [
						[1, 0],
						[0.905, 5],
						[0.915, 10],
						[0.6, 35],
						[1, 72],
						[1, 153.5],
						[0.45, 100],
						[0.4, 110],
						[0.1, 120],
						[0.75, 180],
						[0.1, 240],
						[0.4, 250],
						[0.45, 260],
						[1, 206.5],
						[1, 288],
						[0.6, 325],
						[0.915, 350],
						[0.905, 355]
					]) context.lineTo(centerX + radius * scale * Math.cos((theta * Math.PI) / 180 + angle), centerY + radius * scale * Math.sin((theta * Math.PI) / 180 + angle));
				} else if (sides === 144) { // Boss Shape 3
					for (let [scale, theta] of [
						[0.95, 0],
						[1, 25],
						[1, 90],
						[0.6, 146],
						[0.5, 170],
						[1, 180],
						[0.5, 190],
						[0.6, 214],
						[1, 270],
						[1, 335]
					]) context.lineTo(centerX + radius * scale * Math.cos((theta * Math.PI) / 180 + angle), centerY + radius * scale * Math.sin((theta * Math.PI) / 180 + angle));
				} else if (sides === 145) { // Aquamarine Body Type
					for (let i = 0; i < 360; i++) {
						let theta = (i / 360) * 2 * Math.PI,
							x = centerX + radius * Math.cos(theta + angle),
							y = centerY + radius * Math.sin(theta + angle);
						if (i === 180) {
							x = centerX;
							y = centerY;
						} else if (i > 180) {
							x = centerX + radius * Math.cos(((((i + 180) / 360) * 2) * Math.PI) + angle);
							y = centerY + radius * Math.sin(((((i + 180) / 360) * 2) * Math.PI) + angle);
						}
						context.lineTo(x, y);
					}
				} else if (sides === 146) { // Ring
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
					context.arc(centerX, centerY, radius * 1.1, 0, 2 * Math.PI, false);
				} else if (sides === 147) { // long boy
					for (let [scale, theta] of [
						[12, 0],
						[1, 120],
						[1, 240]
					]) context.lineTo(centerX + radius * scale * Math.cos((theta * Math.PI) / 180 + angle), centerY + radius * scale * Math.sin((theta * Math.PI) / 180 + angle));
				} else if (sides === 148) { // Golden Rectangle rot
					for (let [scale, theta] of [
						[1.2, .541 + Math.PI],
						[-1.2, -0.541 + Math.PI],
						[-1.2, .541 + Math.PI],
						[1.2, -0.541 + Math.PI]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 149) { // Semicircle
					context.arc(centerX, centerY, radius, angle + Math.PI / 2, 3 * Math.PI / 2 + angle);
				} else if (sides === 150) { // Explosive Crusher
					for (let [scale, theta] of [
						[1, 0],
						[1, 1.11],
						[-1.1, -.965],
						[-.46, -.85],
						[-.824, 0],
						[-.46, .85],
						[-1.1, .965],
						[1, -1.11]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 151) { // Dasher
					for (let [scale, theta] of [
						[1, 0],
						[1, 2.09],
						[-.6, -.588],
						[-1, 0],
						[-.6, .588],
						[1, -2.09]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 152) { // Red Runner 3
					for (let [scale, theta] of [
						[1, 0],
						[1, 2.09],
						[-.39, -.89],
						[-.5, 0],
						[-.39, .89],
						[1, -2.09]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 153) { // Red Runner 4
					for (let [scale, theta] of [
						[1, 0],
						[1, 2.09],
						[-.39, -.89],
						[-1.08, .5],
						[-1.08, -0.5],
						[-.39, .89],
						[1, -2.09]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 154) { // Red Runner 4
					for (let [scale, theta] of [
						[0.634, .884],
						[-1, -1.183],
						[-1, 1.183],
						[0.634, -0.884]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 155) { // Slider
					for (let [scale, theta] of [
						[1, 0],
						[0.86, 1.11],
						[-1, -0.86],
						[-0.05, 0],
						[-1, .86],
						[0.86, -1.11]
					]) context.lineTo(centerX + radius * scale * Math.cos(angle + (theta - .0261)), centerY + radius * scale * Math.sin(angle + (theta - .0261)));
				} else if (sides === 156) { // Donut Ring
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
					context.arc(centerX, centerY, radius / 1.5, 0, 2 * Math.PI, false);
				} else if (sides === 157) { // Injector
					context.arc(centerX, centerY, radius, 0, 2 * Math.PI, true);
					context.arc(centerX, centerY, radius * .475, 0, 2 * Math.PI, false);
				} else if (sides > 157 && sides < 190) { // Shape Transform
					for (let i = 157; i < 190; i++)
						if (sides === i) {
							context.save();
							context.translate(centerX, centerY);
							context.rotate(angle);
							let borderRadius = (i - 158) / 31, // 0 = square, 1 = circle
								centerAway = radius * (1 - borderRadius),
								scaleRadius = radius * borderRadius;
							context.arc(centerAway, centerAway, scaleRadius, 0, .5 * Math.PI);
							context.arc(-centerAway, centerAway, scaleRadius, .5 * Math.PI, Math.PI);
							context.arc(-centerAway, -centerAway, scaleRadius, Math.PI, 1.5 * Math.PI);
							context.arc(centerAway, -centerAway, scaleRadius, -0.5 * Math.PI, 0);
							context.restore();
						}
				} else if (sides === 191) { // Pyromancer
					context.save();
					context.translate(centerX, centerY);
					context.rotate(angle + Math.PI / 4);
					let borderRadius = 0.4, // 0 = square, 1 = circle
						centerAway = radius * (1 - borderRadius),
						scaleRadius = radius * borderRadius;
					context.arc(centerAway, centerAway, scaleRadius, 0, .5 * Math.PI);
					context.arc(-centerAway, centerAway, scaleRadius, .5 * Math.PI, Math.PI);
					context.arc(-centerAway, -centerAway, scaleRadius, Math.PI, 1.5 * Math.PI);
					context.arc(centerAway, -centerAway, scaleRadius, -0.5 * Math.PI, 0);
					context.restore();
				} else if (sides > 9999) {
					context.save();
					context.beginPath();
					context.translate(centerX, centerY);
					context.rotate(angle);
					if (!window.frames) {
						window.frames = {}
					}
					switch (sides) {
						case 10000:
							if (!imageCache.ned || !imageCache.ned.ready) break;
							context.drawImage(imageCache.ned, -radius * 1.5, -radius * 2.5, radius * 3, radius * 5);
							break;
						case 10001:
							if (!imageCache.do_not_open_at_any_cost || !imageCache.do_not_open_at_any_cost.ready) break;
							context.drawImage(imageCache.do_not_open_at_any_cost, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10002:
							if (!imageCache.ice_hue || !imageCache.ice_hue.ready) break;
							context.drawImage(imageCache.ice_hue, -radius * 3, -radius * 3, radius * 6, radius * 6);
							break;
						case 10003:
							if (!imageCache.poison_hue || !imageCache.poison_hue.ready) break;
							context.drawImage(imageCache.poison_hue, -radius * 3, -radius * 3, radius * 6, radius * 6);
							break;
						case 10004:
							if (!imageCache.ied || !imageCache.ied.ready) break;
							context.drawImage(imageCache.ied, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10005:
							if (!imageCache.danksGun || !imageCache.danksGun.ready) break;
							context.drawImage(imageCache.danksGun, -radius, -radius, radius * 2.25, radius * 2);
							break;
						case 10006:
							if (!imageCache.hotWheels || !imageCache.hotWheels.ready) break;
							context.drawImage(imageCache.hotWheels, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10007:
							if (!imageCache.omega || !imageCache.omega.ready) break;
							context.drawImage(imageCache.omega, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10008:
							if (!imageCache.missingno || !imageCache.missingno.ready) break;
							context.drawImage(imageCache.missingno, -radius, -radius * 1.5, radius * 2, radius * 3);
							break;
						case 10009:
							if (!imageCache.speedy || !imageCache.speedy.ready) break;
							context.drawImage(imageCache.speedy, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10010:
							if (!imageCache.marble_swirl || !imageCache.marble_swirl.ready) break;
							context.drawImage(imageCache.marble_swirl, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10011:
							if (!imageCache.fourFour || !imageCache.fourFour.ready) break;
							context.drawImage(imageCache.fourFour, -radius, -radius * 1.5, radius * 2, radius * 3);
							break;
						case 10012:
							if (!imageCache.emp_hue || !imageCache.emp_hue.ready) break;
							context.drawImage(imageCache.emp_hue, -radius * 2, -radius * 2, radius * 4, radius * 4);
							break;
						case 10013:
							if (!imageCache.par_hue || !imageCache.par_hue.ready) break;
							context.drawImage(imageCache.par_hue, -radius * 2, -radius * 2, radius * 4, radius * 4);
							break;
						case 10014:
							if (!imageCache.soccerballs || !imageCache.soccerballs.ready) break;
							context.drawImage(imageCache.soccerballs, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10015:
							if (!imageCache.boyKisser || !imageCache.boyKisser.ready) break;
							context.drawImage(imageCache.boyKisser, -radius * 5, -radius * 5, radius * 10, radius * 10);
							break;
						case 10016:
							if (!imageCache.tonk || !imageCache.tonk.ready) break;
							context.drawImage(imageCache.tonk, -radius * 2, -radius * 2, radius * 4, radius * 4);
							break;
						case 10017:
							context.rotate(-angle);
							if (!imageCache.rollfac || !imageCache.rollfac.ready) break;
							context.drawImage(imageCache.rollfac, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10018:
							// Make sure the image is loaded
							if (
								!imageCache["f150-0"] || !imageCache["f150-0"].ready
								|| !imageCache["f150-1"] || !imageCache["f150-1"].ready
								|| !imageCache["f150Flipped-0"] || !imageCache["f150Flipped-0"].ready
								|| !imageCache["f150Flipped-1"] || !imageCache["f150Flipped-1"].ready) break;

							// Manage frames
							window.frames.f150 = window.frames.f150 ? window.frames.f150 + 1 : 1
							if (window.frames.f150 === 20) window.frames.f150 = 0
							let frame = (window.frames.f150 * 0.1) | 0

							// Draw the correct image
							let image
							if (Math.abs(angle) * (180 / Math.PI) > 90) {
								image = imageCache[`f150Flipped-${frame}`]
							} else {
								image = imageCache[`f150-${frame}`]
							}

							// profit
							context.drawImage(image, -radius * 1.75, -radius, radius * 3.5, radius * 2);
							break;
						case 10019:
							if (!imageCache.treadmarks || !imageCache.treadmarks.ready) break;
							context.drawImage(imageCache.treadmarks, -radius, -radius, radius * 2, radius * 2);
							break;
						case 10020: // This is not a mistake, leave this blank
							break;
						case 10021:
							if (!imageCache.seniorpentagon || !imageCache.seniorpentagon.ready) break;
							context.drawImage(imageCache.seniorpentagon, -radius, -radius, radius * 2, radius * 2);
							break;
					}
					context.restore();
				} else if (sides > 200) {
					let path = path2dCache.get(sides) || 2 * Math.PI,
					radiusDiv = 1;
					switch (sides) {
						case 201: // 6 Pointed Star
							path = new Path2D("m -1.2745055,-0.73559036 .8496635,-1.54e-5 L -5.9657109e-7,-1.4711814 .42484199,-0.73560576 1.2745055,-0.73559036 .84968469,-1.7597132e-6 1.2745055,0.73558804 .42484199,0.73560224 -5.9657109e-7,1.4711779 -0.424842,0.73559964 -1.2745055,0.73558804 -0.8496847,-1.7597132e-6 Z");
							break;
						case 202: // AK-47
							path = new Path2D("m 7.93294,0.3852 c -0.0125,-0.025 -0.01,-0.2325 -0.01,-0.2325 l -0.0025,-0.105 -0.1025,0.0025 -0.095,0.2025 -0.095,0.145 c 0,0 -0.37496,0.0082 -0.535,0.005 -0.25,-0.005 -0.3925,-0.1425 -0.3925,-0.1425 l -0.0075,-0.095 -0.815,-0.005 c 0,0 .005,-0.035 -0.015,-0.04 -0.02,-0.005 -0.99,-0.0025 -0.99,-0.0025 l -0.015,-0.0325 c 0,0 -0.1625,0 -0.2025,0.0025 -0.04,0.0025 -0.0875,0.055 -0.12,0.06 -0.0325,0.005 -0.1125,0.0025 -0.1125,0.0025 L 4.42044,0.0127 4.29794,0.0102 c 0,0 -0.005,0.05 0,0.115 -0.215,0 -1.80008,0.0032 -1.8775,0.0075 -0.045,0.0025 -0.09184,0.0296 -0.11302,0.05188 -0.02356,0.02476 -0.03814,0.06458 -0.03948,0.08562 -0.0675,0.005 -0.0825,0.0175 -0.12,0.055 -0.0375,0.0375 -0.03,0.125 -0.03,0.125 0,0 -0.57478,0.07816 -0.625,0.08 -0.16482,0.00598 -0.1125,-0.07 -0.3025,-0.05 -0.1014,0.01066 -1.09,0.125 -1.115,0.125 -0.025,0 -0.08438,0.01132 -0.0625,0.075 .08812,0.25652 .11084,0.58902 .1025,0.69 -0.01078,0.13054 .4025,-0.06 .9225,-0.215 .52,-0.155 1.095,-0.37 1.095,-0.37 0,0 .05824,0.03246 .0875,0.1025 .02988,0.07156 .0225,0.1575 .0225,0.1575 0,0 -0.19,0.445 -0.24,0.52 -0.05,0.075 .03,0.08 .03,0.08 l .34,0.0925 c .035,0.00836 .05582,-0.0025 .06582,-0.03832 .01532,-0.05488 .02336,-0.27168 .06336,-0.33168 .04,-0.06 .2175,-0.2675 .2175,-0.2675 h .75832 l -0.00082,-0.31168 c 0,0 .0025,0.01168 .04914,0.005 0,0.80296 .67824,1.48692 .89502,1.59918 .05768,0.02988 .075,-0.005 .09,-0.0325 .015,-0.0275 .18832,-0.30664 .215,-0.36 .02666,-0.05332 .05332,-0.07332 -0.02668,-0.12664 C 4.0857,1.46426 4.10294,0.7702 4.10294,0.7702 c 0,0 .285,-0.005 .3175,-0.0025 .0325,0.0025 .13982,0.09734 .1975,0.0975 .23206,0.00074 .2725,-0.1125 .4475,-0.115 .08006,-0.00114 .9275,0 .9275,0 v -0.1475 l 2.0025,0.0025 .0025,-0.1975 c 0,0 -0.0525,0.0025 -0.065,-0.0225 z m -5.17634,0.66116 .00134,-0.25164 .5175,0.0025 c -0.02058,0.00796 .0225,0.245 .0225,0.245 l -0.54134,0.00414 z");
							break;
						case 203: // Pencil?
							path = new Path2D("M 0 0 L 1 -4 L 4 -1 z M 2 -5 L 10 -13 L 13 -10 L 5 -2 zM 11 -14 L 13 -16 L 14 -16 L 16 -14 L 16 -13 L 14 -11 z");
							radiusDiv = 8;
							break;
						case 204: // South America
							path = new Path2D("M -11846.244699999996 74746.89329999998 L -12076.148499999996 75436.60469999998 -15937.617299999998 77458.84309999998 -21591.992599999998 75574.43259999999 -26004.772999999997 71620.88789999999 -30188.2215 58474.05069999998 -29130.7784 42920.658299999996 -30004.069699999996 36776.164699999994 -27889.7554 17224.047499999986 -26740.236399999998 -1684.6822000000102 -27200.043999999998 -6925.001900000003 -31889.052099999997 -10464.491000000009 -37956.9111 -12533.053300000007 -39152.1821 -14096.056000000004 -41128.6685 -16210.942200000005 -40807.2607 -17359.889300000003 -50506.6847 -31901.590600000003 -53310.710399999996 -33188.93750000001 -53770.518 -37004.08240000001 -51242.1481 -39808.108100000005 -53218.6345 -44956.923800000004 -51655.631799999996 -49048.29640000001 -48713.7782 -51576.666300000004 -48070.390699999996 -53231.173 -46231.160299999996 -53966.6364 -44668.1576 -56770.6621 -46553.14 -64401.5238 -43657.0384 -66102.9263 -44116.846 -67481.7772 -41220.744399999996 -69841.4366 -40807.2607 -72553.3864 -37589.17939999999 -73932.8092 -35520.617099999996 -73794.9813 -31889.052099999997 -76736.8349 -30418.125299999996 -76139.1994 -32486.687599999997 -74760.34850000001 -31934.804099999998 -72645.4623 -33176.399 -71036.70760000001 -32348.859699999997 -69198.0491 -30785.856999999996 -69473.7049 -30463.877299999996 -70990.9556 -31521.320399999997 -72783.2902 -30004.069699999996 -74024.8851 -28625.2188 -73978.5612 -26372.504699999998 -74851.85250000001 -24258.1904 -73978.5612 -23706.3069 -72599.7103 -19293.5265 -73105.2699 -18190.331399999995 -72047.8268 -15937.617299999998 -71956.3228 -13455.571299999996 -73289.4217 -9134.2949 -73335.1737 -11662.664799999999 -72691.7862 -10283.241999999998 -70944.6317 -6468.097099999999 -70576.90000000001 -6605.925000000003 -68830.3174 -2928.608 -67772.8743 -1089.3775999999998 -66164.1196 -813.7217999999993 -64693.192800000004 2358.035600000003 -62808.2104 9529.089699999997 -62302.6508 15689.024600000004 -58563.5686 17527.683099999995 -53231.173 18952.857900000003 -52863.441300000006 19090.685799999992 -49829.51180000001 22492.346999999994 -47990.8533 31502.631500000003 -43945.2327 36053.239799999996 -41800.035800000005 38260.2019 -40973.068400000004 41661.8631 -40880.9925 48005.37789999999 -35272.941100000004 51453.363 -34536.90580000001 52970.04179999999 -29434.414000000004 51499.11499999999 -25067.3856 46810.1069 -21205.916800000006 43638.3495 -17206.620100000007 42351.00259999999 -17988.407400000004 41845.443 -10510.814900000012 39087.169299999994 -2695.801400000011 35685.50809999999 3188.4776999999885 33203.462100000004 4889.30829999999 27686.914699999994 5302.791999999987 19627.127999999997 9041.874199999991 18431.857000000004 15937.272499999992 7859.1417 27965.473299999998 5652.7514999999985 30401.767299999992 -1610.378499999999 28241.700999999986 596.0117000000027 31229.306599999996 1515.0550000000003 34968.388799999986 -691.3352000000014 38140.14619999999 -8337.638200000001 40560.99889999999 -8751.121899999998 43549.1764 -10589.780399999996 44652.371499999994 -13440.129999999997 43824.83219999999 -13532.2059 46767.25769999999 -12244.858999999997 47318.56929999999 -12107.0311 48789.49609999999 -13623.709900000002 50536.65059999999 -13440.129999999997 52145.405299999984 -14405.497199999998 53294.35239999999 -16198.403699999995 54168.215599999996 -17209.522899999996 55869.0462 -15784.348099999996 57937.60849999999 -13899.937599999997 58167.51229999999 -14083.517500000002 60220.6333 -16566.1354 62427.023499999996 -16381.9836 64633.41369999999 -18450.545899999997 65690.8568 -18496.8698 67116.0316 -17025.371099999997 69827.98139999998 -16657.6394 71835.35039999998 -12980.322399999997 74731.45199999998 Z");
							radiusDiv = 20000;
							break;
						case 205: // Test Shape (Removed)
							path = new Path2D("m 212.2546,201.15486 151.2126,153.98949 -177.57217,133.1785 267.7454,104.04721 206.70602,-55.490784 -180.34644,-130.4042 273.29395,8.322845 -22.196838,-191.44621 -163.69818,98.4987 -54.10498,-172.02364 -119.30444,56.879272 z");
							break;
						case 206: // Ship-23/AWS Body
							path = new Path2D("m-146.62466 -180.25066l74.75065 0l1.4356918 1.8136444l2.438324 2.9370117l2.7506561 2.9370117l3.312336 3.2493439l3.687664 3.18898l4.249344 3.3123322l4.874016 3.4986877l3.9396324 2.2519684l4.1233597 2.3123322l3.7506561 1.8110199l0.62467194 2.0l0.31233597 2.438324l0.12598419 2.1863556l0.24934387 1.9396362l71.68767 0l0.12598419 -3.0630035l0.24934387 -2.3123322l0.8110237 -3.0629883l4.375328 -2.2493439l4.125984 -2.2519684l4.375328 -2.6850433l4.687664 -3.2519684l5.56168 -4.687668l3.312336 -3.0603638l2.24934 -2.18898l1.876648 -2.3753204l2.186348 -2.3753357l1.8766403 -2.3753204l75.4357 0l3.6246643 .50131226l3.3753357 .8740082l3.5013123 1.3123322l3.123352 1.5643158l3.2519684 2.0l4.687668 3.81102l2.4986877 2.6246643l2.0 2.7506561l2.561676 3.9370117l1.3753357 3.6246796l1.1889801 3.2519684l0.6246643 2.561676l0.3753357 2.7506561l0.12335205 2.0629883l0 74.00001l-2.4986877 2.123352l-3.0 2.3123398l-2.7506561 2.624672l-3.3123322 3.312336l-3.8740234 4.43832l-2.6272888 3.4383202l-3.0603638 4.4986877l-2.6246796 4.062992l-1.6876678 3.375328l-1.5643005 3.062992l-0.7480316 1.7506561l-2.0 .56167984l-2.3753204 .24934387l-2.0630035 .062992096l-1.3123322 0l0 72.06299l1.9370117 0l2.1259766 .24934387l2.3123474 .50131226l1.8740082 .49868774l1.2493439 2.8740158l1.9370117 3.8136482l2.0 3.1259842l2.5643005 3.8740158l3.3753357 4.4986877l3.7480164 4.5013123l4.0630035 4.312336l2.6246643 2.624672l2.9396362 2.438324l3.0 2.3123322l0 75.49868l-0.68766785 4.3753357l-1.5643005 4.9370117l-1.8110199 3.9396362l-2.6876678 4.123352l-2.1259918 2.9370117l-2.4986725 2.5013123l-3.3123474 2.6246643l-4.5013123 2.8136597l-2.7506561 1.3753204l-3.6246643 1.4356995l-3.0630035 .8136444l-2.8740082 .49868774l-76.249344 0l-0.9370041 -1.4986877l-1.3753281 -1.8136444l-2.251976 -2.561676l-2.748024 -2.6876678l-3.501316 -3.438324l-2.5616798 -2.3753357l-2.2493439 -1.8740082l-3.062992 -2.1259918l-3.624672 -2.4356842l-3.624672 -2.2519684l-4.125984 -2.2493439l-2.687664 -1.3123474l-2.4986877 -1.0629883l-0.25196838 -2.123352l-0.24934387 -2.3123322l0 -1.8136597l0.062992096 -1.9369965l-72.37533 0l-0.062992096 1.8740082l-0.24934387 1.3753204l-0.37532806 2.1259918l-0.62467194 2.123352l-3.2493439 2.0630035l-4.125984 2.3123322l-5.750656 3.5643005l-3.624672 2.5616913l-4.062992 3.2493286l-3.0603676 2.6876678l-3.0 2.9370117l-2.8136444 2.9370117l-1.8740158 2.18898l-1.813652 2.4383087l-1.1259842 1.6876678l-75.81103 0l-3.8766327 -0.6273041l-3.3727112 -1.0l-3.9396362 -1.8740082l-4.123352 -2.1863556l-2.7506561 -1.5643005l-3.9370117 -3.6876678l-3.0 -3.81102l-2.2493439 -3.438324l-2.0629883 -4.249344l-1.3123322 -3.9369965l-0.50131226 -3.6246796l-0.49868774 -3.627304l-0.12599182 -1.561676l0 -72.81102l1.561676 -1.3149643l2.627304 -2.186348l2.3123322 -2.1259842l3.1863556 -3.0603676l3.561676 -3.6272964l3.1259918 -4.0603676l2.561676 -3.5013123l3.2519684 -4.937008l1.7480316 -3.062992l1.8136444 -3.5616798l1.6246796 -3.5616798l2.6876678 -0.56430435l2.561676 -0.24934387l3.2493439 0l0 -71.93701l-2.2493439 0l-2.4356995 -0.12598419l-2.2519684 -0.37532806l-1.1863556 -0.31233597l-1.2493439 -2.687664l-1.3123322 -2.5616798l-1.7506561 -3.1259842l-2.3753204 -4.0603676l-1.5616913 -2.375328l-2.4383087 -3.312336l-2.438324 -3.1259842l-3.4986877 -4.0l-3.1259918 -3.1863518l-3.0629883 -2.6272964l-3.123352 -2.5616837l-1.9396362 -1.561676l0 -72.50131l0.31495667 -3.7480316l1.0 -4.8136444l1.0 -3.3123322l1.7480316 -4.125992l2.0629883 -3.2493439l2.6246796 -3.2493439l3.2493439 -3.3123322l4.750656 -3.6876678l4.0629883 -2.18898l4.312332 -1.6876678l3.8740234 -0.93699646l2.3753204 -0.62467957zm74.7 143.3l0 71.68767l3.186348 .062992096l4.186348 .68766403l4.000004 1.1259842l1.4383202 2.624672l3.375328 4.312336l4.375328 4.687664l3.4986877 3.312336l4.2519684 3.4356956l3.8110237 2.687664l2.2493439 1.2519684l1.3149605 3.5616798l0.43569565 3.6876678l0.24934387 2.6876602l-0.060367584 1.7506561l71.49869 0l0.18897629 -3.7506561l0.8110237 -3.7506561l0.8766403 -3.312336l0.43569565 -1.2493439l3.8766403 -2.5643044l2.8740158 -2.4356956l4.0 -3.7506561l3.312336 -3.5616798l3.1863518 -3.5013123l2.4383202 -3.062992l1.5013123 -2.687664l2.8740158 -0.8740158l2.8740158 -0.62467194l3.6272964 -0.50131226l3.1233597 -0.18635178l0 -71.813644l-2.624672 -0.12335968l-3.375328 -0.43832016l-3.2493439 -0.68766403l-2.1889763 -0.68766403l-2.312336 -3.375328l-2.0603676 -3.0603676l-2.2519684 -2.5643044l-2.687664 -3.1233597l-2.687664 -2.5013123l-2.2493439 -1.9370079l-2.312336 -1.8740158l-2.687664 -2.1259842l-3.312336 -2.375328l-0.7506561 -2.4383202l-0.68766403 -3.0603676l-0.31233597 -2.4383163l0 -3.1259918l-72.12336 0l-0.062992096 2.624672l-0.37532806 2.813652l-0.43832016 1.9370041l-0.24934387 1.6876678l-0.18635178 1.1863518l-1.8766403 1.3753281l-2.0603676 1.312336l-1.9396324 1.3753281l-1.9370079 1.3753281l-1.7506561 1.5013123l-2.5616798 2.312336l-2.4986877 2.687664l-1.687664 2.0l-2.624672 2.8740158l-2.0 2.4383202l-1.5013123 2.1233597l-1.4383202 2.687664l-2.1233597 .62467194l-2.8136482 .50131226l-1.9370041 .31233597l-2.0 .062992096z");
							radiusDiv = 170;
							break;
						case 207: // Cancel Sign
							path = new Path2D("m-3.674541E-5 6.157506l0 0c0 -3.4006827 2.7567978 -6.1574807 6.1574802 -6.1574807l0 0c1.6330652 0 3.199245 .64873266 4.353996 1.8034842c1.1547518 1.1547515 1.8034849 2.7209306 1.8034849 4.3539963l0 0c0 3.4006824 -2.7567978 6.1574802 -6.1574807 6.1574802l0 0c-3.4006824 0 -6.1574802 -2.7567978 -6.1574802 -6.1574802zm9.545908 1.8245373c0.8057308 -1.496357 .5345459 -3.34406 -0.66718006 -4.545785c-1.201725 -1.2017255 -3.0494275 -1.4729105 -4.545785 -0.6671798zm-6.7768545 -3.649075l0 0c-0.80573094 1.496357 -0.53454566 3.34406 .6671796 4.5457854c1.2017252 1.201725 3.0494277 1.4729099 4.545785 .6671791z");
							break;
						case 208: // k
							path = new Path2D("M -2505.8469999999993 -9786.8972 L -6211.4472 -9190.269199999999 -6211.4472 9504.074800000002 -2505.8469999999993 9504.074800000002 -2505.8469999999993 3786.389800000001 C -2083.0603999999994 4109.563300000002 -1685.1435999999994 4532.174800000001 -1262.356999999999 5004.505300000001 -839.5703999999996 5476.835800000001 -416.78379999999925 5998.885300000002 -43.736799999999675 6520.934800000001 329.3102000000008 7042.9843 702.3572000000004 7565.033800000001 1050.5344000000005 8087.083300000002 1373.841800000001 8609.1328 1672.2794000000013 9081.4633 1945.847200000001 9504.074800000002 L 6198.583000000001 9504.074800000002 C 5925.015200000001 8957.165800000002 5576.838000000001 8360.537800000002 5154.051400000001 7689.331300000002 4731.264800000002 7018.124800000001 4283.608400000002 6371.777800000002 3786.2124000000013 5700.571300000001 3288.8164000000006 5029.364800000001 2766.5506000000014 4407.8773 2244.2848000000004 3786.389800000001 1722.0190000000011 3164.9023000000016 1199.753200000001 2617.9933 702.3572000000004 2170.5223000000005 1697.1492000000007 1201.0018 2617.331800000001 256.34079999999994 3462.9050000000016 -663.4606999999996 4283.608400000002 -1583.2621999999992 5154.051400000001 -2552.782699999999 6024.4944000000005 -3572.0221999999994 L 1622.5398000000005 -3572.0221999999994 C 1398.7116000000005 -3298.5676999999996 1100.2740000000013 -2950.5346999999992 776.9666000000007 -2577.6421999999993 478.52900000000045 -2204.7496999999994 130.35180000000037 -1782.1381999999994 -242.6951999999992 -1359.5266999999985 -615.7421999999997 -936.9151999999995 -988.7891999999993 -514.3036999999986 -1386.7059999999992 -91.6921999999995 -1759.7529999999997 330.9193000000014 -2132.7999999999993 753.5308000000005 -2505.8469999999993 1151.2828000000009 L -2505.8469999999993 -9786.8972 Z");
							radiusDiv = 3200;
							break;
						case 209: // 24 Pointed Star
							path = new Path2D("m-3.1884842 -0.007504462l0.84110737 -0.46545094l-0.59896183 -0.75189334l0.9552134 -0.10814953l-0.26564586 -0.92389536l0.92389536 .26564574l0.10814953 -0.9552133l0.7518934 .5989616l0.46545094 -0.84110713l0.46545094 .84110713l0.7518933 -0.5989616l0.10814953 .9552133l0.9238956 -0.26564574l-0.26564598 .92389536l0.95521355 .10814953l-0.59896183 .75189334l0.84110713 .46545094l-0.84110713 .46545094l0.59896183 .75189334l-0.95521355 .10814953l0.26564598 .9238956l-0.9238956 -0.26564598l-0.10814953 .9552133l-0.7518933 -0.5989616l-0.46545094 .84110713l-0.46545094 -0.84110713l-0.7518934 .5989616l-0.10814953 -0.9552133l-0.92389536 .26564598l0.26564586 -0.9238956l-0.9552134 -0.10814953l0.59896183 -0.75189334z");
							radiusDiv = 2.2;
							break;
						case 210: // Some Weird Curve Test
							path = new Path2D("m-222.6584 -119.30652c15.722656 -69.82634 66.359146 -74.449265 94.33595 -94.33333c27.976814 -19.884079 46.35739 -29.132996 73.52493 -24.97113c27.167542 4.16185 49.711285 38.38188 89.480316 49.942245c39.769024 11.560379 121.15704 -43.932632 149.13387 19.419952c27.976807 63.352585 86.472885 298.2677 18.727036 360.69556c-67.74585 62.427826 -354.33508 65.66359 -425.2021 13.871384c-70.86702 -51.792206 -15.722656 -254.79834 0 -324.62466z");
							radiusDiv = 90;
							break;
						case 211: // Terminator
							path = new Path2D("M 1.1926452,8.2525e-4 .57453922,0.95420971 .04413176,0.78344108 -1.2866688,0.94915731 -0.64483857,0.28750215 v -0.57500783 l -0.64183023,-0.66165511 1.33080056,0.16571618 .53040746,-0.1707686 z");
							break;
						case 212: // Pistol
							path = new Path2D("m0 -210l0.0866127 -4.3359575l1.2152252 -1.2152233l1.9921265 -0.08661413l1.3018341 1.0419946l1.1259842 2.1679792l1.1286125 2.6010494l9.2782135 0l1.2125969 1.994751l30.519684 0l0.9553833 -1.6482935l0.8661423 -0.34645748l1.3884506 0l0.77952576 .8661423l5.2021027 9.538057l80.72178 0l1.6483002 2.0813656l26.356949 0l23.498688 0l1.994751 -1.994751l114.88452 0l0 -8.149607l3.6404114 0l0 2.0813646l9.451447 0l0 -1.99475l4.6824036 0l3.8136597 7.110235l8.32547 5.635172l0.25982666 5.808399l1.8189087 0l0 1.6482925l2.0813599 0l0 2.2545948l-2.2545776 0l0 10.577427l1.6036682 .43044662l0 4.4251976l-2.2966003 0l0 6.2414703l-2.2545776 14.3937l-2.427826 9.884514l-3.9868774 8.409447l-28.614166 0l-6.590576 7.6325455l-1.8188782 2.1653595l-19.509186 0l-2.3385925 -2.338585l-48.38321 0l-3.8162537 3.2073517l-0.8661499 3.727028l-0.7821655 5.288719l-0.7795105 5.2887115l-1.2992249 5.8110275l-1.0419922 5.375328l-1.2992096 4.5958023l-1.0419922 3.9868774l-0.51968384 3.0367432l0.25984192 1.9921265l1.561676 1.6482849l1.7322998 1.994751l0.34906006 2.341217l-0.52230835 2.5144348l-1.6456604 1.4724426l-3.296585 1.6482849l-8.669296 .9527588l-14.047241 1.1286163l-23.84253 3.2073364l-14.566925 1.9081421l-8.582672 .6062927l-7.805771 -0.6929016l-6.4147034 -1.6483002l-9.797897 -3.0341187l-5.9816284 -1.1259918l-6.417328 .17323303l-5.4619446 2.8609009l-6.070862 6.154846l-4.6797943 5.724411l-2.5170593 5.8950195l-2.1653519 6.414688l-1.3884506 6.244095l1.4750671 2.601059l0.086616516 2.1679688l-0.60892487 1.734909l-1.9055176 .9527588l-3.2099686 .9527588l-4.5065613 15.173233l-3.902893 12.05249l2.3412094 2.5144348l1.1259842 1.9081268l-0.51968384 2.6876678l-2.1679764 1.2152252l-2.9475098 .77952576l-3.640419 9.451447l-1.5616837 6.328079l0 9.2782135l1.1286087 6.4147186l2.1653595 9.278198l3.0367432 5.7218018l3.2939606 4.5957947l1.6483002 1.994751l0.3464508 1.994751l-0.9553757 2.1679688l-3.640419 1.8189087l-8.496063 1.9081421l-11.965881 -0.34646606l-7.5433044 -0.779541l-5.375328 -1.0419922l-14.480316 -1.6456604l-17.081367 -1.6482849l-10.577427 -1.3884583l-9.624672 -0.43307495l-5.808399 -0.51968384l-5.984252 -0.43307495l-2.3412075 -1.3884583l-1.2992125 -2.9475098l-0.69553757 -2.7742615l0.26246738 -2.687683l1.3858261 -1.2125854l3.2073498 -1.3018494l4.7690287 .086639404l1.3018379 -1.212616l0.34645653 -1.1286011l-0.9527569 -1.1259766l-7.110236 -0.086639404l-5.811023 -2.4277954l-2.7742784 -3.556427l-1.6456692 -4.59581l0.4330709 -8.755905l1.5590551 -5.8950195l2.7742782 -15.349075l3.4698167 -15.346466l6.328083 -20.115479l9.36483 -21.501312l16.12861 -26.61943l7.4566917 -9.711288l2.6010475 -5.461937l1.0393715 -5.2887115l-0.17322922 -5.8110275l-1.6482925 -6.587921l-4.2467194 -5.8110275l-5.3779526 -5.115486l-5.808399 -3.207344l-6.4146976 -1.6483002l-7.4566936 -0.6062927l-7.979002 -0.25984192l-3.64042 -1.1259842l-2.1679792 -2.3412094l-1.2992125 -3.0341187l-0.34908152 -4.422577l0.69553804 -4.076111l2.947507 -3.2073517l6.2414703 -2.0813675l6.0708656 -4.3359528l4.682415 -5.8950157l7.9763775 -10.4042015l4.422573 -4.509186l1.2992096 -3.989502l-0.60629654 -5.0288696l-2.1679802 -3.1207352l-5.0288696 -2.0813637l-1.9081383 -3.380579l0.08661461 -3.8162727l3.296587 -3.8136482l2.947506 -0.60629845l4.3359604 1.1259842l2.947506 3.4671917l1.994751 2.4278202l2.687664 .52231026l2.1653519 -1.3884506l-0.43306732 -2.5144367l-2.687664 -0.17322731l-5.9816284 -6.068243zm135.14494 95.92331l-5.0288696 3.469818l-5.0288696 6.2414703l-3.643036 5.7244034l-1.5590668 5.375328l-0.17321777 7.1102448l1.7322845 6.761154l3.4698029 6.070862l5.028885 3.9868774l6.414688 3.296585l6.417328 .8661499l8.32283 -0.17323303l5.8950195 -1.0393677l11.099731 -1.3884583l10.230972 -1.561676l16.301834 -1.9055176l5.2021027 -2.7742767l3.9868774 -5.551178l2.0813599 -7.1102295l1.0393829 -6.241478l0 -7.8031464l-1.7322845 -6.244095l-4.162735 -4.855644l-5.3753357 -3.9868774l-4.6824036 0l0 -3.469818l-15.086624 -0.1732254l-17.860886 1.3884506l-0.8661499 1.9081345l0 11.443573l1.7322845 6.244095l2.9475098 5.721779l5.551178 4.5091934l5.8950195 3.293953l4.509186 .8661499l1.7322845 .9553833l0.60891724 1.561676l-0.08660889 .9527588l-1.821518 .9527588l-5.2887115 .4330597l-6.850403 -0.08660889l-9.10498 -2.8608856l-7.194229 -6.9370117l-6.7637787 -9.708664l-0.69291687 -4.682419l0.606308 -3.3832016l-1.2152252 -2.8608856l-3.2073517 -2.8608932z");
							radiusDiv = 80;
							break;
						case 213: // Bullet
							path = new Path2D("m-164.9029 -40.75328l0 79.07611l258.03412 0l58.267723 -15.262466l152.60104 -23.582678l-147.05249 -22.19685l-58.267723 -18.03412z");
							radiusDiv = 80;
							break;
						case 214: // <3
							path = new Path2D("M 3551.0797000000002 -81.83389999999963 C 11146.0797 2660.1661000000004 3551.0797000000002 13319.6661 -6213.9203 -90.83389999999963 3551.0797000000002 -13483.3339 11146.0797 -2809.8338999999996 3551.0797000000002 -81.83389999999963 Z");
							radiusDiv = 6400;
							break;
						case 215: // Sun
							path = new Path2D("M 8977.0478 1.0478000000002794 L 5311.276224072266 1304.682748730469 5311.276224072266 -1302.5871487304685 Z M 6315.772244444444 -6422.517755555555 L 4645.964064072268 -2908.274988730468 2802.3705887304714 -4751.868464072265 Z M -106.95219999999972 -9082.9522 L 1196.682748730469 -5417.180624072265 -1410.5871487304685 -5417.180624072265 Z M -6530.517755555555 -6422.517755555555 L -3016.274988730468 -4751.868464072265 -4859.868464072265 -2908.274988730468 Z M -9190.9522 1.0478000000002794 L -5525.180624072265 -1302.5871487304685 -5525.180624072265 1304.682748730469 Z M -6530.517755555555 6423.772244444444 L -4859.868464072265 2910.3705887304714 -3016.274988730468 4753.964064072268 Z M -106.95219999999972 9085.0478 L -1410.5871487304685 5419.276224072266 1196.682748730469 5419.276224072266 Z M 6315.772244444444 6423.772244444444 L 2802.3705887304714 4753.964064072268 4645.964064072268 2910.3705887304714 Z M -4648.9522 1.0478000000002794 C -4648.9522 -2507.4295337314643 -2615.4295337314643 -4540.9522 -106.95219999999972 -4540.952200000001 2401.525133731464 -4540.952200000001 4435.0478 -2507.429533731466 4435.0478 1.0477999999984604 4435.0478 2509.525133731464 2401.5251337314658 4543.0477999999985 -106.9521999999979 4543.0478 -2615.4295337314616 4543.0478 -4648.952199999999 2509.5251337314658 -4648.9522 1.0478000000020984 Z");
							radiusDiv = 6400;
							break;
						case 216: // UwU
							path = new Path2D("M -67599.8489 -24560 L -67599.8489 3172.4110000000037 C -67599.8489 8196.398500000003 -66996.97039999999 12215.588500000005 -65791.2134 15162.9945 -64518.4699 18110.400500000003 -62508.874899999995 20320.955 -59628.4554 21861.644500000002 -56815.022399999994 23402.334000000003 -53130.764899999995 24206.172000000006 -48642.6694 24206.172000000006 -44020.60089999999 24206.172000000006 -40269.3569 23335.347500000003 -37455.923899999994 21526.712000000007 -34575.50439999999 19785.063000000002 -32632.895899999996 17440.535500000005 -31494.125399999997 14627.1025 -30422.34139999999 11813.669500000004 -29886.44939999999 7995.439000000002 -29886.44939999999 3172.4110000000037 L -29886.44939999999 -24560 -36250.1669 -24560 -36250.1669 3105.424500000001 C -36250.1669 9134.209500000004 -37254.9644 13220.386000000006 -39197.5729 15296.967500000006 -41207.16789999999 17440.535500000005 -44489.5064 18512.319500000005 -49178.56139999999 18512.319500000005 -51925.0079 18512.319500000005 -54202.548899999994 17976.427500000005 -56078.1709 16904.643500000006 -58020.7794 15832.859500000006 -59293.522899999996 14292.170000000006 -60097.3609 12349.561500000003 -60901.198899999996 10339.966500000002 -61236.1314 7258.5875000000015 -61236.1314 3105.424500000001 L -61236.1314 -24560 Z M -24326.569899999995 -11363.659499999998 L -13675.71639999999 23402.334000000003 -7512.958399999989 23402.334000000003 -479.37589999998454 -3325.279499999997 860.3541000000114 2569.532500000001 6353.247100000008 23402.334000000003 12516.00510000001 23402.334000000003 23367.81810000002 -11363.659499999998 17606.97910000001 -11363.659499999998 11712.167100000006 8732.290500000003 9702.572100000005 15430.940500000004 7960.9231000000145 8799.277000000002 2735.9761000000144 -11363.659499999998 -3292.808899999989 -11363.659499999998 -8852.688399999992 9000.236500000006 C -9924.472399999991 13421.345500000003 -10527.35089999999 15765.873000000007 -10594.33739999999 16167.792000000001 L -12670.91889999999 8732.290500000003 -18230.798399999992 -11363.659499999998 Z M 29128.65710000001 -24560 L 29128.65710000001 3172.4110000000037 C 29128.65710000001 8196.398500000003 29731.535600000017 12215.588500000005 31004.279100000014 15162.9945 32210.036100000012 18110.400500000003 34219.63110000001 20320.955 37100.05060000002 21861.644500000002 39980.47010000002 23402.334000000003 43597.741100000014 24206.172000000006 48152.82310000001 24206.172000000006 52774.89160000002 24206.172000000006 56459.14910000001 23335.347500000003 59339.56860000001 21526.712000000007 62153.00160000002 19785.063000000002 64162.596600000004 17440.535500000005 65234.38060000002 14627.1025 66306.1646 11813.669500000004 66842.05660000003 7995.439000000002 66842.05660000003 3172.4110000000037 L 66842.05660000003 -24560 60545.32560000001 -24560 60545.32560000001 3105.424500000001 C 60545.32560000001 9134.209500000004 59540.52810000001 13220.386000000006 57530.93310000001 15296.967500000006 55588.32460000002 17440.535500000005 52238.99960000001 18512.319500000005 47549.94460000002 18512.319500000005 44870.48460000001 18512.319500000005 42525.957100000014 17976.427500000005 40650.33510000001 16904.643500000006 38774.71310000001 15832.859500000006 37434.98310000001 14292.170000000006 36631.14510000001 12349.561500000003 35894.29360000002 10339.966500000002 35492.37460000001 7258.5875000000015 35492.37460000001 3105.424500000001 L 35492.37460000001 -24560 Z");
							radiusDiv = 25600;
							break;
						case 217: // Clara
							path = new Path2D("M -55462.668699999995 -21790.8814 C -58822.640499999994 -21790.8814 -61919.0851 -21263.826999999997 -64752.002499999995 -20209.7182 -67584.9199 -19155.6094 -70088.4283 -17574.4462 -72130.7641 -15532.1104 -74173.0999 -13489.7746 -75820.1449 -10986.2662 -77006.01729999999 -8021.585200000001 -78191.8897 -5056.904200000001 -78784.8259 -1696.9324000000015 -78784.8259 2058.3302000000003 -78784.8259 9634.737200000003 -76808.3719 15498.217400000001 -72921.34569999999 19648.7708 -69034.3195 23799.324200000003 -63434.3665 25841.659999999996 -55989.723099999996 25841.659999999996 -52497.9877 25841.659999999996 -49467.4249 25512.250999999997 -46832.1529 24787.5512 -44196.8809 24062.8514 -42154.545099999996 23272.269800000002 -40705.1455 22415.8064 L -43538.0629 14180.581400000003 C -44130.99909999999 14444.1086 -44723.9353 14707.635799999996 -45448.6351 15037.044799999996 -46173.3349 15366.453800000003 -46963.91649999999 15629.981 -47886.261699999995 15893.508199999997 -48808.6069 16091.153599999998 -49862.7157 16288.798999999999 -51048.58809999999 16486.4444 -52234.4605 16684.0898 -53552.0965 16749.971599999997 -55067.37789999999 16749.971599999997 -57439.12269999999 16749.971599999997 -59481.45849999999 16354.680800000002 -61128.50349999999 15629.981 -62775.5485 14839.399400000002 -64159.0663 13785.2906 -65147.2933 12467.654600000002 -66201.40209999999 11150.018600000003 -66926.1019 9568.8554 -67387.2745 7790.046799999996 -67848.44709999999 5945.356400000001 -68111.9743 3968.902399999999 -68111.9743 1860.684799999999 -68111.9743 -774.5872000000018 -67782.5653 -3014.5684 -67057.8655 -4859.2588 -66333.1657 -6703.949199999999 -65410.820499999994 -8219.230599999999 -64224.948099999994 -9339.2212 -63104.9575 -10525.0936 -61721.439699999995 -11381.557 -60206.158299999996 -11908.6114 -58690.876899999996 -12435.6658 -57175.595499999996 -12699.193 -55594.4323 -12699.193 -53222.6875 -12699.193 -51114.4699 -12435.6658 -49203.8977 -11908.6114 -47359.207299999995 -11381.557 -45712.162299999996 -10722.739 -44328.644499999995 -9998.0392 L -41363.9635 -18299.146 C -41693.3725 -18496.791400000002 -42286.308699999994 -18826.2004 -43076.8903 -19221.4912 -43867.4719 -19616.782 -44855.698899999996 -20012.0728 -46041.571299999996 -20341.4818 -47227.443699999996 -20736.7726 -48610.9615 -21066.1816 -50192.1247 -21329.7088 -51773.287899999996 -21659.1178 -53552.0965 -21790.8814 -55462.668699999995 -21790.8814 Z M -24959.395299999996 -26204.962 L -34775.7835 -24623.7988 -34775.7835 13521.763399999996 C -34775.7835 15366.453800000003 -34578.1381 17013.4988 -34248.7291 18528.7802 -33853.438299999994 19978.179799999998 -33128.7385 21229.934 -32074.629699999998 22284.042799999996 -31086.4027 23272.269800000002 -29702.884899999997 24062.8514 -27858.194499999998 24655.787599999996 -26079.385899999994 25248.7238 -23773.522899999996 25512.250999999997 -20940.605499999998 25578.1328 L -19557.087699999996 17474.6714 C -20742.960099999997 17408.789599999996 -21665.3053 17211.144200000002 -22390.005099999995 16881.735200000003 -23114.704899999997 16552.326199999996 -23641.759299999998 16157.0354 -24037.0501 15695.862800000003 -24366.4591 15234.690199999997 -24629.986299999997 14641.754 -24761.749899999995 13917.054199999999 -24893.5135 13192.354399999997 -24959.395299999996 12401.772799999999 -24959.395299999996 11545.309399999998 L -24959.395299999996 -26204.962 Z M 207.45230000000447 9964.146200000003 C 866.2703000000038 9964.146200000003 1590.970100000006 10030.027999999998 2381.5516999999963 10095.909800000001 3172.1333000000013 10161.791599999997 3765.069499999998 10293.555200000003 4160.3603 10359.436999999998 L 4160.3603 17804.0804 C 3633.3059000000067 17869.9622 2908.6061000000045 17935.843999999997 2052.1426999999967 18001.7258 1195.6793000000034 18067.607600000003 273.3341000000073 18067.607600000003 -714.8928999999916 18067.607600000003 -2493.7014999999956 18067.607600000003 -3943.1011 17804.0804 -4997.209900000002 17211.144200000002 -5985.436900000001 16618.208 -6512.491299999994 15498.217400000001 -6512.491299999994 13982.936000000002 -6512.491299999994 13192.354399999997 -6314.8459 12533.536399999997 -5985.436900000001 12006.481999999996 -5656.027900000001 11479.427600000003 -5128.973499999993 11084.1368 -4536.037299999996 10754.7278 -3943.1011 10425.318800000001 -3218.4012999999977 10227.6734 -2427.8196999999927 10161.791599999997 -1571.3562999999995 10030.027999999998 -714.8928999999916 9964.146200000003 207.45230000000447 9964.146200000003 Z M -1505.4744999999966 -10656.8572 C -2625.4651000000013 -10656.8572 -3745.4556999999913 -10590.9754 -4865.446299999996 -10459.2118 -5985.436900000001 -10393.33 -7105.427499999991 -10261.5664 -8093.654500000004 -10063.921 -9081.881500000003 -9932.1574 -10004.2267 -9734.511999999999 -10860.690099999993 -9536.866600000001 -11717.1535 -9339.2212 -12441.853300000002 -9207.457600000002 -13034.789499999999 -9009.8122 L -11783.035300000003 -1103.9962000000014 C -10597.162899999996 -1565.1687999999995 -9213.645099999994 -1894.5777999999991 -7566.600099999996 -2092.2232000000004 -5919.555099999998 -2355.750400000001 -4272.5100999999995 -2487.513999999999 -2625.4651000000013 -2487.513999999999 -121.95669999999518 -2487.513999999999 1656.8519000000088 -1960.459600000002 2645.0789000000077 -972.2325999999994 3633.3059000000067 15.994399999999587 4160.3603 1399.512200000001 4160.3603 3046.5571999999993 L 4160.3603 3968.902399999999 C 3567.424100000004 3771.2570000000014 2776.842499999999 3639.4933999999994 1722.733699999997 3573.6116 734.5066999999981 3441.847999999998 -385.483899999992 3375.966199999999 -1637.2381000000023 3375.966199999999 -3547.8102999999974 3375.966199999999 -5326.618900000001 3573.6116 -7105.427499999991 3968.902399999999 -8884.236099999995 4298.311399999999 -10399.517500000002 4891.247599999999 -11783.035300000003 5747.710999999999 -13166.553100000005 6604.174399999996 -14220.6619 7724.165000000001 -15077.1253 9107.682800000002 -15867.706899999997 10491.200599999996 -16262.9977 12204.127399999998 -16262.9977 14246.463199999998 -16262.9977 16354.680800000002 -15933.5887 18133.4894 -15208.888899999998 19582.889000000003 -14484.189099999996 21032.2886 -13495.962099999997 22218.161 -12178.326099999991 23140.506199999996 -10860.690099999993 23996.969599999997 -9279.526899999997 24655.787599999996 -7500.718299999993 25051.0784 -5656.027900000001 25446.3692 -3613.6921 25644.014600000002 -1373.710899999991 25644.014600000002 2183.9063000000024 25644.014600000002 5214.469100000002 25446.3692 7717.977500000008 25051.0784 10221.4859 24589.9058 12197.939899999998 24260.4968 13581.457699999999 23931.0878 L 13581.457699999999 3507.729800000001 C 13581.457699999999 1333.6303999999982 13317.930500000002 -576.9418000000005 12856.757899999997 -2355.750400000001 12395.585300000006 -4134.559000000001 11539.121899999998 -5583.958600000002 10353.249500000005 -6835.712800000001 9233.2589 -8087.467000000001 7652.095700000005 -9009.8122 5741.523499999996 -9668.6302 3830.9513000000006 -10327.4482 1393.3246999999974 -10656.8572 -1505.4744999999966 -10656.8572 Z M 36705.96950000001 -10459.2118 C 33741.288499999995 -10459.2118 31106.016499999998 -10195.6846 28734.271699999998 -9602.7484 26296.645099999994 -9075.694 24254.309300000008 -8482.7578 22475.500700000004 -7889.821599999999 L 22475.500700000004 24919.3148 32291.888900000005 24919.3148 32291.888900000005 -1565.1687999999995 C 32753.061499999996 -1696.9324000000015 33411.879499999995 -1828.696 34268.3429 -1894.5777999999991 35124.8063 -2026.3414000000012 35849.5061 -2092.2232000000004 36442.442299999995 -2092.2232000000004 37825.9601 -2092.2232000000004 39077.71430000001 -1960.459600000002 40263.5867 -1696.9324000000015 41449.45910000001 -1499.2870000000003 42503.567899999995 -1235.7597999999998 43360.0313 -1038.1143999999986 L 45007.0763 -9141.575799999999 C 44480.02190000001 -9339.2212 43821.20390000001 -9536.866600000001 43096.504100000006 -9668.6302 42371.8043 -9866.2756 41581.2227 -9998.0392 40856.522899999996 -10063.921 40131.823099999994 -10195.6846 39341.241500000004 -10261.5664 38616.5417 -10327.4482 37891.8419 -10393.33 37233.0239 -10459.2118 36705.96950000001 -10459.2118 Z M 64442.20730000001 9964.146200000003 C 65101.02530000001 9964.146200000003 65825.72510000001 10030.027999999998 66616.30669999999 10095.909800000001 67406.88829999999 10161.791599999997 67999.82449999999 10293.555200000003 68395.1153 10359.436999999998 L 68395.1153 17804.0804 C 67868.06090000001 17869.9622 67143.36110000001 17935.843999999997 66286.8977 18001.7258 65430.43429999999 18067.607600000003 64508.08910000001 18067.607600000003 63519.8621 18067.607600000003 61741.05350000001 18067.607600000003 60291.653900000005 17804.0804 59237.54509999999 17211.144200000002 58249.318100000004 16618.208 57722.26370000001 15498.217400000001 57722.26370000001 13982.936000000002 57722.26370000001 13192.354399999997 57919.90909999999 12533.536399999997 58249.318100000004 12006.481999999996 58578.72709999999 11479.427600000003 59105.78150000001 11084.1368 59698.71770000001 10754.7278 60291.653900000005 10425.318800000001 61016.35370000001 10227.6734 61806.93530000001 10161.791599999997 62663.39869999999 10030.027999999998 63519.8621 9964.146200000003 64442.20730000001 9964.146200000003 Z M 62729.28049999999 -10656.8572 C 61609.2899 -10656.8572 60489.29930000001 -10590.9754 59369.308699999994 -10459.2118 58249.318100000004 -10393.33 57129.327500000014 -10261.5664 56141.1005 -10063.921 55152.87349999999 -9932.1574 54230.528300000005 -9734.511999999999 53374.0649 -9536.866600000001 52517.60149999999 -9339.2212 51792.9017 -9207.457600000002 51199.965500000006 -9009.8122 L 52451.71969999999 -1103.9962000000014 C 53637.59210000001 -1565.1687999999995 55021.10990000001 -1894.5777999999991 56668.154899999994 -2092.2232000000004 58315.19990000001 -2355.750400000001 59962.24489999999 -2487.513999999999 61609.2899 -2487.513999999999 64112.798299999995 -2487.513999999999 65891.60690000001 -1960.459600000002 66879.8339 -972.2325999999994 67868.06090000001 15.994399999999587 68395.1153 1399.512200000001 68395.1153 3046.5571999999993 L 68395.1153 3968.902399999999 C 67802.17910000001 3771.2570000000014 67011.5975 3639.4933999999994 65957.48869999999 3573.6116 64969.2617 3441.847999999998 63849.27110000001 3375.966199999999 62597.51689999999 3375.966199999999 60686.94469999999 3375.966199999999 58908.1361 3573.6116 57129.327500000014 3968.902399999999 55350.518899999995 4298.311399999999 53835.23749999999 4891.247599999999 52451.71969999999 5747.710999999999 51068.2019 6604.174399999996 50014.0931 7724.165000000001 49157.629700000005 9107.682800000002 48367.0481 10491.200599999996 47971.7573 12204.127399999998 47971.7573 14246.463199999998 47971.7573 16354.680800000002 48301.1663 18133.4894 49025.8661 19582.889000000003 49750.5659 21032.2886 50738.7929 22218.161 52056.4289 23140.506199999996 53374.0649 23996.969599999997 54955.22810000001 24655.787599999996 56734.0367 25051.0784 58578.72709999999 25446.3692 60621.06289999999 25644.014600000002 62861.0441 25644.014600000002 66418.6613 25644.014600000002 69449.22409999999 25446.3692 71952.73250000001 25051.0784 74456.2409 24589.9058 76432.6949 24260.4968 77816.2127 23931.0878 L 77816.2127 3507.729800000001 C 77816.2127 1333.6303999999982 77552.68549999999 -576.9418000000005 77091.5129 -2355.750400000001 76630.34030000001 -4134.559000000001 75773.8769 -5583.958600000002 74588.00450000001 -6835.712800000001 73468.01389999999 -8087.467000000001 71886.85070000001 -9009.8122 69976.27849999999 -9668.6302 68065.70629999999 -10327.4482 65628.0797 -10656.8572 62729.28049999999 -10656.8572 Z")
							radiusDiv = 25600;
							break;
						case 218: // Australia
							path = new Path2D("M 78983 107017.038 L 69820 100908.038 61942 104927.038 54548 99622.038 44098 98015.038 40401 91424.038 39115 80331.038 35899 78081.038 21753 80813.038 21592 77598.038 32202 77116.038 33006 69078.038 30434 68435.038 29308 74544.038 23199 74705.038 24003 71329.038 27379 71329.038 27218 67310.038 30434 58468.038 27861 57986.038 26093 62969.038 18377 68596.038 17573 73579.038 12107 70686.038 13715 66667.038 3426 51394.038 -5094 51234.038 -10721 48983.038 -23903 47858.038 -37085 54288.038 -43677 53484.038 -57502 62005.038 -59592 68274.038 -66236 69400.038 -78776 69078.038 -83920 70846.038 -85206 75026.038 -89386 75026.038 -94852 81456.038 -105783 81296.038 -108998 77277.038 -114625 75187.038 -113500 71007.038 -110445 69721.038 -111410 57825.038 -118966 47697.038 -117680 41427.038 -126361 31943.038 -126200 26959.038 -134077 18600.038 -132469 15706.038 -134398 13294.038 -131826 13455.038 -129254 18278.038 -127968 16349.038 -135042 4453.0380000000005 -136167 -369.96199999999953 -133434 -2781.9619999999995 -135845 -12908.962 -132791 -15159.962 -131183 -13551.962 -117519 -27055.962 -110285 -27698.962 -107391 -30270.962 -102729 -31074.962 -98388 -33807.962 -90029 -36058.962 -84402 -40881.962 -84242 -45221.962 -78133 -50526.962 -81991 -55670.962 -76686 -64351.962 -71702 -57278.962 -68809 -60332.962 -72345 -65316.962 -69452 -66602.962 -65915 -65155.962 -63664 -72711.962 -59645 -75926.962 -59645 -78981.962 -56752 -80910.962 -54823 -79141.962 -54340 -83535.962 -48714 -83857.962 -49196 -86429.962 -42766 -84500.962 -38907 -80642.962 -37943 -75819.962 -35692 -78873.962 -30226 -78391.962 -27172 -76944.962 -27172 -81285.962 -29262 -81606.962 -26850 -84821.962 -25886 -88037.962 -22831 -89162.962 -23153 -93020.962 -19134 -98004.962 -14793 -98808.962 -5791 -98968.962 -4344 -102505.962 -11096 -104756.962 -9006 -108132.962 -3540 -106363.962 -4 -102505.962 10499 -100576.962 13072 -98164.962 18859 -99451.962 27058 -99611.962 28665 -97521.962 24646 -95110.962 23842 -91091.962 18537 -89323.962 21270 -86911.962 15965 -79195.962 24646 -71157.962 32684 -69067.962 34935 -65530.962 42330 -62958.962 47796 -56689.962 55030 -57492.962 62585 -75337.962 60496 -86268.962 64354 -93342.962 62425 -95271.962 66926 -101380.962 68373 -107971.962 72553 -107328.962 73839 -99129.962 76893 -93824.962 77054 -81285.962 78983 -79195.962 83806 -79838.962 89593 -75015.962 90236 -61672.962 93558 -55027.962 93398 -44256.962 96934 -41524.962 101436 -40720.962 101596 -36218.962 105455 -36540.962 110599 -31074.962 109634 -27377.962 114779 -19660.962 113171 -16445.962 115743 -14677.962 121531 -14837.962 122656 -11944.962 121209 -6799.9619999999995 124585 -1012.9619999999995 127800 -1494.9619999999995 127639 1559.0380000000005 135517 15063.038 132623 23583.038 136160 35318.038 128443 48340.038 128283 53484.038 123138 58468.038 123781 63291.038 118155 64577.038 102722 93192.038 102883 96729.038 99024 100587.038 89218 99622.038 81180 106696.038 Z");
							radiusDiv = 25000;
							break;
						case 219: // Michigan
							path = new Path2D("m -30.347175,-37.325674 1.156,-1.032 1.268,-0.306 3.262,-1.827 1.313,-0.173 .229,0.29 -3.213,2.54 -1.98,0.873 -1.211,0.379 z m 46.117,23.585 .195,1.444 1.799,0.3 .804,-0.595 c 0,0 .05,-0.816 -0.12,-0.927 -0.169,-0.116 -0.781,-1.148 -0.781,-1.148 l -1.235,-0.004 -0.916,-0.018 -0.259,0.614 z m 12.713,37.227 -1.273,-4.82 -0.675,-5.214 -1.144,-1.966 -1.333,-1.164 -0.977,0.529 -2.286,0.743 -1.413,2.675 -1.78,1.904 -0.677,0.286 -0.771,-0.455 c 0,0 -1.351,-0.982 -1.218,-1.336 .136,-0.349 .595,-2.771 .595,-2.771 l 1.983,-0.502 .677,-1.8459998 .529,-1.404 1.461,-0.749 .474,-5.629 -0.761,-1.37 -0.668,-0.536 -0.318,-1.231 .508,-0.397 .882,0.285 .194,-0.891 -1.211,-1.426 -0.554,-1.529 -1.447,-0.168 -2.44,-1.11 -2.853,-2.254 -1.538,-0.179 -0.403,0.32 -0.5100001,-0.335 -1.571,-1.4640002 -1.743,0.8030002 -1.776,1.077 -0.052,2.011 .521,0.245 1.149,0.407 .216,0.483 -1.502,0.283 -1.466,0.012 -0.929,0.902 -0.32,1.155 .078,0.926 -0.179,3.095 -2.12599998,0.945 -0.352,-0.134 .274,-2.352 .885,-1.27 .51899998,-1.315 -0.39799998,-0.505 -1.144,0.326 -0.81900002,2.289 -1.607,0.453 -1.119,0.972 -0.153,0.532 .309,0.494 -0.529,1.403 -1.301,0.124 -0.074,0.637 .295,1.406 -1.032,3.361 -1.166,2.1539998 .053,2.667 .197,0.667 -0.609,1.302 -0.233,0.433 -0.362,1.517 1.6,3.574 1.206,3.812 .498,2.809 -0.752,2.57 -0.934,3.281 -1.693,2.734 -0.362,1.52 -1.9269999,1.539 -0.471,0.381 2.6099999,0.209 12.445,0.166 3.479,0.041 .098,0.698 4.4250001,-0.171 5.803,-0.242 2.948,0.081 -0.673,-0.735 .185,-0.803 1.423,-1.942 1.227,-0.842 .208,-2.841 .997,-0.789 .632,-0.123 .354,-1.972 1.06,-1.598 .548,0.41 .048,0.369 .441,0.145 1.146,-0.417 z m -69.299,-45.244 1.103,-0.456 1.59,-0.273 2.137,-1.033 .063,-0.545 .4,-0.318 3.412,-0.152 1.481,-0.929 2.582,-0.89 .175,-0.716 1.272,-1.5 1.046,-0.338 .843,-0.91 1.412,-1.116 2.603,-1.074 2.653,0.035 .558,0.707 -0.243,0.523 -2.143,0.298 -1.017,1.626 -1.318,0.304 -0.426,1.326 -1.569,1.65 -0.345,1.426 .417,0.324 .619,-0.571 2.179,-1.395 .638,0.807 1.265,0.147 1.747,0.752 .739,0.73 .613,1.814 1.359,1.715 2.18,0.163 .876,-0.449 .823,0.829 .872,0.375 .7729999,-0.366 .639,0.075 .963,-0.439 2.494,-1.727 1.973,-0.412 3.72900002,0.248 2.66199998,-0.789 1.529,-0.559 .802,0.19 -0.369,3.164 .252,0.211 1.571,0.641 1.122,-0.143 3.5390001,-0.501 .71,-0.562 .781,0.366 -0.453,3.889 1.606,1.93 .684,0.442 .661,0.632 -0.746,0.095 -0.431,-0.232 -2.048,-0.514 -1.223,0.223 -1.2530001,-0.235 -1.904,0.601 -0.992,-0.115 -3.175,-1.104 -2.90299998,-0.245 -1.251,1.32 -3.93300002,-0.091 -1.411,0.293 -0.832,1.647 -0.798,0.548 -0.261,-0.123 -0.708,-1 -2.6889999,1.064 -0.365,-0.042 -0.522,-0.98 -0.466,0.039 -1.368,2.3170002 -0.808,2.198 -2.628,4.305 -0.836,-0.747 -0.678,-0.855 -0.226,-5.8620002 -1.972,-0.879 -0.619,-1.367 -6.855,-2.353 -1.331,-0.806 -4.459,-1.812 -4.529,-1.176 z");
							radiusDiv = 14;
							break;
						case 220: // No U
							path = new Path2D("M 14762.9944 70634.5825 L -47799.005600000004 75584.5825 -42897.005600000004 12974.582500000004 Z M 15927.0943 -12737.4613 L 28797.0943 126.53869999999915 C 32210.430524234933 3538.283625295895 34128.33888141619 8165.918862656707 34128.90142496409 12991.41748209053 34129.463968511984 17816.916101524366 32212.634617788208 22444.9983822118 28800.09395026814 25857.539049731873 L -1244.905699999992 55902.5387 -26984.905699999992 30174.53869999999 Z M -16923.2065 14906.5984 L -29793.2065 2042.5984000000008 C -33206.54272423493 -1369.1465252958951 -35124.45108141619 -5996.781762656707 -35125.013624964085 -10822.28038209053 -35125.57616851198 -15647.779001524365 -33208.74681778821 -20275.8612822118 -29796.20615026814 -23688.401949731873 L 248.7934999999925 -53733.4016 25988.793499999992 -28005.40159999999 Z M -15771.106500000002 -68477.4456 L 46802.8935 -73415.4456 41888.8935 -10817.445600000006 Z");
							radiusDiv = 25600;
							break;
						case 221: // CZ-557 Sniper
							path = new Path2D("m548.53284 17.845146l3.6403809 -3.2965927l1.5617065 -4.160103l0.8661499 -4.682411l-0.8661499 -4.855644l-0.8687744 -5.0288696l-1.7322998 -5.897644l95.20209 0l0.51971436 2.0813675l1.6483154 .78215027l3.0341187 0l1.0393677 -0.78215027l0.5196533 -1.0393677l1.1286011 0l0.34649658 1.0393677l0.77948 .60630035l3.0367432 0l1.4724731 -0.77952576l0.6062622 -1.2126007l3.0368042 0l3.026245 -1.7480316l31.653503 0l0 -2.9343872l-1.3858032 0l0 -1.3018341l2.1679688 0l0 -8.58268l-2.0813599 0l0 -5.115486l-19.335938 0l-0.9527588 -0.95275116l-11.0997925 0l-0.95269775 -0.9527588l-3.7270508 0l-0.43572998 -0.8687668l-0.6928711 -0.78215027l-4.5092163 0l-0.6929321 1.0419922l-1.2125854 -0.08660889l-0.6954956 -0.9553833l-0.8661499 -0.43306732l-3.0341187 0l-1.0419922 .3464508l-0.9527588 1.1286087l0 1.3858261l-3.0341187 0l-0.9553833 .9553833l-232.11023 0l-115.57745 -2.4278183l-14.044617 0l-1.2152405 -1.734909l-2.5144348 0l0 -1.5616837l16.388458 0l1.3490906 -2.3359566l0 -4.858265l-1.3490906 -0.9553833l-3.123352 0l0 1.4750671l3.2966003 0l0 1.3858261l-7.283478 0l-0.6167908 -1.0682411l0 -1.7060356l-3.979004 0l0 2.6010475l-3.902893 0l0 -10.490814l8.6719055 0l85.83731 16.215221l38.845093 0l2.5144653 -5.2047195l0.9527588 -9.275593l0.34643555 -9.711285l0 -14.480316l-0.25982666 -6.677166l-0.8661499 -7.020996l-0.9553833 -5.115486l-1.3858032 -2.8635168l-38.758545 0l-86.09711 17.341206l-8.845154 0l0 -3.7270336l-14.826782 0l0 3.0341206l-28.438324 0l-1.6036682 -1.6036739l-4.8110046 0l0 -10.015748l1.2991943 -0.692914l0 -2.1679788l-0.8661194 -0.8661413l0 -1.4750657l0.9527283 -0.9527559l0 -1.3884516l-1.0393677 -1.0393701l-2.6876526 -0.95275587l-19.07611 0l-2.8477783 .7637796l-2.0944824 1.0551181l-0.9081421 .29658794l0 2.0l1.3569641 .7821522l0 1.656168l-0.91864014 .56167984l0 1.5013123l1.0918579 1.0918636l0 10.283464l-3.4671936 0l-2.4986877 2.5013123l-12.314941 0l0 -3.2519684l-13.811035 0l0 3.312336l-23.375336 0l-10.750641 -6.43832l-12.624664 0l0 1.4383202l-9.249359 0l-0.59317017 -0.5931759l-34.22049 0l0 1.5931759l-1.438324 0l0 -1.687664l-4.435669 0l0 1.6246719l-1.3123474 0l0 -1.0629921l-5.750641 0l-1.0630188 1.8766403l-0.561676 6.1233597l-0.06298828 9.312336l0.12335205 9.687664l0.56433105 6.43832l0.49865723 3.4383202l1.1260071 2.1233597l5.0 0l0 -1.5616798l1.6876526 0l0 1.5013123l36.312347 0l0 -1.0l8.750641 0l0 -1.312336l1.123352 0l0 1.4986877l4.2519836 0l0 1.0629921l11.937012 0l11.146973 -6.4356956l21.916016 0l0 9.559055l-3.8136597 0l-0.6850281 -2.5590553l-3.128601 0l-0.62731934 2.3412056l-4.4960327 0l-0.58532715 -2.1837234l-2.7900085 0l-1.0629883 .96587753l0 5.1233597l3.6876526 0l0 .81365204l3.6876526 0l0.2677307 .99474335l3.4199524 0l0 1.6929169l-1.5013123 0l-0.22573853 -0.8451462l-2.1469727 .5748062l-2.1259766 2.7690277l-6.1889954 0l0.27822876 1.0393677l-7.963257 0l0 1.0866165l-3.6876526 0l-11.81366 1.9370041l-19.375336 3.062996l-0.75064087 .81365204l0 3.372696l-3.9370117 0l0 3.50132l4.5643005 0l0 5.750656l-45.438324 12.186348l-3.7506409 1.438324l-2.7506714 2.186348l-2.1863403 2.813652l-3.7506714 7.4383163l-2.123352 3.2493439l-2.3753204 2.624672l-2.5013275 1.6876678l-3.0629883 1.9370041l-4.249344 1.186348l-3.3123322 0l-4.750656 0l-2.3753357 -0.748024l-3.0 -1.7506561l-2.6876526 -3.1863556l-2.5616913 -4.0l-2.3123322 -4.0629883l-1.3753204 -3.813652l-0.7506561 -4.31234l-0.49868774 -5.312332l-0.7506561 -4.062996l-0.49868774 -1.8110199l-0.87664795 -1.3753281l-1.3753204 -0.56430817l-9.312347 -0.6850357l-67.87401 0l-68.438324 1.4986877l-59.435696 0l-1.4383202 2.6876678l-1.1259842 3.561676l-0.18635178 4.937004l1.1863518 12.876648l2.0 60.12336l1.4383202 33.813644l46.624672 -1.2493439l0 6.750656l1.687664 1.561676l3.312336 1.1233673l2.7506561 -0.9370117l1.687664 -1.7480316l0 -7.0629883l63.312336 .18634033l2.7506638 -0.31233215l2.123352 -0.93699646l1.1259918 -1.438324l0 -2.4356995l0.06298828 -5.2519684l1.0 -3.561676l1.4986877 -2.1259918l2.3123322 -2.561676l2.438324 -1.6246643l3.6876678 -1.5013275l4.0629883 -0.8740082l5.0 -0.561676l30.435684 -2.6876678l9.312347 -0.6246643l18.37532 0l3.9396362 .6246643l3.8740234 1.6246796l6.1259766 4.1863403l3.6850433 2.5643158l5.939636 3.4986725l7.561676 4.3123474l11.312332 5.438324l5.6876526 1.8110199l7.063019 1.1259766l4.936981 .12599182l3.7506714 0l2.0 -0.50131226l1.3753357 -1.4356995l0.561676 -2.0l0.24932861 -4.0629883l6.0629883 -48.18898l0.6876831 -5.874008l0.9370117 -3.8136597l1.6246643 -3.1863403l2.1259766 -2.0l3.9370117 -1.5616913l4.8740234 -0.50131226l7.438324 -0.37532043l3.3753052 .7506561l2.2493591 1.4986877l2.6876526 2.8136444l1.3753357 2.7506561l0.6876526 3.3753357l-0.06298828 2.8740082l0.81365967 3.6876678l1.9370117 3.438324l3.0 3.123352l5.0 3.0l5.2493286 1.438324l6.126007 .43832397l6.873993 -0.12599182l5.5013123 -0.7506561l4.687683 -1.6246796l4.060364 -2.0l2.7506409 -2.2493286l1.5013123 0l0 -1.0l3.3753357 -4.6246796l0.6850281 -3.6246643l0.06298828 -8.62468l0.7506714 -2.5013123l2.5013123 -2.8740082l2.0603638 -2.1259918l1.5013123 -2.3123322l1.7296753 .4645691l0 32.53543l-1.9186401 1.6876678l0 1.7506561l1.1259766 .6246643l-1.1259766 .7506561l0 3.6246796l1.8451233 1.8451385l48.782166 -2.7847748l15.249359 0l8.753265 -5.0551147l0.43307495 -0.881897l0 -1.3123322l-1.1863403 0l0 -1.8110199l-2.564331 0l0 -35.81366l37.81366 -3.81102l11.438324 -0.62729645l20.873993 -0.8110199l39.0 -0.43832397l68.0 0l0 6.312332l1.3753662 2.062996l3.312317 1.3753357l2.5013428 -1.0630035l1.4986572 -1.8740082l0 -7.876648l66.81366 0l0 6.876648l1.6246338 2.2493439l2.7480469 1.0l2.1259766 -0.75066376l1.8740234 -2.123352l0 -7.750656zm-430 28l2.0 2.3123322l2.6273193 1.8740082l2.6246643 .7506561l3.2493286 .12599182l0.0630188 1.3123322l1.3123169 1.6246796l2.123352 2.1259766l0.7506714 1.0603638l1.0629883 0l0.7506714 -0.49868774l0 -0.8766327l-0.6876831 -0.7480316l-1.3123169 -1.0629883l-1.1889954 -2.0630035l-0.18634033 -1.3123322l1.1863403 -1.1863556l1.3753357 -2.5643005l1.7506409 -3.0l1.9370117 -3.1863556l1.3123474 -3.1259766l0.9370117 -3.1233673l0.25195312 -2.3123322l7.3753357 0l0.27822876 1.0367432l2.0341187 0l0 -1.7873993l2.873993 .43569946l2.561676 .93963623l1.6246948 1.3123322l1.0 1.0l-0.6876831 .8110199l0.06298828 1.2519684l0.90026855 .51968384l0.9763794 1.4173279l0.12335205 3.4986877l-0.3123169 3.8136444l-1.123352 2.6246796l-1.3123474 1.0l-1.876648 1.8740082l-1.123352 1.1889801l0.12335205 1.4986877l0.7506714 .56430054l2.0629883 .7480316l-1.7506714 1.1259918l-5.0629883 1.9369965l-3.6876526 .7506561l-2.8110352 -0.06298828l-4.876648 .24934387l-5.873993 -0.31233215l-5.0629883 -0.9370117l-3.3123474 -1.7506561l-3.561676 -3.123352l-1.876648 -3.6246796l-0.74801636 -1.9396362l-0.3123474 -2.7480316zm65 -98l12.249329 0l2.438324 2.4383202l33.4357 0l2.658783 -2.65617l27.716522 0l0 9.845146l-4.873993 0l0 -2.375328l-4.3753357 0l0 2.1233597l0.12597656 .8136482l-4.750641 -0.18897629l0 -3.1233597l-5.126007 0l0 2.7506561l-4.123352 0l0 -2.6272964l-4.5013123 0l0 2.7506561l-5.0629883 0l0 -2.4986877l-4.3753357 0l0 2.2493439l-4.873993 0l0 -2.4383202l-4.4986877 0l0 2.624672l-4.876648 0l0 -2.687664l-4.123352 0l0 2.5013123l-4.564331 0l0 -2.687664l-4.7480164 0l0 2.7506561l-4.750641 0l0 -2.7506561l-4.438324 0l0 2.937008l0 .68766403l-4.3753357 0z");
							radiusDiv = 75;
							break;
						case 222: // Ship-23/AWS Minion Body 1
							path = new Path2D("m-70.18826 15.310836l0 -30.68504l2.6876678 -1.3149614l3.5616798 -1.4356956l3.7506561 -1.4383202l4.4356956 -1.7506561l3.9396324 -1.6246719l6.0603676 -2.0l4.0 -0.7506561l2.5013123 -0.43569565l1.6246719 -0.12598419l3.8136482 .18897629l5.0 .24934387l6.4356956 .18635178l6.375328 .37532806l7.687663 .062992096l7.750656 .37532806l7.43832 .62467194l7.5616794 .43832016l5.312337 .56167984l5.0 .81365013l5.937008 .62467l4.874016 .9370079l3.687664 .7506561l4.062992 1.0l5.1889763 1.4986877l3.8110237 1.1889782l3.624672 .93700695l5.0 1.9370079l4.8766365 2.2493439l2.5616837 1.2493439l2.0629883 1.1889763l2.375328 1.5616798l2.2493439 1.5013123l1.9370117 1.687664l3.7506561 4.0l-5.375328 5.937008l-2.6876678 1.8110237l-3.624672 1.9396324l-3.375328 1.7480316l-2.498684 1.3753281l-3.4383202 1.5013123l-2.375328 1.0l-2.8740158 .81102276l-3.0 .9370079l-4.375328 1.1889763l-2.937008 .68766403l-2.687664 .56167984l-2.687664 .62467194l-3.624672 .7506561l-4.125984 .7506561l-4.125984 .49868774l-3.375328 .43832016l-4.1233597 .68766403l-4.375329 .49868774l-3.687664 .37532806l-6.687664 .31233597l-7.937008 .31233597l-6.624672 .43832016l-7.438319 .18635178l-8.186352 .25196838l-5.125984 .062994l-5.874016 .43569374l-2.8766403 -0.062992096l-1.1863518 .062992096l-2.2493439 -0.49868774l-4.0 -1.1889763l-3.8136482 -1.1863518l-4.312336 -1.5013123l-3.7506561 -1.4986877l-3.8110237 -1.5616779l-3.6876678 -1.5013142z");
							radiusDiv = 30;
							break;
						case 223: // Ship-23/AWS Minion Body 2
							path = new Path2D("m-150.87172 -0.31737927l45.091873 -26.03412l46.22047 0l1.0629921 -0.09186363l-2.4986877 -2.1233597l-1.8766403 -2.375328l-2.3123398 -3.062992l-2.561676 -3.4383202l-2.624672 -4.7480316l-2.0 -3.8136482l-2.3123398 -5.249344l-1.8136444 -4.43832l-1.7506561 -5.874016l-1.1863556 -5.062992l-0.9370041 -5.813652l-0.43832397 -5.874016l-0.06298828 -4.8136444l0.25196838 -5.6850433l0.6850357 -6.0629883l1.2519684 -5.813652l1.3753281 -4.4383163l1.7480316 -4.9370117l1.5643082 -4.312332l2.0 -4.1233597l2.0603638 -3.5643082l2.18898 -3.7480316l2.8740158 -4.2519684l2.937008 -3.7480316l3.062992 -3.2519684l3.1889763 -3.2493439l4.375328 -3.7506561l4.4986877 -3.6876678l4.937008 -3.0603638l4.375328 -2.2519684l7.56168 -3.3753204l8.0 -2.5616913l3.8766403 -1.3123322l3.999999 -0.9370117l4.624672 -0.6876526l2.4383206 -0.24934387l2.5616798 -0.12599182l4.249344 -0.12597656l3.4383202 0l4.0 .25196838l3.4383197 .37532043l2.5616798 .37271118l7.312337 1.7506561l4.062992 1.2493439l4.4986877 1.7506561l4.2519684 1.7506561l3.7480316 1.8740082l4.750656 2.5643005l3.312336 2.060379l1.8136482 1.2519684l2.7480316 2.1863403l2.687664 2.18898l2.9396324 3.1233673l3.0603676 2.9369965l3.9396324 4.3123474l3.4986877 4.8766327l1.8740158 2.4356995l2.7506561 4.8136444l2.624672 5.375328l2.2519684 5.5616837l2.186348 6.1889725l1.1259842 5.624672l0.8740158 5.062996l0.37532806 4.312332l0.31233978 4.9370117l-0.06299591 5.0l-0.37532806 5.0l-0.561676 3.4383163l-1.2493439 8.000004l-1.6246719 5.624672l-2.1259842 5.56168l-2.624672 5.062992l-2.375328 4.4986877l-2.438324 3.8136482l-2.186348 3.1863518l-2.2493439 3.0l-2.062992 2.2519684l-2.0 2.0603676l46.498684 0l45.874023 26.485563l-45.745415 26.412075l-46.503933 0l5.2519684 6.041994l2.3726997 3.7480316l3.438324 5.813648l2.3123322 3.624672l2.438324 5.624672l1.6876602 4.937008l2.1863556 7.125984l0.8136444 4.186352l0.68766785 5.0l0.49868774 4.312332l0.18897247 3.3123398l-0.18897247 3.2519684l-0.24934387 4.435692l-0.37532806 5.939636l-1.0 4.7480316l-0.8740158 3.2519684l-2.18898 6.68766l-2.0603638 5.1863556l-3.2519684 6.624672l-2.0 3.8136444l-3.8740158 5.7480392l-3.375328 3.7506561l-3.2493439 3.5013123l-2.7506561 2.8740082l-4.062992 3.5013123l-5.249344 3.9370117l-5.56168 3.9370117l-4.750656 2.6876526l-4.813648 2.2493439l-3.375328 1.1259918l-4.624672 1.3753204l-4.56168 1.4356995l-3.624673 .7506561l-3.937008 .561676l-2.9999995 .3753357l-3.937008 .31233215l-4.43832 0l-4.8766403 -0.18635559l-5.8740163 -0.8766327l-4.186352 -0.561676l-6.1889753 -1.4986877l-3.4356956 -0.93963623l-7.5643044 -2.6246796l-4.56168 -2.4986877l-4.624672 -2.5013123l-4.5643044 -2.9369965l-6.3727036 -5.1863556l-5.1889763 -4.876648l-4.43832 -5.249344l-3.8110237 -5.0629883l-4.18898 -6.561676l-2.8740158 -6.31234l-2.8740158 -6.624672l-2.0 -7.249344l-1.5643005 -6.9396286l-0.49868774 -4.0603714l-0.24934387 -4.375328l-0.12598419 -4.1889725l0.31233215 -5.1233597l0.50131226 -4.750656l1.1233597 -6.5013123l1.1259842 -4.0603676l1.3123398 -4.2519684l1.3753281 -3.8110237l2.81102 -6.2519684l1.9396362 -4.0l2.6850357 -4.1233597l2.7506561 -3.7506561l2.813652 -3.7506561l2.2493439 -2.687664l1.8136482 -1.8740158l-47.564304 0z");
							radiusDiv = 65;
							break;
						case 224: // 3,3-diethyl-2,2-dimethylheptane
							path = new Path2D("m13.501312 -304.00067l-28.501312 0l-19.251968 19.24936l0 29.002625l19.375328 19.375336l0 68.12335l-18.937008 18.937012l0 28.813644l19.532808 19.532806l0 67.21785l-19.858267 19.860893l-67.61155 0l-19.80577 -19.805775l0 -67.055115l19.779526 -19.779526l0 -27.97113l-20.110237 -20.11023l-27.61155 0l-19.682419 19.67978l0 27.181107l19.181107 20.249344l0 67.49869l-19.624664 19.627296l-66.62468 0l-20.249344 -18.627296l-28.75064 0l-19.375336 19.375328l0 28.375328l19.687653 19.687664l27.438324 0l19.842514 -19.84252l68.157486 0l20.078735 20.078741l0 66.57742l-20.039368 20.039368l0 27.45932l19.45932 20.249344l28.249344 0l19.375328 -19.375336l0 -27.874008l-18.624672 -19.249344l-0.49868774 -67.750656l19.748032 -20.750656l67.0 0l19.87664 19.87664l0 68.12336l-19.186352 19.18898l0 27.81102l19.309711 20.0l0 67.750656l-19.372704 19.375336l0 28.125977l19.687664 19.687653l27.937008 0l19.343834 -19.343811l0 -27.845154l-19.047245 -19.047241l0 -68.45145l19.976376 -19.97638l0 -28.774277l-20.02362 -18.249344l0 -69.0l19.125984 -19.125984l67.874016 0l19.564308 19.56168l27.685036 0l20.094482 -20.091864l68.15486 0l19.999985 20.656168l27.251984 0l19.876648 -19.874016l68.87137 0l19.564331 19.564304l27.18634 0l19.97113 -19.968504l68.02887 0l19.388428 19.388453l27.362244 0l19.43042 -19.430447l0 -28.181103l-18.713928 -18.71391l-28.716492 0l-19.356964 19.356953l-67.14438 0l-19.821503 -19.821522l-29.178497 0l-19.338562 19.338583l-66.91077 0l-19.750671 -19.160105l-29.249329 0l-19.375336 19.375328l-66.87401 0l-19.937012 -19.937008l-29.062988 0l-19.656166 19.656168l-66.845146 0l-19.04462 -19.044619l0 -68.54855l19.398952 -19.396324l0 -28.104988l-20.102364 -19.249344l0 -68.249344l20.0 -20.0l0 -26.501312z");
							radiusDiv = 60;
							break;
						case 225: // Shotgun
							path = new Path2D("m114.0 -29.624672l75.186356 0l2.2519684 -1.6246719l2.4986877 -1.312336l2.8136444 -0.56430435l2.9370117 -0.31233597l17.312332 0l0 4.312336l43.624664 0l8.876648 -0.7480316l0.3123474 -1.687664l0.9370117 -1.1259842l1.8739929 -0.68766403l0 -8.56168l4.561676 0l0 9.062992l3.1889954 -0.12598419l3.561676 -0.7506561l3.312317 -1.2493439l2.6246948 -0.43832016l3.1889648 -0.060367584l2.1863403 .62467194l1.438324 1.4356956l1.6876831 1.9396324l45.624664 0l2.2493286 .24934387l1.5013428 1.0l2.435669 .62467194l317.25195 0l0 -8.125984l6.687683 0l-0.56427 8.251968l25.312317 0l0 23.372704l-3.8110352 0l0 14.312336l-73.188965 0l-9.18634 .12598419l-6.1259766 .12598419l-1.6246948 1.4986877l-2.3753052 .50131226l-8.498718 0l-2.0 -0.31233597l-1.1259766 -0.56430435l-1.7506714 -0.8740158l-2.5616455 -0.43832016l-18.498718 -0.37532806l-189.12598 0l0.18634033 4.1889763l-0.3123169 2.2493439l-1.123352 2.2493439l-1.3123474 1.9396324l-1.7506714 1.8110237l-1.561676 1.0l-1.7506409 .50131226l-2.2493591 0l-2.0629883 -0.31233597l-1.6246643 -0.68766403l-15.0 0l-7.438324 .68766403l-8.708649 2.333334l-9.165375 0l-14.125977 -0.7716541l-20.937012 0l-14.312317 -0.43832016l-5.438324 1.0l-4.624695 1.2493439l-3.1259766 .12598419l-2.8110046 -0.8740158l-1.7506714 -1.8766403l-1.0629883 -2.8110237l-0.561676 -3.624672l-44.18898 .18635178l-1.5616913 .50131226l-0.6246643 1.6246719l-1.1863556 .8110237l-2.4383087 0l-3.0630035 .56430435l-2.1259766 1.3727036l-2.81102 .8136482l-2.6246796 .24934387l-7.687668 .8766403l-15.062988 .7480316l-7.874008 1.0l-6.5013275 .43832016l-3.0 .68766403l-2.0629883 .8740158l-1.2493439 2.2519684l-0.49868774 3.312336l-0.31233215 6.249344l-1.3753204 5.4986877l-3.7506561 3.7506561l-4.18898 2.8766403l-4.249344 1.4356956l-6.249344 1.9370079l-5.5616837 .43832016l-5.68766 0l-4.062996 -0.8110237l-3.8740158 -1.3149605l-2.6272964 -2.1863518l-2.1233597 -3.2493439l-2.3123322 -3.937008l-2.5643082 -3.7506561l-2.186348 -2.312336l-1.5013199 -0.8766403l-2.0603638 -0.62467194l-1.813652 .18897629l-4.312332 1.6246719l-309.87402 105.93701l-1.876648 .31233215l-1.1863556 -0.43832397l-0.8766327 -1.123352l-0.12336731 -1.3753204l0.3753357 -3.18898l4.0629883 -19.186356l1.8110199 -11.937004l0.50131226 -6.062996l0.06036377 -5.813652l-0.06036377 -5.435692l-0.43830872 -2.813652l-1.0630035 -7.186348l-1.438324 -5.68766l-2.2493439 -10.18898l-2.2493286 -6.56168l-2.6246796 -7.312336l-2.6876678 -6.062992l-0.31233215 -1.8110237l0.68766785 -1.8136482l2.1863403 -1.1259842l3.6246796 -1.312336l6.3753204 -0.68766403l193.31235 -25.12336l3.8766403 1.6246719l3.0 2.1863518l2.3727036 1.9396324l3.3149605 2.1863518l3.4986877 1.5013123l2.937008 .9370079l3.624672 .37532806l3.062992 0l2.5013123 -0.50131226l4.0603676 -1.0l10.501312 -3.1259842l9.125984 -3.3727036l52.249348 -18.87664l1.4986801 -2.937008l2.18898 -2.4986877l4.062996 -3.8136482l4.186348 -3.0l4.561676 -2.4383202l1.3753281 -1.1863518l0.12599182 -1.312336l-1.438324 -1.6246719l-2.438324 -2.1889763l-1.186348 -2.4986877l-0.9370041 -2.624672l-1.5013199 -1.1889763l-2.123352 -1.312336l-1.1259918 -1.5616798l0.5013199 -1.4383202l1.6246719 -0.62467194l2.748024 .062992096l1.3753281 1.3753281l2.50132 2.8110237l2.4383163 2.937008l2.4356918 1.6272964l2.6876678 2.0l1.9370041 1.6850395l-0.31233215 1.5013123l0.12598419 1.2493439l1.1259842 .18897629zm3 62l-0.7480469 -1.3726959l-1.6246643 -0.1889801l-1.438324 .561676l-1.6246643 1.3149643l-1.5643005 2.4986877l-0.49868774 1.3123322l-0.3123474 2.438324l0.24935913 1.8740158l0.43832397 2.2493439l0.75064087 2.2519684l1.4356995 2.3123398l2.5013123 1.6876602l3.9370117 1.3753281l3.7506409 .43569183l5.0 -0.06298828l4.8740234 -0.7480316l4.5013123 -1.5643082l4.6246643 -2.186348l3.3123474 -2.6876602l2.0 -3.813652l0.43569946 -3.7480316l-0.3123474 -2.813652l-0.87402344 -2.6246643l-1.3753052 -2.3753357l-2.3123474 -1.6246643l-2.3123474 -0.81365204l-2.561676 -0.49868774l-2.5013123 0l-3.312317 .12598419l-1.7506714 .56168365l-2.123352 1.7506561l-2.6246643 1.748024l-2.3123474 2.375328l-1.5013123 3.375328l-0.43832397 2.624672l0.6246643 3.438324l1.8136597 2.561676l1.438324 1.438324l1.9370117 2.3123398l-1.8136597 -0.12599182l-2.4356995 -1.561676l-1.6876526 -1.0l-1.1889954 -1.8740158l-1.123352 -1.1889801l-0.87664795 -2.561676l-0.561676 -3.0z");
							radiusDiv = 70;
							break;
						case 226: // Grenade (may need some fixes)
							path = new Path2D("m-17.874016 -306.0l24.0 .12597656l13.498688 .87402344l20.624672 1.2493286l17.251968 .87664795l19.249344 1.6246948l17.12336 2.123352l15.251968 2.3753052l8.249344 .6246948l4.0 2.0l5.624672 4.5013123l4.5013123 4.6246643l4.0 5.5013123l2.0 3.3727112l15.0 28.125977l4.4986877 9.624664l9.624664 20.876648l8.249344 19.62468l9.125992 23.748016l14.249344 40.627304l9.251968 28.0l13.62468 42.874016l12.37532 45.874016l7.372696 29.87664l5.5013275 23.748032l4.750656 22.750656l5.7480316 28.501312l7.251953 36.498688l4.123352 25.125984l3.7506714 27.62468l1.2493286 12.37532l0 10.498688l-0.8739929 6.2519684l-2.0 8.498688l-2.2493591 8.0l-2.876648 5.0l-2.6246643 3.7506561l-4.873993 4.4986877l-4.5013275 1.5013123l-4.6246796 .24934387l-4.0 -0.6246643l-2.4986725 -1.8740234l-2.6246796 -6.2519684l-3.0 -8.62468l-1.5013123 -7.3753204l-0.8740082 -10.748032l-2.1259918 -17.0l-2.4986877 -18.125977l-3.627304 -25.0l-4.6246643 -26.50132l-4.123352 -23.498688l-6.3753357 -31.125984l-4.6246643 -21.0l-6.3753357 -29.0l-13.624664 -53.12336l-11.251984 -40.0l-9.624664 -28.501312l-8.62468 -24.249336l-6.4986725 -16.375336l-7.6246796 -16.874008l-6.3753204 -12.750656l-3.876648 -7.6246796l-1.123352 -1.2493439l-2.3753357 -1.6273041l-16.375328 -1.2493439l-6.249344 -0.37532043l1.0 6.125992l1.2493439 7.6246643l-0.24934387 7.750656l-0.50131226 10.0l-2.375328 10.249344l-3.4986877 8.624664l-5.375328 8.876648l-4.624672 5.624672l-5.750656 7.0l-3.7506561 3.624672l-1.2493439 2.4986877l0.8740158 4.624672l2.6272964 1.0l6.624672 1.7506561l6.4986877 2.5013123l5.624672 2.375328l3.1259842 1.4986877l8.125984 7.624672l6.874016 7.8766403l6.624672 8.748032l7.125992 11.501312l7.4986725 13.0l6.0 12.874016l4.876648 10.750656l3.0 8.249344l2.4986877 10.249344l0.6246643 5.5013123l-0.37532043 5.249344l-1.6246796 5.125984l-2.3753204 3.624672l-2.6246796 2.2493439l-0.24932861 4.8766403l2.8740082 5.3727036l4.125992 3.2519684l7.874008 3.7480316l7.5013123 4.750656l4.249344 4.0l4.125992 8.125984l1.7480164 10.0l2.876648 19.375328l1.2493439 15.748032l0.7506561 18.750656l-0.87664795 13.87664l-1.4986725 9.249344l-1.7506714 5.6246796l-2.7506561 3.3753204l-4.7480164 2.8740082l-4.876648 1.7506714l-5.0 1.6246643l-3.3753357 1.5013123l-1.4986725 2.372696l0.12597656 2.7506561l3.0 3.876648l4.0 1.4986877l6.0 5.874008l2.6246796 5.750656l1.2493439 7.125992l-0.5013275 9.62468l-2.2493439 11.4986725l-3.4986725 11.125992l-3.876648 10.0l-5.4986877 12.624664l-6.125992 10.375336l-5.4986725 8.249344l-4.3753357 5.5013275l-4.0 3.2493286l-6.3753204 3.3753357l-8.62468 2.3753357l-8.87664 1.7506409l-6.0 1.4986877l-2.1233597 3.3753357l-0.12598419 4.6246643l3.0 3.8740234l3.7506561 5.627289l1.0 5.123352l-1.1259842 9.501312l-3.0 7.4986877l-7.7480316 12.126007l-7.125984 7.6246643l-7.874016 8.375336l-7.6272964 6.873993l-9.624672 8.624664l-9.249344 6.876648l-10.750656 6.624695l-8.249344 3.7506409l-7.4986877 1.6246643l-7.125984 .24935913l-4.750656 -1.0l-3.4986877 -2.5013123l-1.7506561 -2.6246948l-9.624672 6.876648l-7.249344 4.249359l-7.125984 1.7506409l-7.5013123 .12335205l-6.624672 -1.123352l-6.375328 -2.5013123l-5.0 -3.873993l-3.1233597 -4.0l-1.8766403 -2.7506714l-2.8740158 2.5013123l-2.2493439 3.2493591l-3.2493439 3.873993l-4.6272964 3.3753357l-5.0 2.6246643l-4.249344 1.5013123l-5.0 .12335205l-8.0 -0.49865723l-7.750656 -0.6246948l-8.249344 -0.6246643l-4.0 -1.0l-4.0 -1.7506409l-5.0 -4.7506714l-4.375328 -4.6246643l-1.8740158 2.7506409l-2.2493439 3.0l-3.0 2.0l-2.8766403 1.6246948l-3.2493439 .75064087l-7.0 -0.12597656l-7.874016 -0.7506714l-6.9999924 -1.123352l-5.750656 -1.3753357l-6.0 -3.0l-8.125992 -5.1259766l-7.4986877 -5.3753357l-17.624664 -13.873993l-14.0 -12.375336l-12.5013275 -12.750671l-4.0 -5.6246643l-3.4986725 -7.4986877l-1.3753357 -5.0l-0.6246643 -8.251984l1.123352 -5.7480164l2.2519684 -6.1259766l0.37269592 -6.3753357l-1.4986725 -3.3753357l-4.3753357 -1.4986877l-11.125992 -3.0l-5.0 -1.6246643l-5.874008 -2.876648l-4.249344 -1.8739929l-4.6246643 -5.501343l-9.125992 -10.624664l-3.6246643 -6.750656l-5.249359 -10.249344l-5.876648 -15.4986725l-6.123352 -19.0l-3.2519531 -13.5013275l-0.12335205 -7.874008l0.8739929 -4.876648l3.126007 -4.874008l4.873993 -5.125992l4.876648 -2.7480164l1.6246643 -2.7506561l-0.87664795 -3.1259918l-3.123352 -1.3753357l-7.750641 -2.4986725l-3.6246643 -2.6246796l-3.126007 -2.7506561l-2.7506409 -4.4986877l-1.8740234 -6.3753204l-1.4986877 -9.750664l-0.25198364 -6.874016l0.12600708 -6.8766403l1.1259766 -8.498688l1.0 -12.375328l2.2493591 -16.624672l2.0 -11.375328l1.8739929 -7.249344l4.0 -8.750656l4.6246643 -7.249344l7.2519836 -5.375328l8.372711 -3.8766403l7.627289 -2.624672l3.6246796 -3.0l0.8740082 -4.0l-2.0 -3.8740158l-5.125992 -5.375328l-3.2493439 -4.874016l-3.0 -3.6272964l-2.2493286 -5.1233597l-0.12600708 -8.87664l2.2519836 -6.3727036l4.123352 -8.750656l6.5013275 -11.750656l8.123352 -14.375328l9.251968 -13.12336l10.498688 -12.87664l8.874008 -8.750656l9.627304 -7.3727036l11.249344 -7.0l14.375336 -6.125984l2.8740082 -25.50132l1.7506561 -9.123352l2.123352 -6.5013123l4.3753357 -7.249344l24.125992 -24.624664l3.0 -4.8740234l1.0 -9.251968l-6.6246796 -6.3753357l-4.876648 -5.6246643l-4.372696 -7.874008l-2.3753204 -6.7506714l-0.5013275 -10.37532l0.5013275 -15.874008l1.123352 -8.624664l3.3753204 -7.7506714l4.0 -6.3753357l6.876648 -6.750641l9.372696 -5.8740234l8.750664 -3.2493286l12.249344 -3.0l27.251968 -4.501343l18.874016 -3.2493286l21.750656 -2.4986877z");
							radiusDiv = 150;
							break;
						case 227: // RPG/Rocket Launcher
							path = new Path2D("m385 -40l4.7506714 0l7.7506714 -14.56168l16.060364 5.8110237l-0.06036377 -0.6876602l10.18634 0l0 3.1889725l5.624695 0l80.06299 -12.687664l22.624634 0l71.37537 18.87402l22.873962 0l2.6903076 2.6902847l12.9973755 0l0 15.622047l-13.0 0l-2.4382935 2.438324l-22.561707 0l-71.74805 17.750656l-22.251953 0l-80.31232 -12.438324l-6.624695 0l0 2.8740158l-8.062988 0l0 -1.0l-16.811035 6.624672l-7.1259766 -13.561676l-6.4382935 0l0 5.125984l-55.874023 0l-22.18634 -1.5643082l0 25.314964l-0.93963623 3.2493439l-2.5617065 2.81102l-4.123352 3.2519684l-6.5012817 2.0l-6.9370117 1.6246796l-6.249359 1.123352l-3.7506714 .06298828l0 2.5616913l-1.8136292 0l0 40.93962l-1.7349243 3.0078735l-22.826752 0l-1.6404419 -2.8398895l0 -8.855637l3.454071 -30.81366l-0.50131226 -2.0l-2.561676 -3.2493439l-2.0629883 -1.4383087l-3.8136597 -0.3123474l-3.4356995 -0.49868774l-0.81362915 -1.3123322l1.0 -2.1259766l2.8136292 -0.87402344l2.9370117 -1.3123322l1.6876831 -2.438324l0.561676 -2.8136444l-1.6876831 -2.2493439l-2.9369812 -2.2493439l-2.9370117 -0.68766785l-3.0 0l0 -4.0629883l4.0 0l2.6876526 -1.5616837l0 -2.937004l-7.188965 0l0 -9.750656l-2.0629883 0l-9.874023 5.68766l-41.24936 0l0 2.8110275l6.9370117 0l0 3.937004l-6.3753357 8.750656l-1.4986877 45.56431l-2.225708 3.8556366l-20.713898 0l-2.4356995 -3.4199371l-1.3123474 -46.123367l-6.6876526 -7.8766403l0 -5.0l8.687653 0l0 -3.186348l-9.251953 0l-6.4356995 2.6876602l-105.06299 0l-45.000015 -7.8766403l-98.50131 0l0 -1.3753281l-6.937004 0l-84.4357 10.375328l-1.1259842 1.5013123l-0.7506561 4.1863556l-1.1863518 3.937004l-0.37532806 3.438324l-6.687664 0l-0.68766403 -2.5616837l-1.0 -5.312332l-1.5616779 -5.813652l-0.56430626 -3.3123322l0 -43.062996l0.62729836 -5.0603676l1.4356937 -5.125984l1.8766422 -4.5013123l1.5616779 -1.687664l4.8110237 0l2.4383202 11.813648l86.249344 11.813648l5.8766403 0l0 -1.8766403l89.12336 0l0 -3.186348l1.9081268 -1.9055176l3.5301971 0l1.9212494 1.9212646l0 3.6719131l45.89238 -7.8766403l99.56171 0l0 -3.1863518l6.1259766 0l0 2.5616798l8.299194 2.2230988l21.76117 0l0 -8.784779l3.0944824 -3.0944862l1.217865 0l0 -1.6561699l-1.656189 -1.6561661l0 -17.65617l2.469818 0l0 -8.750656l2.6246643 0l0 26.501312l-1.4986877 1.4383202l0 1.7480316l35.561707 0l3.4986877 3.1259842l0 9.811024l8.438293 0l11.063019 5.0l100.06296 0l-2.1889648 -1.9370041l0 -10.435699l4.091858 -2.3622055l26.595825 0l0 -23.577427l4.312317 0l0 2.8766403l-2.0 0l0.4593506 1.7112885l4.4172974 3.2257195l0 16.375328l3.687683 1.687664l0 10.249348l-1.322876 2.2887115l11.010498 0zm-110 52l-1.2493591 1.2493439l1.0 1.561676l0.06298828 4.0l2.6246643 1.1259766l5.123352 -0.18896484l4.8136597 -1.4986877l5.4987183 -1.9370117l4.0 -2.9370117l2.5012817 -4.0l0.56170654 -4.1889725l0.18896484 -7.750656l-0.56433105 -2.1863556l-1.4986572 -1.6876602l-2.0629883 -1.1863556l-2.8740234 -0.43831635l-3.564331 .8110199l-1.9369507 1.6876678l-1.3123779 1.1259842l-4.687622 0l-0.87402344 1.1259842l-1.5617065 3.0l-1.0629883 3.7480316l-0.06298828 3.2519684l0.6876831 2.624672l1.0 2.6246643l2.4382935 2.0l0 1.4986877l-1.1889648 -0.12335205l-1.5617065 -1.6876678l-1.876648 -1.0629883zm68 -65l0 3.6876678l20.687622 0l0 -3.813652z");
							radiusDiv = 70;
							break;
						case 228: // Mare's Leg Rifle
							path = new Path2D("m-20 35l34.750656 -1.3727036l10.56168 .37270355l2.8136482 .68766403l3.5616798 2.3753242l5.43832 3.438324l7.561676 3.3123398l6.0 1.561676l5.7506638 0l5.2414627 -1.4041977l16.509193 -5.7821503l22.249336 -7.75066l16.750656 -6.375328l17.937012 -5.186352l2.7506561 -4.624672l6.6246796 -6.375328l6.123352 -3.0l1.5013123 -1.8766403l-0.24934387 -2.3727036l-2.5013123 -1.5013123l-2.7506561 -1.0l-3.7480316 -1.6246719l-0.7506561 -1.6246719l0.3753357 -2.0l2.123352 -1.7506561l2.6246643 -0.12598419l1.7506561 .8766403l2.6246796 2.375328l3.6246643 1.2493439l4.125992 .62467194l2.7506561 -1.1259842l2.3753357 -2.4986877l4.3753204 -2.2493439l11.62468 -0.37532806l15.624664 -0.12598419l5.874008 0l2.3753357 2.5013123l3.0 -3.0l42.125977 .7480316l2.0 -1.8740158l24.624695 0l1.4986572 4.5013123l19.126007 0l1.6246643 -1.6272964l2.5013123 .12598419l0.561676 2.5013123l1.123352 -3.062992l0 -0.9370079l-1.7480164 0l0 -6.5013123l2.8740234 0l0 -5.0l4.561676 0l0 9.813648l-1.0367432 3.8635178l10.976379 0l0 -1.8635178l4.561676 0l0 -1.8136482l4.561676 0l0 -1.4986877l6.188965 0l2.1706238 3.7585297l21.078735 0l1.6404114 .94750786l6.7979126 0l1.4094238 -0.8136482l10.464569 0l5.9501343 3.4356956l5.1128845 0l0.24932861 -1.5170612l0.7506714 -1.2493439l1.4986572 -0.50131226l12.687683 0l0.6876526 .31233597l0.561676 .7506561l0.31497192 1.0l148.68503 0l0 -5.43832l-1.123352 0l0 -1.312336l17.687683 0l0 7.062992l14.498657 0l0 19.062992l-1.8635254 3.2283478l-10.073486 0l0 1.645668l3.1890259 0l0 13.312336l-1.5197144 2.63517l-23.543335 0l0 2.052494l-2.9369507 0l0 -2.2493439l-27.687683 0l0 1.6246719l-12.687683 0l0 -1.687664l-23.375305 -1.312336l-38.81366 0l0 2.0l-13.0 0l0 4.564308l-24.0 0l0 2.8740158l-16.18634 0l0 1.3753281l-13.063019 .6876602l-16.438324 .7506561l-30.0 1.0l-12.435669 0l-41.56433 0l-1.3753052 -3.0629883l-44.24936 0l-3.9370117 1.123352l-2.438324 2.18898l0.25198364 1.561676l-0.12597656 1.438324l-1.4356995 1.438324l-3.438324 4.937004l-2.3753204 2.5616837l-1.9396362 2.0l-1.2493439 3.6876602l-0.12336731 5.937004l-0.7506561 3.624672l-2.0629883 2.6876678l-3.561676 4.624672l-4.9370117 3.438324l-5.0 2.375328l-5.3753204 1.561676l-7.125992 .81365204l-6.8136444 -0.56430817l-5.060364 -1.0603638l-4.687668 -0.56430817l-3.8136597 .56430817l-2.6876526 1.3726959l-2.8740234 3.5643082l-2.438324 6.249344l-3.3753204 9.062988l-4.0629883 7.438324l-3.0603638 4.123352l-7.2519836 5.7506714l-7.4986725 2.3123322l-5.8740234 .561676l-8.750656 .6246643l-9.937012 -0.74801636l-8.813644 -1.6246796l-8.062996 -1.9396362l-6.624672 -2.8740082l-3.0 -2.8136597l-3.0 -3.6876526l-3.1259842 -5.060364l-1.4356918 -4.125992l-0.6876602 -4.438324l0.4986801 -6.186348l3.062996 -5.438324l5.68766 -4.68766l65.0 -23.062996l2.3753357 -2.186348l-2.8740234 -0.43832397l-126.93963 47.18898l-23.060368 8.62468l-4.8766403 1.4986725l-3.8740158 -0.18634033l-2.312336 -1.3123322l-2.2493439 -3.1259918l-2.0 -7.123352l-0.8136482 -10.750664l-0.062992096 -5.624672l-0.31233597 -11.564308l-1.2493439 -5.49868l-1.4383202 -4.9370117l-2.8110237 -8.68766l-1.5013123 -8.750664l-0.062992096 -5.125984l0.43832016 -4.49868l2.2493439 -2.3753357zm184 20l-3.4986877 1.8740158l1.8740082 6.874016l3.6246796 8.0l4.2519684 5.2519684l7.0 4.3727036l5.6246796 .62729645l10.123352 .24934387l7.876648 -1.7506561l4.0 -1.7506561l3.6246643 -3.375328l2.7506561 -6.0l0.37269592 -2.7480316l-0.8740082 -4.375328l-2.1259918 -4.249344l-3.0 -3.6272964l-3.6246643 -3.0l-4.7480316 -1.7480316l-8.750656 1.4986877l-4.125992 -0.7506561l-2.2493286 1.7506561l-3.2493439 0l0.12335205 -2.1233597l-2.7480316 1.0l-0.12597656 3.4986877l0.4986725 5.0l1.876648 4.624672l3.3753357 3.624672l3.6246643 2.624672l2.3753357 .62729645l0.8740082 2.3727036l-0.8740082 2.2519684l-2.1259918 .12335968l-2.0 -1.0l-3.6246643 -1.6246719l-3.7506714 -4.0l-2.4986725 -2.7506561l-1.6246796 -3.4986877l0 -2.8740158l-4.3753204 -0.12598419l-2.3753357 -1.2493439l-0.6246643 -1.5013123zm-20 13l-1.123352 .62467194l-17.876648 6.125984l-22.624664 7.4986877l-11.874016 4.2519684l-5.375328 3.0l-3.375328 4.874016l-1.0 3.624672l0 6.2493362l2.0 4.627304l4.249344 4.7480316l4.125984 3.3753204l7.125992 2.3753357l9.0 1.8740082l7.7480164 1.1259918l8.5013275 .24934387l9.624664 0l6.125992 -1.123352l7.249344 -4.125992l4.4986725 -5.750656l2.2519836 -6.6246796l3.3753204 -7.3753204l2.123352 -5.7480316l2.3753357 -6.0l1.1259918 -4.2519684l-0.7506561 -4.375328l-2.3753357 -3.1233597l-2.3753357 -3.0l-5.4986725 -1.8766403l-4.125992 -0.62467194z");
							radiusDiv = 65;
							break;
						case 229: // Magnum Rifle
							path = new Path2D("m200 45l48.99997 -5.81102l5.0629883 0l0 -1.1889801l3.758545 -1.0078735l9.803162 0l1.4330444 -0.8267746l6.1916504 0l4.876587 -6.1023636l0.9370117 -0.561676l2.0629883 -0.43832397l8.561707 0l0 -18.68766l-0.9370117 -0.9370041l-15.375305 0l-20.81366 11.125984l-14.123352 0l-0.8451538 -0.8451462l-17.779541 0l0 -1.5931778l-59.251953 1.3753281l-1.561676 -0.31233215l-1.1863708 -1.1259918l-1.3123169 -0.7506561l-1.6273193 -0.37532806l-5.1863403 -1.0l-1.7506714 -0.6850357l-1.0 -1.3753281l-0.37530518 -0.93963623l-0.37271118 -2.4356918l-0.18896484 -2.438324l-0.43832397 -5.6246643l-0.6246948 -8.687668l0 -5.750656l0.18899536 -8.435696l0.49868774 -5.813648l0.56430054 -3.1259842l0.6850281 -1.312336l1.1260071 -1.2493439l2.5013123 -0.9370079l6.2493286 -1.5013123l0.9370117 -1.0l1.6246643 -0.68766403l58.126007 -0.49868774l2.435669 -2.5616798l17.062988 0l1.1889954 -1.1889763l13.811005 0l21.438354 10.624672l15.312317 0l0 -3.8740158l20.624695 0l0 3.8136482l40.8136 0l4.123413 -3.3149605l-0.24938965 -12.56168l-1.3753052 -1.5616798l-0.43566895 -0.8766403l0 -3.4356956l0.37268066 -1.0l0.93963623 -1.1889763l2.123352 -0.9370079l3.876648 -1.1233597l4.123352 -0.7506561l3.876648 -0.37532806l4.2493286 0l3.0 .24934387l4.2493286 .50131226l3.2493896 .7480316l2.876587 1.0l1.1864014 1.0l0.43829346 1.2519684l0 4.249344l-0.24932861 1.0629921l-0.87664795 1.2493439l-0.24932861 12.186352l3.6246338 2.687664l65.0 -0.7480316l1.9055176 -3.301838l18.15747 0l1.9527588 3.380577l71.04724 -1.3910751l1.6246948 1.8740158l0.7506714 2.375328l0.9370117 4.4356956l0.43829346 5.9396324l-0.12597656 7.4356956l-0.18634033 7.5643044l-0.25195312 2.6876678l-0.56170654 2.8740158l-0.6876831 2.0629883l-1.0 1.4356918l-71.06299 1.1889801l0 18.375328l6.0629883 0l3.6115723 2.083992l5.6378174 0l0.81359863 .8530197l0.6246948 1.186348l0.43829346 1.3753281l39.624695 0l6.4987183 .56430817l9.501282 1.0l9.624695 0l11.624634 1.6876602l43.189026 0l3.312317 -0.8136444l2.0603638 -1.0629959l1.56427 -1.186348l1.4987183 -1.1259918l4.312317 0l-1.2808228 -1.280838l0 -1.2178421l6.343811 -11.50132l6.501343 1.0l0 8.062996l2.0603638 -1.6876602l3.2519531 -2.0l3.4987183 -1.2493439l2.1259766 -0.37532806l1.2493286 .6876602l2.2493286 0l1.0 .561676l0.56433105 1.0629959l0 2.81102l2.1863403 -1.6246719l2.5617065 -1.3123322l2.8135986 -1.3123398l2.4383545 -0.7506561l2.312317 -0.18634796l1.3123169 .8740158l2.5617065 0l1.5617065 .62729645l0.8765869 1.3727036l0 6.68766l2.015747 1.162735l7.5459595 0l4.5459595 4.545929l511.70343 -3.582672l0 -1.6246719l5.687622 -1.876648l5.624634 -1.561676l5.624756 -1.561676l2.8135986 -0.37532806l0 -2.6876678l-1.1864014 -2.6876678l-1.3122559 -3.7506561l-1.1259766 -3.937004l-0.12597656 -2.6876678l0.25195312 -2.7506561l0.87402344 -1.4986801l1.5616455 -1.0629959l1.1259766 -0.31233978l3.4383545 -0.06298828l2.4986572 .6876602l1.4383545 .75066376l1.7480469 1.1259842l14.627197 0l1.8110352 -0.6273041l2.4383545 -0.62467194l2.687622 -0.24934387l5.7507324 0l1.6246338 .56168365l1.6246338 1.0l1.7507324 1.7506561l1.8110352 2.6876602l1.1889648 2.5616837l0.81103516 2.375328l0 8.18898l2.1259766 2.1259842l0 3.2493439l1.112793 .6430435l0 2.3569565l1.7612305 .8110199l1.5012207 2.3123322l1.1234131 2.7506638l0.24938965 3.186348l0.12597656 3.1259842l-0.5617676 3.2493439l-1.3752441 2.5013123l-1.9370117 2.186348l-2.1259766 1.1259918l-2.9370117 .561676l-27.125977 0l-1.4987793 -0.561676l1.3753662 -0.62467194l1.3753662 0l0 -1.251976l-3.3149414 0l-0.36486816 1.3622055l-405.63513 7.3884583l0.81359863 2.9369965l0.5013428 3.627304l0.24926758 4.4356995l-0.6246338 5.0629883l-2.0629883 4.8136444l-1.3123779 1.6246796l-2.8135986 2.6246643l-3.7506104 2.3123474l-4.435791 1.561676l-6.0 .7506561l-5.8135986 .561676l-36.561646 3.3753204l0 7.9370117l-0.87402344 1.5643158l-2.1259766 1.3123322l-2.4383545 .49868774l-2.3753662 -0.49868774l-1.4986572 -0.9370117l-0.81365967 -1.1259766l0 -7.8136597l-263.18634 20.939636l-12.0 .9370117l-15.876648 1.6876678l-14.874023 2.0l-14.125977 1.8740082l-1.8740234 .68766785l-3.5616455 2.0629883l-2.4383545 1.3753357l-2.687622 1.9369965l-3.8740234 1.4986877l-4.0629883 .81365967l-5.312378 .6246643l-8.375305 .8136444l-12.498657 1.0603638l-13.126038 .7506561l-45.75061 4.5013275l-10.375366 1.3123322l-5.811035 .37532043l-5.0629883 .06036377l-4.188965 -0.31233215l-3.8110352 -0.24934387l-4.5616455 -0.24934387l-2.312317 2.0630035l-1.8136597 1.0603638l-1.6246948 -0.18635559l-1.5012817 -0.8740082l-1.2493896 -0.5643158l-1.4382935 0l-0.6876831 .5643158l-0.37268066 1.7480164l0.06036377 3.9396362l-0.12335205 5.4356995l-1.1889648 5.18898l-1.43573 3.81102l-1.876648 3.3123322l-2.7479858 3.876648l-4.3150024 3.9370117l-4.748047 2.3753204l-3.6246338 1.6876678l-3.9396362 .68766785l-5.624695 .18634033l-9.0 -0.06298828l-5.7480164 -0.43569946l-5.5013123 -0.8136444l-5.4986877 -1.1259918l-4.188965 -1.4356842l-4.3123474 -2.1259918l-2.6246643 -1.6246643l-2.9370117 -2.5013123l-2.2519836 -3.0l-1.3123169 -2.4986877l-0.6876831 -2.6876678l-0.49868774 -2.8136444l-0.12597656 -4.249344l-0.49868774 -3.4356995l-1.1259766 -3.6876678l-2.0 -3.1259766l-3.0629883 -2.7506561l-2.9370117 -1.8740234l-2.8110352 -1.3753204l-3.2519531 -0.561676l-2.687683 -0.12599182l-3.6246643 .50131226l-19.123352 6.6850433l-8.876648 3.3149567l-4.1863403 2.1863556l-7.5013123 4.438324l-4.4356995 3.1863403l-5.438324 3.6876678l-4.8740234 4.438324l-4.5643005 4.687668l-3.8110046 4.249344l-4.1889954 5.2493286l-4.3123474 6.3753357l-3.2493286 5.438324l-2.4986877 3.9370117l-1.7506409 2.9370117l-1.3123474 1.5013123l-2.3753357 1.4986877l-2.1889648 .12597656l-3.2493591 .06298828l-3.3753357 -0.6272888l-5.0 -1.0l-9.624664 -1.1863708l-9.375336 -1.561676l-10.0 -2.0l-10.123352 -2.6246643l-7.6876526 -2.438324l-2.1259766 -1.0629883l-1.3123474 -1.3753357l-0.9370117 -1.9369965l-1.0 -1.3123322l-1.561676 -0.7506714l-2.0629883 -0.31233215l-2.3753357 .43832397l-38.501312 14.063004l-42.687668 15.312317l-41.87401 15.312347l-32.687668 11.624664l2.7506561 6.687683l0.24934387 2.6246643l-1.561676 2.1259766l-2.3123322 1.6850281l-3.18898 .62731934l-2.1863556 -0.12600708l-1.561676 -1.0629883l-1.2519684 -1.561676l-0.9370117 -2.2493286l-1.3123322 -2.876648l-0.6246643 -1.7506714l-42.687668 15.687683l-39.561684 13.501312l-16.125984 5.1259766l-4.312336 1.0l-2.312336 .12335205l-2.1259842 -0.6876526l-1.4356956 -2.0629883l-0.8766403 -3.7480469l-1.4356956 -6.6876526l-1.5013123 -9.251984l-0.7506561 -8.624664l-1.7480316 -16.624664l-0.8766403 -8.435699l-0.9370079 -10.939636l-0.56167984 -8.561676l-0.8766403 -9.125977l-0.68766403 -8.123367l-0.62467194 -8.813644l-1.312336 -14.561676l-0.8110237 -12.18898l-1.2519684 -15.372711l-0.9370079 -10.564301l-0.31233597 -9.062988l0.062992096 -5.8740234l0.37532806 -4.81102l0.8740158 -3.438324l1.2493439 -3.0l1.7506561 -1.6876526l3.0 -1.1259918l3.687664 -0.8740082l5.874016 -0.3123474l42.12598 -1.2493439l22.062996 -1.4383087l21.937004 0l33.93701 -3.2493439l139.99998 -8.125992l33.0 -1.0l12.0 -0.24934387l5.438324 .18635559l5.126007 1.0629883l3.561676 1.5013123l3.561676 2.372696l3.438324 2.7506561l4.1259766 3.0l4.1863403 2.3123474l4.063019 1.5013123l5.2493286 1.2493439l4.5013123 .18634033l9.874023 0l4.438324 -0.18634033l4.6876526 -0.87402344l4.7480164 -1.6876526l8.750671 -3.18898l28.249329 -10.81102l15.188995 -5.0630035l16.199463 -4.341202l0 -1.8477783l-5.3254395 0l-1.1260071 -1.561676l-0.74801636 -2.3123322l-0.18899536 -2.8740082l0 -2.3753357l0.18899536 -1.9370041l1.3123474 0l0 -3.3123398l-1.5013428 0l0 -2.18898l0.3123474 -1.6876602l1.0 -1.438324zm41 88l-10.750671 .31233215l-2.4986877 .6273041l-2.6876526 1.1863556l-2.3753357 2.0l-2.3123474 2.3753204l-1.5013123 2.7506561l-1.3123169 3.1233673l-0.81103516 3.0629883l-0.06298828 2.5013123l0.3123474 3.372696l0.6876526 3.3753357l1.6246643 3.8136444l1.8110352 2.3753357l2.3753052 2.0629883l2.5013428 1.6246796l2.2493286 .74801636l4.1259766 1.6876678l4.4356995 1.1889801l5.1889954 1.123352l3.9369812 .5643158l5.4986877 .49868774l6.188965 -0.43569946l4.8740234 -0.50131226l4.501343 -0.9370117l4.123352 -1.3123322l3.6273193 -1.8136444l3.3726807 -2.6876678l2.9396362 -3.6876678l2.1863403 -3.9370117l0.9370117 -3.3753204l0.12597656 -3.4356995l-0.3123169 -4.0629883l-0.6876831 -2.5643005l-1.4382935 -3.1863556l-1.4383545 -2.0629883l-2.0 -2.1233673l-1.4986572 -0.8766327l-2.5013428 -1.0630035l-5.2493286 -0.93699646l-4.8740234 -0.68766785l-3.5616455 -0.3753357l-3.876648 -0.18634033l-8.24939 0l-0.81359863 1.4986877l-0.7480469 1.7506561l-1.0629883 1.0l-1.9370117 2.5013123l-2.126007 2.2493439l-1.2493286 2.6876678l-1.2519836 3.2493286l-0.81100464 3.0630035l-0.12600708 3.7506561l0.56433105 2.6246643l1.2493286 2.3753357l1.6246643 2.123352l2.3123474 2.0629883l1.5013123 1.3123474l0.9369812 1.3753204l0 1.2493439l-0.9369812 .43832397l-2.314972 -0.49868774l-1.7480164 -1.6876678l-2.0 -2.18898l-1.7506714 -2.2493286l-1.6876526 -3.0l-1.1863403 -3.1259918l-0.50131226 -2.6876678l0 -2.81102l0.37530518 -3.0629883l1.0 -2.8136597l1.6246948 -2.81102l1.561676 -2.3123322l1.3123169 -1.8136444l0.50131226 -2.2493439z");
							radiusDiv = 106;
							break;
						case 230: // RPG Rocket
							path = new Path2D("m-188.62112 -16.533947l8.0143585 0l12.969101 -24.251179l27.098267 9.488823l0 -2.001377l17.078102 0l0 6.2210903l10.228264 0l134.11871 -21.404089l38.26966 0l120.62271 31.946732l38.694733 0l4.3259735 4.321554l22.032852 0l0 26.571358l-22.245377 0l-3.9540558 3.9540453l-38.012848 0l-120.72455 29.892221l-38.274086 0l-134.53935 -20.877178l-11.596466 0l0 5.061001l-13.602264 0l0 -2.320179l-28.045822 11.388359l-12.335907 -22.56418l-78.34146 0l0 -35.427002z");
							radiusDiv = 70;
							break;
						case 231: // A literal fucking nuke
							path = new Path2D("M -115825.0046 -51899.336599999995 L -115825.0046 -55148.8094 -89690.3429 -57122.0082 -76683.3125 -57122.0082 -76683.3125 -52944.1146 -53466.04400000001 -52944.1146 -39122.19410000001 -42035.17019999999 -8610.804499999998 -53524.073 23723.636799999993 -56889.903 27977.849499999997 -56889.903 65417.7289 -51551.4834 89972.455 -42035.17019999999 92282.377 -37160.960999999996 94044.8092 -37160.960999999996 95807.24139999998 -37876.77099999999 114121.98760000001 -21687.280999999995 120017.39349999999 769.0494000000035 113332.0198 23070.642999999996 97428.01539999999 35720.071800000005 95645.164 34327.4406 91390.9513 34327.4406 91593.229 39201.6498 65579.80629999998 54752.6982 27410.578599999993 58698.48659999999 -12703.577900000004 53824.27739999999 -40175.69720000001 43147.438200000004 -53060.8505 53360.066999999995 -75427.5317 53360.066999999995 -75427.5317 57770.0658 -88312.685 58060.65419999999 -114569.2238 54752.6982 -114569.2238 50574.8046 -88798.9172 50574.8046 -88798.9172 21329.549400000004 -120160.8941 21329.549400000004 -120404.0102 -22538.333399999996 -89042.03330000001 -23002.5438 -88555.80110000001 -49462.5366 Z M -64010.168399999995 16919.2431 L -78597.1344 16919.2431 -78597.1344 -15343.3797 -64496.40059999999 -15343.3797 Z");
							radiusDiv = 51200;
							break;
						case 232: // Nuke Launcher
							path = new Path2D("M -34622.26700000001 18230.8882 L 21045.89559999999 17487.262300000002 21045.89559999999 14402.736400000002 56851.52169999998 14402.736400000002 56739.9388 15313.3465 56702.48439999999 16056.972399999999 56758.666 16576.652200000004 57037.23309999998 16818.5452 60381.59889999998 17264.0965 62685.8248 17487.262300000002 63429.45069999999 17431.861000000004 63837.54759999999 17208.695200000002 63931.18359999999 16762.363600000004 64098.167799999996 16131.100900000005 64414.1893 15815.079400000002 64878.467799999984 15629.368000000002 65473.0564 15499.0579 65993.5165 15499.0579 65993.5165 23395.6939 67238.095 23395.6939 63225.01209999999 34637.476 63113.429199999984 35343.6475 63132.15640000001 38371.991799999996 64060.71340000001 39356.73040000001 73202.7082 39821.78920000001 75246.31390000001 39096.8905 85242.7372 39096.8905 86599.6789 38873.7247 88141.55169999998 38390.719000000005 89442.3118 37610.419 91021.639 36663.13480000001 91987.65039999998 35510.631700000005 92842.8592 34173.1975 93474.1219 32667.99880000001 93939.1807 31293.110200000003 94180.2934 30159.334299999995 95444.3794 23544.731200000002 95778.34779999999 23228.7097 103935.60399999999 23228.7097 111423.3628 14440.190800000004 117313.8475 14440.190800000004 117778.12599999999 15090.180700000004 123129.4234 15090.180700000004 123129.4234 9924.594700000001 122701.81899999999 9924.594700000001 122701.81899999999 9404.914900000003 122924.9848 9404.914900000003 122924.9848 8011.299100000004 125861.2537 8011.299100000004 128276.28219999999 4833.917500000003 128276.28219999999 690.5244999999995 109417.2115 690.5244999999995 109249.44699999999 -721.8185000000012 109249.44699999999 -15363.367699999999 109677.0514 -15363.367699999999 109677.0514 -17519.3366 110029.747 -17519.3366 110029.747 -20528.9537 13725.120999999985 -20528.9537 13725.120999999985 -22443.029599999998 3802.8262000000104 -22443.029599999998 1647.6376000000018 -24598.218199999996 1034.3217999999906 -24598.218199999996 724.5426999999909 -24061.371799999997 49.58319999999367 -25546.282699999996 -5970.431299999997 -28314.787099999998 -16059.710300000006 -29856.6599 -25591.8551 -28760.338399999997 -32652.7898 -25861.5239 -36090.0113 -28741.6112 -42166.2074 -28741.6112 -42166.2074 -29930.788399999998 -45548.0276 -29930.788399999998 -52013.5934 -29392.3814 -52013.5934 -28314.787099999998 -45343.58900000001 -27813.0542 -45343.58900000001 -20752.119499999997 -83564.2436 -20752.119499999997 -83564.2436 -21736.858099999998 -86239.8923 -22071.606799999998 -86425.6037 -22387.628299999997 -88748.5568 -22795.725199999997 -89343.14540000001 -22517.158099999997 -90327.884 -22684.922599999998 -91609.91690000001 -22684.922599999998 -91609.91690000001 -23501.896699999998 -93393.6827 -23501.896699999998 -93616.8485 -22667.755999999998 -94713.17000000001 -22667.755999999998 -99803.8472 -21774.312499999996 -99803.8472 -16961.422099999996 -101996.4902 -16961.422099999996 -101996.4902 -22350.173899999998 -102795.5174 -22350.173899999998 -103965.9674 -24133.9397 -104950.706 -24133.9397 -105304.1819 -25304.3897 -105805.9148 -27125.609899999996 -106214.792 -28184.477 -107087.9477 -30005.697199999995 -108425.38190000001 -32643.891499999998 -109038.6977 -33982.106 -110283.27620000001 -35654.2889 -111676.892 -37345.199 -112755.2666 -38385.338899999995 -114073.9736 -39686.098999999995 -114836.3267 -40002.1205 -115634.5736 -39964.666099999995 -116062.178 -39500.387599999995 -116712.9482 -40057.521799999995 -117362.9381 -40410.9977 -118087.8368 -40559.2547 -118719.0995 -40447.6718 -118607.5166 -39704.826199999996 -119091.3026 -38868.3446 -119760.0197 -37400.6003 -120112.7153 -36546.1718 -120614.4482 -35338.2674 -120818.88680000001 -34650.823099999994 -121097.45390000001 -32086.757299999997 -121209.0368 -31752.008599999997 -121562.5127 -31417.259899999997 -121915.2083 -31417.259899999997 -121915.2083 -32198.3402 -122416.9412 -32198.3402 -122416.9412 -18429.1664 -122974.0754 -18280.909399999997 -123568.664 -18392.492299999998 -124089.1241 -18578.2037 -124721.1671 -18578.2037 -125092.5899 -18968.3537 -125408.61140000001 -19098.6638 -125947.0184 -19061.209399999996 -126523.66010000001 -18652.332199999997 -126820.9544 -18280.909399999997 -127247.7785 -18169.3265 -127637.92850000001 -17983.6151 -127917.27590000001 -17648.8664 -127749.5114 -11721.707599999998 -128493.1373 -11350.284799999998 -128493.1373 -9287.951899999996 -128288.69870000001 -9009.384799999996 -127917.27590000001 -8990.657599999999 -127508.3987 -9157.641799999998 -126802.22720000001 -9399.534799999998 -126226.3658 -9510.337399999997 -125445.2855 -9399.534799999998 -124590.857 -9231.770299999996 -123829.2842 -9250.497499999998 -123271.3697 -9454.936099999999 -122695.5083 -9547.791799999999 -122379.4868 -9231.770299999996 -122379.4868 2455.5630999999994 -118496.714 2455.5630999999994 -118496.714 2826.9858999999997 -122379.4868 2826.9858999999997 -122379.4868 8903.182 -122686.1447 9209.839899999999 -122296.77500000001 9434.566299999999 -47926.382 9181.7491 -42891.106100000005 13139.430700000004 -38338.05560000001 15053.5066 -34974.9626 15053.5066 -34974.9626 17877.412300000004 Z")
							radiusDiv = 64;
							break;
						case 233: // Sawed-Off Shotgun
							path = new Path2D("M -22966.441300000002 4515.905599999998 L -25928.490800000003 3199.9115999999995 -26054.987800000003 3288.6721 -27016.4713 2655.6555999999982 -27016.4713 2516.4025999999976 -28636.4833 2997.410100000001 -30066.7498 4237.931099999998 -30332.4998 3997.1615999999995 -29648.990800000003 3300.8966 -30446.772300000004 3579.4025999999976 -32328.2823 5440.184099999999 -36612.7038 16175.9526 -36916.1903 18757.448099999998 -36511.187300000005 20073.9736 -37209.046800000004 22002.787099999998 -38795.5743 21712.0566 -45490.8798 18978.0206 -46705.8888 18117.5221 -46629.8843 15561.007099999999 -42579.8543 6313.438599999998 -42187.6073 3566.6466 -42579.8543 -1259.3734000000004 -42390.1088 -3841.4003999999986 -37247.846300000005 -12662.705899999999 -37273.3583 -12966.723899999999 -36564.3373 -14105.7284 -35172.3388 -14523.4874 -35754.331300000005 -15915.4859 -36184.846300000005 -16117.9874 -36918.8478 -17168.2314 -36944.359800000006 -17674.7509 -36766.8388 -18016.5054 -36210.3583 -18484.7569 -35463.6008 -18724.994899999998 -34931.5693 -18687.2584 -34109.3388 -18395.9964 -32792.8133 -18307.2359 -29907.2998 -18295.0114 -29527.808800000003 -17902.2329 -22971.7563 -19851.7749 -21528.7338 -19851.7749 -21225.247300000003 -20383.2749 -21275.739800000003 -20939.7554 -20921.229300000003 -21484.0114 -19453.226300000002 -21484.0114 -19098.7158 -20889.262899999998 -18364.714300000003 -20383.2749 -18060.696300000003 -19863.9994 29075.38119999999 -19826.262899999998 29138.62969999999 -20104.7689 35678.20569999999 -20104.7689 35918.44369999999 -19839.0189 42006.244699999996 -19839.0189 42563.2567 -20750.0099 42563.2567 -21167.7689 43524.7402 -21167.7689 43524.7402 -18624.0099 46992.77769999999 -18624.0099 46992.77769999999 -12671.2099 40588.73419999999 -12671.2099 40841.7282 -12354.9674 40474.4617 -10949.6814 38487.7147 -9106.4394 35247.69069999999 -7562.4319 34792.1952 -7562.4319 34792.1952 -7169.653400000001 31020.671199999997 -6638.153400000001 30919.1547 -7106.4048999999995 -1341.8323000000019 -3634.6468999999997 -1417.8368000000046 -4647.154399999999 -1936.5808000000034 -3685.1394 -8361.884300000005 -4026.893899999999 -14736.695300000003 -3545.8863999999994 -13749.168300000005 -2925.625899999999 -13040.678800000002 -1297.1098999999995 -13167.175800000005 550.3840999999993 -14652.186800000003 2389.9055999999982 -16930.1958 3705.8996000000006 -19946.458300000002 4515.905599999998 Z M -26867.5932 1385.0941999999995 L -26475.3462 2258.3486999999996 -25627.6037 2802.6047 -25741.344699999998 2890.8337 -22969.5722 4080.8621999999996 -19831.0647 4004.8576999999996 -17198.5452 3295.8367 -14920.0047 2055.8472 -13692.7712 460.8157000000001 -13523.7542 -1319.1778 -14181.751199999999 -2660.6838 -15472.7647 -3496.2018 -21712.574699999997 -3027.9503 -22370.5717 -1294.1972999999998 -22383.327699999998 566.5841999999998 -21253.358699999997 1895.3342000000002 -19886.3407 2882.3297000000002 -20203.1147 3135.8552 -21784.858699999997 2287.5811999999996 -23202.369199999997 996.5676999999996 -24746.376699999997 -2855.2128 -25674.907199999998 -2766.4523 -26332.904199999997 -2171.7038000000002 -27104.6422 465.06770000000006 Z M -28256.2187 2413.4115 L -27306.959700000003 2160.4175 -27408.4762 1818.663 -27395.7202 1489.6645 -27876.727700000003 1920.1795000000002 Z");
							radiusDiv = 12800;
							break;
						case 234: // Marksman Pistol
							path = new Path2D("m -1.18794,-0.66151372 v .09246 l -0.49026,0.0183 h -0.2148 l -0.0221,0.01157 v .17142898 l -0.0183,0.02504 -0.004,0.01422 .0203,0.0203 -0.0368,0.03674 -0.0135,-0.0963 -0.003,-0.06355 -0.0154,-0.03564 -0.0173,-0.01541 -0.0231,-0.0058 -0.0424,0.0029 -0.0472,0.0067 -0.0578,0.01252 -0.0289,0.0087 v .02215 l -0.0145,0.02503 h -0.0655 l .004,-0.01395 h -0.0384 v -0.01782 h -0.0192 v -0.01348 h -0.0568 l -0.0135,-0.01154 h -0.0963 l -0.0106,0.01059 v .07608 l .0279,-0.01541 .0318,-0.0077 h .0347 l .0491,0.0077 .0462,0.01156 .0424,0.01735 .0298,9.49e-4 .1126999,0.111743 .0221,0.02116 .008,0.0097 -0.005,0.01636 -0.0222,0.01348 -0.0501,0.0087 -0.0876,0.01154 -0.11078,0.03273 -0.10306,0.03567 -0.0694,0.02406 -0.0511,0.02601 -0.027,0.02889 -0.0164,0.04432 -0.0202,0.12230801 -0.025,0.08574 -0.0299,0.07417 -0.0424,0.08185 -0.0549,0.10498595 -0.0848,0.143512 -0.0385,0.07033 -0.027,0.05103 -0.01,0.03662 -0.0578,0.08762 -0.0279,0.07033 -0.0337,0.10980108 -0.0472,0.15316 -0.0193,0.127123 -0.0318,0.147366 -0.003,0.04334 -0.026,0.05778 -0.0327,0.06069 -0.0241,0.02312 -0.0202,0.02891 -0.007,0.03466 -0.003,0.03178 -0.0144,0.02312 .004,0.02117 .0231,-0.0077 h .0231 l -0.005,0.0212 .0722,0.08091 .53551,0.08091 .0164,-0.02891 .0404,0.0048 .0241,-0.04817 .052,0.0029 .008,-0.02986 -0.004,-0.03758 -0.0154,-0.03562 -0.0164,-0.0472 -0.006,-0.04142 v -0.0366 l .004,-0.04431 .0115,-0.03373 .0241,-0.05585 .0404,-0.05586 .0145,-0.02312 v -0.107875 l .01,-0.06261 .0173,-0.04914 .027,-0.04718 .0202,-0.0366 .0308,-0.03466 .0366,-0.02891 .004,-0.104022 .0106,-0.04429 .0289,-0.06358 .025,-0.052 .0241,-0.026 .0385,-0.03082 .16084,-0.04239 .0327,-0.01541 .0202,-0.02121 .0395,-9.48e-4 .0453,-0.09343 .0732,-0.0029 .0491,0.01251 .0375,0.02507 .0481,0.05103 .0453,0.05684 .0327,0.04814 .0289,0.06068 .0202,0.05201 .01,0.06164 .003,0.06067 -0.002,0.07705 -0.0164,0.06551 -0.0106,0.04432 .005,0.02695 .0145,-0.01154 .0134,-0.0636 .0212,-0.07705 .0308,-0.0703 .026,-0.05103 .0405,-0.05491 .027,-0.02601 .0501,-0.03177 .0944,-0.04432 .0973,-0.04528 .0809,-0.05874 .0366,-0.04045 .0241,-0.04142 .0144,-0.04236 .0115,-0.06455 .007,-0.05874 -0.002,-0.03373 -0.0202,-0.0472 -0.0231,-0.03082 -0.006,-0.02793 .006,-0.02793 .0173,-0.01928 .0366,-0.01251 .1676,0.0183 .1541,9.63e-4 .1781901,-0.0077 .17048,-0.0087 .15026,-0.0077 2.80667998,-0.180113 .0616,-0.01252 .0617,-0.01734 .0559,-0.03273 .0289,-0.02891 h .26104 v .02504 h .20707 v -0.163739 h -0.21768 v .0183 h -0.15987 v -0.02889 l .37756,-0.0077 v .0048 h .0202 v -0.33133202 h -0.0925 l .0154,-0.04236 h .0684 v -0.04432 h -0.14543 v -0.03755 h -0.0491 l -0.021,-0.01215 -0.0177,0.0102 -0.0899,-0.02411 v .01929 h -0.0226 v -0.0183 h -0.0395 v -0.02023 l -0.0252,0.0068 v .07417 h -4.0451401 v -0.08381 z m .42572,0.129065 .0183,0.03469 -0.7127299,0.0096 -0.0135,-0.01446 -0.21094,-9.48e-4 v -0.01637 z m 2.8365399,0.0037 h .81423 l .0218,0.03776 h -0.85241 z m -2.51194992,0.0021 h .89671996 l .0164,0.03373 h -0.92558996 z m 2.18253992,0.0039 .0135,0.03178 h -0.98724996 l .0125,-0.02793 z m -2.9896799,0.83314399 .0462,0.0183 .0376,0.02215 .0347,0.02987 .0327,0.04718 .0164,0.0471999 .01,0.04527 -0.003,0.05105 -0.0135,0.05683 -0.0298,0.05105 -0.0539,0.04528 -0.0751,0.04525 -0.10691,0.04239 -0.078,0.03564 -0.052,0.02695 -0.053,0.0019 -0.0202,-0.01154 -0.0135,-0.02601 -0.0202,-0.05875 -0.0327,-0.05875 -0.0404,-0.0549 -0.0231,-0.05007 -0.0106,-0.0395 -0.005,-0.04431 .004,-0.04527 .0106,-0.0404398 .0279,-0.04334 h .0231 l .026,0.01347 .0279,0.03082 .0212,0.0423798 .01,0.05489 v .07131 l .004,0.03947 .0135,0.04047 .0145,0.02695 .0289,0.03275 .0241,0.02408 .0173,0.01154 .0174,-0.0019 .0125,-0.01636 -0.002,-0.02026 -0.0328,-0.02598 -0.0183,-0.02409 -0.0192,-0.04525 -0.006,-0.05203 v -0.27644585 z");
							radiusDiv = 1;
							break;
						case 235: // Sawed-Off Shotgun 2
							path = new Path2D("M 89.826172 -48.648438 L 81.589844 -48.5625 L 70.404297 -47.433594 L 61.126953 -45.611328 L 47.601562 -42.578125 L 37.890625 -39.457031 L 31.5625 -37.722656 L 23.410156 -34.6875 L 17.773438 -32.605469 L 13.697266 -30.873047 L 12.226562 -31.480469 L 5.375 -28.792969 L -3.1542969 -26.505859 L -13.177734 -22.375 L -22.457031 -18.302734 L -33.640625 -12.144531 L -46.822266 -5.0332031 L -55.490234 -0.61132812 L -64.595703 5.1972656 L -73.525391 12.220703 L -84.884766 21.669922 L -96.417969 31.033203 L -106.73438 40.226562 L -113.58203 47.595703 L -119.56641 56.177734 L -123.4668 63.808594 L -127.63086 73.173828 L -131.18359 81.0625 L -134.39453 90.167969 L -136.30273 97.884766 L -135.95312 102.30664 L -133.0918 106.20703 L -127.63086 110.45703 L -121.21289 113.05859 L -121.30273 118.60547 L -115.14453 123.20117 L -116.61914 127.79883 L -116.27344 131.87305 L -114.01758 134.9082 L -111.50391 135.25391 L -110.0293 133.43359 L -109.5957 129.35938 L -108.55469 121.0332 L -107.60156 118.3457 L -105.86523 117.6543 L -90.345703 116.26562 L -86.273438 116.00586 L -83.582031 114.79297 L -82.197266 113.23047 L -80.894531 110.36914 L -80.375 106.20703 L -79.509766 102.13477 L -76.388672 95.890625 L -72.658203 89.039062 L -68.669922 82.191406 L -65.818359 77.253906 L -60.953125 70.917969 L -55.837891 64.849609 L -49.855469 59.908203 L -43.091797 55.572266 L -35.201172 51.757812 L -24.625 47.941406 L -13.091797 44.994141 L -2.1679688 43.605469 L 7.2832031 42.220703 L 15.345703 40.572266 L 20.115234 40.486328 L 23.582031 41.873047 L 25.923828 44.5625 L 27.3125 47.855469 L 27.398438 53.75 L 28.351562 58.953125 L 29.914062 62.421875 L 32.773438 65.976562 L 36.589844 68.664062 L 41.792969 71.005859 L 49.25 72.826172 L 58.525391 74.039062 L 66.330078 74.212891 L 75.779297 73.779297 L 83.322266 72.566406 L 91.822266 69.878906 L 98.669922 66.496094 L 105.17383 63.201172 L 111.1543 58.693359 L 118.52539 52.970703 L 125.46289 48.375 L 133.0918 44.648438 L 139.94141 41.265625 L 146.5332 39.359375 L 172.54297 39.359375 L 172.54297 36.582031 L 175.31836 36.582031 L 175.31836 76.121094 L 177.13867 78.894531 L 180.25977 79.9375 L 268.0918 72.046875 L 272.77344 70.746094 L 275.28906 68.837891 L 275.63477 66.236328 L 274.42188 37.537109 L 299.91406 37.537109 L 299.91406 28.605469 L 404.39453 28.605469 L 404.39453 38.144531 L 405.17383 42.046875 L 406.5625 43.865234 L 410.63477 46.121094 L 413.23633 46.726562 L 419.74023 46.726562 L 419.74023 44.039062 L 427.80273 44.039062 L 430.92578 47.162109 L 433.83203 44.259766 L 442.19727 44.259766 L 445.12305 47.185547 L 448.18164 44.128906 L 456.50391 44.128906 L 459.49609 47.121094 L 462.44336 44.173828 L 471.41797 44.173828 L 474.38672 47.142578 L 477.13867 44.388672 L 485.89453 44.388672 L 488.8457 47.337891 L 491.44922 44.738281 L 498.20703 44.738281 L 500.9375 47.466797 L 504.10547 44.298828 L 512.60156 44.298828 L 515.29102 46.990234 L 518.2832 44 L 526.125 44 L 529.05273 46.925781 L 531.98242 43.998047 L 539.74023 43.998047 L 542.70898 46.966797 L 545.59375 44.083984 L 554.56641 44.083984 L 557.58008 47.097656 L 560.89844 43.78125 L 568.00586 43.78125 L 571.38672 47.162109 L 574.81445 43.738281 L 580.4043 43.738281 L 581.27734 47.005859 L 592.02344 47.005859 L 597.57227 46.380859 L 603.20703 44.474609 L 606.67773 41.697266 L 608.93164 39.533203 L 610.31836 35.630859 L 613.69727 34.503906 L 622.63086 34.503906 L 628.69727 34.763672 L 633.29297 33.982422 L 637.63086 29.212891 L 639.88477 24.097656 L 640.83789 18.808594 L 640.83789 13.779297 L 640.4043 9.7929688 L 638.8457 6.6699219 L 636.67773 2.7695312 L 634.33594 .6015625 L 631.125 -1.046875 L 627.13867 -2.0859375 L 614.04688 -2.0859375 L 614.04688 -9.6308594 L 650.375 -9.6308594 L 653.66992 -11.798828 L 654.79883 -14.572266 L 655.14453 -19.082031 L 654.45117 -25.410156 L 653.49609 -30.351562 L 651.58984 -36.421875 L 650.28906 -38.503906 L 648.0332 -39.630859 L 313.96094 -43.009766 L 313.96094 -39.109375 L 309.88477 -39.109375 L 309.88477 -41.017578 L 305.63477 -41.017578 L 305.63477 -44.052734 L 301.64844 -44.052734 L 301.64844 -46.654297 L 89.826172 -48.648438 z M 56.75 38.75 L 89.814453 38.75 L 92.501953 39.5625 L 94.9375 40.9375 L 97.185547 43 L 99 45.375 L 100.18555 48.126953 L 100.6875 51.0625 L 99.75 54.126953 L 97.375 57.375 L 93 60.4375 L 87.4375 62.75 L 79.814453 65.5625 L 72.6875 68 L 66.625 68.873047 L 57.185547 69.375 L 49.25 68.6875 L 44.6875 66.185547 L 40.814453 62.0625 L 38.625 58.6875 L 37.873047 55.126953 L 38.0625 51.873047 L 39.126953 49.0625 L 40.501953 47.375 L 42.375 46.9375 L 44.375 47.873047 L 45.625 50.6875 L 45.0625 52.126953 L 44.4375 54.873047 L 44.75 58.6875 L 45.5625 61.5625 L 46.501953 63.375 L 47.9375 65.4375 L 49.25 66.375 L 50.625 66.375 L 51.0625 65.25 L 50.4375 63.185547 L 49.25 61.0625 L 48.4375 58.814453 L 48.185547 55.6875 L 48.25 52.873047 L 48.6875 50.6875 L 49.9375 48.126953 L 56.75 38.75 z ");
							radiusDiv = 78;
							break;
						case 236: // Mirco-SMG
							path = new Path2D("M -95.25 -100.9375 L -97.0625 -99.0625 L -97.0625 -63.625 L -102.375 -59.9375 L -102.375 -52.9375 L -117.3125 -52.9375 L -117.3125 -42.3125 L -144 -42.3125 L -144 -37.3125 L -381.375 -37.3125 L -383.25 -39.9375 L -385.6875 -39.9375 L -401.87305 -25.5625 L -401.87305 -18.3125 L -397.83984 -17.230469 L -397.83984 -11.5625 L -401.38867 -10.611328 L -401.38867 -6.1855469 L -399.03125 -5.5546875 L -399.03125 -1.1269531 L -401.25781 -0.52929688 L -401.25781 81 L -385.6875 96.9375 L -384.125 95.375 L -384.125 -14.126953 L -373.87305 -21.814453 L -373.87305 -25.25 L -145 -25.25 L -145 -19.25 L -104.375 -19.25 L -104.375 .12695312 L -102.4375 2.0625 L -6.1269531 2.0625 L -6.1269531 26.5625 L -5.25 26.501953 L 3.75 26.501953 L 3.75 32.25 L 18 46.501953 L 15.75 60.75 L 16.25 75 L 13.501953 89.25 L 11 105.75 L 9.25 120 L 8.5019531 136.25 L 17 160.75 L 31.75 169.25 L 38.75 169.25 L 38.75 174.25 L 100.25 174.25 L 100.25 82 L 161.50195 82 L 170.50195 80.75 L 177 77.75 L 181 73 L 182.75 66.75 L 182.75 27 L 185.5957 29.845703 L 185.5957 42.6875 L 292.75 42.6875 L 292.75 30 L 302 30 L 307.875 27.814453 L 312.75 24.75 L 315.50195 21.0625 L 317.3125 17.375 L 318.25 13.25 L 318.25 7 L 359.81445 7 L 359.81445 -4.9375 L 420.3125 -4.9375 L 420.3125 -25.6875 L 359.375 -25.6875 L 359.375 -38.126953 L 315.18555 -38.126953 L 315.18555 -48.873047 L 312.4375 -51.375 L 310.3125 -52.625 L 307.375 -52.625 L 307.375 -84.75 L 305.3125 -86.814453 L 285.6875 -86.814453 L 266.375 -54.25 L 266.375 -59.9375 L 205.3125 -59.9375 L 205.3125 -62.498047 L 187.625 -62.498047 L 184.3125 -64.498047 L 181.4375 -65.3125 L 177.4375 -65.3125 L 177.4375 -87.498047 L 175.75 -89.185547 L 163.5625 -89.185547 L 152.87305 -72.873047 L 152.87305 -66.3125 L 51.9375 -66.3125 L 51.9375 -72.375 L 48.6875 -72.375 L 48.6875 -68.625 L 46.185547 -68.625 L 46.185547 -72.498047 L 40.375 -72.498047 L 40.375 -68.625 L 38.126953 -68.625 L 38.126953 -72.185547 L 30.126953 -72.185547 L 30.126953 -68.5625 L 28.126953 -68.5625 L 28.126953 -72.0625 L 19.814453 -72.0625 L 19.814453 -68.0625 L 17.5625 -68.0625 L 17.5625 -72.126953 L 8.8144531 -72.126953 L 8.8144531 -68.625 L 6.75 -68.625 L 6.75 -72.126953 L -0.6875 -72.126953 L -0.6875 -67.75 L -2.8730469 -67.75 L -2.8730469 -72.126953 L -11.625 -72.126953 L -11.625 -67.814453 L -13.9375 -67.814453 L -13.9375 -72.126953 L -21.185547 -72.126953 L -22.285156 -68.017578 L -24.375 -68.017578 L -24.375 -72.185547 L -30.814453 -72.185547 L -30.814453 -67.814453 L -33 -67.814453 L -33 -71.9375 L -36.375 -71.9375 L -36.375 -63.814453 L -64.4375 -100.9375 L -95.25 -100.9375 z M 118.0625 26.126953 L 119.18555 35.5625 L 121.3125 43.75 L 123.9375 50.814453 L 126.625 55.4375 L 130.6875 60.3125 L 134.12695 63.9375 L 136.9375 66.4375 L 139.375 68.5625 L 142.12695 68.5625 L 142.12695 65.126953 L 138.81445 62 L 134.375 56.814453 L 131.375 51.625 L 129.9375 47.75 L 129.9375 27.4375 L 176 27.4375 L 176 61 L 174.5625 66.6875 L 171.4375 71.185547 L 166.9375 74.6875 L 162.50195 76.625 L 102.18555 76.625 L 102.18555 26.75 L 118.0625 26.126953 z ");
							radiusDiv = 75;
							break;
						case 237: // SMG
							path = new Path2D("M 19.28125 -128.41406 L 16.330078 -117.41016 L -15.058594 -117.41016 L -32.226562 -97.466797 L -58.757812 -97.466797 L -58.757812 -85.503906 L -231.64844 -85.503906 L -231.64844 -90.533203 L -232.51367 -96.253906 L -234.25 -98.855469 L -237.36914 -100.41797 L -264.76953 -100.41797 L -270.31836 -98.162109 L -273.26562 -95.212891 L -275 -89.664062 L -276.21289 -77.351562 L -277.25391 -37.640625 L -280.375 -0.18359375 L -284.53711 35.191406 L -284.12695 38.126953 L -283.6875 40.9375 L -282.49805 43.375 L -280.6875 44.4375 L -278.4375 44.5625 L -275.4375 42.6875 L -273.12695 39.501953 L -271.375 32.126953 L -264.0625 2.8144531 L -258.75 -18.3125 L -254.49805 -36.0625 L -253.49805 -40.814453 L -251.81445 -44.498047 L -248.81445 -48.25 L -243.81445 -51.3125 L -233.18555 -56.375 L -233.18555 -65.498047 L -230.625 -68.0625 L -46 -68.0625 L -43.498047 -65.5625 L -43.498047 -55.375 L -6.75 -22.75 L 16.375 -22.75 L 16.375 -19.625 L 34.25 -19.625 L 40.75 -15.873047 L 47.125 -11.126953 L 51.501953 -7 L 54.375 1.5019531 L 56.25 10.375 L 56.25 17.625 L 53.625 26.501953 L 49 38.501953 L 44 41.75 L 42 46.75 L 5.5625 97.5625 L -0.75 107.0625 L -4.8144531 112.0625 L -9.0625 116.25 L -10.126953 118.625 L -10.3125 121.50195 L -8.375 123.75 L 4.4375 128.5625 L 35.4375 138.50195 L 52.6875 144.12695 L 61.625 147.25 L 66.75 149 L 69.501953 148.9375 L 72 145.87305 L 72.3125 144.375 L 70.814453 142.625 L 69.375 139 L 68.873047 135.81445 L 69.125 132.5625 L 72.5625 124.4375 L 92.375 85.75 L 109.4375 53.126953 L 114.4375 53.126953 L 117.0625 51.9375 L 120.50195 51.625 L 123.5625 52.375 L 131.3125 60.75 L 210.25 60.75 L 213.375 54.625 L 216.6875 49.625 L 218.87305 47.375 L 222.3125 46.0625 L 248.51367 43.513672 L 248.9375 41.9375 L 252.0625 41.9375 L 252.0625 45.4375 L 250.25 45.4375 L 250.25 51.75 L 257.9375 51.75 L 257.9375 50 L 267.75 50 L 272 70.75 L 277.25 88.75 L 285.50195 117.25 L 294.75 141.50195 L 304.4375 165.0625 L 307.375 165.87305 L 330.4375 154.375 L 347.9375 147 L 348.75 144.25 L 343.25 131.25 L 333.75 106.50195 L 325 80.501953 L 317.625 47 L 317.625 39.375 L 321.4375 37.9375 L 324.87305 37.9375 L 326.5625 37.185547 L 326.6875 35.4375 L 325.9375 33.126953 L 322.4375 27.375 L 319.25 25.375 L 317.0625 25.375 L 315.125 9.9375 L 311 -9.4375 L 311 -18.3125 L 308.9375 -18.3125 L 308.9375 -19.9375 L 312.25 -19.9375 L 312.25 -22 L 315.625 -22 L 315.625 -18.185547 L 320.50195 -13.375 L 536 -13.375 L 536 -27.873047 L 539.23828 -38.873047 L 539.23828 -46.765625 L 542.4375 -47.625 L 542.4375 -39.75 L 576.18555 -39.75 L 576.18555 -42.814453 L 596.75 -42.814453 L 601.625 -45.5625 L 632.87305 -45.5625 L 634.9375 -46.9375 L 634.9375 -70.779297 L 602.40625 -70.779297 L 598.9375 -74.25 L 577.0625 -74.25 L 574.5625 -77.9375 L 574.5625 -82.0625 L 577.0625 -85.75 L 577.0625 -106.3125 L 570.9375 -112.75 L 546.5625 -112.75 L 541.87305 -106.18555 L 541.87305 -101.87305 L 531.18555 -101.87305 L 527.50195 -107.375 L 526.33008 -105.27344 L 522.3418 -105.27344 L 518.61328 -110.64844 L 518.61328 -118.71094 L 516.61914 -120.70508 L 514.01758 -120.70508 L 510.54883 -125.9082 L 494.07617 -125.9082 L 491.99414 -122.61133 L 465.46289 -122.61133 L 459.39453 -118.625 L 459.39453 -109.60547 L 85 -109.60547 L 85 -121.05273 L 81.359375 -121.05273 L 75.289062 -125.03906 L 75.289062 -128.41406 L 19.28125 -128.41406 z M 532.6875 -85.0625 L 543.4375 -85.0625 L 544.625 -82.5625 L 544.875 -80.375 L 543.625 -76.185547 L 541.875 -71.6875 L 540.3125 -69.25 L 538.3125 -69.25 L 535.75 -72.4375 L 533.625 -77.5625 L 532.5625 -81.4375 L 532.6875 -85.0625 z M 156.375 6.0625 L 198.5625 6.0625 L 200.87305 8.375 L 200.87305 37 L 198.50195 37.75 L 196.25 39.625 L 194.25 42.25 L 193.12695 45.375 L 193.12695 50.126953 L 136.87305 50.126953 L 126 35.501953 L 126 11.126953 L 130 6.25 L 133.625 6.25 L 135.50195 8.625 L 135.50195 17.75 L 136.375 24.25 L 138.87305 30.873047 L 142.25 37.25 L 145.625 41.75 L 149.625 44.873047 L 153.50195 44.873047 L 153.50195 41.501953 L 151.375 39 L 149.75 32.625 L 149.25 26.375 L 150.75 19.625 L 152.50195 13.375 L 156.375 6.0625 z ");
							radiusDiv = 74;
							break;
						case 238: // Fatman Nuke Launcher
							path = new Path2D("m -548.34342,-158.14336 -2.12304,0.375 .375,2.5 -1.62891,2.8125 -2.24805,4.9375 -1.1875,2.875 -1.6875,4.0625 -0.6875,2.3125 -0.93554,8.625 -0.37696,1.125 -1.1875,1.12695 h -1.1875 v -2.6289 h -1.6875 v 46.316402 l -1.87304,0.498047 -2,-0.375 -1.75196,-0.625 h -2.125 l -1.25,-1.3125 -1.0625,-0.4375 -1.81054,0.125 -1.94141,1.375 -1,1.25 -1.43555,0.375 -1.31054,0.625 -0.94141,1.126953 .56445,19.935547 -2.5,1.25 v 6.9375 l .6875,0.93555 1.24805,0.06445 1.37695,-0.5625 2.375,-0.81445 1.93555,-0.3711 2.62891,0.3711 2.87304,0.56445 2.5625,-0.0625 1.87696,-0.6875 1.93554,-0.3125 1.06446,1.0625 v 39.3125 h 13.05859 v 1.25 h -13.05859 V 8.2316391 l -1.03321,1.0332 1.31055,0.7558599 250.1582,-0.8515599 16.93555,13.3124999 15.3164,6.43945 h 11.3125 v 9.49805 l 1.18555,1.18945 187.250003,-2.50195 v -10.375 h 120.4375 l -0.375,3.0625 -0.12695,2.50195 .18945,1.74805 .9375,0.8125 11.25,1.5 7.75,0.75 2.50195,-0.18555 1.3711,-0.75195 .3164,-1.50195 .56055,-2.12305 1.06445,-1.0625 1.56055,-0.625 2,-0.4375 h 1.75 v 26.56055 h 4.1875 l -13.49805,37.81445 -0.37695,2.375 .06445,10.187501 3.12305,3.31055 30.75,1.56445 6.874997,-2.4375 h 33.62305 l 4.56445,-0.75 5.1875,-1.625 4.375,-2.625 5.3125,-3.18555 3.25,-3.876951 2.875,-4.5 2.125,-5.0625 1.5625,-4.625 .8125,-3.8125 4.25195,-22.25 1.12305,-1.0625 h 27.4375 l 25.1875,-29.5625 h 19.8125 l 1.5625,2.1875 h 18 v -17.37695 h -1.43945 V 9.9210891 h .75195 v -4.68945 h 9.87695 l 8.12305,-10.6875 V -19.391411 h -63.43555 l -0.56445,-4.75195 v -49.248047 h 1.4375 v -7.251953 h 1.1875 v -10.125 h -323.9375 v -6.4375 h -33.375 l -7.25,-7.249999 h -2.0625 l -1.04297,1.80664 -2.26953,-4.99414 -20.25,-9.3125 -33.9375,-5.1875 -32.0625,3.6875 -23.75,9.75195 -11.5625,-9.6875 h -20.4375 v -4 h -11.375 l -21.74805,1.81055 v 3.625 l 22.43555,1.6875 v 23.749999 h -128.5625 v -3.3125 l -9,-1.125 -0.625,-1.064453 -7.8125,-1.371094 -2,0.935547 -3.3125,-0.564453 h -4.3125 v -2.748046 h -6 l -0.75,2.80664" + " h -3.68945 l -17.12305,3.005859 v 16.1875 h -7.375 v -18.125 h -2.6875 l -3.9375,-5.999999 h -3.3125 l -1.1875,-3.9375 -1.6875,-6.125 -1.37695,-3.5625 -2.93555,-6.125 -4.5,-8.875 -2.0625,-4.50195 -4.18554,-5.62305 -4.6875,-5.68945 -3.62891,-3.49805 -4.43555,-4.375 -2.56445,-1.0625 -2.68359,0.125 -1.43946,1.5625 -2.18945,-1.875 -2.18555,-1.1875 z m 462.000003,72.064452 h 56.87695 l 1.65821,0.957031 -1.79102,1.033204 h -56.80859 l -1.43555,-0.742188 z m 78.5605503,0 H 49.094083 l 1.6582,0.957031 -1.78906,1.033204 H -7.8453667 l -1.43555,-0.742188 z m 77.3749997,0 h 56.876947 l 1.6582,0.957031 -1.78906,1.033204 H 69.529633 l -1.43555,-0.742188 z m 79.062497,0 h 56.87695 l 1.6582,0.957031 -1.78906,1.033204 h -56.80859 l -1.43555,-0.742188 z m -490.42969,7.03125 c 1.40753,0 2.75668,0.559418 3.75195,1.554688 .99527,0.99527 1.55469,2.346374 1.55469,3.753906 0,2.931023 -2.37561,5.306641 -5.30664,5.306641 -2.93101,0 -5.30664,-2.375618 -5.30664,-5.306641 0,-2.931023 2.37563,-5.308594 5.30664,-5.308594 z m 31.10937,0 c 1.40753,0 2.75864,0.559418 3.75391,1.554688 .99527,0.99527 1.55469,2.346374 1.55469,3.753906 0,2.931023 -2.37757,5.306641 -5.3086,5.306641 -2.931,0 -5.30664,-2.375618 -5.30664,-5.306641 0,-2.931023 2.37564,-5.308594 5.30664,-5.308594 z m -128.11914,0.002 c 1.40753,0 2.75669,0.559418 3.75196,1.554688 .99527,0.99527 1.55468,2.344421 1.55468,3.751953 0,2.931023 -2.37561,5.30664 -5.30664,5.306641 -2.93101,0 -5.30859,-2.375618 -5.30859,-5.306641 0,-2.931023 2.37758,-5.306641 5.30859,-5.306641 z m 31.4961,0 c 1.40753,0 2.75668,0.559418 3.75195,1.554688 .99527,0.99527 1.55469,2.344421 1.55469,3.751953 0,2.931023 -2.37561,5.30664 -5.30664,5.306641 -2.93101,0 -5.3086,-2.375618 -5.3086,-5.306641 0,-2.931023 2.37759,-5.306641 5.3086,-5.306641 z m 33.24804,0 c 1.40753,0 2.75864,0.559418 3.75391,1.554688 .99527,0.99527 1.55274,2.344421 1.55274,3.751953 0,2.931023 -2.37562,5.30664 -5.30665,5.306641 -2.93101,0 -5.30664,-2.375618 -5.30664,-5.306641 0,-2.931023 2.37563,-5.306641 5.30664,-5.306641 z m 90.38477,8.402344 h 2.75 v 15 h -11.75 v -4.68945 l 1.8125,-1.87305 .375,-3.75 z m -73.63281,2.191406 c 1.40753,0 2.75668,0.55941 3.75195,1.554688 .99527,0.99527 1.55469,2.346382 1.55469,3.753906 0,2.93103 -2.37561,5.30664 -5.30664,5.30664 -2.93101,0 -5.3086,-2.37561 -5.3086,-5.30664 0,-2.931023 2.37759,-5.308594 5.3086,-5.308594 z m -64.875,0.564453 c 1.40751,0 2.75668,0.557465 3.75195,1.552735 .99527,0.99527 1.55469,2.346382 1.55469,3.753906 0,2.93102 -2.37563,5.30664 -5.30664,5.30664 -2.93103,0 -5.30664,-2.37562 -5.30664,-5.30664 0,-2.931023 2.37561,-5.306641 5.30664,-5.306641 z m 30.62304,0 c 1.40753,0 2.75669,0.557465 3.75196,1.552735 .99527,0.99527 1.55469,2.346382 1.55469,3.753906 0,2.93102 -2.37562,5.30664 -5.30665,5.30664 -2.93101,0 -5.30859,-2.37562 -5.30859,-5.30664 0,-2.931023 2.37758,-5.306641 5.30859,-5.306641 z m 65.62305,0.435547 c 1.40753,0 2.75864,0.55941 3.75391,1.554688 .99527,0.99527 1.55469,2.346378 1.55469,3.753906 0,2.93103 -2.37757,5.30664 -5.3086,5.30664 -2.93103,0 -5.30664,-2.37561 -5.30664,-5.30664 0,-2.931027 2.37561,-5.308594 5.30664,-5.308594 z m -168.42578,8.683594 h 6.87695 v 13.37695 l 3.31055,1.12305 v 13.0625 l 18.5,3.9375 v 14.8125 h -50.43554 v -1.24805" + " h 21.37109 z m 55.55859,0.95117 c 1.40753,0 2.75669,0.55941 3.75196,1.55469 .99527,0.99527 1.55468,2.34442 1.55468,3.75195 0,2.93102 -2.37561,5.30664 -5.30664,5.30664 -2.93101,0 -5.30859,-2.37562 -5.30859,-5.30664 0,-2.93102 2.37758,-5.30664 5.30859,-5.30664 z m 33.24414,0 c 1.40753,0 2.75669,0.55941 3.75196,1.55469 .99527,0.99527 1.55469,2.34442 1.55469,3.75195 0,2.93102 -2.37562,5.30664 -5.30665,5.30664 -2.93101,0 -5.30859,-2.37562 -5.30859,-5.30664 0,-2.93102 2.37758,-5.30664 5.30859,-5.30664 z m 31.5,0 c 1.40753,0 2.75864,0.55941 3.75391,1.55469 .99527,0.99527 1.55274,2.34442 1.55274,3.75195 0,2.93102 -2.37562,5.30664 -5.30665,5.30664 -2.93101,0 -5.30664,-2.37562 -5.30664,-5.30664 0,-2.93102 2.37563,-5.30664 5.30664,-5.30664 z m 31.50196,0 c 1.40753,0 2.75668,0.55941 3.75195,1.55469 .99527,0.99527 1.55469,2.34442 1.55469,3.75195 0,2.93102 -2.37561,5.30664 -5.30664,5.30664 -2.93101,0 -5.30664,-2.37562 -5.30664,-5.30664 0,-2.93102 2.37563,-5.30664 5.30664,-5.30664 z m 36.75976,6.17383 h 2.0586 l -0.12305,23.75 -2.375,1.125 -6.18945,0.25 1,-13.3125 z m -117.25781,4.43945 c 1.40753,0 2.75864,0.55942 3.75391,1.55469 .99527,0.99527 1.55273,2.34442 1.55273,3.75195 0,2.93103 -2.37561,5.30664 -5.30664,5.30664 -2.93101,0 -5.30664,-2.37561 -5.30664,-5.30664 0,-2.93103 2.37563,-5.30664 5.30664,-5.30664 z m 31.49609,0 c 1.40753,0 2.75669,0.55941 3.75196,1.55469 .99527,0.99527 1.55469,2.34639 1.55469,3.75391 0,2.93103 -2.37562,5.30664 -5.30665,5.30664 -2.93101,0 -5.30859,-2.37561 -5.30859,-5.30664 0,-2.93102 2.37758,-5.3086 5.30859,-5.3086 z m 33,0 c 1.40753,0 2.75669,0.55941 3.75196,1.55469 .99527,0.99527 1.55469,2.34639 1.55469,3.75391 0,2.93103 -2.37562,5.30664 -5.30665,5.30664 -2.93101,0 -5.30859,-2.37561 -5.30859,-5.30664 0,-2.93102 2.37758,-5.3086 5.30859,-5.3086 z m 31.5,0 c 1.4075,0 2.75864,0.55941 3.75391,1.55469 .99527,0.99527 1.55273,2.34639 1.55274,3.75391 0,2.93103 -2.37565,5.30664 -5.30665,5.30664 -2.93103,0 -5.30664,-2.37561 -5.30664,-5.30664 0,-2.93102 2.37561,-5.3086 5.30664,-5.3086 z m 159.35352,7.8125 c 1.00238,0 1.96308,0.39863 2.67187,1.10743 .7088,0.70879 1.10743,1.66947 1.10743,2.67187 0,2.08738 -1.69193,3.7793 -3.7793,3.7793 -2.08737,0 -3.7793,-1.69192 -3.7793,-3.7793 0,-2.08738 1.69193,-3.7793 3.7793,-3.7793 z m -64.88281,0.1836 c 1.00238,0 1.9631,0.39863 2.67187,1.10742 .7088,0.7088 1.10742,1.66948 1.10742,2.67187 0,2.08737 -1.69192,3.78125 -3.77929,3.78125 -2.08737,0 -3.7793,-1.69388 -3.7793,-3.78125 0,-2.08737 1.69193,-3.77929 3.7793,-3.77929 z m 32.25781,0 c 1.00238,0 1.96307,0.39863 2.67187,1.10742 .7088,0.7088 1.10743,1.66948 1.10743,2.67187 0,2.08737 -1.69193,3.78125 -3.7793,3.78125 -2.0874,0 -3.7793,-1.69388 -3.7793,-3.78125 0,-2.08737 1.6919,-3.77929 3.7793,-3.77929 z m 65.24805,0.002 c 1.00238,0 1.96502,0.39863 2.67382,1.10742 .70878,0.70881 1.10743,1.66949 1.10743,2.67188 0,2.08737 -1.69388,3.77929 -3.78125,3.77929 -2.08737,0 -3.7793,-1.69192 -3.7793,-3.77929 0,-2.08738 1.69193,-3.7793 3.7793,-3.7793 z m 35,0 c 1.002383,0 1.965023,0.39863 2.673823,1.10742 .70878,0.70881 1.10743,1.66949 1.10743,2.67188 0,2.08737 -1.69388,3.77929 -3.781253,3.77929 -2.08737,0 -3.7793,-1.69192 -3.7793,-3.77929 0,-2.08738 1.69193,-3.7793 3.7793,-3.7793 z m 29.250003,0 c 1.00238,0 1.96307,0.39863 2.67187,1.10742 .70874,0.70881 1.10742,1.66949 1.10742,2.67188 0,2.08737 -1.69195,3.77929 -3.77929,3.77929 -2.0874,0 -3.7793,-1.69192 -3.7793,-3.77929 0,-2.08738 1.6919,-3.7793 3.7793,-3.7793 z m 33.25195,0 c 1.00238,0 1.96308,0.39863 2.67187,1.10742 .7088,0.70881 1.10743,1.66949 1.10743,2.67188 0,2.08737 -1.6919,3.77929 -3.7793,3.77929 -2.0874,0 -3.7793,-1.69192 -3.7793,-3.77929 0,-2.08738 1.6919,-3.7793 3.7793,-3.7793 z m 32.0605503,0 c 1.00238,0 1.96307,0.39863 2.67187,1.10742 .7088,0.70881 1.10742,1.66949 1.10742,2.67188 0,2.08737 -1.69189,3.77929 -3.77929,3.77929 -2.08734,0 -3.7793,-1.69192 -3.7793,-3.77929 0,-2.08738 1.69196,-3.7793 3.7793,-3.7793 z m 34.6874997,0 c 1.00238,0 1.96307,0.39863 2.67187,1.10742 .70874,0.70881 1.10742,1.66949 1.10742,2.67188 0,2.08737 -1.69195,3.77929 -3.77929,3.77929 -2.0874,0 -3.7793,-1.69192 -3.7793,-3.77929 0,-2.08738 1.6919,-3.7793 3.7793,-3.7793 z" + "m 30.99804,0 c 1.00238,0 1.96308,0.39863 2.67188,1.10742 .70874,0.70881 1.10742,1.66949 1.10742,2.67188 0,2.08737 -1.69196,3.77929 -3.7793,3.77929 -2.0874,0 -3.77929,-1.69192 -3.77929,-3.77929 0,-2.08738 1.69189,-3.7793 3.77929,-3.7793 z m 35.75,0 c 1.00238,0 1.96308,0.39863 2.67188,1.10742 .7088,0.70881 1.10742,1.66949 1.10742,2.67188 0,2.08737 -1.69196,3.77929 -3.7793,3.77929 -2.0874,0 -3.77929,-1.69192 -3.77929,-3.77929 0,-2.08738 1.69189,-3.7793 3.77929,-3.7793 z" + "m 31.369137,0.61719 c 1.00238,0 1.96308,0.39863 2.67188,1.10742 .7088,0.7088 1.10742,1.66949 1.10742,2.67187 0,2.08738 -1.69196,3.7793 -3.7793,3.7793 -2.0874,0 -3.78125,-1.69192 -3.78125,-3.7793 0,-2.08737 1.69385,-3.77929 3.78125,-3.77929 z m 36.38672,0 c 1.00238,0 1.96503,0.39863 2.67383,1.10742 .7088,0.7088 1.10742,1.66949 1.10742,2.67187 0,2.08738 -1.69385,3.7793 -3.78125,3.7793 -2.0874,0 -3.77929,-1.69192 -3.77929,-3.7793 0,-2.08737 1.69189,-3.77929 3.77929,-3.77929 z m 34.06641,0 c 1.00238,0 1.96307,0.39863 2.67187,1.10742 .7088,0.7088 1.10743,1.66949 1.10743,2.67187 0,2.08738 -1.6919,3.7793 -3.7793,3.7793 -2.08734,0 -3.7793,-1.69192 -3.7793,-3.7793 0,-2.08737 1.69196,-3.77929 3.7793,-3.77929 z m -636.54102,2 c 1.40753,0 2.75669,0.5594 3.75196,1.55469 .99527,0.99526 1.55468,2.34442 1.55468,3.75195 0,2.93101 -2.37561,5.30664 -5.30664,5.30664 -2.93101,0 -5.30859,-2.37563 -5.30859,-5.30664 0,-2.93103 2.37758,-5.30664 5.30859,-5.30664 z m 31.4961,0 c 1.40753,0 2.75668,0.5594 3.75195,1.55469 .99527,0.99526 1.55469,2.34442 1.55469,3.75195 0,2.93101 -2.37561,5.30664 -5.30664,5.30664 -2.93101,0 -5.3086,-2.37563 -5.3086,-5.30664 0,-2.93103 2.37759,-5.30664 5.3086,-5.30664 z m 33.24804,0 c 1.40753,0 2.75864,0.5594 3.75391,1.55469 .99527,0.99526 1.55274,2.34442 1.55274,3.75195 0,2.93101 -2.37562,5.30664 -5.30665,5.30664 -2.93101,0 -5.30664,-2.37563 -5.30664,-5.30664 0,-2.93103 2.37563,-5.30664 5.30664,-5.30664 z m 30.43946,0 c 1.40753,0 2.75668,0.5594 3.75195,1.55469 .99529,0.99526 1.55469,2.34442 1.55469,3.75195 0,2.93101 -2.37562,5.30664 -5.30664,5.30664 -2.93103,0 -5.3086,-2.37563 -5.3086,-5.30664 0,-2.93103 2.37757,-5.30664 5.3086,-5.30664 z m 81.13281,3.75781 12.875,5.12695 -0.12695,5.74805 h -11.43555 l -21.00781,5.62891 -9.61524,14.0585901 -3.3125,0.3125 -0.93945,1.43749998 -4.875,-3.87304998 -0.0625,-15.7519501 h 8.375 v -3.75 h 20.125 z m 45.1582,1.18359 c 1.00238,0 1.96308,0.39668 2.67188,1.10547 .7088,0.7088 1.10742,1.67145 1.10742,2.67383 0,2.08739 -1.69193,3.7793 -3.7793,3.7793 -2.0874,0 -3.77929,-1.69191 -3.77929,-3.7793 0,-2.08737 1.69189,-3.7793 3.77929,-3.7793 z m 32.17969,0 c 1.00238,0 1.96308,0.39668 2.67188,1.10547 .7088,0.7088 1.10742,1.67145 1.10742,2.67383 0,2.08739 -1.69193,3.7793 -3.7793,3.7793 -2.08737,0 -3.78125,-1.69191 -3.78125,-3.7793 0,-2.08737 1.69388,-3.7793 3.78125,-3.7793 z m 31.94141,0 c 1.00238,0 1.96307,0.39864 2.67187,1.10743 .7088,0.7088 1.10742,1.66949 1.10742,2.67187 0,2.08739 -1.69192,3.7793 -3.77929,3.7793 -2.08737,0 -3.7793,-1.69191 -3.7793,-3.7793 0,-2.08737 1.69193,-3.7793 3.7793,-3.7793 z m 33.4375,0 c 1.00238,0 1.96502,0.39864 2.67382,1.10743 .7088,0.7088 1.10547,1.66949 1.10547,2.67187 0,2.08739 -1.69192,3.7793 -3.77929,3.7793 -2.08737,0 -3.7793,-1.69191 -3.7793,-3.7793 0,-2.08737 1.69193,-3.7793 3.7793,-3.7793 z m 33.439453,0 c 1.00238,0 1.96307,0.39864 2.67187,1.10743 .7088,0.7088 1.10743,1.66949 1.10743,2.67187 0,2.08739 -1.69193,3.7793 -3.7793,3.7793 -2.0874,0 -3.7793,-1.69191 -3.7793,-3.7793 0,-2.08737 1.6919,-3.7793 3.7793,-3.7793 z m 31.24805,0 c 1.00238,0 1.96502,0.39864 2.67382,1.10743 .7088,0.7088 1.10743,1.66949 1.10743,2.67187 0,2.08739 -1.69391,3.7793 -3.78125,3.7793 -2.0874,0 -3.7793,-1.69191 -3.7793,-3.7793 0,-2.08737 1.6919,-3.7793 3.7793,-3.7793 z m 34.25,0 c 1.00238,0 1.96307,0.39864 2.67187,1.10743 .70874,0.7088 1.10742,1.66949 1.10742,2.67187 0,2.08739 -1.69195,3.7793 -3.77929,3.7793 -2.0874,0 -3.7793,-1.69191 -3.7793,-3.7793 0,-2.08737 1.6919,-3.7793 3.7793,-3.7793 z m 31.56445,0 c 1.00244,0 1.96308,0.39864 2.67187,1.10743 .7088,0.7088 1.10743,1.66949 1.10743,2.67187 0,2.08739 -1.6919,3.7793 -3.7793,3.7793 -2.0873397,0 -3.7792997,-1.69191 -3.7792997,-3.7793 0,-2.08737 1.69196,-3.7793 3.7792997,-3.7793 z m 33.93359,0 c 1.00238,0 1.96503,0.39864 2.67383,1.10743 .7088,0.7088 1.10742,1.66949 1.10742,2.67187 0,2.08739 -1.69385,3.7793 -3.78125,3.7793 -2.08734,0 -3.77929,-1.69191 -3.77929,-3.7793 0,-2.08737 1.69195,-3.7793 3.77929,-3.7793 z" + "m 33.93555,0 c 1.00238,0 1.96308,0.39864 2.67188,1.10743 .7088,0.7088 1.10742,1.66949 1.10742,2.67187 0,2.08739 -1.6919,3.7793 -3.7793,3.7793 -2.08734,0 -3.7793,-1.69191 -3.7793,-3.7793 0,-2.08737 1.69196,-3.7793 3.7793,-3.7793 z m 64.884767,0 c 1.00238,0 1.96307,0.39864 2.67187,1.10743 .7088,0.7088 1.10742,1.66949 1.10742,2.67187 0,2.08739 -1.69195,3.7793 -3.77929,3.7793 -2.0874,0 -3.7793,-1.69191 -3.7793,-3.7793 0,-2.08737 1.6919,-3.7793 3.7793,-3.7793 z m 36.05468,0 c 1.00238,0 1.96503,0.39864 2.67383,1.10743 .7088,0.7088 1.10547,1.66949 1.10547,2.67187 0,2.08739 -1.69196,3.7793 -3.7793,3.7793 -2.0874,0 -3.77929,-1.69191 -3.77929,-3.7793 0,-2.08737 1.69189,-3.7793 3.77929,-3.7793 z m -69.375,1.84375 c 1.00238,0 1.96308,0.39667 2.67188,1.10547 .70874,0.7088 1.10742,1.67143 1.10742,2.67383 0,2.08737 -1.69196,3.7793 -3.7793,3.7793 -2.0874,0 -3.77929,-1.69193 -3.77929,-3.7793 0,-2.08739 1.69189,-3.7793 3.77929,-3.7793 z m -469.5332,1.54102 c 1.40753,0 2.75668,0.5594 3.75195,1.55469 .99529,0.99527 1.55469,2.34442 1.55469,3.75195 0,2.93103 -2.37562,5.30859 -5.30664,5.30859 -2.93103,0 -5.30859,-2.37756 -5.30859,-5.30859 0,-2.93103 2.37756,-5.30664 5.30859,-5.30664 z m -100.18164,0.80664 h 4.625 v 15.25 h -4.375 z m 132.24609,0.5 v 5.30664 h 5.30664 c 0,2.93103 -2.37564,5.30664 -5.30664,5.30664 -2.93103,0 -5.30664,-2.37561 -5.30664,-5.30664 0,-2.93102 2.37561,-5.30664 5.30664,-5.30664 z m -95.75195,0.4375 c 1.40753,0 2.75668,0.5594 3.75195,1.55469 .99527,0.99527 1.55469,2.34442 1.55469,3.75195 0,2.93103 -2.37561,5.30859 -5.30664,5.30859 -2.93101,0 -5.30859,-2.37756 -5.30859,-5.30859 0,-2.93103 2.37758,-5.30664 5.30859,-5.30664 z m 31.49609,0 c 1.40753,0 2.75669,0.5594 3.75196,1.55469 .99527,0.99527 1.55469,2.34442 1.55469,3.75195 0,2.93103 -2.37562,5.30859 -5.30665,5.30859 -2.93101,0 -5.30859,-2.37756 -5.30859,-5.30859 0,-2.93103 2.37758,-5.30664 5.30859,-5.30664 z m 420.541023,2.9082 c 1.00238,0 1.96308,0.39863 2.67187,1.10742 .7088,0.70878 1.10743,1.66948 1.10743,2.67188 0,2.08737 -1.69196,3.7793 -3.7793,3.7793 -2.0874,0 -3.7793,-1.69193 -3.7793,-3.7793 0,-2.08739 1.6919,-3.7793 3.7793,-3.7793 z m 31.75195,0 c 1.00244,0 1.96503,0.39863 2.67383,1.10742 .7088,0.70878 1.10742,1.66948 1.10742,2.67188 0,2.08737 -1.69385,3.7793 -3.78125,3.7793 -2.08734,0 -3.77929,-1.69193 -3.77929,-3.7793 0,-2.08739 1.69195,-3.7793 3.77929,-3.7793 z m 34.74805,0 c 1.00238,0 1.96503,0.39863 2.67383,1.10742 .7088,0.70878 1.10547,1.66948 1.10547,2.67188 0,2.08737 -1.6919,3.7793 -3.7793,3.7793 -2.08734,0 -3.7793,-1.69193 -3.7793,-3.7793 0,-2.08739 1.69196,-3.7793 3.7793,-3.7793 z" + "m 67.558587,0 c 1.00244,0 1.96308,0.39863 2.67188,1.10742 .7088,0.70878 1.10742,1.66948 1.10742,2.67188 0,2.08737 -1.6919,3.7793 -3.7793,3.7793 -2.08734,0 -3.77929,-1.69193 -3.77929,-3.7793 0,-2.08739 1.69195,-3.7793 3.77929,-3.7793 z m 33.00782,0 c 1.00244,0 1.96307,0.39863 2.67187,1.10742 .7088,0.70878 1.10742,1.66948 1.10742,2.67188 0,2.08737 -1.69189,3.7793 -3.77929,3.7793 -2.08734,0 -3.7793,-1.69193 -3.7793,-3.7793 0,-2.08739 1.69196,-3.7793 3.7793,-3.7793 z m -68.38477,1.36524 c 1.00238,0 1.96308,0.39862 2.67188,1.10742 .7088,0.7088 1.10742,1.66947 1.10742,2.67187 0,2.08737 -1.6919,3.7793 -3.7793,3.7793 -2.08734,0 -3.7793,-1.69193 -3.7793,-3.7793 0,-2.08737 1.69196,-3.77929 3.7793,-3.77929 z m -440.83789,1.91211 10.125,0.68945 -0.125,13.5000001 -8.375,-6.3125001 h -2.125 z m -60.46289,2.13281 c .92716,-0.01619 1.8579,0.21019 2.69531,0.67969 1.67482,0.93895 2.71503,2.70689 2.7207,4.62695 l -5.32226,0.01562 -5.32031,0.16993 c -0.0614,-1.9191 .91563,-3.72186 2.55664,-4.71875 .82051,-0.49844 1.74276,-0.75725 2.66992,-0.77344 z m 31.75,0.25 c .92716,-0.01619 1.8579,0.21019 2.69531,0.67969 1.67482,0.93895 2.71503,2.70689 2.7207,4.62695 l -5.32226,0.01562 -5.32031,0.16993 c -0.0614,-1.9191 .91563,-3.72186 2.55664,-4.71875 .82051,-0.49844 1.74276,-0.75725 2.66992,-0.77344 z m -95.25195,0.24805 c .92716,-0.01619 1.8579,0.21019 2.69531,0.67968 1.67482,0.93895 2.71503,2.7069 2.7207,4.62696 l -5.32226,0.01562 -5.32032,0.16992 c -0.0614,-1.9191 .91563,-3.72186 2.55664,-4.71875 .82051,-0.49843 1.74277,-0.75724 2.66993,-0.77343 z m 31.75,0 c .92716,-0.01619 1.85985,0.21019 2.69726,0.67968 1.67482,0.93895 2.71308,2.7069 2.71875,4.62696 l -5.32226,0.01562 -5.32032,0.16992 c -0.0614,-1.9191 .91563,-3.72186 2.55664,-4.71875 .82051,-0.49843 1.74277,-0.75724 2.66993,-0.77343 z m 500.214843,14.3105401 48.437497,0.0586 v 6.18945 H 94.844083 Z m -6.875,0.0586 v 6.12695 h -28.25 l -2.1875,-0.81445 -2.5,-1.24805002 -2.625,-1.12305 -1.5625,-0.37695 -1.875,0.3125 -1,0.8125 -1.68945,2.37500002 h -6.93555 v -5.75195 z m 62.999997,0.12695 h 48.875 v 6.18555 h -48.875 z m -86.437497,8.6875 181.187497,0.3125 v 4.6874999 l -2.625,2.875 h -6.6875 l -1.5625,-4.3769499 -1.0625,-0.62305 H 70.656583 l -4.6875,-2.1875 z m -18.6875,0.49805 .06445,1.50195 -1.93945,6.0624999 h -14.3125 l .5,-0.87695 3.5625,-6.5605499 z M -257.53092,24.856639 h 19.8125 v 1.5 h 8.31055 v -1.5 l 78.87695,0.12305 v 5.18945 h -107 z m 389.12305,32.1875 35.87695,0.25195 -1.56055,10.49805 -2.6875,12 -2.12695,6.12695 -2.87305,4.12305 -5.3125,7.1875 -4.25195,2.74805 -5.9375,2.814451 -5.6875,1.625 -6.49805,0.625 h -29.37695 l -1.876947,-4.43555 8.814447,-43.439451 h 19 l -0.0625,5.9375 5.375,23.50195 2.6875,11.56055 3.18555,4.312501 .56445,-4.687501 z");
							radiusDiv = 60;
							break;
						case 239: // TM-9 SMG
							path = new Path2D("M 1135.3125 -248.625 L 1135.3125 -246.6875 L 1138.9707 -243.03125 L 1138.9707 -237.49805 L 1123.4375 -237.49805 L 1121.873 -246.3125 L 1119.6875 -247.75 L 1106.0625 -247.75 L 1106.5488 -245.9375 L 1108.9062 -241.85547 L 1108.9062 -235.81445 L 1092.873 -235.81445 L 1091.8145 -243.9375 L 1089.75 -245.81445 L 1075.9375 -245.81445 L 1075.9375 -243.75 L 1078.4375 -241 L 1078.4375 -235.625 L 1061.375 -235.625 L 1060.127 -243.12695 L 1058.127 -245.49805 L 1044.873 -245.49805 L 1044.873 -243.12695 L 1047.625 -240.5625 L 1047.625 -235.0625 L 1030.75 -235.0625 L 1029.502 -243.6875 L 1027.25 -245.81445 L 1013.3125 -245.81445 L 1013.3125 -244 L 1015.9375 -241.5625 L 1015.9375 -235.18555 L 999.6875 -235.18555 L 998.81445 -243.3125 L 996.81445 -245.5625 L 983 -245.5625 L 983 -243.4375 L 985.5625 -241.375 L 985.5625 -235.5625 L 970.18555 -235.5625 L 968.5625 -244.25 L 966.25 -246.18555 L 952.0625 -246.18555 L 952.0625 -244.3125 L 954.6875 -241.625 L 954.6875 -235.0625 L 939.5625 -235.0625 L 937.5625 -243.81445 L 935.4375 -245.75 L 921.625 -245.75 L 921.625 -243.3125 L 924.5625 -240.375 L 924.5625 -233.625 L 908.50195 -233.625 L 907.4375 -241.49805 L 905.6875 -244.3125 L 890.25 -244.3125 L 890.25 -242.12695 L 893.375 -240.3125 L 893.375 -233.87305 L 878.50195 -233.87305 L 877.75 -242.12695 L 876 -244.25 L 859.50195 -244.25 L 859.50195 -242.18555 L 862.6875 -239.75 L 862.6875 -233.375 L 845.81445 -233.375 L 845.81445 -244.0625 L 829.5625 -244.0625 L 829.5625 -241.81445 L 832.85742 -239.91016 L 832.85742 -233.6875 L 816.4375 -233.6875 L 815.25 -241.87305 L 813.0625 -244.375 L 800 -244.375 L 800 -241.75 L 802.81445 -239.12695 L 802.81445 -233.4375 L 785.6875 -233.4375 L 785 -240.75 L 783.25 -243.75 L 769.3125 -243.75 L 769.3125 -241.375 L 772.18555 -239 L 772.18555 -233.49805 L 756.50195 -233.49805 L 754.625 -242.18555 L 752.12695 -244.75 L 739.0625 -244.75 L 739.0625 -242.12695 L 741.50195 -240.12695 L 741.50195 -233.625 L 725 -233.625 L 723.75 -242.87305 L 721.4375 -245.3125 L 708.75 -245.3125 L 708.75 -242.9375 L 711.4375 -240.25 L 711.4375 -235.0625 L 694.75 -235.0625 L 693.50195 -243.25 L 691.50195 -245.75 L 683.875 -247.5625 L 648.875 -247.5625 L 648.875 -237.18555 L 631.50195 -237.18555 L 631.50195 -245.87305 L 617.75 -245.87305 L 617.75 -237.5625 L 601.9375 -237.5625 L 601.9375 -246.18555 L 588.875 -246.18555 L 588.875 -237.6875 L 571 -237.6875 L 571 -247.0625 L 557.12695 -247.0625 L 557.12695 -237.6875 L 540.18555 -237.6875 L 540.18555 -247.375 L 526.12695 -247.375 L 526.12695 -237.49805 L 509.5625 -237.49805 L 509.5625 -246.12695 L 496.5625 -246.12695 L 496.5625 -237.81445 L 479.6875 -237.81445 L 479.6875 -246.49805 L 465.5625 -246.49805 L 465.5625 -237.4375 L 448.4375 -237.4375 L 448.4375 -246.4375 L 435.0625 -246.4375 L 435.0625 -237.6875 L 417.875 -237.6875 L 417.875 -246.375 L 405.6875 -246.375 L 405.6875 -237.49805 L 388.4375 -237.49805 L 388.4375 -246.6875 L 374.75 -246.6875 L 374.75 -237.18555 L 357.18555 -237.18555 L 357.18555 -247 L 343.25 -247 L 343.25 -237.25 L 326.3125 -237.25 L 326.3125 -246.18555 L 312.81445 -246.18555 L 312.81445 -237.4375 L 296.75 -237.4375 L 296.75 -247.12695 L 283.25 -247.12695 L 283.25 -237.5625 L 265.81445 -237.5625 L 265.81445 -248 L 129.25" + " -248 L 127.75 -246.81445 L 127.75 -241.6875 L 100.625 -241.6875 L 98.375 -240.375 L 96.625 -236.25 L 96.25 -229.87305 L 94.625 -226.25 L 94.126953 -222.5625 L 94.5625 -218.87305 L 95.6875 -217.6875 L 98.185547 -216.9375 L 100.6875 -214.81445 L 101.81445 -212.49805 L 101.4375 -209.49805 L 99.814453 -208.18555 L 95.3125 -207.49805 L 84.873047 -207.49805 L 83.822266 -211.42969 L 78.5625 -211.42969 L 77.458984 -207.31445 L 54.873047 -207.31445 L 52.3125 -205.375 L 52.3125 -198.25 L 50.0625 -198.25 L 50.0625 -201.25 L 47.126953 -201.25 L 47.126953 -198.375 L 44.5625 -198.375 L 44.5625 -201.0625 L 42.185547 -201.0625 L 42.185547 -198.49805 L 39.9375 -198.49805 L 39.9375 -201.375 L 38 -201.375 L 38 -198.625 L 35.25 -198.625 L 35.25 -201.3125 L 32.5625 -201.3125 L 32.5625 -198.625 L 30.185547 -198.625 L 30.185547 -201.625 L 27.5625 -201.625 L 27.5625 -198.75 L 24.873047 -198.75 L 24.873047 -202.87305 L 22.375 -202.87305 L 22.375 -209.4375 L -462.49805 -213 L -466.12695 -218.625 L -479.25 -218.87305 L -498.375 -218.12695 L -512.12695 -217.12695 L -522.625 -216.375 L -531 -214.625 L -535.49805 -211.75 L -539.25 -206.75 L -540.49805 -201.375 L -541.375 -192.25 L -541.12695 -169.75 L -539.625 -155.49805 L -537.12695 -145.625 L -535.375 -132.87305 L -535.12695 -121.87305 L -534.875 -112.49805 L -531 -107.87305 L -531.375 -86.498047 L -531.25 -76.25 L -529 -69 L -526.875 -58.375 L -526.875 -35.498047 L -523.375 -27.375 L -522 -15.126953 L -522 -1 L -520 7.625 L -518.625 18.625 L -518.625 34 L -518.625 46.625 L -514 65.375 L -513.75 76.75 L -511 86.625 L -511 108.75 L -506 128.50195 L -506 152 L -501.49805 169.50195 L -501.49805 186 L -500.625 194.50195 L -497.625 203.375 L -493 209.50195 L -487 212.87305 L -478 213.25 L -463.625 212 L -449.25 209.87305 L -441.625 207.12695 L -424.12695 207.12695 L -414.49805 200.12695 L -414.625 192.375 L -413.25 186.25 L -410.12695 177.25 L -404 155.50195 L -396.12695 130.25 L -386.25 91.75 L -379 68 L -376.12695 59.873047 L -372.87305 54.75 L -366.625 49.75 L -359.625 46.75 L -350.75 44.873047 L -248.375 46.625 L -240.625 45.625 L -231.12695 43.126953 L -82.873047 -12 L -67.498047 -16.873047 L -44.498047 -22.126953 L -17.25 -27.126953 L 2.75 -30.625 L 8.5019531 -33.25 L 12.625 -38.498047 L 14.873047 -46.375 L 20.873047 -73.126953 L 21.3125 -114.3125 L 23.25 -116.6875 L 25.3125 -113.375 L 28 -116.4375 L 30.5625 -112.81445 L 33.375 -116.18555 L 35.873047 -112.49805 L 38.25 -116.25 L 40.9375 -112.625 L 42.6875 -116 L 46 -112.375 L 48.126953 -115.375 L 52.0625 -111.375 L 52.0625 -104.75 L 76 -104.75 L 76 -50.126953 L 83.25 -50.126953 L 82.625 -43.873047 L 81.126953 -39.873047 L 81.501953 -36.873047 L 83.501953 -34 L 88.25 -30.375 L 94.625 -27.873047 L 102.625 -22.625 L 109.375 -16.126953 L 114.12695 -9 L 119.375 1.25 L 122.625 11.501953 L 123.375 20.625 L 123.12695 30.375 L 120.50195 41.873047 L 115.87305 53.25 L 108.75 64.126953 L 103 71.126953 L 94.501953 81.75 L 87.25 93.25 L 81.375 101.375 L 73.126953 113.625 L 66.75 123.87305 L 60.501953 135.375 L 53.25 146.25 L 47.75 154.12695 L 42.625 163.625 L 38.625 171.25 L 32.126953 182.25 L 27.625 190.75 L 19.873047 204.75 L 13.25 219.87305 L 6.25 232.75 L 3.5019531 237.75 L 3.25 241.12695 L 4.625 244.12695 L 6.75 246.625" + " L 18.873047 253.50195 L 31.126953 259.875 L 75.375 280.50195 L 106.50195 294 L 136 306.375 L 147.625 310.875 L 151.87305 311.375 L 155.12695 309.875 L 157.87305 306 L 159.75 300 L 160.25 293.875 L 159.12695 288.375 L 156.375 284.25 L 154.25 280.12695 L 154.12695 276.12695 L 155.25 272.875 L 157.87305 267.375 L 162.75 256.875 L 171.375 239.50195 L 184.75 209.50195 L 194.375 188.375 L 206.25 164.12695 L 218.12695 140.50195 L 225.375 125 L 232 109.87305 L 236 102.12695 L 239.87305 97.501953 L 243.375 95.126953 L 249.12695 94.126953 L 259.50195 94.126953 L 262 91.625 L 281.75 91.625 L 288.625 92.501953 L 295.75 96.126953 L 301 100.375 L 309.75 105.50195 L 318 110.12695 L 324.375 111.75 L 331.12695 112.87305 L 339.625 111.87305 L 350.625 110.12695 L 369 106.50195 L 391.75 102.25 L 414.625 98.75 L 430.375 95.873047 L 444.75 94.625 L 455.50195 92.625 L 458.75 93.126953 L 460.375 95.375 L 459.87305 99.375 L 456 104.75 L 439.625 159.12695 L 428.625 198.75 L 420.625 218.75 L 409.87305 254 L 399.375 291.12695 L 383.625 342 L 368.75 394.625 L 364.375 408.50195 L 361.87305 411.50195 L 358 412.75 L 355.12695 415.12695 L 353.87305 418.875 L 353.25 422.625 L 353.87305 425.75 L 355.25 428.875 L 356.625 433.25 L 356.625 441.50195 L 357.99414 443.87695 L 361 445 L 364.25 445 L 394.75 442.875 L 464.12695 441.75 L 470.375 441 L 473.375 439.25 L 475.375 436.12695 L 476.375 431.75 L 476.12695 426.50195 L 475.375 421.875 L 473.25 416.75 L 471.50195 413 L 471.25 409.75 L 472.12695 404.50195 L 474.75 397.12695 L 481.75 372.375 L 488.25 351 L 497.25 318.875 L 504 297.875 L 536.75 183.75 L 566.25 86 L 569.75 72.501953 L 592.75 69.625 L 603.25 66.873047 L 606.375 64.126953 L 606.25 61.501953 L 603.50195 58.625 L 600.125 55.501953 L 597.375 51.375 L 596.125 46.126953 L 597.125 41.375 L 600.25 35 L 606.75 10.625 L 617.375 -26.375 L 621.125 -39.375 L 623.75 -48.873047 L 625.625 -53 L 628.87305 -56.75 L 634.25 -60.375 L 640.375 -63.25 L 650.50195 -65.126953 L 661.75 -67.126953 L 668.87305 -68.625 L 675.125 -70.25 L 679.75 -73.75 L 682.125 -78.375 L 684.25 -87.126953 L 687.625 -81.873047 L 692.625 -76.375 L 698 -71.75 L 701.50195 -69.873047 L 707.75 -69.126953 L 716.75 -70 L 805.125 -70 L 828.125 -92.375 L 937.625 -94.498047 L 940.50195 -92.498047 L 941.25 -89.873047 L 939.87305 -87.873047 L 937.12695 -86.873047 L 921.25 -86.873047 L 917 -85.75 L 915.25 -82.625 L 916.50195 -80.873047 L 919.25 -79.126953 L 920.375 -75.873047 L 920 -73.498047 L 917.625 -71 L 915.625 -67.625 L 912.50195 -66.498047 L 911.375 -63.873047 L 912.75 -60.75 L 913.75 -53.75 L 917 -49.25 L 923.50195 -42.625 L 928.12695 -36.126953 L 932.625 -26.625 L 934.625 -18.75 L 934.87305 -12.25 L 933.50195 -6.4980469 L 928.75 5 L 925 10.625 L 923.12695 16.25 L 922.87305 23 L 924 56.25 L 927.25 56.25 L 927.25 61.25 L 924.625 61.25 L 924.625 64.75 L 927.12695 64.75 L 927.12695 67.4375 L 924.56641 68.123047 L 924.56641 70.4375 L 927 71.3125 L 927 74 L 924.81445 74 L 924.81445 76.9375 L 926.87305 76.9375 L 926.87305 79.25 L 924.87305 79.25 L 924.87305 82.375 L 926.87305 82.375 L 926.87305 85.375 L 924.87305 85.375 L 924.87305 88.4375 L 926.75 88.4375 L 926.75 91 L 924.75 91 L 924.75 94.0625 L 926.81445 94.0625 L 926.81445 97.501953 L 924.6875 97.501953 L 924.6875 100.9375" + " L 926.75 100.9375 L 926.75 103.50195 L 924.9375 103.50195 L 924.9375 107 L 926.9375 107 L 926.9375 109.6875 L 925 109.6875 L 925 112.75 L 926.9375 112.75 L 926.9375 114.9375 L 925.25 114.9375 L 925.25 118.87305 L 926.6875 118.87305 L 926.6875 121.81445 L 925.10938 122.23633 L 925.10938 125.25 L 926.6875 125.25 L 926.6875 127.18555 L 925 127.18555 L 925 130.4375 L 926.625 130.4375 L 926.625 133.75 L 925.12695 133.75 L 925.12695 159.25 L 922.18555 162.75 L 922.18555 178.81445 L 922.6875 181.12695 L 924.6875 183.9375 L 927.9375 186.18555 L 932.6875 187.81445 L 938.12695 188.4375 L 1030.4375 188.4375 L 1036.625 188.12695 L 1041.873 187.0625 L 1044.625 185.4375 L 1046.25 183.18555 L 1046.9375 180.12695 L 1046.9375 136 L 1044.8145 136 L 1044.8145 131.9375 L 1047.625 131.9375 L 1047.625 128.18555 L 1044.9375 128.18555 L 1044.9375 125.0625 L 1047.9375 125.0625 L 1047.9375 122.12695 L 1045.0625 122.12695 L 1045.0625 119.18555 L 1048.0625 119.18555 L 1048.0625 116.375 L 1045.1855 116.375 L 1045.1855 113.4375 L 1048.1855 113.4375 L 1048.1855 110 L 1045.127 110 L 1045.127 107.6875 L 1047.625 107.6875 L 1047.625 104.625 L 1045.3125 104.625 L 1045.3125 101.18555 L 1048 101.18555 L 1048 98.25 L 1045.127 98.25 L 1045.127 95.873047 L 1047.8145 95.873047 L 1047.8145 92.501953 L 1045.1855 92.501953 L 1045.1855 89 L 1047.75 89 L 1047.75 85.9375 L 1045.127 85.9375 L 1045.7324 83.671875 L 1048.0625 83.671875 L 1048.0625 80.75 L 1045.25 80.75 L 1045.25 77 L 1048.0625 77 L 1048.0625 74.0625 L 1045.127 74.0625 L 1045.127 70.9375 L 1048.127 70.9375 L 1048.127 67.3125 L 1045.1855 67.3125 L 1045.1855 63.814453 L 1047.8145 63.814453 L 1047.8145 61.0625 L 1045.127 61.0625 L 1045.127 57.3125 L 1047.873 57.3125 L 1047.873 16.9375 L 1046.873 12.185547 L 1044.6875 6.6875 L 1041.8145 .6875 L 1039.5625 -3.6875 L 1037.1855 -9.625 L 1036.625 -14.6875 L 1036.873 -20.25 L 1038.1855 -25.498047 L 1040.127 -30.25 L 1043.3125 -35.625 L 1047.4375 -41.814453 L 1051.375 -46.25 L 1054.6875 -50 L 1057.75 -53.4375 L 1057.75 -66.126953 L 1064.75 -66.126953 L 1064.75 -80.625 L 1063 -95.75 L 1204.127 -95.75 L 1208.375 -113.87305 L 1208.375 -125.75 L 1213.375 -125.75 L 1213.375 -128.3125 L 1216.502 -128.3125 L 1216.502 -121.49805 L 1233.625 -121.49805 L 1235.502 -123.87305 L 1235.502 -130.25 L 1240.8145 -130.25 L 1240.8145 -123.625 L 1242.873 -121.25 L 1254.127 -121.25 L 1256.127 -123.87305 L 1256.127 -130.4375 L 1260.75 -130.4375 L 1260.75 -123.6875 L 1263.375 -121.25 L 1273.127 -121.25 L 1273.127 -124 L 1335.25 -124 L 1335.25 -121.12695 L 1347.75 -121.12695 L 1351.5625 -121.625 L 1354.1855 -123.49805 L 1355.625 -126.75 L 1356 -131.4375 L 1356.6875 -140.4375 L 1356.6875 -164.375 L 1356.127 -173 L 1354.75 -180.375 L 1352.75 -184.25 L 1350.127 -186.25 L 1345.873 -186.87305 L 1341.873 -186.75 L 1337 -186.12695 L 1332.375 -184.75 L 1325.127 -184.375 L 1279.127 -184.375 L 1274.375 -185.625 L 1270.625 -186.75 L 1265.9375 -187.375 L 1261.873 -187.0625 L 1260.4375 -186.12695 L 1259.9375 -184.75 L 1259.9375 -178.81445 L 1259.9375 -176.6875 L 1255.873 -176.6875 L 1253.8145 -176.6875 L 1253.8145 -183.25 L 1251.6895 -185.37305 L 1243.5625 -185.37305 L 1241.1895 -183 L 1241.1895 -176.3125 L 1235.6875 -176.3125 L 1235.6875 -182.87305 L 1233.1895 -185.37305 L 1216.5625 -185.37305 L 1216.5625 -179.9375" + " L 1207.625 -182.0625 L 1207.625 -193.0625 L 1206.3125 -203.625 L 1181.75 -227.6875 L 1164.6875 -245.3125 L 1159.8145 -247.9375 L 1156 -248.625 L 1135.3125 -248.625 z M 752.50195 -225.87305 L 762.18555 -225.3125 L 765 -223.18555 L 766.81445 -219.9375 L 767.125 -216.4375 L 765.4375 -213.375 L 761 -210.3125 L 755.0625 -209.625 L 744.18555 -209.625 L 740.0625 -211.18555 L 737.87305 -213.3125 L 736.5625 -216.12695 L 736.5625 -218.5625 L 738.9375 -223.18555 L 742.75 -225.375 L 752.50195 -225.87305 z M 813.50195 -225.87305 L 823.18555 -225.3125 L 826 -223.18555 L 827.81445 -219.9375 L 828.125 -216.4375 L 826.4375 -213.375 L 822 -210.3125 L 816.0625 -209.625 L 805.18555 -209.625 L 801.0625 -211.18555 L 798.87305 -213.3125 L 797.5625 -216.12695 L 797.5625 -218.5625 L 799.9375 -223.18555 L 803.75 -225.375 L 813.50195 -225.87305 z M 874.50195 -225.87305 L 884.18555 -225.3125 L 887 -223.18555 L 888.81445 -219.9375 L 889.125 -216.4375 L 887.4375 -213.375 L 883 -210.3125 L 877.0625 -209.625 L 866.18555 -209.625 L 862.0625 -211.18555 L 859.87305 -213.3125 L 858.5625 -216.12695 L 858.5625 -218.5625 L 860.9375 -223.18555 L 864.75 -225.375 L 874.50195 -225.87305 z M 935.50195 -225.87305 L 945.18555 -225.3125 L 948 -223.18555 L 949.81445 -219.9375 L 950.125 -216.4375 L 948.4375 -213.375 L 944 -210.3125 L 938.0625 -209.625 L 927.18555 -209.625 L 923.0625 -211.18555 L 920.87305 -213.3125 L 919.5625 -216.12695 L 919.5625 -218.5625 L 921.9375 -223.18555 L 925.75 -225.375 L 935.50195 -225.87305 z M 996.50195 -225.87305 L 1006.1855 -225.3125 L 1009 -223.18555 L 1010.8145 -219.9375 L 1011.127 -216.4375 L 1009.4375 -213.375 L 1005 -210.3125 L 999.0625 -209.625 L 988.18555 -209.625 L 984.0625 -211.18555 L 981.87305 -213.3125 L 980.5625 -216.12695 L 980.5625 -218.5625 L 982.9375 -223.18555 L 986.75 -225.375 L 996.50195 -225.87305 z M 1057.502 -225.87305 L 1067.1855 -225.3125 L 1070 -223.18555 L 1071.8145 -219.9375 L 1072.125 -216.4375 L 1070.4375 -213.375 L 1066 -210.3125 L 1060.0625 -209.625 L 1049.1855 -209.625 L 1045.0625 -211.18555 L 1042.873 -213.3125 L 1041.5625 -216.12695 L 1041.5625 -218.5625 L 1043.9375 -223.18555 L 1047.75 -225.375 L 1057.502 -225.87305 z M 1121.002 -225.87305 L 1130.6875 -225.3125 L 1133.502 -223.18555 L 1135.3145 -219.9375 L 1135.627 -216.4375 L 1133.9395 -213.375 L 1129.502 -210.3125 L 1123.5645 -209.625 L 1112.6875 -209.625 L 1108.5645 -211.18555 L 1106.375 -213.3125 L 1105.0625 -216.12695 L 1105.0625 -218.5625 L 1107.4375 -223.18555 L 1111.252 -225.375 L 1121.002 -225.87305 z M 957.375 -204.00195 L 976.81445 -204.00195 L 981.625 -203.06641 L 985.18945 -201.06641 L 985.9375 -198.06641 L 984.75 -194.75 L 981.87695 -191.93945 L 978.0625 -189.93945 L 972 -188.87695 L 964.375 -188.62695 L 956.6875 -188.93945 L 950.25195 -189.68945 L 946.56445 -191.50195 L 945.4375 -193.18945 L 945.25195 -195.31445 L 945.75 -198.4375 L 947.75 -201.00195 L 951.3125 -202.87695 L 957.375 -204.00195 z M 1017.375 -204.00195 L 1036.8145 -204.00195 L 1041.625 -203.06641 L 1045.1895 -201.06641 L 1045.9375 -198.06641 L 1044.75 -194.75 L 1041.877 -191.93945 L 1038.0625 -189.93945 L 1032 -188.87695 L 1024.375 -188.62695 L 1016.6875 -188.93945 L 1010.252 -189.68945 L 1006.5645 -191.50195 L 1005.4375 -193.18945 L 1005.252 -195.31445 L 1005.75 -198.4375 L 1007.75 -201.00195 L 1011.3125 -202.87695" + " L 1017.375 -204.00195 z M 1080.127 -204.00195 L 1099.5645 -204.00195 L 1104.375 -203.06641 L 1107.9395 -201.06641 L 1108.6875 -198.06641 L 1107.502 -194.75 L 1104.627 -191.93945 L 1100.8145 -189.93945 L 1094.75 -188.87695 L 1087.127 -188.62695 L 1079.4375 -188.93945 L 1073.002 -189.68945 L 1069.3145 -191.50195 L 1068.1895 -193.18945 L 1068.002 -195.31445 L 1068.502 -198.4375 L 1070.502 -201.00195 L 1074.0625 -202.87695 L 1080.127 -204.00195 z M 1141.375 -204.00195 L 1160.8145 -204.00195 L 1165.625 -203.06641 L 1169.1895 -201.06641 L 1169.9375 -198.06641 L 1168.75 -194.75 L 1165.877 -191.93945 L 1162.0625 -189.93945 L 1156 -188.87695 L 1148.375 -188.62695 L 1140.6875 -188.93945 L 1134.252 -189.68945 L 1130.5645 -191.50195 L 1129.4375 -193.18945 L 1129.252 -195.31445 L 1129.75 -198.4375 L 1131.75 -201.00195 L 1135.3125 -202.87695 L 1141.375 -204.00195 z M 834.625 -202.75 L 854.0625 -202.75 L 858.87305 -201.81445 L 862.4375 -199.81445 L 863.18555 -196.81445 L 862 -193.49805 L 859.125 -190.6875 L 855.3125 -188.6875 L 849.25 -187.625 L 841.625 -187.375 L 833.9375 -187.6875 L 827.50195 -188.4375 L 823.81445 -190.25 L 822.6875 -191.9375 L 822.50195 -194.0625 L 823 -197.18555 L 825 -199.75 L 828.5625 -201.625 L 834.625 -202.75 z M 895.125 -202.75 L 914.56445 -202.75 L 919.375 -201.81445 L 922.93945 -199.81445 L 923.6875 -196.81445 L 922.50195 -193.49805 L 919.62695 -190.6875 L 915.81445 -188.6875 L 909.75 -187.625 L 902.125 -187.375 L 894.4375 -187.6875 L 888.00195 -188.4375 L 884.31445 -190.25 L 883.18945 -191.9375 L 883.00195 -194.0625 L 883.50195 -197.18555 L 885.50195 -199.75 L 889.0625 -201.625 L 895.125 -202.75 z M 1328.502 -160.25 L 1333.25 -158.75 L 1335.25 -155.75 L 1333 -151.49805 L 1326.25 -149.49805 L 1291 -149.49805 L 1288.75 -156.49805 L 1309 -159.25 L 1328.502 -160.25 z M 1080.127 -119.625 L 1099.5645 -119.625 L 1104.375 -118.6875 L 1107.9395 -116.6875 L 1108.6875 -113.6875 L 1107.502 -110.37305 L 1104.627 -107.5625 L 1100.8145 -105.5625 L 1094.75 -104.49805 L 1087.127 -104.25 L 1079.4375 -104.5625 L 1073.002 -105.3125 L 1069.3145 -107.12305 L 1068.1895 -108.81055 L 1068.002 -110.9375 L 1068.502 -114.06055 L 1070.502 -116.625 L 1074.0625 -118.49805 L 1080.127 -119.625 z M 1141.375 -119.625 L 1160.8145 -119.625 L 1165.625 -118.6875 L 1169.1895 -116.6875 L 1169.9375 -113.6875 L 1168.75 -110.37305 L 1165.877 -107.5625 L 1162.0625 -105.5625 L 1156 -104.49805 L 1148.375 -104.25 L 1140.6875 -104.5625 L 1134.252 -105.3125 L 1130.5645 -107.12305 L 1129.4375 -108.81055 L 1129.252 -110.9375 L 1129.75 -114.06055 L 1131.75 -116.625 L 1135.3125 -118.49805 L 1141.375 -119.625 z M 1030.375 -118.97656 L 1039.375 -118.72461 L 1045.252 -116.60156 L 1047.375 -112.35156 L 1047.127 -108.84961 L 1043.75 -105.97656 L 1041.252 -105.97656 L 1041.252 -108.35156 L 1032.877 -110.09961 L 1028.877 -110.09961 L 1022 -108.35156 L 1021.0742 -104.89844 L 1007.75 -105.22656 L 1006.252 -108.72461 L 1007.625 -112.09961 L 1010.877 -115.22656 L 1016.502 -117.72461 L 1021.127 -118.60156 L 1030.375 -118.97656 z M 968.625 -118.75 L 977.625 -118.49805 L 983.50195 -116.375 L 985.625 -112.12695 L 985.375 -108.625 L 982 -105.75 L 979.50195 -105.75 L 979.50195 -108.12695 L 971.12695 -109.87305 L 967.12695 -109.87305 L 960.25 -108.12695 L 959.32227 -104.67188 L 946 -105 L 944.50195 -108.49805 L 945.87305 -111.87305 L 949.12695 -115 L 954.75 -117.49805 L 959.375 -118.375 L 968.625 -118.75 z M 834.625 -116.50391 L 854.0625 -116.50391 L 858.87305 -115.56641" + " L 862.4375 -113.56641 L 863.18555 -110.56641 L 862 -107.25195 L 859.125 -104.44141 L 855.3125 -102.44141 L 849.25 -101.37891 L 841.625 -101.12891 L 833.9375 -101.44141 L 827.50195 -102.19141 L 823.81445 -104.00195 L 822.6875 -105.68945 L 822.50195 -107.81641 L 823 -110.93945 L 825 -113.50391 L 828.5625 -115.37891 L 834.625 -116.50391 z M 895.125 -116.50391 L 914.56445 -116.50391 L 919.375 -115.56641 L 922.93945 -113.56641 L 923.6875 -110.56641 L 922.50195 -107.25195 L 919.62695 -104.44141 L 915.81445 -102.44141 L 909.75 -101.37891 L 902.125 -101.12891 L 894.4375 -101.44141 L 888.00195 -102.19141 L 884.31445 -104.00195 L 883.18945 -105.68945 L 883.00195 -107.81641 L 883.50195 -110.93945 L 885.50195 -113.50391 L 889.0625 -115.37891 L 895.125 -116.50391 z M -72.873047 -104.25 L -72 -94.375 L -76 -89.126953 L -88 -88.75 L -86.498047 -91 L -72.873047 -104.25 z M -386.875 -81.126953 L -268 -81.126953 L -271.875 -77.75 L -332 -49.75 L -339.49805 -45.75 L -344.375 -42.126953 L -344.375 -36.375 L -346.75 -32.873047 L -350.12695 -30.375 L -351.12695 -27 L -350.625 -23.625 L -347.875 -21.25 L -344 -22.126953 L -339.375 -24.873047 L -276.25 -42.498047 L -242.75 -52 L -218.12695 -57.375 L -177.375 -71.498047 L -172.25 -71.498047 L -172.25 -28.75 L -172.75 -23.375 L -176.12695 -17.75 L -182.375 -12.75 L -193.49805 -6.8730469 L -249.75 13 L -308.75 11.375 L -343.375 10.75 L -399.12695 10.75 L -418.375 12 L -435.375 12 L -439.75 10.25 L -444.12695 3.75 L -446.49805 -4.4980469 L -446.875 -16.126953 L -446.12695 -33 L -444.625 -43.375 L -444.49805 -49.25 L -444.375 -57.25 L -442.25 -61 L -439 -62 L -435.25 -61.25 L -431.25 -59 L -424.875 -55.375 L -417.875 -54.375 L -408 -55.375 L -399.25 -60.375 L -390.25 -69.126953 L -387.25 -78 L -386.875 -81.126953 z M -114.25 -80.126953 L -71.126953 -80.126953 L -65.75 -78.498047 L -62.625 -75.25 L -59.873047 -69.625 L -59 -65 L -59 -49.873047 L -59.873047 -46.375 L -63.25 -42.25 L -67.873047 -39.75 L -108.375 -24.873047 L -113.87305 -23.25 L -119.75 -23.25 L -122.625 -24.498047 L -125.75 -27.375 L -126.625 -31.126953 L -125.75 -35.625 L -125.75 -68.75 L -123.87305 -74.25 L -120.12695 -77.873047 L -114.25 -80.126953 z M -23.869141 -75.25 C -19.922219 -75.25 -16.1366 -73.681519 -13.345703 -70.890625 C -10.554808 -68.099724 -8.9863281 -64.314111 -8.9863281 -60.367188 C -8.9863281 -52.148148 -15.650101 -45.486328 -23.869141 -45.486328 C -32.088181 -45.486328 -38.75 -52.148148 -38.75 -60.367188 C -38.75 -68.586228 -32.088181 -75.25 -23.869141 -75.25 z M -148.58789 -51.302734 L -144.37305 -44 L -144.37305 -34.246094 L -148.81055 -29.810547 L -153.375 -34.375 L -153.375 -45.75 L -148.58789 -51.302734 z M 321.50195 -3.3535156 L 316.25 4.6464844 L 311.75 14.394531 L 310.25 23.894531 L 310.25 34.646484 L 311.75 44.394531 L 317.50195 59.144531 L 324.50195 70.144531 L 330.75 76.894531 L 335.25 77.646484 L 336 74.646484 L 332 68.646484 L 327.75 59.894531 L 324 50.144531 L 324 38.394531 L 326.25 27.394531 L 331 15.394531 L 342.50195 2.8945312 L 349 -2.3535156 L 393 -2.3535156 L 402.50195 -0.85546875 L 413.25 3.3945312 L 420.25 8.6464844 L 427.50195 16.646484 L 433 29.394531 L 434 40.894531 L 432.50195 48.394531 L 426.75 59.646484 L 419 71.144531 L 402.75 80.144531 L 383.50195 84.144531 L 351.50195 90.394531 L 339.50195 92.394531 L 329 91.646484 L 317 86.646484 L 305 79.646484 L 290.25 71.646484 L 283.75 62.646484 L 280.25 50.646484 L 279.25 40.144531 L 279.50195 30.394531 L 283 20.894531 L 289.75 11.894531 L 301.50195 2.1445312 L 315.50195 -2.6054688 L 321.50195 -3.3535156 z M -367.375 20 L -262.75 21.25 L -257.875 22.375 L -255 25.625 L -254.25 28.873047 L -255.25 33.126953 L -258.49805 35.25 L -270.12695 35.75 L -353.375 33.501953 L -370.12695 33.375 L -373 30.126953 L -372.875 26.25 L -371.12695 22.501953 L -367.375 20 z ");
							radiusDiv = 175;
							break;
						case 240: // Ship-22 Body
							path = new Path2D("m-505.57953 -92.94494l288.576 0l43.68721 40.416405l333.46558 0l66.132 -102.95984l289.97937 0l-97.996155 153.35243l97.59534 153.48001l-289.97934 0l-66.33188 -102.70404l-332.86493 0l-42.484802 40.544632l-291.7824 0l98.195984 -91.0648z");
							radiusDiv = 85;
							break;
						case 241: // Ninja Star
							path = new Path2D("m-0.34747374 -329.82632l0 93.29396l-234.10236 0l66.24147 69.01837l-165.43309 166.8189l96.763794 0l0 235.83989l69.71129 -67.62991l166.47244 167.16798l0 -98.49869l234.10498 0l-65.89502 -70.057755l165.08662 -166.12598l-96.76378 0l0 -237.57217l-70.404205 70.40419z");
							radiusDiv = 70;
							break;
						case 242: // Puzzle Piece
							path = new Path2D("m 4.7e-6,-0.77690113 a .19543078,0.19543078 0 0 0 -0.1954333,0.19542001 .19543078,0.19543078 0 0 0 .018262,0.082 H -0.5 v .34378 a .19543078,0.19543078 0 0 1 .1170201,-0.0392 A .19543078,0.19543078 0 0 1 -0.1875466,5.3887506e-4 .19543078,0.19543078 0 0 1 -0.3829799,0.19596888 .19543078,0.19543078 0 0 1 -0.5,0.15676886 v .3437201 h .3228437 a .19543078,0.19543078 0 0 0 -0.018272,0.082 .19543078,0.19543078 0 0 0 .1954333,0.19544 .19543078,0.19543078 0 0 0 .1954235,-0.19544 .19543078,0.19543078 0 0 0 -0.018263,-0.082 h .3228339 v -0.3437701 a .19543078,0.19543078 0 0 1 -0.1170102,0.0392 A .19543078,0.19543078 0 0 1 .1875559,4.8885506e-4 .19543078,0.19543078 0 0 1 .3829892,-0.19495114 a .19543078,0.19543078 0 0 1 .1170102,0.0392 v -0.34376 H .1771559 a .19543078,0.19543078 0 0 0 .018272,-0.082 A .19543078,0.19543078 0 0 0 4.4e-6,-0.77693113 Z");
							radiusDiv = 1 / 2;
							break;
						case 243: // Tommy Gun
							path = new Path2D("M 962.625 -146.49805 L 959.08203 -144.45312 L 959.08203 -133.375 L 955.25 -131.12695 L 953 -127.49805 L 951.625 -123.25 L 951.625 -101.75 L 741.875 -100.87305 L 741.875 -102.75 L 736.375 -102.75 L 735.68164 -100.16797 L 728.875 -100.16797 L 728.875 -103 L 724.625 -103 L 724.625 -100.375 L 718.50195 -100.375 L 718.50195 -102.87305 L 713.12695 -102.87305 L 713.12695 -100.49805 L 706.25 -100.49805 L 706.25 -102.75 L 701.375 -102.75 L 701.375 -100.49805 L 694.375 -100.49805 L 694.375 -102.87305 L 690.25 -102.87305 L 690.25 -100.375 L 681.875 -100.375 L 681.875 -102.75 L 677.75 -102.75 L 677.75 -98 L 672.25 -98 L 672.25 -102.75 L 666.25 -102.75 L 666.25 -98.126953 L 660.375 -98.126953 L 660.375 -102.625 L 654 -102.625 L 654 -97.25 L 647.875 -97.25 L 647.875 -103.75 L 643.80859 -102.66211 L 643.80859 -97.498047 L 635.75 -97.498047 L 635.75 -105.25 L 631.12695 -105.25 L 631.12695 -98.375 L 625.25 -98.375 L 625.25 -105.49805 L 618.875 -105.49805 L 618.875 -97.25 L 613 -97.25 L 613 -105.49805 L 607.625 -105.49805 L 607.625 -97.498047 L 600.625 -97.498047 L 600.625 -105.12695 L 595.625 -105.12695 L 595.625 -97.873047 L 589.625 -97.873047 L 589.625 -105.375 L 584.625 -105.375 L 584.625 -97.498047 L 577.50195 -97.498047 L 577.50195 -105.625 L 572.625 -105.625 L 572.625 -97.498047 L 566.12695 -97.498047 L 566.12695 -106.12695 L 560.75 -106.12695 L 560.75 -97.126953 L 553.75 -97.126953 L 553.75 -107.25 L 549.75 -107.25 L 549.75 -97.498047 L 541.75 -97.498047 L 541.75 -107.87305 L 537.75 -107.87305 L 537.75 -97.75 L 530.625 -97.75 L 530.625 -107.75 L 525.75 -107.75 L 525.75 -97.25 L 519.375 -97.25 L 519.375 -107.625 L 514.375 -107.625 L 514.375 -97.126953 L 507.25 -97.126953 L 507.25 -107.375 L 502.75 -107.375 L 502.75 -97.498047 L 494.75 -97.498047 L 494.75 -107.625 L 490.75 -107.625 L 490.75 -98 L 482.875 -98 L 482.875 -107.625 L 478.625 -107.625 L 478.625 -98 L 472.50195 -98 L 472.50195 -107.625 L 466.25 -107.625 L 466.25 -96.25 L 460.75 -96.25 L 460.75 -107.375 L 454.625 -107.375 L 454.625 -96.375 L 449.12695 -96.375 L 449.12695 -107.25 L 444.375 -107.25 L 444.375 -96.625 L 437.12695 -96.625 L 437.12695 -107 L 432.25 -107 L 432.25 -95.873047 L 425.12695 -95.873047 L 425.12695 -106.625 L 419.375 -106.625 L 419.375 -97 L 413.12695 -97 L 413.12695 -105.87305 L 403 -105.87305 L 403 -108.25 L 337.50195 -108.25 L 337.50195 -105.49805 L 207.12695 -105.49805 L 207.12695 -110.375 L 199.375 -110.375 L 199.12695 -115 L 201.375 -119.12695 L 204.375 -122 L 204.375 -136.75 L 199.06641 -142.06055 L 191.12695 -142.06055 L 191.12695 -144.625 L 181.25 -144.625 L 181.25 -142.12695 L 172.87305 -142.12695 L 167.375 -136.87305 L 167.375 -122.25 L 170.375 -118.87305 L 172.12695 -114.625 L 172.625 -110.49805 L 166.34375 -108.81641 L 166.34375 -104.25 L -159.375 -104.25 L -161.75 -116 L -165.87305 -131.625 L -169.75 -138.25 L -173.25 -141.375 L -176.87305 -143.12695 L -193.87305 -143.12695 L -193.87305 -146.25 L -313.375 -146.25 L -321.12695 -143.75 L -326 -139.12695 L -330.375 -131.49805 L -332.12695 -122.75 L -334.625 -112.75 L -336.12695 -103.12695 L -347.75 -103.12695 L -351.875 -99.498047 L -351.875 -78.498047 L -355.75 -76.375 L -358.49805 -73.25 L -360.12695 -67.498047" + " L -359.25 -62 L -356.75 -58.75 L -353.625 -55.625 L -350.49805 -54 L -350.49805 -24.25 L -347 -20 L -340.375 -20 L -340.375 -14.126953 L -334.875 -14.126953 L -334.875 -10.873047 L -361.12695 -8 L -361.12695 -12 L -382.49805 -12 L -382.49805 -4 L -390.75 -3.4980469 L -397.875 -1.8730469 L -406.375 1.375 L -412.75 4.5019531 L -420 8.5019531 L -428 9 L -434.25 6.5019531 L -439.12695 1.8730469 L -442.625 -3.1269531 L -445.625 -6.75 L -450.12695 -9.625 L -453 -10 L -458.625 -8.8730469 L -470.25 -5.375 L -533.375 11.625 L -613.375 31 L -695.625 52.873047 L -788.12695 80.375 L -808.25 84.501953 L -817 87.126953 L -823.75 91.375 L -828.75 96.75 L -832.875 102.625 L -836.12695 109.87305 L -837 116.625 L -835.25 124.375 L -832.75 131.75 L -831.75 141.75 L -830.12695 157.50195 L -827.12695 180.50195 L -827.25 197.87305 L -827.25 287.25 L -826.12695 308.25 L -824.875 316.50195 L -821.75 324.12695 L -817.25 332.12695 L -812 337.25 L -803.75 342.625 L -794.25 344.625 L -784.25 343.875 L -767.49805 339.25 L -741.625 329.75 L -712.75 317.50195 L -677.625 300.50195 L -642.75 282.625 L -616 265.625 L -586 245.25 L -559.875 226.625 L -526 201.25 L -503.625 186.25 L -470.75 165 L -442.625 149.12695 L -415.12695 134.50195 L -387.49805 122.625 L -340.625 105.87305 L -306.75 95.873047 L -246.625 81.25 L -211 75 L -198 71.375 L -185.25 62.625 L -162.12695 44.873047 L -150.49805 30.625 L -142.25 17 L -140.49805 1.5019531 L -91.25 1.5019531 L -80 4.8730469 L -69 10.873047 L -60.498047 19 L -54.75 27.126953 L -51.625 35 L -50.75 39.873047 L -51 45.625 L -52.375 54.126953 L -55.126953 65.375 L -57.625 71.75 L -63 80.501953 L -67.875 87.25 L -74.25 95.625 L -85.375 111.375 L -90.75 121.375 L -98.25 129.87305 L -107.75 141.25 L -114 152.87305 L -118.12695 160.375 L -119.875 168.75 L -119.875 176.50195 L -119.25 189.50195 L -116.875 199.625 L -114.12695 208 L -110.875 215.75 L -106.25 224.375 L -99.126953 233.375 L -91.126953 242.12695 L -80 250.75 L -67.25 257.375 L -52.75 262.75 L -40.375 266.75 L -30.126953 267.87305 L -19.875 267.25 L -13.875 264.75 L -11.375 259.75 L -13.498047 252.375 L -17.875 246.375 L -19.75 237.375 L -18.126953 229.25 L -13.625 221.375 L -6.25 214.375 L 4.375 208.50195 L 13.375 206.87305 L 18.75 205 L 19.25 201 L 16.873047 197.375 L 11.25 192.375 L 9 187.625 L 9.125 180.75 L 11.501953 173.75 L 17.75 164.375 L 25.375 153.75 L 34 143.12695 L 44.75 127.25 L 51.75 117.75 L 60.375 110.375 L 67.75 106.625 L 76 104.625 L 193 104.625 L 193 196.75 L 195.50195 221.12695 L 197.25 251.87305 L 200.12695 282.25 L 202.87305 299.375 L 207.25 311.625 L 211.50195 316.625 L 216.87305 319.25 L 230.25 319.625 L 262 319.625 L 262 322.625 L 289.12695 322.625 L 294.12695 321.375 L 296.875 316.375 L 299 309.50195 L 301 301 L 302.12695 278.375 L 302.875 261.25 L 304.875 236.12695 L 305.625 221.87305 L 305.25 196.87305 L 305.25 181.50195 L 308.12695 181.50195 L 308.12695 172.50195 L 313.625 166.12695 L 318.375 157.50195 L 318.875 151.375 L 318.875 146.375 L 335.375 146.375 L 335.375 139.375 L 332.875 137.25 L 329.625 133.75 L 325.625 132.87305 L 323 132.87305 L 323 116.75 L 320.375 110.75 L 317.375 105.12695 L 311.375 97.625 L 311.375 84 L 305.62695 78.251953 L 305.62695 2.8730469 L 302.12695 2.8730469 L 302.12695 -23.498047 L 407.875 -23.498047 L 411.875 8.1269531" + " L 415 30.75 L 416.25 34.126953 L 419.75 35.75 L 423.12695 34.873047 L 430.50195 31.25 L 452 18 L 471.12695 9.25 L 493.12695 1.375 L 510.375 -4.25 L 525.75 -8.1269531 L 537.375 -9.4980469 L 547.50195 -8.1269531 L 557.375 -4.625 L 564.50195 1.1269531 L 569.375 8 L 572.12695 18 L 571.50195 27.375 L 567.12695 37.375 L 560.25 46.873047 L 549.625 58.625 L 538.50195 70.126953 L 523.875 83 L 513.50195 94.625 L 505 104.25 L 499 113.75 L 494.25 125 L 491.375 134 L 489.50195 145.625 L 489.375 152.87305 L 490.875 163.375 L 493.625 175.25 L 498.25 186.87305 L 504.375 198.12695 L 514.50195 213.25 L 524.25 223.75 L 532.75 230 L 542.50195 232.87305 L 550.75 236.25 L 558.12695 240.25 L 569 241.75 L 577.875 242.12695 L 592.50195 240.87305 L 597.25 238 L 600.50195 234.12695 L 600.875 229.50195 L 598.25 225.12695 L 592.50195 220.87305 L 589.375 215.12695 L 587.375 209.25 L 586 202.25 L 587.12695 195.375 L 590.25 187.75 L 595.875 181.625 L 602.25 177.625 L 612 175.375 L 620.875 175.625 L 624.75 173.625 L 627 171.12695 L 627.12695 166.25 L 625.12695 163.25 L 623 158.87305 L 622.12695 152.25 L 623.50195 144.75 L 627.25 138.12695 L 634.75 131.75 L 642 127.87305 L 649 126.625 L 657.375 126.25 L 661.12695 123.50195 L 663.50195 119.625 L 662.12695 116.375 L 660 114.50195 L 657.875 107.75 L 657.50195 102.50195 L 659.625 96.126953 L 662.75 90.126953 L 668.625 84 L 676 80.375 L 686.625 77.75 L 698.75 77.501953 L 706.625 76 L 712.375 70.873047 L 712.25 66.625 L 709.50195 60.75 L 704.625 56.25 L 703.375 49.126953 L 704 40.75 L 706.75 31.501953 L 712.50195 20.501953 L 719.875 6.25 L 728.875 -4.75 L 738.875 -18.25 L 745.25 -29.625 L 747.25 -36 L 747.25 -40.873047 L 670.50195 -40.873047 L 664.875 -44.498047 L 661.50195 -49.625 L 659.75 -54.126953 L 659.75 -62.873047 L 666.625 -62.873047 L 666.625 -57.625 L 671.375 -57.625 L 671.375 -62.625 L 678.12695 -62.625 L 678.12695 -57.625 L 682.625 -57.625 L 682.625 -62.625 L 690.25 -62.625 L 690.25 -57.375 L 694.75 -57.375 L 694.75 -62.375 L 702.375 -62.375 L 703.67969 -57.503906 L 707 -57.503906 L 707 -62.498047 L 713.375 -62.498047 L 713.375 -59.375 L 719.12695 -59.375 L 719.12695 -62.873047 L 725.25 -62.873047 L 726.1582 -59.486328 L 730.875 -59.486328 L 730.875 -62.625 L 736.75 -62.625 L 736.75 -59.375 L 741.12695 -59.375 L 741.12695 -62.498047 L 951.50195 -64.625 L 951.50195 -58.873047 L 952.25 -54 L 954.12695 -49.75 L 957.375 -47.75 L 962.625 -47 L 975.12695 -47 L 988.375 -47.873047 L 993.625 -49.375 L 995.875 -52.498047 L 996.75 -55.25 L 997.375 -58.25 L 1089 -58.25 L 1094.375 -61.625 L 1097.625 -67.625 L 1099 -75.498047 L 1098.375 -87 L 1097.875 -93.75 L 1096.75 -99.25 L 1095.127 -103.625 L 1092.127 -108.49805 L 1087.75 -112.375 L 1081.127 -113.12695 L 1050.875 -113.12695 L 1047.875 -110.25 L 1047.875 -101.49805 L 1044.25 -101.49805 L 1044.25 -112.75 L 1035.625 -112.75 L 1035.625 -101.87305 L 1032.127 -101.87305 L 1032.127 -110.49805 L 1029.625 -112.625 L 1024.625 -112.625 L 1024.625 -105.75 L 1021.2266 -106.66211 L 1021.2266 -112.375 L 1011.75 -112.375 L 1011.75 -106.87305 L 1008.8164 -106.08594 L 1008.8164 -112.375 L 994.875 -112.375 L 993.12695 -116.25 L 991.12695 -117.625 L 988.625 -116.87305 L 988.625 -113.75 L 986 -113.75 L 986 -129.625 L 984.50195 -134.12695 L 981.25 -139.49805 L 977 -143.49805 L 972.12695 -146.49805" + " L 962.625 -146.49805 z M 656 -63.126953 L 656 -58 L 651.75 -58 L 651.75 -53.873047 L 651 -49.873047 L 649.25 -47.498047 L 645.625 -44.498047 L 642 -42.873047 L 637.87305 -41.625 L 630.50195 -41 L 623.12695 -41 L 623.12695 -48.25 L 612.87305 -48.25 L 608.58984 -40.830078 L 410 -38.126953 L 403.625 -43.375 L 403.625 -49.25 L 412.125 -49.25 L 412.125 -57.625 L 420.87305 -57.625 L 420.87305 -49.75 L 425 -49.75 L 425 -57 L 432.375 -57 L 432.375 -50.126953 L 435.625 -50.126953 L 435.625 -59.498047 L 443.75 -59.498047 L 443.75 -50.126953 L 447.75 -50.126953 L 447.75 -59.375 L 457.25 -59.375 L 457.25 -50.25 L 460.625 -50.25 L 460.625 -59.498047 L 467.625 -59.498047 L 467.625 -50.126953 L 471.25 -51.097656 L 471.25 -59.498047 L 479 -59.498047 L 479 -50.375 L 482.50195 -50.375 L 482.50195 -59.375 L 491.625 -59.375 L 491.625 -49.75 L 494.75 -49.75 L 494.75 -59.126953 L 503.625 -59.126953 L 503.625 -49.873047 L 507.25 -49.873047 L 507.25 -59.498047 L 515.125 -59.498047 L 515.125 -49.625 L 519.25 -49.625 L 519.25 -59.625 L 526 -59.625 L 526 -49.873047 L 530.625 -49.873047 L 530.625 -59.25 L 538.25 -59.25 L 538.25 -50.375 L 541.87305 -50.375 L 541.87305 -59.625 L 550.25 -59.625 L 550.25 -49.873047 L 554.375 -49.873047 L 554.375 -60 L 562 -60 L 562 -50 L 566.375 -50 L 566.375 -59.873047 L 573 -59.873047 L 573 -52 L 578.625 -52 L 578.625 -62.375 L 584.50195 -62.375 L 584.50195 -52 L 589.50195 -52 L 589.50195 -62.25 L 596.50195 -62.25 L 596.50195 -51.873047 L 601.125 -51.873047 L 601.125 -61.873047 L 608.125 -61.873047 L 608.125 -53.873047 L 613.75 -53.873047 L 613.75 -61.75 L 619.125 -61.75 L 619.125 -55.126953 L 625.25 -55.126953 L 625.25 -61.498047 L 631.75 -61.498047 L 631.75 -54.873047 L 636.125 -54.873047 L 636.125 -61.75 L 643.25 -61.75 L 643.25 -54.375 L 648.25 -54.375 L 648.25 -62.25 L 656 -63.126953 z M 146.625 30 L 158.12695 30.9375 L 165.12695 33.375 L 172.12695 38.9375 L 177.9375 45.75 L 181.4375 52.814453 L 182.4375 59 L 181.81445 62.4375 L 177.4375 62.375 L 174.81445 63.625 L 172.87305 66.3125 L 169.6875 72.185547 L 168.3125 76.814453 L 168.4375 81.185547 L 170.18555 83.375 L 172.375 83.75 L 175.5625 81.126953 L 178.25 81.126953 L 175.81445 85.75 L 170.25 90.75 L 163.18555 96.0625 L 154 99.25 L 146.87305 99.75 L 115.375 99.75 L 106.81445 98.5625 L 97.0625 94.3125 L 89.375 87.375 L 83.6875 78.185547 L 82 71.25 L 81.625 64.4375 L 81.814453 54.75 L 83.814453 48.4375 L 87.3125 44 L 90.185547 43.0625 L 95 44 L 100.25 47.625 L 102.50195 51.185547 L 103.4375 56.814453 L 103.18555 63.814453 L 103.625 70.126953 L 105.4375 74.4375 L 109.5625 79.6875 L 113.5625 85.3125 L 119 90.625 L 123.6875 93.873047 L 125.50195 95.625 L 128.50195 95.0625 L 128.75 93.25 L 128.12695 90.873047 L 125 88.625 L 120.0625 84.9375 L 117.12695 80.814453 L 114.9375 76.375 L 113.9375 71.185547 L 113.5625 64.375 L 114.375 59.126953 L 116.25 52 L 118.5625 46.873047 L 122.0625 41.9375 L 126.0625 38.25 L 131.81445 33.9375 L 136.87305 30.873047 L 146.625 30 z ");
							radiusDiv = 165;
							break;
						case 244: // Grenade Launcher
							path = new Path2D("M 430.18555 -104.0625 L 430.18555 -91.185547 L 397.5625 -91.185547 L 395.4375 -90 L 379.5625 -90 L 379.5625 -99.9375 L 377.75 -99.9375 L 375.5625 -102.81445 L 223.3125 -102.81445 L 219.5625 -99.6875 L 219.5625 -90.814453 L 148.75 -90.814453 L 148.75 -92.498047 L 142.5625 -92.498047 L 142.5625 -79.9375 L 137.5625 -79.9375 L 137.5625 -69.75 L 142.81445 -69.75 L 142.81445 -44.5625 L 99.625 -42.6875 L 69.375 -41.4375 L 61.0625 -41.4375 L 55.5625 -35.9375 L 45.9375 -35.9375 L 45.9375 -31.814453 L 43.78125 -29.65625 L 4.6875 -28.5625 L 4.6875 -35.625 L -4.5625 -35.625 L -33.126953 -33.25 L -65.5625 -31.0625 L -91.498047 -29.873047 L -116.75 -28.498047 L -140.87305 -27.3125 L -205.87305 -24.126953 L -207.12695 -26.3125 L -209.49805 -26 L -214.75 -25 L -223.625 -22.5625 L -229.49805 -20.25 L -232.9375 -18.185547 L -234.9375 -16.5625 L -237.12695 -16.5625 L -235.49805 -8.25 L -233.49805 .0625 L -230.75 9.75 L -227.3125 24.375 L -223 39.873047 L -220.375 54.814453 L -218.375 60.873047 L -216.87305 69.185547 L -214.375 85.6875 L -212.81445 102.9375 L -212.0625 123.18555 L -211.5625 134.3125 L -210.625 137.81445 L -209.12695 142.0625 L -207.49805 145.81445 L -205.25 147.625 L -202.75 149 L -199.4375 149.3125 L -195.25 148.87305 L -191.25 148.18555 L -184 147.18555 L -177.9375 145.81445 L -176.25 144.81445 L -176.25 143.12695 L -163.4375 143.12695 L -155.375 138.25 L -153.6875 135.25 L -152.5625 130.50195 L -152.49805 125.6875 L -151.5625 123.3125 L -148.81445 120.5625 L -127.48047 108.24414 L -13.75 19.75 L 8.5019531 19.75 L 7.25 4 L 46.185547 2.75 L 46.185547 8.5019531 L 61 7.4375 L 61 10.375 L 86 9.5625 L 86 6.25 L 89.375 6.25 L 89.375 18.9375 L 86.0625 21.501953 L 72.814453 25 L 70.25 27.625 L 70.25 55.126953 L 74.4375 55.126953 L 74.4375 56.873047 L 71.9375 56.873047 L 71.9375 63.25 L 64.185547 74.4375 L 56.501953 85.873047 L 45.5625 102.375 L 38.3125 113.12695 L 34.3125 119.18555 L 30.625 123.81445 L 21.375 138.625 L 12.4375 152.375 L 8.1269531 158.375 L 6.9375 161.0625 L 7 162.87305 L 8.25 164.87305 L 12.625 167.4375 L 22.4375 170.50195 L 39.814453 174.75 L 55.185547 178.625 L 67.9375 181.6875 L 72.185547 181.9375 L 73.6875 180.87305 L 73.75 178.5625 L 73.75 173.12695 L 87 147.25 L 96.501953 132.50195 L 100.81445 127.12695 L 105.25 121.87305 L 106 119.0625 L 106.81445 113.5625 L 108 109.3125 L 110.3125 106.12695 L 114.12695 102.9375 L 114.12695 98.873047 L 165.87305 98.873047 L 190.4375 117.12695 L 192.9375 106.9375 L 192.9375 142.4375 L 194.12695 146 L 196.50195 149.12695 L 199.75 151.5625 L 202.0625 152.50195 L 205.87305 153.18555 L 212.50195 153.87305 L 225.25 155.25 L 249.87305 157.5625 L 266.09766 161.9082 L 328.4375 161.9082 L 328.4375 160.0625 L 336.4375 159.6875 L 336.4375 163.6875 L 419 163.6875 L 426.0625 158.18555 L 426.0625 154.375 L 428.18555 150.375 L 429.9375 144.81445 L 430.81445 140.50195 L 431.25 132.87305 L 431.3125 124 L 433.0625 62.501953 L 435.5625 62.501953 L 435.5625 56.814453 L 459.18555 56.814453 L 459.18555 36.625 L 463.625 31.9375 L 476.0625 32.0625 L 480.50195 36.501953 L 480.50195 52.501953 L 482.75 52.501953 L 482.75 35.814453 L 477 30.6875 L 477.53516 28.693359 L 488.25 28.693359 L 488.25 41.126953 L 492.6875 45.501953 L 693.375 45.501953 L 697.125 42.3125 L 697.125 25.625 L 710.87305 25.625 L 710.87305 -45.3125 L 687.18555 -45.3125 L 687.18555 -41.4375 L 675.50195 -41.4375 L 668.18555 -51.25 L 668.18555 -62 L 666.18555 -62 L 664 -64.6875 L 451.5625 -64.6875 L 447.75 -61.625 L 447.75 -48 L 443.18555 -48 L 443.18555 -82.25 L 441.75 -91.498047 L 435.9375 -91.498047 L 435.9375 -104.0625 L 430.18555 -104.0625 z M 395.625 -57.9375 L 395.625 -51.4375 L 375.12695 -51.4375 L 375.12695 -45.144531 L 218.81055 -45.144531 L 206.4375 -38 L 206.4375 34 L 203.6875 34 L 203.6875 -57.375 L 395.625 -57.9375 z M 148.25 -57.5625 L 197.75 -57.498047 L 197.75 -50.5625 L 195.375 -48.185547 L 148.25 -48.185547 L 148.25 -57.5625 z M -103.75 24.75 L -103.75 26.75 L -141.6875 46.0625 L -136.81445 51.375 L -87.5625 27.5625 L -83.814453 41.0625 L -103 56.873047 L -124 73.6875 L -140.87305 87.5625 L -151.4375 96.9375 L -156.6875 101.3125 L -166.5625 99 L -169.5625 81 L -171.87305 68 L -174.4375 53.625 L -176.49805 42.4375 L -176.87305 36.25 L -170.375 28 L -103.75 24.75 z M 435.625 28.9375 L 463.4375 29 L 463.4375 30.34375 L 461.59375 30.34375 L 456.6875 35.25 L 456.6875 39.5625 L 435.625 39.5625 L 435.625 28.9375 z M 130.87305 55.126953 L 140.18555 55.126953 L 140.12695 58.501953 L 140.9375 61.126953 L 141.87305 63.185547 L 142.25 65.9375 L 142.3125 69.9375 L 142.625 73.0625 L 144.12695 76.501953 L 146.18555 78.9375 L 148.6875 82.375 L 150.6875 85.0625 L 153.12695 86.6875 L 156.6875 87.9375 L 158.9375 89.185547 L 160.75 89.501953 L 162.625 88.6875 L 163.0625 87.501953 L 161.375 85.9375 L 157.81445 83.814453 L 153.81445 80.6875 L 151.625 77.0625 L 149.75 74.5625 L 149 71.75 L 148.6875 66.9375 L 148.81445 63.4375 L 149.6875 60.25 L 151.12695 57.4375 L 153.0625 55.5625 L 179.75 55.5625 L 179.75 78 L 185.25 82.5625 L 190.5625 82.5625 L 190.5625 79.3125 L 193.6875 79.3125 L 193.6875 93.6875 L 150.4375 93.6875 L 138 93.6875 L 133.12695 92.25 L 128.5625 89 L 126 85.375 L 124.25 81.126953 L 123.50195 75.375 L 123.5625 69.3125 L 124.18555 64.0625 L 126.12695 58.873047 L 128.18555 56.4375 L 130.87305 55.126953 z M 203.9375 55.814453 L 206.3125 55.814453 L 206.3125 130.18555 L 218.625 137.87305 L 375.3125 137.87305 L 375.3125 142.625 L 395.6875 142.625 L 395.6875 153.0625 L 331.50195 153.0625 L 331.50195 155.4375 L 420.625 155.4375 L 420.625 153 L 413.87305 153 L 413.87305 151.18555 L 424.375 140.50195 L 426.3125 140.50195 L 426.3125 142.50195 L 424.6875 143.5625 L 424 145.25 L 423.25 149.6875 L 423.0625 155.50195 L 415.87305 160.87305 L 354.75 160.87305 L 354.75 156.75 L 267.625 156.75 L 251.375 154.18555 L 230.12695 150.75 L 211.0625 149 L 204.18555 148.87305 L 199.3125 144.12695 L 198.87305 140.6875 L 203.3125 140.6875 L 203.9375 55.814453 z ");
							radiusDiv = 75;
							break;
						case 245: // Guy
							path = new Path2D("M -16079.5958 -519.4039999999986 C -16079.5958 -9307.358939307585 -8955.55073930759 -16431.404 -167.59580000000278 -16431.404000000002 4052.528986326819 -16431.404000000002 8099.808448375217 -14754.965956105472 11083.887302240346 -11770.887102240347 14067.96615610547 -8786.80824837522 15744.4042 -4739.528786326826 15744.4042 -519.4040000000005 15744.4042 8268.550939307584 8620.359139307588 15392.596000000001 -167.59579999999733 15392.596000000001 -8955.550739307582 15392.596000000001 -16079.595799999997 8268.550939307588 -16079.5958 -519.4039999999968 Z M 1513.0971 -7497.0647 L 28117.0971 -7497.0647 28117.0971 6458.9353 1513.0971 6458.9353 Z");
							radiusDiv = 12800;
							break;
						case 246: // Missile
							path = new Path2D("M -238.80859 -93.488281 L -238.80859 -23.257812 L -250.25586 -23.257812 L -262.21875 -20.65625 L -262.21875 21.132812 L -248.86719 23.560547 L -239.1543 23.560547 L -239.1543 93.099609 L -215.22656 93.099609 L -99.039062 23.388672 L .15234375 23.388672 L .15234375 46.626953 L 46.970703 46.626953 L 115.81641 23.214844 L 172.3457 23.214844 L 172.3457 58.416016 L 213.09961 23.388672 L 239.80273 23.388672 L 272.58008 21.828125 L 305.00391 16.800781 L 334.13867 9.8632812 L 347.31641 4.6601562 L 355.29688 -0.021484375 L 346.625 -5.3964844 L 332.75195 -10.945312 L 303.44531 -17.708984 L 270.67188 -22.21875 L 242.05664 -23.603516 L 213.27344 -23.603516 L 172.86914 -58.113281 L 172.86914 -23.779297 L 117.20117 -23.779297 L 47.490234 -46.84375 L .49804688 -46.84375 L .49804688 -23.431641 L -99.039062 -23.431641 L -214.70312 -93.488281 L -238.80859 -93.488281 z M -231.69922 -23.779297 L -201.35156 -23.779297 L -201.35156 -21.525391 L -232.21875 -21.525391 L -231.69922 -23.779297 z M -232.21875 22.267578 L -201.35156 22.267578 L -201.35156 24.521484 L -231.69922 24.521484 L -232.21875 22.267578 z");
							radiusDiv = 75;
							break;
						case 247: // Missile Launcher
							path = new Path2D("M -230.31445 -46.876953 L -251.27539 -44.052734 L -241.40234 -13.146484 L -247.12305 -12.277344 L -249.22852 -6.3066406 L -250.27734 -0.671875 L -249.20898 5.4960938 L -245.93359 15.111328 L -243.23047 16.056641 L -253.25781 37.097656 L -231.20117 36.740234 L -227.23242 48.664062 L -220.99023 50.78125 L -199.83789 47.941406 L -200.43164 52.632812 L -199.48242 55.96875 L -196.01367 58.787109 L -190.44141 61.205078 L -181.79297 63.595703 L -184.89844 71.689453 L -181.9043 72.837891 L -178.48633 63.933594 L -172.39258 64.509766 L -176.49414 75.193359 L -174.22656 76.0625 L -168.66602 61.574219 L -169.61719 53.408203 L -159.20898 53.875 L -118.70508 60.279297 L -109.95117 63.638672 L -71.542969 71.013672 L -43.630859 75.03125 L -18.464844 75.050781 L -4.8867188 74.90625 L 10.337891 68.03125 L 27.875 58.960938 L 37.685547 50.140625 L 42.193359 52.005859 L 72.388672 36.816406 L 77.220703 38.535156 L 74.683594 44.792969 L 50.230469 58.972656 L 44.572266 56.267578 L 25.378906 67.910156 L 34.826172 89.34375 L 47.511719 83.5 L 58.78125 79.255859 L 60.248047 74.734375 L 63.845703 73.033203 L 71.25 74.671875 L 105.08398 75.472656 L 137.54492 74.273438 L 204.96094 74.439453 L 224.96289 73.949219 L 233.16602 74.552734 L 249.05859 72.21875 L 276.08789 67.728516 L 274.56445 71.699219 L 279.46484 73.580078 L 283.94531 61.908203 L 359.06836 48.966797 L 403.94336 48.380859 L 402.19727 52.931641 L 408.38281 55.306641 L 411.0918 48.246094 L 431.58984 48.212891 L 436.37695 50.050781 L 439.55664 41.765625 L 442.17969 42.771484 L 444.57617 36.529297 L 439.26562 34.490234 L 441.50586 28.65625 L 437.59766 27.15625 L 361.4043 26.835938 L 248.74023 28.046875 L 224.86719 27.453125 L 199.4707 27.345703 L 165.80664 28.888672 L 165.45508 24.867188 L 187.44141 24.203125 L 213.92188 22.478516 L 251.75391 17.308594 L 296.60547 8.6132812 L 340.97266 -3.4296875 L 354.75977 -9.0976562 L 340.06445 -14.365234 L 287.81641 -24.386719 L 234.94727 -32.791016 L 179.89062 -36.458984 L 143.38672 -35.240234 L 103.5 -31.972656 L 60.712891 -26.478516 L 57.771484 -23.890625 L 49.011719 -23.816406 L 45.412109 -26.777344 L 26.986328 -27.162109 L -55.15625 -24.138672 L -114.19336 -22.277344 L -151.52539 -20.353516 L -153.61133 -22.173828 L -159.91211 -22.455078 L -169.98242 -21.865234 L -230.31445 -46.876953 z M 42.201172 18.8125 L 43.472656 26.664062 L -165.125 28.414062 L -165.99219 24.736328 L 42.201172 18.8125 z M 55.267578 20.361328 L 76.419922 20.712891 L 77.941406 26.519531 L 56.652344 26.515625 L 55.267578 20.361328 z M 86.373047 21.994141 L 154.92383 25.136719 L 86.681641 27.466797 L 86.373047 21.994141 z ");
							radiusDiv = 70;
							break;
						case 248: // Target
							path = new Path2D("M -21726.1993 -238.92439999999988 C -21726.1993 -11999.275862896917 -12192.55076289692 -21532.9244 -432.1993000000075 -21532.924400000004 5215.320634643242 -21532.924400000004 10631.53285591389 -19289.455841258798 14624.932498586342 -15296.05619858635 18618.33214125879 -11302.6565559139 20861.8007 -5886.444334643253 20861.8007 -238.92440000000352 20861.8007 11521.427062896913 11328.15216289692 21055.0756 -432.1992999999966 21055.0756 -12192.550762896914 21055.0756 -21726.199299999997 11521.42706289692 -21726.1993 -238.92439999999624 Z M -17877.52174 -238.92439999999988 C -17877.521739999996 9395.861139492925 -10066.984839492927 17206.398039999996 -432.1993000000002 17206.398039999996 9202.586239492925 17206.398039999996 17013.123140000003 9395.861139492925 17013.123140000003 -238.92440000000352 17013.123140000003 -9873.709939492932 9202.586239492932 -17684.246840000003 -432.1992999999966 -17684.246840000003 -10066.984839492921 -17684.246839999996 -17877.521739999996 -9873.709939492923 -17877.52173999999 -238.92439999999624 Z M -11711.1453 -2840.6749 L -11675.1453 2595.3251 -32111.1453 2595.3251 -32147.1453 -2840.6749 Z M 10823.1455 2366.994 L 10811.1455 -3081.006 31271.1455 -3069.006 31283.1455 2378.994 Z M 2180.6576 -11495.9543 L -3267.3424 -11507.9543 -3255.3424 -31955.954299999998 2192.6576 -31943.954299999998 Z M -3027.0113 11038.3365 L 2408.9887 11014.3365 2420.9887 31462.336499999998 -3015.0113 31486.336499999998 Z");
							radiusDiv = 25600;
							break;
						case 249: // Target
							path = new Path2D("M -57385.447387376305 -33181.55590000001 L -28718.421162262 -49426.919408141584 -307.474000000002 -66115.5559 28103.473162261987 -49426.919408141584 56770.4993873763 -33181.55590000001 56514.420324524006 -247.55590000000666 56770.4993873763 32686.444100000008 28103.473162261987 48931.80760814159 -307.474000000002 65620.4441 -28718.421162262 48931.80760814159 -57385.447387376305 32686.444100000008 -57129.368324524 -247.55590000000666 Z M 52648.5558 -248.46839999999793 C 52648.5558 -29495.259612039496 28939.347012039514 -53204.4684 -307.4441999999908 -53204.468400000005 -14352.248635942873 -53204.468400000005 -27821.814447420693 -47625.19156160894 -37752.99090451482 -37694.01510451482 -47684.16736160894 -27762.8386474207 -53263.4442 -14293.272835942895 -53263.4442 -248.46839999999793 -53263.4442 28998.322812039492 -29554.235412039503 52707.5316 -307.44420000000537 52707.5316 28939.347012039492 52707.5316 52648.555799999995 28998.322812039507 52648.5558 -248.46839999999065 Z");
							radiusDiv = 69500;
							break;
						case 250: // Namenco head
							path = new Path2D("m -81.98688,-205.4567 10.750656,8.50131 17.498688,18.24935 11.501312,18.24934 9.498688,19.24934 6,22.50132 2.750656,10.49868 -6.498688,4.25197 16.249344,-0.25197 14.0000004,-2.24934 14.2493436,-0.49869 -3.750656,-3.75065 -4.9999997,-8.75066 -2.0000002,-10.24934 .5013125,-12.24935 4,-9.25197 5.7506564,-10.49868 4.999999,-8.24935 6.249344,-4.25197 4.249344,7.25197 -0.498688,10.49869 2.249344,8.24934 3.750656,10.50132 -0.251969,10 .251969,12.75065 -3.251969,7 9.501312,2.49869 11.750656,5.501312 10.748032,7 9,2.498688 .251969,-3 -7.501312,-2.750656 -7.498688,-5.000004 -1.501312,-3.74803 1.501312,-7.25197 8.249344,-11.49868 10.750656,-15.24935 9.498688,-10.25197 8.501312,-12.24934 10.748028,-10 13,-8.75066 4.75066,-3.74803 7.75066,10.74803 7.49868,12 18.25197,27 7.49869,15.75066 9,28.750656 2.50131,15.249344 2,21.000004 -1.50131,7.750656 -5.49869,13.498688 -4.75065,8.750654 -7.24935,13.5013133 -7,10.49868798 -9.75065,12.75065572 4.49868,9.249343 2,14.000002 -1,11 -2.74803,5.249344 1.24935,7.251969 8,0.748031 10.75065,-2 9,-3.498687 9.74803,-4 -6.24934,12.498688 -11.75066,13.999996 -19.49868,16.750656 -15.24935,12.750659 -16.25197,8.49868 -8.24934,4 12.24934,17.25197 4,10.74803 .75066,11 -3.49869,16.75066 -1.75065,11.75066 -3.24935,6.24934 -3.75065,2.37534 -4.12599,0.75065 -4.12336,-2.12599 -9.251966,-6.49869 -7.748031,-7.75065 -4.375328,-9.62467 -3.251969,-5.75065 -1.624672,11.24934 -3.624672,11.24934 -4.249344,9.37532 -6,8.62468 -4,4.75066 -2.874016,1.37532 -2.750656,-1.12598 -2,-4 -3.501312,-8.37271 -4.12336,-8.75065 .249344,-17 -5.624672,6.62468 -3.249344,6.87401 -3.125984,4.75065 -4.624672,5.12599 -4.624672,2.37532 -5.125984,2.49869 -7.4986869,1.50131 -5,-0.25196 -2.7506561,-1.74804 -2.12598419,-3.12597 -1.24934391,-5.62468 1.12598421,-7.50131 2.12335969,-7.62467 3.7506561,-9.37534 -2.0000002,-2.24934 -3.37532799,0.62468 -7.24934401,6.87663 -13.0000007,7.12337 -8.87664,6.37532 -9.249344,6.12599 -3.750656,3 -6.249344,0.49869 -5.12336,-3.75066 -3,-6.62467 -0.125984,-7.87401 1.498687,-4.62468 5.627297,-4.75066 5.874016,-3.75065 1.375328,-2.74804 -3.125984,-0.37532 -8.498688,6 -4.876641,5.87401 -9.375328,3.37534 -6,-1.87403 -4.498687,-4.12597 -3.249344,-8.62468 -1.624672,-20.12598 1.372704,-9.87402 9,-18.87664 -38.874016,-24.372707 -17,-13.501312 -17.49869,-13.999996 -7,-14.498688 17,7 19.49869,3.498688 11,-1 -7,-8 -2.49869,-12 3,-16.000002 -1.37533,-7.624671 -7.62467,-5.501313 -8.25197,-10.874016 -5.37532,-13.125985 -2.37271,-12.748032 1,-9.750654 -0.37532,-7.125984 -2,-5.498688 -2.12599,-8.375328 .37534,-12.249348 3.62466,-19.125984 -0.24934,-16.75066 1.87402,-13.74803 6.50131,-14.12597 7.62467,-13 6.87401,-11.37534 7.24935,-12.37532 10.501308,-13.49869 8.249344,-10.50131 z");
							radiusDiv = 60;
							break;
						case 251: // Namenco collar
							path = new Path2D("m -73.485565,112.66929 9.249344,6.74803 16.624672,7.50131 18.750656,5.24936 18.249344,4.87663 15.624672,2.62468 16.874016,2.62466 21.501312,1.37534 23.498688,-5.12599 17.251968,-7.37532 14.249344,-7.75067 7.139109,-4.12073 6.35958,9.24672 6.37533,8.87402 4,9.75065 .37532,11.50132 -1.75065,9.74803 -1.3727,6.50131 -1.75066,10.62466 -2.24934,6.50132 -4.6273,4 -4.12336,0.62468 -5,-2.50132 -8.624673,-6.12336 -7.501312,-7.50132 -4.498688,-9.874 -3.501312,-5.62468 -1.750656,10.49869 -3.498688,12.37533 -4.125984,8.75066 -4.624672,7.37532 -5.12336,6.24934 -2.87664,1.49869 -2.874016,-1.24934 -2.249344,-3.87401 -3.750656,-9.62468 -3.750656,-7.75066 .125984,-7.62466 .249344,-9.75066 -4.249344,5.75066 -5.750656,9.37532 -6.624672,8.62468 -8.501312,4.49868 -8.9999989,2 -5.624672,-0.49868 -3.62467198,-3.50132 -1.62467192,-6.49868 1.37532812,-8.62468 2.49868768,-9.50132 3.0000002,-7.12597 -2.249344,-2 -3.37532798,1 -6.49868772,6.50131 -14.1259845,8.24934 -12.125984,8.24935 -9.624672,6.75065 h -5.748032 l -5.501312,-4 -2.498688,-6.87402 -0.251968,-6.87663 1.624671,-5 5.627297,-4.87402 6.12336,-4 1.501312,-2.37533 -3.624672,-0.49868 -8,5.874 -5.375328,5.75066 -8.501312,3.62468 -6.624672,-1.75066 -5,-4.24934 -3,-7.62468 -0.750656,-7.37532 -0.874016,-13.87402 1.375328,-10 4.498688,-9.12599 z");
							radiusDiv = 60;
							break;
						case 252: // Namenco face
							path = new Path2D("m 13.36431,39.035336 13.936221,-0.240715 6.577894,1.206116 2.293144,1.38602 -0.301529,5.250153 -1.087024,6.276367 -2.594674,4.885281 -1.446832,5.490871 -1.087025,3.501793 2.232328,5.36924 .301529,4.827003 1.930802,2.353959 3.56007,1.809173 3.440979,-2.896202 2.65295,-4.163132 1.26693,-4.345566 2.052425,-1.386016 1.507645,1.023674 -0.301529,2.052429 -1.327744,1.750892 -0.843773,4.041504 -2.29314,3.681694 -1.869988,1.930802 -3.49926,1.568458 -3.078636,-0.362342 -3.258545,-2.171517 -2.351419,-4.223938 -0.904587,-4.163131 -1.026213,-0.663872 -1.991611,0.84378 -2.23233,2.777107 -2.052426,3.377633 -3.377632,2.774574 -2.8962,0.785499 L 11.85413,82.176804 8.7172137,80.24601 5.5194847,77.529709 3.5886845,74.51442 2.2001302,71.618218 l 1.0262127,-1.930801 1.5684581,1.748367 1.5101795,3.380165 3.0761042,2.835388 3.5600713,2.351418 3.438446,0.362342 2.716295,-1.629272 2.110704,-3.256004 2.655483,-3.200264 1.26693,-2.473046 .483967,-2.533859 -0.544781,-4.586281 -2.8962,-4.343037 -2.652948,-4.464657 -2.53386,-6.093929 -3.380166,-2.594669 -1.145303,-3.258541 z m 0,0 13.936221,-0.240715 6.577894,1.206116 2.293144,1.38602 -0.301529,5.250153 -1.087024,6.276367 -2.594674,4.885281 -1.446832,5.490871 -1.087025,3.501793 2.232328,5.36924 .301529,4.827003 1.930802,2.353959 3.56007,1.809173 3.440979,-2.896202 2.65295,-4.163132 1.26693,-4.345566 2.052425,-1.386016 1.507645,1.023674 -0.301529,2.052429 -1.327744,1.750892 -0.843773,4.041504 -2.29314,3.681694 -1.869988,1.930802 -3.49926,1.568458 -3.078636,-0.362342 -3.258545,-2.171517 -2.351419,-4.223938 -0.904587,-4.163131 -1.026213,-0.663872 -1.991611,0.84378 -2.23233,2.777107 -2.052426,3.377633 -3.377632,2.774574 -2.8962,0.785499 L 11.85413,82.176804 8.7172137,80.24601 5.5194847,77.529709 3.5886845,74.51442 2.2001302,71.618218 l 1.0262127,-1.930801 1.5684581,1.748367 1.5101795,3.380165 3.0761042,2.835388 3.5600713,2.351418 3.438446,0.362342 2.716295,-1.629272 2.110704,-3.256004 2.655483,-3.200264 1.26693,-2.473046 .483967,-2.533859 -0.544781,-4.586281 -2.8962,-4.343037 -2.652948,-4.464657 -2.53386,-6.093929 -3.380166,-2.594669 -1.145303,-3.258541 z m 25.774797,-1.492026 -2.624672,-1.624672 -0.375328,-4.000002 .249344,-7 1.249344,-7.624672 2.375328,-6.501311 5.501312,-4.7480318 8.748032,-2.1259844 11.125984,2.249344 4.624672,4.3753282 3.249344,8.501311 .87664,8.12336 -1.501312,3.501312 -8.249344,3.123362 -5.624672,1 -8.249344,0.624672 -4.87664,-0.249344 -2.874016,0.501312 z M -26.236221,23.417322 v -9.372703 l 2.12336,-6.750656 4.251968,-4.5013123 8.375329,-3.7480316 8.0000001,-0.2519685 7,4.375328 5.1233597,7.0000004 1.8766402,6.125983 V 26.79265 l -0.9999999,7.501314 -1.5013123,2 -3,0.624672 -3.8740158,-0.125985 -5.125984,-0.874015 -3.6246717,-1.501313 -3.3753283,-3.123361 -3.375328,-4 -3.12336,-1.624672 -4.375328,-1.501313 z m 80.937008,53.999998 3.874016,1.87664 3.188976,1.561684 .375328,3.188973 1.687664,2.372703 2.186352,1.813652 5.125984,-0.063 1.561684,-1.750656 .498687,-3.312332 -1.186355,-4.249344 -2.062988,-1.687668 -4.937012,-1.68766 -3.125984,-0.31234 -1.312336,-1.186348 -1.375328,0.249344 -2.56168,1.750656 z m -1.624672,-15.3727 4.498688,0.06037 1.750656,-1.498688 3.188976,-1 3.748032,0.937008 1.687668,1.312336 2.438316,0.56168 2.125984,1 -0.125984,1.501308 -1.750656,0.937012 -3.750656,0.188972 -7.186352,-0.627296 -5.43832,-1.748028 z m 6.498687,-12.43832 3.251968,-3.375328 2.312336,-0.624672 2.375328,-1.624672 2.498688,0.12336 .813652,1 -0.375328,2.125984 -1.687668,1.750656 -1.87664,1 -1.312332,1.56168 -1.249344,1.56168 -3.249348,-0.312336 -1.312336,-1.56168 z m -89.186352,23.874016 4.062992,-2.687668 5.435696,-2 4,-0.312332 3.939633,0.937004 2,2 -1.188976,2.375328 -2.498688,1.687668 -3.375329,-0.186356 -2.937008,-0.312332 -2.750656,0.561676 -1.813648,1.687668 -3.56168,0.68766 -1.249344,-2.438316 z m -2.062991,-16.624672 5.312336,0.249344 5.312336,1.312336 1.813648,1.813648 3.062992,0.249344 1.435697,1.188976 -3.435697,1.624672 -3.501312,-0.188976 -4.062992,0.564304 -4.874016,-0.43832 -0.874016,-2.186352 -0.564304,-2.750656 z m 11.375328,-10.375328 3.186352,0.750656 2.627297,2.186352 1.186352,2.627296 3.5616798,1.312336 3.1889763,-1.87664 .312336,-3.12336 -3.5013123,-2.564304 -2.7480318,-1.312336 -2.375328,-0.312336 -4.312337,1.312336 z m 66.328083,-73.921261 16.131237,-0.262468 18.40157,1.569555 16.656174,0.524935 15.784779,-0.349083 10.2021,0.784776 3.92388,-3.052492 2.53019,-4.0105 2.96587,-2.007873 1.8294,2.007873 3.40157,0.871392 -4.18634,0.784776 -1.13387,2.267718 -1.74278,2.267717 -2.61679,0.695538 -0.0866,2.094488 3.40158,0.435695 4.62204,0.349082 4.70866,0.698162 -4.97113,0.871391 -5.58005,0.173229 -4.27296,0.874016 -2.1811,1.307087 -0.52232,5.320209 -0.0892,6.976378 .52493,10.637795 1.3937,3.6640415 .61155,7.2388455 .26247,10.900262 -1.2231,4.708662 -2.79003,4.0105 -3.22572,1.482937 -2.53018,-0.259842 -2.96326,-1.48294 -4.01312,-2.703411 -4.53543,-2.96588 -4.4462,-0.958004 -10.640418,-0.349081 -9.590553,0.958004 -8.286087,1.832022 -7.325462,3.225721 -6.278213,1.482941 -6.018372,0.349079 -6.36483,-0.08661 -3.225719,0.522308 -3.48819,1.482941 -2.616799,-1.133858 -0.611549,-4.186352 .611549,-8.895014 1.83202,-10.115485 1.220474,-8.0236226 .871392,-13.167978 .784775,-6.7139114 2.703415,-6.716534 z m -2.35433,-29.38845 1.742783,3.052494 1.918632,0.958004 2.091866,0.960629 2.616798,2.354332 1.047241,1.569553 2.181103,2.354332 1.569553,0.175854 1.918637,-0.61155 1.569553,-2.181103 .173229,-2.527561 -0.611549,-2.267715 -2.440945,-3.22572 -2.354328,-1.223099 -2.703415,-0.173229 -1.656166,-1.396324 -2.354332,-1.569553 h -2.354332 l -1.396324,1.133857 z m -41.0761149,4.622047 3.8372705,-2.267719 3.8372694,-1.656166 2.879266,-1.918637 3.139107,0.349083 2.091864,1.829396 .08661,2.267715 -0.871391,2.09449 -2.616797,0.173229 -1.829397,0.08661 -1.745407,1.396324 -1.7454069,2.440945 -2.2650914,0.349083 -3.4015749,-0.784779 -1.2204726,-1.393699 z m -91.4803151,15.698162 -1.220474,-0.874016 -2.703407,-2.527561 -0.958008,-3.05249 1.133857,-2.616799 2.005249,0.175854 v 2.440945 l 2.440949,1.047241 2.792648,0.522312 1.56955,2.354328 3.748031,0.958008 3.750657,1.047241 2.267723,-0.08661 7.585296,-0.262467 12.38583,-0.349083 7.934384,1.745407 12.120735,1.220475 11.687662,0.784774 13.6902885,0.784779 10.291339,1.396324 7.2362204,1.044621 3.6640421,1.396324 .871391,3.664043 .435695,9.590551 1.133859,3.401574 -0.698163,3.9238848 -0.958005,3.401575 -0.262467,8.895013 -0.52231,4.884515 -2.091863,6.4514442 -0.08924,5.931758 -0.173229,8.545933 -1.0472436,6.364828 -2.8766403,1.047245 -5.32021005,0.175853 -4.70866155,-0.874016 -5.582677,-2.790027 -3.7480315,-4.622048 -4.448818,-3.052492 -4.708662,-1.918636 -4.622048,-0.435696 -7.152229,0.08661 -8.719162,0.524935 -7.847771,1.918634 -4.971126,3.139109 -5.931759,1.918634 -6.800522,1.044619 -6.018379,-0.87139 -2.965874,-1.742782 -2.440948,-3.314961 -0.349083,-4.446195 .08662,-13.9553797 -1.393699,-26.0734903 .522308,-10.900263 -2.267716,-1.48294 -3.923881,0.173229 -8.023628,0.611547 -3.488182,-0.698162 -0.346458,-2.440946 2.87664,0.435695 1.742782,-0.784775 1.047242,-1.745407 1.832023,-0.346458 z m 210.1348,-139.773024 3.50475,20.87003 3.58411,25.40454 .33571,19.17988 -1.33953,23.049518 -3.15783,18.894547 -2.60023,10.86031 -0.521,10.125679 3.25445,6.571037 10.24777,7.495987 10.89086,4.345286 12.3174,6.063286 7.36059,1.963249 3.75456,-4.599009 1.88651,-11.895172 3.2616,-12.966598 2.21461,-12.945648 .13533,-12.213642 -1.59483,-11.482491 -4.0685,-13.187419 -6.61531,-19.06997 -7.58038,-14.5198 -12.88968,-18.96278 -8.952,-13.0993 -5.37033,-7.93048 -6.7786,-8.60407 z m -200.62824,-25.22173 -4.186348,27.20735 -4.186356,31.74279 -0.695541,28.60366 -2.094482,18.837276 1.745407,18.139107 -3.139107,11.51181 -6.280846,9.068245 -11.858267,6.278214 -12.55905,4.884514 -7.32547,1.396328 -5.92913,-1.745408 -3.1391,-5.580055 -2.09449,-9.419945 .69816,-11.858273 2.79002,-20.582672 .69817,-17.790021 1.7454,-12.55644 6.27822,-13.60367 10.81365,-18.1391 10.11548,-17.0945 10.813656,-14.30184 8.372704,-10.81364 6.976372,-8.021 z");
							radiusDiv = 60;
							break;
						//https://cdn.discordapp.com/attachments/477940548590764052/543748338416091156/2.png stuff:
						case 253: // Ship-2 body
							path = new Path2D("m -105.40841,-390.25675 -60,236.99999 V 83.74128 l 60,237 h 117 l 60,-237 v -236.99804 l -60,-236.99999 z");
							radiusDiv = 60;
							break;
						case 254: // Ship-2 minion body
							path = new Path2D("m -82.113342,-18.506025 a 35.113776,34.741102 0 0 0 35.11439,34.738922 35.113776,34.741102 0 0 0 35.1144,-34.738922 35.113776,34.741102 0 0 0 -3.98814,-16.048604 35.113776,34.741102 0 0 0 3.98814,-16.020681 35.113776,34.741102 0 0 0 -35.1144,-34.741723 35.113776,34.741102 0 0 0 -35.11439,34.741723 35.113776,34.741102 0 0 0 3.98815,16.048604 35.113776,34.741102 0 0 0 -3.98815,16.020681 z");
							radiusDiv = 60;
							break;
						case 257: // Switcheroo (New)
							angle += Math.PI;
						case 255: // Xyv Auto Gun
							path = new Path2D("M -19169.9038 -18519.129 C -8794.682489678713 -28891.0366018223 8024.188598177694 -28888.350310321293 18396.0962 -18513.129000000008 24656.0962 -12251.129 30916.0962 -5989.129000000001 37176.0962 272.8709999999992 30914.0962 6532.870999999999 24652.0962 12792.871 18390.0962 19052.871 8014.874889678711 29424.778601822298 -8803.996198177698 29422.092310321284 -19175.903799999996 19046.871 -29547.8114018223 8671.649689678714 -29545.125110321285 -8147.221398177695 -19169.9038 -18519.128999999997 Z");
							radiusDiv = 26500;
							break;
						case 256: // Astra
							path = new Path2D("M 9575.655400000003 -9618.827699999994 L 13766.655400000003 -9761.827699999994 18529.655400000003 -10523.827699999994 24053.655400000003 -12238.827699999994 28959.655400000003 -14619.827699999994 33483.6554 -17381.827699999994 36960.6554 -19905.827699999994 40960.6554 -23477.827699999994 43818.6554 -26954.827699999994 46104.6554 -30145.827699999994 48675.6554 -33193.827699999994 52295.6554 -36574.827699999994 55533.6554 -38812.827699999994 59677.6554 -41289.827699999994 64916.6554 -43527.827699999994 70583.6554 -45051.827699999994 75441.6554 -45813.827699999994 81108.6554 -46385.827699999994 86918.6554 -45766.827699999994 92395.6554 -44623.827699999994 98015.6554 -43051.827699999994 103778.6554 -40479.827699999994 108207.6554 -37574.827699999994 113826.6554 -33336.827699999994 118256.6554 -28525.827699999994 121494.6554 -22858.827699999994 124447.6554 -16000.827699999994 126018.6554 -11428.827699999994 126971.6554 -5951.827699999994 127257.6554 -951.8276999999944 126971.6554 4287.172300000006 126304.6554 10050.172300000006 124828.6554 14050.172300000006 123780.6554 17479.172300000006 121637.6554 21908.172300000006 119065.6554 25909.172300000006 115493.6554 30671.172300000006 111159.6554 34815.172300000006 106349.6554 38768.172300000006 101444.6554 41435.172300000006 97491.6554 43006.172300000006 92919.6554 44626.172300000006 88014.6554 45626.172300000006 83489.6554 46150.172300000006 80060.6554 46483.172300000006 75631.6554 45959.172300000006 71774.6554 45245.172300000006 66916.6554 43911.172300000006 61582.6554 41863.172300000006 55819.6554 38911.172300000006 50961.6554 35243.172300000006 46532.6554 30862.172300000006 42627.6554 25814.172300000006 40198.6554 22575.172300000006 37531.6554 20051.172300000006 33578.6554 17241.172300000006 28768.655400000003 14288.172300000006 23053.655400000003 11860.172300000006 18291.655400000003 10478.172300000006 13004.655400000003 9621.172300000006 9099.655400000003 9383.172300000006 9194.655400000003 12764.172300000006 9718.655400000003 18146.172300000006 11766.655400000003 25195.172300000006 14147.655400000003 30005.172300000006 17005.655400000003 34386.172300000006 20720.655400000003 39053.172300000006 23577.655400000003 42054.172300000006 26816.655400000003 44959.172300000006 31340.655400000003 48102.172300000006 35007.6554 51722.172300000006 38198.6554 56389.172300000006 41246.6554 61485.172300000006 43818.6554 68438.1723 45151.6554 75391.1723 45723.6554 80773.1723 45675.6554 85393.1723 44913.6554 90250.1723 43627.6554 94918.1723 41770.6554 99537.1723 39008.6554 105538.1723 34340.6554 111967.1723 29483.655400000003 116682.1723 23958.655400000003 120778.1723 19053.655400000003 123493.1723 13004.655400000003 125779.1723 7051.655400000003 127207.1723 1289.6554000000033 127684.1723 -4378.344599999997 127445.1723 -11331.344599999997 126588.1723 -17379.344599999997 124874.1723 -24476.344599999997 121540.1723 -30286.344599999997 117539.1723 -34572.3446 113634.1723 -38239.3446 108538.1723 -41097.3446 103585.1723 -43335.3446 98347.1723 -45240.3446 91298.1723 -46478.3446 83916.1723 -46669.3446 79773.1723 -46145.3446 74105.1723 -44859.3446 68248.1723 -43097.3446 63628.172300000006 -40430.3446 57818.172300000006 -37477.3446 53008.172300000006 -33858.3446 48912.172300000006 -30572.344599999997 46292.172300000006 -26238.344599999997 43292.172300000006 -22904.344599999997 40244.172300000006 -19142.344599999997 36005.172300000006 -15474.344599999997 29862.172300000006 -13093.344599999997 24052.172300000006 -11045.344599999997 17432.172300000006 -10569.344599999997 13145.172300000006 -10569.344599999997 9383.172300000006 -14141.344599999997 9383.172300000006 -18522.344599999997 10193.172300000006 -25333.344599999997 12193.172300000006 -28428.344599999997 13574.172300000006 -32667.344599999997 16003.172300000006 -36096.3446 18479.172300000006 -39477.3446 21051.172300000006 -43192.3446 25004.172300000006 -46145.3446 28862.172300000006 -48621.3446 32100.172300000006 -51146.3446 34577.172300000006 -54479.3446 37434.172300000006 -58718.3446 40292.172300000006 -63766.3446 42673.172300000006 -68719.3446 44578.172300000006 -74339.3446 45626.172300000006 -80483.3446 46007.172300000006 -88626.3446 45530.172300000006 -95246.3446 44054.172300000006 -102104.3446 41578.172300000006 -108438.3446 38053.172300000006 -112700.3446 33790.172300000006 -116820.3446 28433.172300000006 -121678.3446 20575.172300000006 -124393.3446 14860.172300000006 -126298.3446 8573.172300000006 -127536.3446 2668.1723000000056 -128012.3446 -1189.8276999999944 -127441.3446 -5808.827699999994 -126060.3446 -12047.827699999994 -123821.3446 -17715.827699999994 -119678.3446 -25335.827699999994 -115106.3446 -32050.827699999994 -110343.3446 -37050.827699999994 -106772.3446 -39670.827699999994 -100866.3446 -42813.827699999994 -95675.3446 -44575.827699999994 -89531.3446 -45956.827699999994 -82102.3446 -46813.827699999994 -76482.3446 -46575.827699999994 -71005.3446 -45623.827699999994 -64671.3446 -43337.827699999994 -58908.3446 -40289.827699999994 -53432.3446 -36574.827699999994 -49193.3446 -32716.827699999994 -45716.3446 -28716.827699999994 -43573.3446 -25049.827699999994 -40811.3446 -22144.827699999994 -37811.3446 -19381.827699999994 -32000.344599999997 -15524.827699999994 -25619.344599999997 -12523.827699999994 -19713.344599999997 -10857.827699999994 -14236.344599999997 -9809.827699999994 -9617.344599999997 -9714.827699999994 -9998.344599999997 -13905.827699999994 -11283.344599999997 -19810.827699999994 -13141.344599999997 -25239.827699999994 -15760.344599999997 -30573.827699999994 -19427.344599999997 -35812.827699999994 -23285.344599999997 -40051.827699999994 -26809.344599999997 -43194.827699999994 -29905.344599999997 -45575.827699999994 -33667.3446 -49099.827699999994 -37287.3446 -53433.827699999994 -40906.3446 -58815.827699999994 -43478.3446 -64625.827699999994 -45478.3446 -71007.8277 -46574.3446 -78008.8277 -46193.3446 -84247.8277 -44907.3446 -92105.8277 -43240.3446 -98058.8277 -41335.3446 -103249.8277 -38954.3446 -107154.8277 -35001.3446 -112250.8277 -30810.344599999997 -116108.8277 -25714.344599999997 -120108.8277 -20761.344599999997 -122823.8277 -15284.344599999997 -125299.8277 -9474.344599999997 -127109.8277 -3092.3445999999967 -127919.8277 3003.6554000000033 -127776.8277 8385.655400000003 -126919.8277 15243.655400000003 -124871.8277 20720.655400000003 -122299.8277 26339.655400000003 -118775.8277 31435.655400000003 -114679.8277 36817.6554 -109012.8277 39674.6554 -104964.8277 41960.6554 -99772.8277 44008.6554 -93819.8277 45342.6554 -86866.8277 45818.6554 -82294.8277 45342.6554 -77436.8277 44342.6554 -72626.8277 42198.6554 -65578.8277 39722.6554 -60244.827699999994 37103.6554 -55053.827699999994 33769.6554 -50385.827699999994 30340.655400000003 -46671.827699999994 27006.655400000003 -44289.827699999994 22767.655400000003 -41003.827699999994 19577.655400000003 -37955.827699999994 16529.655400000003 -33955.827699999994 14671.655400000003 -30859.827699999994 12480.655400000003 -25906.827699999994 10909.655400000003 -21858.827699999994 9813.655400000003 -16810.827699999994 9385.655400000003 -13524.827699999994 Z");
							radiusDiv = 75000;
							break;
						case 258: // Helium Body
							path = new Path2D("m396.85617 -203.94011l0 405.7953l-802.1417 .09448242l0 -405.7953z");
							radiusDiv = 175;
							break;
						case 259: // Radium Body
							path = new Path2D("m-203.34724 -69.32943l271.96063 0l0 -135.62204l135.2677 0l0 271.4252l-135.2677 0l0 136.15747l-136.15749 0l0 -136.33595l-136.8714 0z");
							radiusDiv = 80;
							break;
						case 260: // Tellurium Body
							path = new Path2D("m178.9008 -36.101273l-143.82152 0l0 -143.28609l-71.46457 0l0 143.19948l-144.0 0l0 71.82152l143.5538 0l0 143.1076l72.0 0l0 -143.19684l143.64566 0z");
							radiusDiv = 60;
							break;
						case 261: // Neptunium Body
							path = new Path2D("m-110.13648 -110.13921l72.98163 0l0 72.98163l73.514435 0l0 -73.07086l73.24672 0l0 73.33595l72.979 0l0 73.07086l-73.15748 0l0 73.24672l-73.06824 0l0 -73.06824l-73.427826 0l0 73.157486l-73.24672 0l0 -73.157486l-73.33596 0l0 -73.249344l73.4252 0z");
							radiusDiv = 42;
							break;
						case 262: // Plutonium Body
							path = new Path2D("M -93.068359 -186.06055 L -185.92188 -93.742188 L -185.92188 92.849609 L -93.246094 185.61328 L 92.990234 185.61328 L 185.66406 92.673828 L 185.66406 -93.207031 L 92.990234 -186.06055 L -93.068359 -186.06055 z M -92.9375 -93.5625 L 92.625 -93.5625 L 92.625 92.5625 L -93 92.5625 L -92.9375 -93.5625 z");
							radiusDiv = 75;
							break;
						case 263: // Castration gun
							path = new Path2D("M -44242.0195 -238.2051999999967 C -44242.0195 -24627.099752527833 -24470.91405252785 -44398.2052 -82.0195000000167 -44398.205200000004 L -82.01950000000215 -44398.2052 C 11629.940691314267 -44398.2052 22862.209484932733 -39745.64712946315 31143.81595719794 -31464.040657197944 39425.422429463164 -23182.434184932736 44077.98050000001 -11950.165391314262 44077.98050000001 -238.2051999999967 L 44077.9805 -238.2051999999967 C 44077.9805 24150.689352527843 24306.875052527837 43921.7948 -82.01949999999488 43921.7948 L -82.01950000000215 43921.7948 C -24470.914052527838 43921.7948 -44242.0195 24150.689352527843 -44242.01950000001 -238.20519999998942 Z M 11090.991800000003 -43096 L 92122.68360976904 -28652.756941444954 92011.29999023097 28176.756941444968 10922.991800000003 42620 Z M 89846.7253 -20894.342 C 89846.7253 -24294.206919958364 87090.59021995837 -27050.342 83690.7253 -27050.342 82058.05258854777 -27050.342 80492.24990074172 -26401.76529071049 79337.77595501562 -25247.29134498439 78183.30200928952 -24092.81739925829 77534.7253 -22527.014711452233 77534.7253 -20894.342 77534.7253 -17494.477080041637 80290.86038004165 -14738.342 83690.7253 -14738.342 87090.59021995837 -14738.342 89846.7253 -17494.477080041637 89846.7253 -20894.342 Z M 89846.7253 -238.8077000000003 C 89846.7253 -3638.672619958364 87090.59021995837 -6394.8077 83690.7253 -6394.807700000001 82058.05258854777 -6394.807700000001 80492.24990074172 -5746.230990710489 79337.77595501562 -4591.757044984389 78183.30200928952 -3437.2830992582876 77534.7253 -1871.480411452234 77534.7253 -238.8077000000012 77534.7253 3161.057219958361 80290.86038004165 5917.1923 83690.7253 5917.1923 87090.59021995837 5917.1923 89846.7253 3161.057219958365 89846.7253 -238.8076999999994 Z M 74115.871 -10711.836299999999 C 74115.871 -14111.701219958362 71359.73591995836 -16867.8363 67959.871 -16867.8363 66327.19828854776 -16867.8363 64761.395600741715 -16219.259590710488 63606.92165501561 -15064.785644984388 62452.44770928951 -13910.311699258287 61803.871 -12344.509011452232 61803.871 -10711.836299999999 61803.871 -7311.9713800416375 64560.00608004163 -4555.836299999999 67959.871 -4555.836299999999 71359.73591995836 -4555.836299999999 74115.871 -7311.971380041634 74115.871 -10711.836299999999 Z M 74115.871 9943.698 C 74115.871 6543.833080041636 71359.73591995836 3787.698 67959.871 3787.697999999999 66327.19828854776 3787.697999999999 64761.395600741715 4436.274709289511 63606.92165501561 5590.748655015612 62452.44770928951 6745.222600741712 61803.871 8311.025288547766 61803.871 9943.697999999999 61803.871 13343.562919958362 64560.00608004163 16099.698 67959.871 16099.698 71359.73591995836 16099.698 74115.871 13343.562919958365 74115.871 9943.698 Z M 57216.8744 -20894.342 C 57216.8744 -24294.206919958364 54460.73931995837 -27050.342 51060.8744 -27050.342 49428.20168854777 -27050.342 47862.399000741716 -26401.76529071049 46707.925055015614 -25247.29134498439 45553.45110928951 -24092.81739925829 44904.8744 -22527.014711452233 44904.8744 -20894.342 44904.8744 -17494.477080041637 47661.009480041634 -14738.342 51060.8744 -14738.342 54460.73931995836 -14738.342 57216.8744 -17494.477080041637 57216.8744 -20894.342 Z M 89846.7253 20416.7266 C 89846.7253 17016.861680041635 87090.59021995837 14260.7266 83690.7253 14260.7266 82058.05258854777 14260.7266 80492.24990074172 14909.303309289511 79337.77595501562 16063.777255015611 78183.30200928952 17218.251200741714 77534.7253 18784.053888547765 77534.7253 20416.726599999998 77534.7253 23816.59151995836 80290.86038004165 26572.7266 83690.7253 26572.7266 87090.59021995837 26572.7266 89846.7253 23816.591519958365 89846.7253 20416.7266 Z M 57216.8744 -238.8077000000003 C 57216.8744 -3638.672619958364 54460.73931995837 -6394.8077 51060.8744 -6394.807700000001 49428.20168854777 -6394.807700000001 47862.399000741716 -5746.230990710489 46707.925055015614 -4591.757044984389 45553.45110928951 -3437.2830992582876 44904.8744 -1871.480411452234 44904.8744 -238.8077000000012 44904.8744 3161.057219958361 47661.009480041634 5917.1923 51060.8744 5917.1923 54460.73931995836 5917.1923 57216.8744 3161.057219958365 57216.8744 -238.8076999999994 Z M 57216.8744 -238.8077000000003 C 57216.8744 3161.0572199583635 54460.73931995837 5917.1923 51060.8744 5917.192300000001 49428.20168854777 5917.192300000001 47862.399000741716 5268.6155907104885 46707.925055015614 4114.141644984388 45553.45110928951 2959.667699258287 44904.8744 1393.8650114522334 44904.8744 -238.8076999999994 44904.8744 -3638.672619958362 47661.009480041634 -6394.8077 51060.8744 -6394.8077 54460.73931995836 -6394.8077 57216.8744 -3638.6726199583654 57216.8744 -238.8077000000012 Z M 44904.8744 20416.7266 C 44904.8744 23816.591519958365 47661.009480041634 26572.7266 51060.8744 26572.7266 52693.54711145223 26572.7266 54259.349799258285 25924.14989071049 55413.82374498439 24769.67594498439 56568.29769071049 23615.20199925829 57216.8744 22049.399311452235 57216.8744 20416.7266 57216.8744 17016.861680041642 54460.73931995837 14260.726600000002 51060.8744 14260.726600000002 47661.00948004164 14260.726600000002 44904.8744 17016.861680041635 44904.8744 20416.7266 Z M -16024.3479 15702.5792 C -7219.824418197492 24507.102681802506 7055.128618197488 24507.102681802513 15859.652099999998 15702.579200000006 22377.91078 9184.320520000001 30100.42814 3870.3205199999975 39027.20418 -239.4208000000035 30100.428139999996 -4349.162120000001 22377.91078 -9663.16212 15859.6521 -16181.4208 7055.128618197495 -24985.944281802505 -7219.824418197491 -24985.944281802505 -16024.347899999999 -16181.4208 -24828.871381802506 -7376.897318197494 -24828.871381802506 6898.055718197487 -16024.347900000002 15702.579199999998 Z");
							radiusDiv = 40000;
							break;
						case 264: // Mega Crusher
							path = new Path2D("m -68.622396,-68.999545 50.7205,14.17287 -28.15733,6.34051 28.90322,8.39184 -49.60166,7.27291 47.17751,11.18913 -27.41144,6.34049 21.81728,6.52698 L -67.317086,-4.9999157e-6 -25.174316,8.764805 l -21.81728,6.52699 27.41144,6.34049 -47.17751,11.18912 49.60166,7.27292 -28.90322,8.39184 28.15733,6.3405 -50.7205,14.17288 71.0459905,-2.6108 26.1061295,-6.89995 18.46078,-11.56209 13.98542,-19.02149 L 68.621294,-4.9999157e-6 60.975924,-28.905215 l -13.98542,-19.0215 -18.46078,-11.56209 -26.1061295,-6.89995 z");
							radiusDiv = 80;
							break;
						case 265: // Atlantis Body
							path = new Path2D("M -14041.4766 2846.028300000001 L -14036.4254 -2751.7509 -10816.187 -4912.1557 8138.211400000002 -4912.1557 10869.270600000002 -3526.2245000000003 13885.689800000002 60.84910000000036 11562.269000000002 2954.9899000000005 10950.8114 3647.9227 8097.473800000002 5033.853900000001 -10816.187 5033.853900000001 Z");
							radiusDiv = 80;
							break;
						case 266: // Grid
							path = new Path2D("m -43.4995,-43.4995 v 4.91205 6.78703 4.91206 14.65022 4.91401 14.64826 4.91401 14.65022 4.91206 6.78703 4.91205 H 38.58745 43.4995 V 38.58745 31.80042 26.88836 12.23814 7.32413 -7.32413 v -4.91401 -14.65022 -4.91206 -6.78703 -4.91205 h -4.91205 z m 4.91205,4.91205 h 6.78703 v 6.78703 h -6.78703 z m 11.69713,0 h 14.65218 v 6.78703 h -14.65218 z m 19.56619,0 H 7.32413 v 6.78703 H -7.32413 Z m 19.56227,0 h 14.65022 v 6.78703 H 12.23814 Z m 19.56228,0 h 6.78703 v 6.78703 h -6.78703 z m -70.38787,11.69909 h 6.78703 v 14.65022 h -6.78703 z m 11.69713,0 h 14.65218 v 14.65022 h -14.65218 z m 19.56619,0 H 7.32413 v 14.65022 H -7.32413 Z m 19.56227,0 h 14.65022 v 14.65022 H 12.23814 Z m 19.56228,0 h 6.78703 v 14.65022 h -6.78703 z m -70.38787,19.56423 h 6.78703 V 7.32413 h -6.78703 z m 11.69713,0 h 14.65218 V 7.32413 h -14.65218 z m 19.56619,0 H 7.32413 V 7.32413 H -7.32413 Z m 19.56227,0 H 26.88836 V 7.32413 H 12.23814 Z m 19.56228,0 h 6.78703 V 7.32413 h -6.78703 z m -70.38787,19.56227 h 6.78703 v 14.65022 h -6.78703 z m 11.69713,0 h 14.65218 v 14.65022 h -14.65218 z m 19.56619,0 H 7.32413 V 26.88836 H -7.32413 Z m 19.56227,0 H 26.88836 V 26.88836 H 12.23814 Z m 19.56228,0 h 6.78703 v 14.65022 h -6.78703 z m -70.38787,19.56228 h 6.78703 v 6.78703 h -6.78703 z m 11.69713,0 h 14.65218 v 6.78703 h -14.65218 z m 19.56619,0 H 7.32413 v 6.78703 H -7.32413 Z m 19.56227,0 h 14.65022 v 6.78703 H 12.23814 Z m 19.56228,0 h 6.78703 v 6.78703 h -6.78703 z");
							radiusDiv = 80;
							break;
						case 267: // ESHG-85 Rectangle
							path = new Path2D("m-80.92146 -65.90371l0.1889801 129.73228l159.59055 -0.12598419l-0.18897247 -129.73228z");
							radiusDiv = 70;
							break;
						case 268: // Quintet Body
							path = new Path2D("M 28156.3567 40550.6989 L -28189.6433 -405.30109999999695 28120.3567 -41337.3011 Z")
							radiusDiv = 40000;
							break;
						case 269: // ICBM
							path = new Path2D("M 253032 -4477 L 253032 4524 204740 4524 190698 12631 98298 27146 98298 30147 -162639 30147 -163830 40243 -165640 40243 -165640 41577 -178594 41577 -191548 46673 -206883 46673 -206883 39291 -227409 51006 -235696 53292 -252270 48720 -252270 31528 -241836 25504 -241836 20384 -227219 11335 -220504 11335 -220504 -11287 -227076 -11287 -241792 -20193 -241840 -25479 -252984 -31242 -252365 -48577 -235601 -53245 -227314 -51006 -206931 -39243 -206931 -46625 -191167 -46625 -177736 -41529 -165640 -41386 -165640 -40243 -163854 -40243 -162592 -30194 98274 -30194 98274 -27122 190643 -12597 204527 -4581 216503 -4581 Z");
							radiusDiv = 200000;
							break;
						case 270: // Hexachoron Rectangle
							path = new Path2D("m-68.19849 -77.10977l0 153.98163l136.15747 0l0 -153.98163z");
							radiusDiv = 70;
							angle += Math.PI / 2;
							break;
						case 271: // Overdrive Redesign
							path = new Path2D("M -38155.2158 -196.9519999999975 C -38155.2158 -21189.295341068457 -21137.55914106847 -38206.952 -145.21580000001268 -38206.952000000005 9935.662978801054 -38206.952000000005 19603.655208090873 -34202.33849771047 26731.912952900668 -27074.08075290068 33860.17069771047 -19945.823008090887 37864.7842 -10277.830778801072 37864.7842 -196.95200000000477 37864.7842 20795.391341068454 20847.12754106846 37813.048 -145.21579999999813 37813.048 -21137.559141068454 37813.048 -38155.21579999999 20795.39134106846 -38155.2158 -196.9519999999975 Z M 20801 -14160.860359999999 C 20801 -18016.989604361064 17674.989604361068 -21143 13818.86036 -21143 L -14108.860360000006 -21143 C -15960.638926890344 -21143 -17736.573464731344 -20407.383828539463 -19045.978646635413 -19097.9786466354 -20355.383828539474 -17788.573464731337 -21091.000000000015 -16012.638926890337 -21091.000000000015 -14160.860359999999 L -21091 13766.860360000006 C -21091 17622.98960436107 -17964.98960436107 20749 -14108.860360000006 20749 L 13818.860359999999 20749 C 17674.989604361064 20749 20801 17622.98960436107 20801 13766.860360000006 Z");
							radiusDiv = 38000;
							break;
						case 272: // Supercarrier Body
							path = new Path2D("m -370.59277,-101.62303 31.2756,-31.27821 h 239.25984 l 7.128613,4.5433 1.603676,11.22835 -5.88189,9.98162 -8.375329,3.56431 h -51.86352 l -18.20734,10.511808 17.36745,10.026245 H 3.3074972 56.41773 l 34.275593,9.183731 h 82.456697 l 19.24672,-9.228348 h 90.89238 l 99.979,8.556427 166.63257,73.4251996 -166.63257,73.6036764 -100.8714,8.732277 h -89.1076 l -19.60629,-9.089233 -87.106516,0 -35.688769,8.645668 H -157.9786 l -17.66929,10.202095 17.63254,10.181104 h 51.36221 l 9.267713,3.76378 6.060372,10.51444 -1.07087,11.5853 -6.771652,3.74278 H -338.87098 l -31.45407,-31.456693 z");
							radiusDiv = 85;
							break;
						case 273: // PDK-175000 Rectangle
							path = new Path2D("m-55.724384 -41.661858l110.86614 0l0 83.055115l-110.86614 0z");
							radiusDiv = 70;
							break;
						case 274:
							path = new Path2D("m-56.0803 -0.3169869l56.04987 -56.04987l28.249344 28.249344l0 55.958008l-28.160105 28.160105z");
							radiusDiv = 30;
							break;
						case 275: // Bow Hollow Square
							path = new Path2D("M 541.9918 -157367.0523 L 156793.9918 -1115.0523000000103 541.9918 155136.9477 -155710.0082 -1115.0523000000103 Z M 541.9918 -72734.71902 L -71077.67492 -1115.0523000000103 541.9918 70504.61442 72161.65852000001 -1115.0523000000103 Z");
							radiusDiv = 150000;
							break;
						case 276: // Bow Core
							path = new Path2D("M 26263.09846 124848.78024 C 12462.331121401558 138649.54757859843 -9913.133721401553 138649.54757859843 -23713.901060000004 124848.78024000001 L -123664.90154 24897.77975999999 C -130292.26373270349 18270.417567296507 -134015.47704394883 9281.785495679942 -134015.47704394886 -90.72000000005937 -134015.47704394886 -9463.225495679973 -130292.26373270355 -18451.857567296567 -123664.90154000005 -25079.219760000065 L -23713.901059999993 -125030.22024000002 C -9913.133721401538 -138830.98757859846 12462.33112140154 -138830.98757859846 26263.09845999999 -125030.22024000002 L 126214.09894 -25079.219760000007 C 140014.86627859843 -11278.45242140157 140014.86627859846 11097.012421401538 126214.09894000001 24897.77975999999 Z");
							radiusDiv = 100000;
							break;
						case 277: // Nothing
							path = new Path2D("");
							break;
						case 278: // Triple Shrapnel Projectile
							path = new Path2D("M -225396 36390 L -225396 -45927 -166908 -45927 -166908 -95422 -216928 -99951 -216928 -106450 -169271 -109666 -143571 -109666 -143571 -101691 -100444 -101691 -73464 -80980 -16256 -101822 43217 -107730 51751 -107730 122350 -96899 167546 -79077 171780 -69919 175882 -69919 177950 -71495 212118 -40741 223047 1271 210247 42758 180412 66192 177162 63632 169088 63632 169088 72691 120545 101312 49519 108204 -25807 98555 -76812 78172 -100772 96979 -142423 96979 -142423 104856 -170387 104856 -215582 98949 -215582 91367 -167236 91367 -167236 36456 Z M 78783.11779999999 -213472.0702 L 150069.6398 -172313.5702 120825.63979999999 -121662.96219999998 163688.3098 -96915.46219999998 192620.4238 -137968.2822 198248.55779999998 -134718.7822 177205.1138 -91839.82019999999 164355.1138 -69583.62019999999 157448.7638 -73571.12019999999 135885.2638 -36223.13819999999 104459.53779999999 -23213.958199999994 93904.7098 36749.1698 69284.53779999999 91206.78780000002 65017.53779999999 98597.23180000001 20338.391799999983 154320.46580000003 -17693.4602 184549.2018 -27741.28820000001 183636.84579999998 -29792.28820000001 187189.17780000003 -29461.47220000002 189768.0658 -73178.4362 203980.55380000002 -115025.32819999999 192439.0678 -144553.07020000002 160610.7678 -149929.4142 123056.65780000002 -146087.45419999998 121522.15780000002 -142050.45419999998 114530.07379999998 -149895.54820000002 110000.57379999998 -150409.83419999998 53651.83580000003 -120865.30620000005 -11302.680200000003 -74846.2722 -71710.4962 -31692.094199999992 -105689.32619999998 -35998.956200000015 -135842.1862 -15173.456200000015 -171911.9522 -21994.938200000004 -175850.4522 -8012.938200000004 -200067.2762 19700.023799999995 -236252.6462 26266.035799999983 -232461.6462 2093.0357999999833 -190594.0102 49645.96179999999 -163138.5102 Z M 143075.1086 174884.3183 L 71788.58660000001 216042.8183 42544.5866 165392.2103 -318.08339999999953 190139.7103 20769.802600000003 235721.5303 15141.6686 238971.0303 -11471.8874 199308.0683 -24321.8874 177051.86830000003 -17415.5374 173064.36830000003 -38979.0374 135716.3863 -34533.3114 101996.20630000002 -81186.4834 62875.07830000002 -116039.3114 14325.460300000006 -120306.3114 6935.0163000000175 -146226.1654 -59619.21770000001 -153390.3134 -107669.95369999998 -147576.4854 -115915.59769999995 -149627.4854 -119467.92970000001 -152026.3014 -120470.81769999999 -142477.33740000002 -165437.3057 -111559.4454 -195907.81969999996 -69231.7034 -205566.51969999998 -34020.35940000001 -191446.4097 -34612.3194 -187351.9097 -30575.3194 -180359.82569999996 -22730.22539999999 -184889.32569999996 26327.060600000004 -157161.5877 67808.5326 -99099.0717 97115.49859999999 -29042.25570000001 104966.32059999998 25319.574300000007 133233.1826 36665.43429999999 154058.6826 72735.2003 160880.1646 68796.7003 174862.1646 93013.52430000002 192344.2026 135105.8943 185778.1906 138896.8943 161605.1906 97029.25830000002 114052.2646 124484.75830000002 Z");
							radiusDiv = 150000;
							break;
						case 279: // Half a Bullet
							path = new Path2D("M 36095.94156434246 -18178.901427781693 C 36096.766822630176 1901.2925509294437 19819.88215293352 18180.523791155094 -260.311736101954 18182.593201963173 -20340.50562513742 18184.66261277126 -36620.74533667949 1908.7866222731082 -36624.058899999996 -18171.4071 L -264.05890000000363 -18177.4071 Z");
							radiusDiv = 20000;
							break;
						case 280: // Half a circle
							path = new Path2D("M 994.5926706014361 -56724.497201560764 C 33330.16971105673 -56564.93472966795 59437.46449163744 -30266.370352159516 59360.990692470434 2069.50994325996 59284.51689330343 34405.390238679436 33053.123548205214 60580.17452151223 717.1535000000149 60586.7899 L 705.1535000000003 1930.7899000000034 Z");
							radiusDiv = 22000;
							break;
						case 281: // L
							path = new Path2D("M -110592.5825 -166982.721 L -110592.5825 170413.26870000004 114825.12539999998 170413.26870000004 114825.12539999998 105173.64010000005 -34641.90770000001 105173.64010000005 -34641.90770000001 -166982.721 Z");
							radiusDiv = 220000;
							break;
						case 282: // E
							path = new Path2D("M -110592.5825 -166982.721 L -110592.5825 170413.26870000004 128457.29779999999 170413.26870000004 128457.29779999999 106634.22880000001 -34641.90770000001 106634.22880000001 -34641.90770000001 25328.124500000005 100219.2264 25328.124500000005 100219.2264 -36990.32669999999 -34641.90770000001 -36990.32669999999 -34641.90770000001 -103203.68109999999 117259.44189999999 -103203.68109999999 117259.44189999999 -166982.721 Z");
							radiusDiv = 220000;
							break;
						case 283: // T
							path = new Path2D("M -110592.5825 -166982.721 L -110592.5825 -102229.95529999999 -8838.15280000001 -102229.95529999999 -8838.15280000001 170413.26870000004 67112.52199999998 170413.26870000004 67112.52199999998 -102229.95529999999 168866.95169999998 -102229.95529999999 168866.95169999998 -166982.721 Z");
							radiusDiv = 220000;
							break;
						case 284: // U
							path = new Path2D("M -110592.5825 -166982.721 L -110592.5825 42855.18890000001 C -110592.5825 62816.56780000002 -108158.266 80830.49510000003 -102802.7697 97383.83370000005 -96960.41010000001 113450.3094 -88683.734 127569.33350000004 -77485.8781 139740.90600000005 -66288.0222 151425.61560000005 -52168.986500000006 160676.0107 -35128.77100000001 167492.0913 -18088.555500000002 173821.30900000004 2359.703099999999 177229.34930000003 26216.00479999998 177229.34930000003 50072.30649999999 177229.34930000003 71007.42839999999 173821.30900000004 88534.50719999998 167492.0913 106061.586 161162.87360000002 120667.485 151912.4785 131865.3409 140227.76890000005 143063.19679999998 128056.19640000004 151826.73619999998 113937.1723 157182.23249999998 97383.83370000005 162537.72879999998 80830.49510000003 165458.90859999997 62816.56780000002 165458.90859999997 42855.18890000001 L 165458.90859999997 -166982.721 89508.2338 -166982.721 89508.2338 36525.97120000003 C 89508.2338 63790.29360000003 83665.87419999998 83264.80960000001 71981.15499999998 94462.65630000003 60783.29909999999 105660.503 45690.53679999999 111502.85780000003 27189.731400000004 111502.85780000003 17939.3287 111502.85780000003 9662.652599999987 110042.2691 1872.839799999987 107607.95460000003 -5430.109700000015 105173.64010000005 -12246.195900000006 100791.87400000004 -17601.692200000005 94949.51920000001 -22957.188500000004 88620.30150000003 -26852.09490000001 80830.49510000003 -29773.27470000001 71580.10000000003 -33181.317800000004 61842.84200000003 -34641.90770000001 50158.13240000003 -34641.90770000001 36525.97120000003 L -34641.90770000001 -166982.721 Z");
							radiusDiv = 220000;
							break;
						case 285: // C
							path = new Path2D("M 61757.025699999984 -166982.721 C 36926.99739999998 -166982.721 14044.422299999991 -163087.8178 -6890.699600000007 -155298.0114 -27825.821500000005 -147508.205 -46326.6269 -135823.49539999999 -61419.389200000005 -120730.74549999999 -76512.1515 -106124.85849999999 -88683.734 -87624.06829999998 -97447.2734 -65715.23779999999 -106210.8128 -43319.544399999984 -110592.5825 -18489.536499999987 -110592.5825 9261.648800000024 -110592.5825 65250.88230000003 -95986.6835 108581.68040000004 -67261.7488 139254.04310000004 -38536.8141 169926.40580000004 2846.566399999996 185019.15570000003 57862.11929999998 185019.15570000003 83665.87419999998 185019.15570000003 106061.586 182584.84120000005 125536.11799999997 177229.34930000003 145010.64999999997 171873.8574 160103.41229999997 166031.50260000004 170814.40489999996 159702.2849 L 149879.283 98844.42240000001 C 145497.5133 100791.87400000004 141115.7436 102739.32560000001 135760.2473 105173.64010000005 130404.75099999997 107607.95460000003 124562.39139999998 109555.4062 117746.30519999999 111015.99490000002 110930.219 112963.44650000005 103140.40619999998 114424.03520000001 94376.86679999997 115884.62390000004 85613.3274 117345.2126 75876.06139999999 117832.0755 64678.2055 117832.0755 47151.12669999998 117832.0755 32058.364399999977 114910.89810000002 19886.781899999987 109555.4062 7715.199399999998 103713.05140000003 -2508.929900000003 95923.24500000002 -9811.879400000005 86185.98700000002 -17601.692200000005 76448.72900000002 -22957.188500000004 64764.01940000002 -26365.231600000014 51618.721100000024 -29773.27470000001 37986.55990000002 -31720.727900000013 23380.672900000005 -31720.727900000013 7801.0601000000315 -31720.727900000013 -11673.455899999972 -29286.41140000001 -28226.79449999999 -23930.915100000013 -41858.95569999999 -18575.418800000014 -55491.11689999998 -11759.332600000009 -66688.96359999999 -2995.7932000000146 -75452.49579999999 5280.882899999997 -83729.16509999998 15505.012199999997 -90058.38279999999 26702.868099999978 -93953.286 37900.724 -97848.1892 49098.5799 -99795.6408 60783.29909999999 -99795.6408 78310.37789999998 -99795.6408 93890.00349999998 -97848.1892 108009.03919999998 -93953.286 121641.2116 -90058.38279999999 133812.7941 -85189.75379999999 144036.92339999997 -79834.26189999998 L 165945.7719 -141178.98729999998 C 163511.45539999998 -142639.576 159129.68569999997 -145073.89049999998 153287.32609999995 -147995.0679 147444.96649999998 -150916.24529999998 140142.017 -153837.4227 131378.47759999998 -156758.60009999998 122614.93819999999 -159192.9146 112390.80889999999 -161627.2291 100706.0897 -163574.6807 89021.37049999998 -166008.9952 75876.06139999999 -166982.721 61757.025699999984 -166982.721 Z");
							radiusDiv = 220000;
							break;
						case 286:
							path = new Path2D("m -0.83560792,-0.16484729 -0.14934489,0.08164876 .14934489,0.08164877 V -5.16764e-4 L -0.98495281,0.08113253 -0.83560792,0.16278128 .98546956,-0.001033 Z");
							radiusDiv = 1;
							break;
						case 287: // Circle with divider
							path = new Path2D("M -21424.76549428232 -232.56278767007097 C -21455.469520310588 -7921.789564568044 -17375.936826617923 -15041.594358731802 -10726.716904784818 -18903.33303384653 -4077.4969829517104 -22765.071708961255 4128.23120634471 -22780.30946767396 10791.747456838419 -18943.2920917444 17455.26370733213 -15106.274715814836 21561.210646504594 -8001.670079481808 21559.064000000002 -312.38230000002295 L 67.06399999999849 -318.3823000000011 Z M 21575.012227136827 140.37279718391437 C 21610.00950699305 7829.581232008775 17534.452772617635 14951.662712221685 10887.390078400917 18817.113359032686 4240.327384184209 22682.564005843687 -3965.3910180768107 22702.383407937617 -10631.048617983643 18869.087186070145 -17296.706217890474 15035.79096420267 -21406.619353495393 7933.479979481808 -21408.766000000003 244.19220000002315 L 83.23400000000038 238.19220000000132 Z");
							radiusDiv = 35000;
							break;
						case 288: // The King?
							path = new Path2D("m -93.909295,-22.821633 -6.017115,6.021382 V 8.3529955e-4 16.801925 l 6.024729,6.02046 6.02473,6.02046 71.167457,-0.0742 71.167457,-0.0742 3.035713,-0.74999 c 10.498135,-2.59362 20.563099,-7.60065 29.375745,-14.6136 C 89.5432,11.203108 96.803163,3.9755073 98.567918,1.6845083 l 1.247452,-1.619533 -2.061967,-2.489731 C 86.585746,-15.90919 69.555083,-25.94568 53.632641,-28.425952 c -2.387047,-0.371834 -10.206215,-0.417065 -72.101114,-0.417065 h -69.423711 z");
							radiusDiv = 64;
							break;
						case 289: // ROD-1
							path = new Path2D("m -23.592617,17.282173 c .200209,-0.284804 2.997938,-4.302586 6.21717,-8.928404 l 5.853149,-8.41058 -0.122578,-0.175334 c -4.69411,-6.714431 -12.234092,-17.604942 -12.207255,-17.631779 .02016,-0.02016 10.786739,3.972479 23.92569592,8.872563 C 13.212523,-4.09128 23.939567,-0.061605 23.911445,-0.036534 23.855285,0.013536 -23.830221,17.8 -23.908302,17.8 c -0.02658,0 .115475,-0.233023 .315685,-0.517827 z");
							radiusDiv = 30;
							break;
						case 290: // Hellbringer
							path = new Path2D("M -0.16303856,74.934766 C -11.162845,70.715262 -20.296472,67.124244 -20.460038,66.954738 c -0.163567,-0.169506 -5.541307,-9.165282 -11.950535,-19.990606 -6.409222,-10.825325 -11.84419,-19.869515 -12.077704,-20.098184 -0.233511,-0.228675 -8.495256,-3.098256 -18.359457,-6.376846 -9.864201,-3.278595 -17.934914,-6.004918 -17.934914,-6.058495 0,-0.05359 3.269674,-3.209575 7.265939,-7.0133115 3.996266,-3.8037402 7.321205,-7.05741779 7.388755,-7.23040288 .06755,-0.17298025 -2.08464,-2.42314462 -4.782643,-5.00037222 -2.698003,-2.5772281 -6.049506,-5.7826184 -7.447787,-7.1230934 l -2.542329,-2.437224 17.993947,-5.980755 c 9.896671,-3.289413 18.184739,-6.167853 18.417953,-6.396526 .233218,-0.22867 5.6675,-9.272855 12.076186,-20.098187 6.408683,-10.825325 11.795865,-19.830304 11.971516,-20.011056 .17565,-0.180753 9.392743,-3.797264 20.48246676,-8.036691 l 20.16314724,-7.708049 21.166999,21.375382 21.167071,21.37538 9.191795,19.959903 L 80.922159,0.06550374 71.711213,20.017829 62.500263,39.970151 41.41429,61.310084 C 29.817039,73.047041 20.217739,82.640246 20.082495,82.628305 19.947256,82.616331 10.836763,79.154279 -0.16303856,74.934766 Z M -21.238192,7.0794574 c 5.508157,-3.8269054 9.884549,-7.08086525 9.725308,-7.23102091 -0.159242,-0.15015566 -4.719474,-3.34644069 -10.133841,-7.10285849 l -9.844309,-6.829859 -5.852913,3.822955 c -5.618542,3.6698636 -6.181902,3.943856 -14.068792,6.8424243 -9.895824,3.63686789 -9.516191,3.45422733 -8.169472,3.93030258 .581487,0.20556249 4.506529,1.64636372 8.72231,3.20178452 7.29312,2.6908198 7.944657,3.0127829 13.428131,6.6356106 3.169701,2.094168 5.856616,3.780818 5.970924,3.748124 .114302,-0.0327 4.714497,-3.190557 10.222654,-7.0174626 z");
							radiusDiv = 64;
							break;
						case 291: // Shield
							path = new Path2D("m -45.842363,-52.890476 c 19.507044,32.14599 27.924259,65.9472 0,105.1725 30.08133,-10.54462 60.29467,-24.38994 91.082058,-52.58624447 C 13.091037,-29.007806 -16.498064,-41.714176 -45.842363,-52.890476");
							radiusDiv = 64;
							break;
						case 292: // Snowflake
							path = new Path2D("m -56.135262,-42.203199 35.0459,5.51675 z m 12.33507,-12.577281 13.70117,2.56441 z m 35.3906811,-14.977189 -12.7453111,33.10902 z m -17.0597911,4.39384 -4.62972,13.147759 z m -13.43496,-2.00887 16.48922,28.56016 22.44233116,38.87126065 z m 95.0941,109.69334 -35.0459,-5.51675 z m -12.33507,12.577271 -13.70116,-2.56441 z M 8.4640989,69.875112 21.209398,36.766101 Z m 17.0597791,-4.39385 4.62973,-13.14776 z m 13.43495,2.00888 L 22.469618,38.929981 .02728916,0.05872165 Z M 8.5459089,-69.710439 21.291218,-36.601419 Z m 17.0597791,4.39385 4.62974,13.147759 z m 30.66597,23.16063 -35.04591,5.51675 z m -12.33508,-12.577291 -13.70115,2.56442 z m -4.97774,-12.639449 -16.48922,28.56016 L .02728916,0.05872165 Z M -8.4913309,69.827882 -21.236632,36.718861 Z m -17.0597711,-4.39385 -4.62973,-13.14776 z m -30.66597,-23.160621 35.0459,-5.51675 z m 12.33508,12.577271 13.70116,-2.56441 z m 4.97774,12.63945 16.48921,-28.560151 L .02728916,0.05872165 Z m 103.61272,-94.938651 -22.3006,27.59226065 z m 4.724697,16.97113 -9.071427,10.58334065 z M 64.708468,27.660421 42.407868,0.06816165 Z M 69.433165,10.689291 60.361738,0.10595165 Z M 77.890385,0.05872165 H 44.911958 .02728916 Z M -64.653882,27.565961 l 22.3006,-27.59225935 z m -4.724702,-16.97113 9.071427,-10.58333935 z m 4.724702,-38.13781 22.30059,27.59226065 z m -4.724702,16.97113 9.071427,10.58334065 z m -8.457218,10.63057065 h 32.97842 44.88467116 zM 21.171176,0.05872505 15.994608,9.2774532 10.59924,18.369856 .02730299,18.496181 -10.544634,18.369856 -15.940002,9.277453 -21.11657,0.05872505 l 5.176568,-9.21872815 5.395368,-9.0924029 10.57193715,-0.126325 10.57193685,0.126325 5.395369,9.0924031 z");
							radiusDiv = 11.75;
							break;
						case 293: // inf
							path = new Path2D("m .14288931,-31.331168 c -2.18070981,-10e-4 -4.36658981,0.12533 -5.66993991,0.38034 -5.4652424,1.069318 -10.4057854,3.419898 -14.5215744,6.889498 4.60004,3.85204 8.060421,8.97661 9.840723,14.8890118 1.0092513,3.35174 1.2485413,5.1388595 1.2350713,9.22424942 -0.0136,4.11814008 -0.33165,6.23933008 -1.4366123,9.58855968 -1.879471,5.6968791 -5.286063,10.5588891 -9.651072,14.2197991 .463597,0.40135 .921694,0.7748 1.365281,1.10536 4.73505,3.52859 10.3754233,5.66632 16.2160635,6.1464 14.3801245,1.18199 27.7889045,-7.72487 32.3241145,-21.4715591 1.10496,-3.3492296 1.42301,-5.4709396 1.43661,-9.58907968 .0135,-4.08538992 -0.22582,-5.87250942 -1.23507,-9.22423942 C 26.699564,-20.28799 17.415314,-28.61821 5.7818184,-30.944628 c -1.2826394,-0.2565 -3.4582091,-0.38529 -5.63892909,-0.38654 z");
							radiusDiv = 32;
							break;
						case 294: // Ship-22
							path = new Path2D("M 9.7769285,-10.500902 6.8677622,-3.3309742 H -7.9096739 l -1.9179966,-2.883402 H -22.326682 l 4.225564,6.17819635 -4.225564,6.28224005 h 12.4990115 l 1.9179966,-2.883402 H 6.8677622 L 9.7769285,10.532587 H 22.288897 L 17.925077,0.01591315 22.288897,-10.500902 Z");
							radiusDiv = 1;
							break;
						case 295: // Asteroid
							path = new Path2D("m -2.152836,-11.747481 -8.025417,3.7820045 4.0160087,3.3635848 L -9.9904472,0.05654427 -6.4884573,4.3029849 -10.178253,7.9927838 -2.152836,11.77479 6.8408596,8.361801 10.25403,0.01356092 6.8408596,-8.3344914 Z");
							radiusDiv = 16;
							break;
						case 296: // Splitter Pentagon
							path = new Path2D("m 14.511167,-60.497522 -30.367655,9.810771 -31.388267,10.257255 44.6861613,32.4667525 z m 10.489282,3.1781 L 8.0149208,-5.0430252 H 62.980558 L 44.020993,-31.23109 Z m -77.81127,26.391156 -0.05219,31.17690746 L -52.809271,32.32937 -9.2765285,0.70081043 Z M 8.9631848,5.9149622 25.572507,57.031737 44.020993,31.727856 62.709257,5.9149622 Z M -1.6516709,8.706523 -46.385891,41.207381 l 30.529403,9.976136 31.291111,10.109459 z");
							radiusDiv = 72;
							break;
						case 297: // Splitter Square
							path = new Path2D("m -47.025568,-46.871049 .414444,41.273965 h 40.8595218 v -40.859003 z m 93.505919,0 -41.2739648,0.414962 V -5.597084 H 46.065906 Z M -46.611124,5.3614199 -47.025568,46.635385 -5.7516022,46.220423 V 5.3614199 Z m 51.8175102,0 V 46.220423 L 46.480351,46.635385 46.065906,5.3614199 Z");
							radiusDiv = 72;
							break;
						case 298: // Splitter Hexagon
							path = new Path2D("M -57.203125 -100.2832 L -85.748047 -49.90625 L -111.97266 -5.3164062 L 113.36719 -5.3164062 L 87.142578 -49.90625 L 58.595703 -100.2832 L .69726562 -99.816406 L -57.203125 -100.2832 z M -111.16016 6.7050781 L -85.748047 49.912109 L -57.203125 100.28711 L .69726562 99.820312 L 58.595703 100.28711 L 87.142578 49.912109 L 112.55469 6.7050781 L -111.16016 6.7050781 z");
							radiusDiv = 95;
							break;
						case 299: // Splitter Splitter Square
							path = new Path2D("M -177.73438 -177.15039 L -177.04297 -108.29297 L -108.87695 -108.29297 L -108.87695 -176.45898 L -177.73438 -177.15039 z M -21.738281 -177.15039 L -90.595703 -176.45898 L -90.595703 -108.29297 L -22.429688 -108.29297 L -21.738281 -177.15039 z M 19.677734 -177.15039 L 20.369141 -108.29297 L 88.535156 -108.29297 L 88.535156 -176.45898 L 19.677734 -177.15039 z M 175.67383 -177.15039 L 106.81641 -176.45898 L 106.81641 -108.29297 L 174.98242 -108.29297 L 175.67383 -177.15039 z M -177.04297 -90.011719 L -177.73438 -21.154297 L -108.87695 -21.845703 L -108.87695 -90.011719 L -177.04297 -90.011719 z M -90.595703 -90.011719 L -90.595703 -21.845703 L -21.738281 -21.154297 L -22.429688 -90.011719 L -90.595703 -90.011719 z M 20.369141 -90.011719 L 19.677734 -21.154297 L 88.535156 -21.845703 L 88.535156 -90.011719 L 20.369141 -90.011719 z M 106.81641 -90.011719 L 106.81641 -21.845703 L 175.67383 -21.154297 L 174.98242 -90.011719 L 106.81641 -90.011719 z M -177.73438 18.695312 L -177.04297 87.552734 L -108.87695 87.552734 L -108.87695 19.386719 L -177.73438 18.695312 z M -21.738281 18.695312 L -90.595703 19.386719 L -90.595703 87.552734 L -22.429688 87.552734 L -21.738281 18.695312 z M 19.677734 18.695312 L 20.369141 87.552734 L 88.535156 87.552734 L 88.535156 19.386719 L 19.677734 18.695312 z M 175.67383 18.695312 L 106.81641 19.386719 L 106.81641 87.552734 L 174.98242 87.552734 L 175.67383 18.695312 z M -177.04297 105.83398 L -177.73438 174.69141 L -108.87695 174 L -108.87695 105.83398 L -177.04297 105.83398 z M -90.595703 105.83398 L -90.595703 174 L -21.738281 174.69141 L -22.429688 105.83398 L -90.595703 105.83398 z M 20.369141 105.83398 L 19.677734 174.69141 L 88.535156 174 L 88.535156 105.83398 L 20.369141 105.83398 z M 106.81641 105.83398 L 106.81641 174 L 175.67383 174.69141 L 174.98242 105.83398 L 106.81641 105.83398 z");
							radiusDiv = 250;
							break;
						case 300: // Splitter Decagon
							path = new Path2D("M -1.2617188 -129.95703 L -35.912109 -129.85156 L -1.2617188 -23.210938 L 33.386719 -129.85156 L -1.2617188 -129.95703 z M -49.84375 -125.32422 L -77.939453 -105.04297 L -105.91016 -84.591797 L -15.193359 -18.681641 L -49.84375 -125.32422 z M 47.318359 -125.32422 L 12.669922 -18.681641 L 103.38477 -84.591797 L 75.414062 -105.04297 L 47.318359 -125.32422 z M -114.51953 -72.742188 L -125.32812 -39.818359 L -135.93359 -6.8320312 L -23.802734 -6.8320312 L -114.51953 -72.742188 z M 111.99414 -72.742188 L 21.277344 -6.8320312 L 133.4082 -6.8320312 L 122.80273 -39.818359 L 111.99414 -72.742188 z M -135.93359 7.8164062 L -125.32812 40.802734 L -114.51953 73.726562 L -23.802734 7.8164062 L -135.93359 7.8164062 z M 21.277344 7.8164062 L 111.99414 73.726562 L 122.80273 40.802734 L 133.4082 7.8164062 L 21.277344 7.8164062 z M -15.195312 19.666016 L -105.91016 85.576172 L -77.939453 106.02734 L -49.84375 126.30859 L -15.195312 19.666016 z M 12.667969 19.666016 L 47.318359 126.30859 L 75.414062 106.02734 L 103.38477 85.576172 L 12.667969 19.666016 z M -1.2636719 24.195312 L -35.912109 130.83594 L -1.2617188 130.94141 L 33.386719 130.83594 L -1.2636719 24.195312 z");
							radiusDiv = 155;
							break;
						case 301: // Dropship Boss
							path = new Path2D("M 31.227547,-0.06102919 -31.227474,-35.87645 l 0.01903,9.309665 16.791335,16.8237079 9.79e-4,0.00104 16.7856216,9.62572203 -16.7660246,9.65845457 -16.759932,16.7921285 0.01903,9.542199 z");
							radiusDiv = 32;
							break;
						case 302: // Kamikaze crasher
							path = new Path2D("M -0.5 0 L -1 0.5 L -0.5 1 L 1 0 L -0.5 -1 L -1 -0.5 L -0.5 00")
							break;
						case 303: // RTX Body
							path = new Path2D("M -0.58942146,-0.873 -0.873,-0.5896005 v 1.1791058 l 0.28357854,0.2833995 H 0.58942145 L 0.873,0.5895053 V -0.5896005 L 0.58942145,-0.873 Z M 4.8037767e-8,-0.7249525 A 0.72496095,0.72500251 0 0 1 0.72496108,5.01e-5 0.72496095,0.72500251 0 0 1 4.8037767e-8,0.7250527 0.72496095,0.72500251 0 0 1 -0.72496099,5.01e-5 0.72496095,0.72500251 0 0 1 4.8037767e-8,-0.7249525 Z");
							radiusDiv = 1.05;
							break;
						case 305: // Oxyphenbutazone bullet
							path = new Path2D("M -5.0002116 -8.6604533 L -5.0002116 8.6604533 L 9.9999064 0 L -5.0002116 -8.6604533 z M -2.5853719 -4.4777629 L 5.1707438 0 L -2.5853719 4.4777629 L -2.5853719 -4.4777629 z ");
							radiusDiv = 8;
							break;
						case 306: // Droid's fuckahedron
							path = new Path2D("M 1 0.85 L 1 -0.85 L 0.85 -1 L -0.85 -1 L -1 -0.85 L -1 0.85 L -0.85 1 L 0.85 1 L 1 0.85");
							radiusDiv = 1;
							break;
						case 307: // orbitalstrike insignia piece
							path = new Path2D("M 1 1 L 1 -1 L -1 -1 L -1 1 L 1 1 M 0.95 0.95 L -0.95 0.95 L -0.95 -0.95 L 0.95 -0.95 L 0.95 0.95");
							radiusDiv = 1;
							break;
						case 308: // orbitalstrike insignia piece
							path = new Path2D("M 0.9257 0 A 0.9256 0.9256 90 0 1 -0.9257 0 A 0.9256 0.9256 90 0 1 0.9257 0 M 0 1 A 0.935 0.935 90 0 0 0 -1 A 0.935 0.935 90 0 0 0 1");
							radiusDiv = 1;
							break;
						case 309: // kys
							path = new Path2D("M 0 0");
							radiusDiv = 1;
							break;
						case 310: //fuckin diamond
							path = new Path2D('M -1 0 L 0 -1 C 1 0 2 0 2 0 C 2 0 1 0 0 1 L -1 0');
							radiusDiv = 1;
							break;
						case 311: // Seer
							path = new Path2D('M 1.5 0 L 0 -1 L 0 -0.425 L -1.5 -0.425 L -2 0 L -1.5 0.425 L 0 0.425 L 0 1 L 1.5 0');
							radiusDiv = 1;
							break;
						case 312: // Trident
							path = new Path2D('M 3.4 0 C 2.9 0 2.1 0 1.7 -0.1 L 1.7 -0.1 L 1.1 -0.2 L 1.3 -0.3 L 2.3 -0.4 L 2 -0.525 L 1.9 -0.6 C 1.8 -0.7 1.8 -0.8 1.8 -1 L 1.8 -1 C 1.7 -0.9 1.7 -0.8 1.7 -0.7 L 1.7 -0.7 C 1.7 -0.7 1.7 -0.6 1.8 -0.55 L 1.8 -0.55 C 1.2 -0.6 1.1 -0.7 0.7 -0.7 L 0.7 -0.7 L 0 -0.4 C -0.2 -0.3 -0.6 -0.3 -0.9 -0.25 C -1.2 -0.2 -1.5 -0.2 -1.8 -0.2 C -2.2 -0.2 -2.6 -0.1 -2.9 -0.1 C -3 -0.1 -3 -0.1 -3.1 -0.2 C -3.1 -0.1 -3.1 0 -3.5 0 M 3.4 0 C 2.9 0 2.1 0 1.7 0.1 L 1.7 0.1 L 1.1 0.2 L 1.3 0.3 L 2.3 0.4 L 2 0.525 L 1.9 0.6 C 1.8 0.7 1.8 0.8 1.8 1 L 1.8 1 C 1.7 0.9 1.7 0.8 1.7 0.7 L 1.7 0.7 C 1.7 0.7 1.7 0.6 1.8 0.55 L 1.8 0.55 C 1.2 0.6 1.1 0.7 0.7 0.7 L 0.7 0.7 L 0 0.4 C -0.2 0.3 -0.6 0.3 -0.9 0.25 C -1.2 0.2 -1.5 0.2 -1.8 0.2 C -2.2 0.2 -2.6 0.1 -2.9 0.1 C -3 0.1 -3 0.1 -3.1 0.2 C -3.1 0.1 -3.1 0 -3.5 0');
							radiusDiv = 1;
							break;
						case 313: //vivisection beam
							path = new Path2D('m -0.0645 0.981 h 0.1382 l 0.06 -0.981 l -0.06 -0.981 l -0.1382 0 l -0.06 0.981 z');
							radiusDiv = 1;
							break;
						case 315: //vivisection greenpart back
							path = new Path2D('m 0.9813 0.5787 l -0.1256 -0.2854 l 0.018 -0.002 V -0.2913 l -0.018 -0.002 l 0.1219 -0.277 l -0.4705 -0.3206 l -0.1893 0.2582 l -0.3152 -0.43 l -0.4475 0.2584 l 0.2046 0.4649 l -0.7409 0.0811 v 0.5168 l 0.7409 0.0811 l -0.2046 0.4649 l 0.4475 0.2584 l 0.3152 -0.43 l 0.1721 0.2348 z');
							radiusDiv = 1;
							break;
						case 316: //vivisection redpart back
							path = new Path2D('m -0.9813 0 l 0.3318 -0.3201 l -0.0069 -0.4596 l 0.4624 0.0068 l 0.3221 -0.3298 l 0.3221 0.3298 v 1.5457 l -0.3221 0.3298 l -0.3221 -0.3298 l -0.4624 0.0068 l 0.0069 -0.4596 z');
							radiusDiv = 1;
							break;
						case 317: //vivisection bodies
							path = new Path2D('M -0 -1.1234 L -0.991 0.0005 L 0 1.0879 L 0.4511 0.0005 Z');
							radiusDiv = 1;
							break;
						case 318: //vivisection yellowpart back
							path = new Path2D('M -0.672 0.001 L 0.1395 -0.3074 L 0 -1.1665 L 0.672 -0.6157 v 1.2334 l -0.672 0.5508 l 0.1395 -0.8591 z');
							radiusDiv = 1;
							break;
						case 319: //8 Pointed star
							path = new Path2D('m 0 -0.9643 l 0.3013 0.2376 l 0.381 0.0451 l 0.0451 0.381 l 0.2376 0.3013 l -0.2376 0.3013 l -0.0451 0.381 l -0.381 0.0451 l -0.3013 0.2376 l -0.3013 -0.2376 l -0.381 -0.0451 l -0.0451 -0.381 l -0.2376 -0.3013 l 0.2376 -0.3013 l 0.0451 -0.381 l 0.381 -0.0451 z');
							radiusDiv = 1;
							break;
						case 314: //E
							path = new Path2D('M 1.5 -1.5 v -1 h -3 v 5 h 3 v -1 h -2 v -1 h 2 v -1 h -2 v -1 h 2');
							radiusDiv = 1;
							break;
						case 320: //5-Pointed star
							path = new Path2D('M 0 -25 l 6 17 h 18 l -14 11 l 5 17 l -15 -10 l -15 10 l 5 -17 l -14 -11 h 18 z');
							radiusDiv = 1;
							break;
						case 321: // Leafer
							path = new Path2D('M 1.25,0 C 1.06917,0 0.89576,-0.047 0.7679,-0.13054 0.64004,-0.21414 0.5682,-0.32748 0.5682,-0.44568 L -0.80929,-0.66162 -1.25,0 -0.80929,0.66162 0.5682,0.44568 Z');
							radiusDiv = 1;
							break;
						case 322: // Green Gear
							path = new Path2D('m -0.0538 -0.9932 l -0.1014 0.2128 l -0.0016 0.0493 l 0.0317 0.1476 l -0.199 0.0825 l -0.082 -0.1268 l -0.0359 -0.0338 l -0.2222 -0.0787 l -0.0761 0.0761 l 0.0787 0.2222 l 0.0338 0.0359 l 0.1268 0.082 l -0.0825 0.199 l -0.1476 -0.0317 l -0.0493 0.0016 l -0.2128 0.1014 V 0.0538 l 0.2128 0.1014 l 0.0493 0.0015 l 0.1476 -0.0316 l 0.0825 0.199 l -0.1268 0.082 l -0.0338 0.036 l -0.0787 0.2222 l 0.0761 0.0761 l 0.2222 -0.0787 l 0.0359 -0.0338 l 0.082 -0.1267 l 0.199 0.0824 l -0.0317 0.1476 l 0.0016 0.0493 l 0.1014 0.2128 h 0.1076 l 0.1014 -0.2128 l 0.0015 -0.0493 l -0.0316 -0.1476 l 0.199 -0.0824 l 0.082 0.1267 l 0.036 0.0338 l 0.2222 0.0787 l 0.0761 -0.0761 l -0.0787 -0.2222 l -0.0338 -0.036 l -0.1267 -0.082 l 0.0824 -0.199 l 0.1476 0.0316 l 0.0493 -0.0015 l 0.2128 -0.1014 v -0.1076 l -0.2128 -0.1014 l -0.0493 -0.0016 l -0.1476 0.0317 l -0.0824 -0.199 l 0.1267 -0.082 l 0.0338 -0.0359 l 0.0787 -0.2222 l -0.0761 -0.0761 l -0.2222 0.0787 l -0.036 0.0338 l -0.082 0.1268 l -0.199 -0.0825 l 0.0316 -0.1476 l -0.0015 -0.0493 l -0.1014 -0.2128 z m 0.0538 0.6807 a 0.3125 0.3125 90 0 1 0.3125 0.3125 a 0.3125 0.3125 90 0 1 -0.3125 0.3125 A 0.3125 0.3125 90 0 1 -0.3125 -0 A 0.3125 0.3125 90 0 1 -0 -0.3125 Z');
							radiusDiv = 1;
							break;
						case 323: // Open Square
							path = new Path2D('m 0.816 0.816 l 0 -1.632 l -1.632 0 l 0 1.632 l 1.632 0 z m -0.096 -0.096 l -1.44 0 l 0 -1.44 l 1.44 0 l 0 1.44 z');
							radiusDiv = 1;
							break;
						case 324: // Distant Point (nothing)
							path = new Path2D('M 100000000 0 l 0 0');
							radiusDiv = 1;
							break;
						case 325: // half a hexagon
							path = new Path2D("M -0.5 -0.75 L 0.5 -0.75 L 0.9 0 L -0.9 0 L -0.5 -0.75");
							radiusDiv = .9;
							break;
					}
					path2dCache.set(sides, { path, radiusDiv })
					radius /= radiusDiv;
					context.save();
					context.translate(centerX, centerY);
					context.scale(radius, radius);
					context.lineWidth /= radius;
					context.rotate(angle);
					context.stroke(path);
					if (fill) context.fill(path);
					context.restore();
				}
				break;
		}
		context.closePath();
		context.stroke();
		if (fill) context.fill();
		context.lineJoin = "round";
	}

	function makeGunPath(context, length, height, aspect, skin) {
		// Calculate height dimensions based on aspect
		const h = aspect > 0 ? [height * aspect, height] : [height, -height * aspect];
		// Now all drawing can be done relative to origin (0,0) without angle calculations
		switch (skin) {
			case 0: // Normal Barrel
				context.lineTo(length, h[0]); // tr
				context.lineTo(-length, h[1]); // br
				context.lineTo(-length, -h[1]); // bl
				context.lineTo(length, -h[0]); // tl
				break;

			case 1: // Flamethrower Barrel
				context.lineTo(length * Math.cos(-h[0] / 3), length * Math.sin(-h[0] / 3));
				context.lineTo(length * 1.25, 0);
				context.lineTo(length * Math.cos(h[0] / 3), length * Math.sin(h[0] / 3));
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				break;

			case 2: // Scramjet Thruster Base
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				// Bezier curve
				context.bezierCurveTo(
					length * 0.25, -h[0] * 0.25,
					length * 0.25, h[0] * 0.25,
					length, h[0]
				);
				break;

			case 3: // Round Barrel
				context.ellipse(0, 0, length, height, 0, 0, 2 * Math.PI, true);
				break;

			case 4: // Spiky Barrel
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length * 1.25, 0);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				break;

			case 5: // L Triangle Barrel
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				break;

			case 6: // R Triangle Barrel
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				break;

			case 7: // L Coilgun Barrel
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1] * 4.25);
				context.lineTo(length, -h[0]);
				break;

			case 8: // R Coilgun Barrel
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1] * 4.25);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				break;

			case 9: // R Triangle 2
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length * 2, -h[0]);
				break;

			case 10: // L Triangle 2
				context.lineTo(length * 2, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				break;

			case 11: // Split Barrel
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				context.lineTo(length, 0);
				context.lineTo(-length, 0);
				context.lineTo(length, 0);
				break;

			case 12: // Veloc B
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				context.bezierCurveTo(
					length * 0.5, -h[0] * 0.5,
					length * 0.5, h[0] * 0.5,
					length, h[0]
				);
				break;

			case 13: // Rev Triangle
				context.lineTo(length, h[0]);
				context.lineTo(-length, 0);
				context.lineTo(length, -h[0]);
				break;

			case 14: // Terminus Barrel
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				context.bezierCurveTo(
					length * 0.5, -h[0] * 0.5,
					length * 0.5, h[0] * 0.5,
					length, h[0]
				);
				break;

			case 15: // Nothing
				break;

			case 16: // Notched Barrel
				context.lineTo(length * 0.5, 0);
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				break;

			case 17: // Circle with hole in it
				context.ellipse(0, 0, length, height, 0, 0, 2 * Math.PI, true);
				context.ellipse(0, 0, length * 0.8, height * 0.8, 0, 0, 2 * Math.PI, false);
				break;

			case 18: // Pyromancer barrel
				context.lineTo(length * Math.cos(-h[0] / 10), length * Math.sin(-h[0] / 10) - 1);
				context.lineTo(length * 1.25, 0);
				context.lineTo(length * Math.cos(h[0] / 10), length * Math.sin(h[0] / 10) - 1);
				context.lineTo(length, h[0]);
				context.lineTo(-length, h[1]);
				context.lineTo(-length, -h[1]);
				context.lineTo(length, -h[0]);
				break;
			case 19: // Laser
				let count = length*4;
				const maxCount = count;
				const unit = length/count
				context.roundRect(-length, -unit/4, length*2-unit/2, unit/2, 5); // Rod
				while(count > 0){
					let alpha = (maxCount - count+1)/maxCount
					context.roundRect(
						length*(1-alpha),
						-height*alpha,
						unit/2,
						2*height*alpha,
						5
					)
					count--;
				}
				break;
			case 100: // Tachyon
				break;
			default:
				console.error("Invalid gun skin: ", skin)
			break;
		}
	}

	function handleAnimations(id, ogProps) {
		let animations = _anims.get(id);
		if (animations) {
			const props = []
			for(let obj of ogProps){
				const newObj = {}
				for(let key2 in obj){
					newObj[key2] = obj[key2]
				}
				props.push(newObj)
			}
			for(let animation of animations){
				let prop = props[animation.index]
				if(!prop) return props;
				prop.shape = animation.shape;
				prop.size = animation.size;
				prop.x = animation.x;
				prop.y = animation.y;
				prop.angle = animation.angle;
				prop.layer = animation.layer;
				prop.color = animation.color;
			}
			return props
		}
		return ogProps
	}

	const drawProp = (() => {
	    function fixRot(xx, yy, angle, x, y) {
	        let cos = Math.cos(angle), sin = Math.sin(angle);
	        return [
	            x * cos - y * sin + xx,
	            x * sin + y * cos + yy
	        ];
	    }

	    function pointInit(drawSize, m, p, scaleInit, angle) {
	        let scale = scaleInit * drawSize / m.size * m.realSize * p.size;
	        return [
	            scale * (p.x / p.size + Math.cos(angle)),
	            scale * (p.y / p.size + Math.sin(angle))
	        ];
	    }

	    function drawPropPoints(ctx, xx, yy, rot, drawSize, m, p, scale, angle, c1, c2) {
	        let point = pointInit(drawSize, m, p, scale, angle);
	        if (c2 !== undefined) {
	            ctx.bezierCurveTo(
	                ...fixRot(xx, yy, rot, ...c1),
	                ...fixRot(xx, yy, rot, ...c2),
	                ...fixRot(xx, yy, rot, ...point)
	            );
	        } else if (c1 !== undefined) {
	            ctx.quadraticCurveTo(
	                ...fixRot(xx, yy, rot, ...pointInit(drawSize, m, p, ...c1)),
	                ...fixRot(xx, yy, rot, ...point)
	            );
	        } else {
	            ctx.lineTo(...fixRot(xx, yy, rot, ...point));
	        }
	    }
	
		function drawDiggerFace(context, p, rot, xx, yy, drawSize, m, source) {
			if (!source || !source.render || !source.widthHeightRatio) {
				return;
			}
			context.save();
			context.shadowOffsetX = 0;
			context.shadowOffsetY = 0;
			let expression = source.widthHeightRatio[0];
			let size = drawSize / m.size * m.realSize * p.size;
			let x = size * 0.25;
			let y = size * 0.45;
			let mood = source.render.extra[1] = lerp(source.render.extra[1], expression === 2 ? -0.5 : expression === 3 ? 0.5 : 0, 0.2);
			let mouthdip = expression === 2 ? 3.75 : expression === 3 ? 3 : 1.75;
			let eye = size * 0.15;
			let xpadding = .3 * .25 / .45;
			let pointy = Math.min(Math.max(Math.sin(-rot) * 0.5, -0.32), 0.32) * y;
			let pointx = Math.min(Math.max(Math.cos(rot) * -0.5, -xpadding), xpadding) * x;
			let originalLineWidth = context.lineWidth;

			source.render.extra[0] = lerp(source.render.extra[0], mouthdip, 0.2);

			setColors(context, color.guiblack);
			context.beginPath();
			context.moveTo(xx - size / 4, yy + size / 2.25);
			context.quadraticCurveTo(xx, yy + size / source.render.extra[0], xx + size / 4, yy + size / 2.25);
			context.lineWidth = size / 13;
			context.stroke();
			context.lineWidth = originalLineWidth;

			context.save();

			context.beginPath();
			context.moveTo(xx - x * 1.6, yy - y - (mood > 0 ? x * -mood : 0));
			context.lineTo(xx - x * 0.6, yy - y - (mood < 0 ? x * mood : 0));
			context.lineTo(xx - x * 0.6, yy);
			context.lineTo(xx - x * 1.6, yy);
			context.lineTo(xx - x * 1.6, yy - y);
			context.clip();

			context.beginPath();
			context.moveTo(xx - x * 1.6, yy - y - (mood > 0 ? x * -mood : 0));
			context.lineTo(xx - x * 0.6, yy - y - (mood < 0 ? x * mood : 0));
			context.lineTo(xx - x * 0.6, yy);
			context.lineTo(xx - x * 1.6, yy);
			context.lineTo(xx - x * 1.6, yy - y);
			context.fill();

			setColors(context, color.guiwhite);
			context.fillRect(xx - eye / 2 - x * 1.1 - pointx, yy - y / 2 - pointy - eye / 2, eye, eye);
			context.restore();

			context.save();
			context.beginPath();
			context.moveTo(xx + x * 1.6, yy - y - (mood > 0 ? x * -mood : 0));
			context.lineTo(xx + x * 0.6, yy - y - (mood < 0 ? x * mood : 0));
			context.lineTo(xx + x * 0.6, yy);
			context.lineTo(xx + x * 1.6, yy);
			context.lineTo(xx + x * 1.6, yy - y);
			context.clip();

			setColors(context, color.guiblack);
			context.beginPath();
			context.moveTo(xx + x * 1.6, yy - y - (mood > 0 ? x * -mood : 0));
			context.lineTo(xx + x * 0.6, yy - y - (mood < 0 ? x * mood : 0));
			context.lineTo(xx + x * 0.6, yy);
			context.lineTo(xx + x * 1.6, yy);
			context.lineTo(xx + x * 1.6, yy - y);
			context.fill();

			setColors(context, color.guiwhite);
			context.fillRect(xx - eye / 2 + x * 1.1 - pointx, yy - y / 2 - pointy - eye / 2, eye, eye);
			context.restore();

			return context.restore();
		}

	    return function (ctx, p, pColor, rot, xx, yy, drawSize, m, source) {
	        ctx.save();
	        ctx.beginPath();
			let isimage = p.shape instanceof ImageBitmap ? p.shape : undefined;
	        let path = p.shape instanceof Path2D ? p.shape : undefined;
	        let rpmAngle = (Date.now() * (p.rpm || 0) / 1000) % (2 * Math.PI);
	        let propRot = p.rpm === false ? p.angle : p.angle + rpmAngle;
	        let finalRot = p.lockRot === true ? propRot : rot + propRot;

			if (p.tankOrigin === true) {
	            ctx.translate(xx, yy);
	            ctx.rotate(rot);
	            ctx.translate(-xx, -yy);
	        }

	        if (Array.isArray(p.shape)) {
	            for (let [x, y, cx1, cy1, cx2, cy2] of p.shape) {
	                drawPropPoints(ctx, xx, yy, finalRot, drawSize, m, p,
	                    Math.hypot(x, y), Math.atan2(x, y),
	                    cx1 !== undefined ? [Math.hypot(cx1, cy1), Math.atan2(cx1, cy1)] : undefined,
	                    cx2 !== undefined ? [Math.hypot(cx2, cy2), Math.atan2(cx2, cy2)] : undefined
	                );
	            }
	        } else if (typeof p.shape === 'number') {
	            if (p.shape > 999) { // Special cases
	                if (p.shape === 1000) {
	                    if (!source?.render || !source.widthHeightRatio) return;
	                    drawDiggerFace(ctx, p, rot, xx, yy, drawSize, m, source);
						ctx.restore();
	                    return;
	                }
	                throw new TypeError(`${p.shape} is not a valid prop shape`);
	            }
	            if (p.shape > 0) {
	                let size = p.scaleSize === true ? drawSize + p.size : p.size;
	                for (let i = 0; i < p.shape; i++) {
	                    drawPropPoints(ctx, xx, yy, finalRot, size, m, p,
	                        1,
	                        (2 * Math.PI / p.shape) * i + Math.PI / p.shape
	                    );
	                }
	            } else if (p.shape < 0) { // Quadratic curve shapes (like traps)
	                let scale = p.scaleSize === true ? (drawSize / m.size * m.realSize * p.size) : p.size;
	                let dip = p.dip - 6 / (p.shape * p.shape);
	                ctx.moveTo(...fixRot(p.x + xx, p.y + yy, finalRot, scale, 0));
	                for (let i = 0; i < -p.shape; i++) {
	                    let theta = -(i + 1) / p.shape * 2 * Math.PI;
	                    let htheta = -(i + 0.5) / p.shape * 2 * Math.PI;
	                    ctx.quadraticCurveTo(
	                        ...fixRot(p.x + xx, p.y + yy, finalRot,
	                            scale * dip * Math.cos(htheta),
	                            scale * dip * Math.sin(htheta)
	                        ),
	                        ...fixRot(p.x + xx, p.y + yy, finalRot,
	                            scale * Math.cos(theta),
	                            scale * Math.sin(theta)
	                        )
	                    );
	                }
	            } else { // Circle and other shape: 0 cases
                	let r = p.scaleSize === true ? drawSize / m.size * m.realSize * p.size : p.size;
                	let arcStart = finalRot;
                	let arcEnd = 2 * Math.PI * p.arclen + arcStart;
                	let positionScale = drawSize / m.size * m.realSize;
                	let scaledX = p.x * positionScale;
                	let scaledY = p.y * positionScale;
                	const [centerX, centerY] = fixRot(xx, yy, finalRot, scaledX, scaledY);
                	ctx.arc(centerX, centerY, r, arcStart, arcEnd, false);

                	if (p.ring !== undefined) {
                	    ctx.arc(centerX, centerY, r * p.ring, arcEnd, arcStart, true);
                	}

                	if (p.isAura) {
                	    let grad = getGradient(pColor)
                	    let x = centerX | 0;
                	    let y = centerY | 0;

                	    ctx.save()
                	    ctx.translate(x, y)
                	    ctx.scale(r, r)
                	    ctx.fillStyle = grad;
                	    ctx.beginPath()
                	    ctx.arc(0, 0, 1, 0, 2 * Math.PI)
                	    ctx.closePath()
                	    ctx.fill()
                	    ctx.restore()
                	    ctx.restore() // Corresponds to the main ctx.save() at the top
                	    return;
                	}
	            }
	        } else if (path) {
	            let radius = p.scaleSize === true ? drawSize / m.size * m.realSize * p.size / path.path2dDiv : p.size
				let positionScale = drawSize / m.size * m.realSize;
	            ctx.translate(p.x * positionScale + xx, p.y * positionScale + yy);
	            ctx.scale(radius, radius);
	            ctx.lineWidth /= radius;
	            ctx.rotate(finalRot);
	        } else if (isimage) {
				let radius = p.scaleSize === true ? drawSize / m.size * m.realSize * p.size : p.size
				let positionScale = drawSize / m.size * m.realSize;
				ctx.save()
				ctx.translate(p.x * positionScale + xx, p.y * positionScale + yy);
				ctx.rotate(finalRot);
				ctx.drawImage(p.shape, -radius * p.shape.p1, -radius * p.shape.p2, radius * p.shape.p3, radius * p.shape.p4);
				ctx.restore();
			}


			if (path) {
	            if (!p.borderless) ctx.stroke(path);
	            if (p.fill) ctx.fill(path);
	        } else {
	            if (p.loop) ctx.closePath();
	            if (!p.borderless) ctx.stroke();
	            if (p.color >= 1000) {
	                ctx.save();
	                ctx.clip();
	                specialColors[p.color](ctx, source);
	                ctx.restore();
	            } else if (p.fill) {
	                ctx.fill();
	            }
	        }
	        ctx.restore();
	    };
	})();


	return function (x, y, instance, ratio, alpha) {
		let scale = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1,
			rot = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 0,
			turretsObeyRot = arguments.length > 7 && arguments[7] !== undefined ? arguments[7] : 0,
			assignedContext = arguments.length > 8 && arguments[8] !== undefined ? arguments[8] : 0,
			turretInfo = arguments.length > 9 && arguments[9] !== undefined ? arguments[9] : 0,
			render = arguments.length > 10 && arguments[10] !== undefined ? arguments[10] : instance.render,
			source = turretInfo === 0 ? instance : turretInfo;

		// Preserve original main context globalAlpha.
		const originalCtxGlobalAlpha = ctx.globalAlpha;

		if (config.hideMiniRenders === true && !render.real) return;

		let fade = turretInfo ? 1 : render.status.getFade(instance.size);
		if (fade === 0 || alpha === 0) return;

		let drawSize = scale * ratio * (turretInfo ? instance.size : render.size);
		if (config.lerpSize) drawSize = drawSize * fade;

		// Get mockup data.
		const m = mockups.get(instance.index);
		let props = m.props

		let currentContext = assignedContext || ctx;
		// Coordinates relative to currentContext.
		let tankDrawX = x;
		let tankDrawY = y;

		const useOffscreenCanvas = ((alpha < 1 || fade < 1 ) && turretInfo === 0);
		if (useOffscreenCanvas) {
			currentContext = ctx2;

			// Dynamically size offscreen canvas.
			currentContext.canvas.width = Math.max(currentContext.canvas.height = drawSize * m.position.axis + ratio * 7.5 * instance.size, 1);

			// Recalculate tank center for offscreen canvas.
			tankDrawX = currentContext.canvas.width / 2 - drawSize * 2 * m.position.axis * m.position.middle.x * Math.cos(rot) / 4;
			tankDrawY = currentContext.canvas.height / 2 - drawSize * 2 * m.position.axis * m.position.middle.x * Math.sin(rot) / 4;

			currentContext.clearRect(0, 0, currentContext.canvas.width, currentContext.canvas.height);
			// Save offscreen canvas state.
			currentContext.save();
			// Draw opaque on offscreen canvas.
			currentContext.globalAlpha = 1;
		} else {
			// Apply globalAlpha for main context drawing.
			currentContext.globalAlpha = (config.glassMode ? .7 : 1);
		}

		// Apply common canvas settings.
		currentContext.lineCap = "round";
		currentContext.lineJoin = config.pointy ? "miter" : "round";

		// Apply shader settings.
		let shadowRelativeColor = false;
		if (render.real) {
			switch (config.shaders) {
				case "Disabled":
					currentContext.shadowBlur = 0;
					currentContext.shadowColor = "rgba(0,0,0,0)";
					currentContext.shadowOffsetX = 0;
					currentContext.shadowOffsetY = 0;
					break;
				case "Light Blur":
					currentContext.shadowBlur = 14;
					currentContext.shadowColor = "#ebf5f0";
					currentContext.shadowOffsetX = 0;
					currentContext.shadowOffsetY = 0;
					break;
				case "Dark Blur":
					currentContext.shadowBlur = 14;
					currentContext.shadowColor = "#101211";
					currentContext.shadowOffsetX = 0;
					currentContext.shadowOffsetY = 0;
					break;
				case "Colorful Blur":
					currentContext.shadowBlur = 18;
					shadowRelativeColor = true;
					currentContext.shadowOffsetX = 0;
					currentContext.shadowOffsetY = 0;
					break;
				case "Light":
					currentContext.shadowBlur = 0;
					currentContext.shadowColor = "#ebf5f0";
					currentContext.shadowOffsetX = 8;
					currentContext.shadowOffsetY = 8;
					break;
				case "Dark":
					currentContext.shadowBlur = 0;
					currentContext.shadowColor = "#101211";
					currentContext.shadowOffsetX = 8;
					currentContext.shadowOffsetY = 8;
					break;
				case "Light Stroke":
					currentContext.shadowBlur = 0;
					currentContext.shadowColor = "#ebf5f0";
					currentContext.shadowOffsetX = 8;
					currentContext.shadowOffsetY = 8;
					break;
				case "Dark Stroke":
					currentContext.shadowBlur = 0;
					currentContext.shadowColor = "#101211";
					currentContext.shadowOffsetX = 8;
					currentContext.shadowOffsetY = 8;
					break;
				case "Colorful Dense":
					currentContext.shadowBlur = 10;
					shadowRelativeColor = true;
					currentContext.shadowOffsetX = 0;
					currentContext.shadowOffsetY = 0;
					break;
				case "Dynamic Fake 3D":
					currentContext.shadowBlur = 0;
					shadowRelativeColor = true;
					currentContext.shadowOffsetX = Math.max(-4, Math.min(4, x * 0.012));
					currentContext.shadowOffsetY = Math.max(-4, Math.min(4, y * 0.012));
					break;
				case "Fake 3D":
					currentContext.shadowBlur = 0;
					shadowRelativeColor = true;
					currentContext.shadowOffsetX = 4;
					currentContext.shadowOffsetY = 4;
					break;
			}
		}

		source.guns?.update?.();

		let renderColor = render.status.getColor();
		let renderBlend = render.status.getBlend();
		let finalColor = mixColors(getColor(instance.color), renderColor, renderBlend);
		if (fade > 0) {
			finalColor = mixColors(finalColor, color.dgrey, 1 - fade);
		}
		if (instance === global.player.instance) global._tankMenuColor = finalColor // dont include invuln bc it looks bad
		let invulnTicker = instance.invuln && (Date.now() - instance.invuln) % 200 > 110;
		if (invulnTicker) finalColor = mixColors(finalColor, color.vlgrey, .5);

		let adjustedRot = rot;
		if (fade > 0) adjustedRot += (((90 * Math.PI) / 180) * (1 - fade)) * Math.sign(rot);

		currentContext.lineWidth = ratio * config.borderChunk * fade;
		if (scale < 1) {
			currentContext.lineWidth *= scale;
		}

		// --- LEASH RENDERING ---
		if (instance.leash) {
			currentContext.save();
			currentContext.strokeStyle = "black";
			currentContext.lineWidth = drawSize*.45*(instance.leash.fadeOverride!==1?instance.leash.fadeOverride:fade)
			currentContext.globalAlpha = .25*(instance.leash.fadeOverride!==1?instance.leash.fadeOverride:fade); 
			const renderedAnchorX = instance.render?.x ?? instance.x;
			const renderedAnchorY = instance.render?.y ?? instance.y;
			for (let i = 0; i < instance.leash.points.length; i++) {
				let lastPoint = instance.leash.points[i - 1];
				let currentPoint = instance.leash.points[i];
				let nextPoint = instance.leash.points[i + 1];
				if (lastPoint) {
					currentPoint.vel.x += (lastPoint.pos.x - currentPoint.pos.x) * .5;
					currentPoint.vel.y += (lastPoint.pos.y - currentPoint.pos.y) * .5;
				}
				if (nextPoint) {
					currentPoint.vel.x += (nextPoint.pos.x - currentPoint.pos.x) * .5;
					currentPoint.vel.y += (nextPoint.pos.y - currentPoint.pos.y) * .5;
				}
				if (i === 0) {
					currentPoint.vel.x = (renderedAnchorX-currentPoint.pos.x) * .75;
					currentPoint.vel.y = (renderedAnchorY-currentPoint.pos.y) * .75;
				}
				if (i === instance.leash.points.length - 1) {
					currentPoint.vel.x += (instance.leash.x-currentPoint.pos.x) * .75;
					currentPoint.vel.y += (instance.leash.y-currentPoint.pos.y) * .75;
				}
			}

			currentContext.beginPath();
			currentContext.moveTo(tankDrawX, tankDrawY);
			for (let i = 0; i < instance.leash.points.length; i++) {
				const canvasX = tankDrawX + ratio * (instance.leash.points[i].pos.x - renderedAnchorX);
				const canvasY = tankDrawY + ratio * (instance.leash.points[i].pos.y - renderedAnchorY);
				currentContext.lineTo(canvasX, canvasY);
				currentContext.moveTo(canvasX, canvasY);
				instance.leash.points[i].tick();
			}
			ctx.closePath()
			currentContext.stroke();
			currentContext.restore();
		}
		

		// --- PROP ANIMATIONS ---
		props = handleAnimations(instance.id, props)

		// --- PROP RENDERING - LAYER -2 ---
		if (props.length) {
			for (let i = 0; i < props.length; i++) {
				let p = props[i];
				let pColor = getColor(p.color == -1 ? instance.color : p.color);
				if (invulnTicker) pColor = mixColors(pColor, color.vlgrey, .5);
				setColors(currentContext, pColor);
				if(!p.stroke) currentContext.strokeStyle = currentContext.fillStyle;
				if (p.layer === -2) drawProp(currentContext, p, pColor, adjustedRot, tankDrawX, tankDrawY, drawSize, m, source);
			}
		}

		// --- TURRET RENDERING - LAYER 0 ---
		if (source.turrets.length === m.turrets.length) {
			for (let i = 0; i < m.turrets.length; i++) {
				if (!source.turrets[i]) continue;
				let t = m.turrets[i];
				if (t.layer === 0) {
					let ang = t.direction + t.angle + adjustedRot,
						len = t.offset * drawSize;
					source.turrets[i].lerpedFacing = lerpAngle(source.turrets[i].lerpedFacing || source.turrets[i].facing, source.turrets[i].facing, .15);
					drawEntity(tankDrawX + len * Math.cos(ang), tankDrawY + len * Math.sin(ang), t, ratio, alpha, (drawSize / ratio / t.size * t.sizeFactor), (source?.turrets?.[i]?.lerpedFacing || 0) + turretsObeyRot * adjustedRot, turretsObeyRot, currentContext, source.turrets[i], render);
				}
			}
		}

		// --- PROP RENDERING - LAYER -1 ---
		if (props.length) {
			for (let i = 0; i < props.length; i++) {
				let p = props[i];
				let pColor = getColor(p.color == -1 ? instance.color : p.color);
				if (invulnTicker) pColor = mixColors(pColor, color.vlgrey, .5);
				setColors(currentContext, pColor);
				if(!p.stroke) currentContext.strokeStyle = currentContext.fillStyle;
				if (p.layer === -1) drawProp(currentContext, p, pColor, adjustedRot, tankDrawX, tankDrawY, drawSize, m, source);
			}
		}

		// --- GUN RENDERING ---
		if (source.guns.length === m.guns.length) {
			let positions = source.guns.getPositions();
			for (let i = 0; i < m.guns.length; i++) {
				let g = m.guns[i];

				const gunAngle = g.angle || 0;
				const gunAspect = (g.aspect == null ? 1 : g.aspect);
				const gunBaseColor = (g.color == null ? 16 : g.color);

				const anglePlusRot = gunAngle + adjustedRot;
				const cosAnglePlusRot = Math.cos(anglePlusRot);
				const sinAnglePlusRot = Math.sin(anglePlusRot);

				const directionPlusAnglePlusRot = g.direction + anglePlusRot;
				const cosDirPlusAnglePlusRot = Math.cos(directionPlusAnglePlusRot);
				const sinDirPlusAnglePlusRot = Math.sin(directionPlusAnglePlusRot);

				const positionDivisor = (gunAspect === 1) ? 2 : 1;
				const position = positions[i] / positionDivisor;

				const offsetX = g.offset * cosDirPlusAnglePlusRot;
				const offsetY = g.offset * sinDirPlusAnglePlusRot;
				const lengthTerm = g.length / 2 - position;

				const gx = offsetX + lengthTerm * cosAnglePlusRot;
				const gy = offsetY + lengthTerm * sinAnglePlusRot;

				let gColor = mixColors(getColor(gunBaseColor), renderColor, renderBlend);
				if (invulnTicker) {
					gColor = mixColors(gColor, color.vlgrey, .5);
				}

				switch (g.color_unmix) {
					case 1: setColorsUnmix(currentContext, gColor); break;
					case 2: setColorsUnmixB(currentContext, gColor); break;
					case 0:
					case null: setColors(currentContext, gColor); break;
				}

				const gunDrawLength = ((g.length / 2) * 1000 | 0) / 1000;
				const gunDrawWidth = ((g.width / 2) * 1000 | 0) / 1000;

				const key = `${gunDrawLength}|${gunDrawWidth}|${gunAspect}|${g.skin}`;
				let path = gunCache.get(key);
				if (path === undefined) {
					path = new Path2D();
					makeGunPath(path, gunDrawLength, gunDrawWidth, gunAspect, g.skin || 0);
					path.closePath();
					gunCache.set(key, path);
				}
				currentContext.save();
				currentContext.translate(tankDrawX + drawSize * gx, tankDrawY + drawSize * gy);
				currentContext.rotate(anglePlusRot);
				currentContext.scale(drawSize, drawSize);
				currentContext.lineWidth /= drawSize;
				currentContext.stroke(path);
				currentContext.lineWidth *= drawSize;
				currentContext.fill(path);
				currentContext.restore();
			}
		}

		// --- PROP RENDERING - LAYER 0 ---
		if (props.length) {
			for (let i = 0; i < props.length; i++) {
				let p = props[i];
				let pColor = mixColors(getColor(p.color == -1 ? instance.color : p.color), renderColor, renderBlend);
				if (invulnTicker) pColor = mixColors(pColor, color.vlgrey, .5);
				setColors(currentContext, pColor);
				if(!p.stroke) currentContext.strokeStyle = currentContext.fillStyle;
				if (p.layer === 0) drawProp(currentContext, p, pColor, adjustedRot, tankDrawX, tankDrawY, drawSize, m, source);
			}
		}

		// --- BODY RENDERING ---
		setColors(currentContext, finalColor);
		if (shadowRelativeColor) currentContext.shadowColor = currentContext.strokeStyle;
		if (instance.color >= 1000) {
			currentContext.save();
			currentContext.beginPath();
			drawPoly(currentContext, tankDrawX, tankDrawY, drawSize / m.size * m.realSize, m.shape, source.widthHeightRatio, ratio, scale, adjustedRot, undefined, false);
			currentContext.clip();
			specialColors[instance.color](currentContext, instance);
			currentContext.restore();
		} else {
			drawPoly(currentContext, tankDrawX, tankDrawY, drawSize / m.size * m.realSize, m.shape, source.widthHeightRatio, ratio, scale, adjustedRot);
		}

		// --- PROP RENDERING - LAYER 1 ---
		if (props.length) {
			for (let i = 0; i < props.length; i++) {
				let p = props[i];
				let pColor = mixColors(getColor(p.color == -1 ? instance.color : p.color), renderColor, renderBlend);
				if (invulnTicker) pColor = mixColors(pColor, color.vlgrey, .5);
				setColors(currentContext, pColor);
				if(!p.stroke) currentContext.strokeStyle = currentContext.fillStyle;
				if (p.layer === 1) drawProp(currentContext, p, pColor, adjustedRot, tankDrawX, tankDrawY, drawSize, m, source);
			}
		}

		// --- TURRET RENDERING - LAYER 1 ---
		if (source.turrets.length === m.turrets.length) {
			for (let i = 0; i < m.turrets.length; i++) {
				let t = m.turrets[i];
				if (t.layer === 1) {
					let ang = t.direction + t.angle + adjustedRot,
						len = t.offset * drawSize;
					if (source.turrets[i]) source.turrets[i].lerpedFacing = lerpAngle(source.turrets[i].lerpedFacing || source.turrets[i].facing, source.turrets[i].facing, .15);
					drawEntity(tankDrawX + len * Math.cos(ang), tankDrawY + len * Math.sin(ang), t, ratio, alpha, drawSize / ratio / t.size * t.sizeFactor, (source?.turrets[i]?.lerpedFacing || 0) + turretsObeyRot * adjustedRot, turretsObeyRot, currentContext, source.turrets[i], render);
				}
			}
		}

		// --- PROP RENDERING - LAYER 2 ---
		if (props.length) {
			for (let i = 0; i < props.length; i++) {
				let p = props[i];
				let pColor = mixColors(getColor(p.color == -1 ? instance.color : p.color), renderColor, renderBlend);
				if (invulnTicker) pColor = mixColors(pColor, color.vlgrey, .5);
				setColors(currentContext, pColor);
				if(!p.stroke) currentContext.strokeStyle = currentContext.fillStyle;
				if (p.layer === 2) drawProp(currentContext, p, pColor, adjustedRot, tankDrawX, tankDrawY, drawSize, m, source);
			}
		}

		if (useOffscreenCanvas) {
			// Restore offscreen canvas state.
			currentContext.restore();

			if (currentContext.canvas.width > 0 && currentContext.canvas.height > 0) {
				ctx.save();
				// Apply tank transparency.
				ctx.globalAlpha = alpha * fade;
				// Draw offscreen content to main context.
				ctx.drawImage(currentContext.canvas, Math.round(x - tankDrawX), Math.round(y - tankDrawY));
				ctx.restore();
			}
		}

		// Restore original globalAlpha.
		ctx.globalAlpha = originalCtxGlobalAlpha;

		// Clear gun cache if size exceeds limit.
		if (gunCache.size > 4000) {
			gunCache.clear();
		}
	};
}();

export { drawEntity }