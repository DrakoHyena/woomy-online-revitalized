import { getColor, setColors } from "../colors.js";
import { currentSettings } from "../settings.js";
import { roomState } from "../state/room.js";
import { gameState } from "./scenes/game.js";
import { entities } from "../socket.js";
import { mockups } from "../mockups.js";

// ==========================================
// PATH & SHAPE RENDERING
// ==========================================

const path2dCache = new Map();

function drawShape(context, shape, size, stroke, fill, options = {}) {
    const widthHeightRatio = options.widthHeightRatio ?? [1, 1];
    const angle = options.angle ?? 0;
    const ring = options.ring ?? false;
    const arcLen = options.arcLen ?? 1;
    const dipOverride = options.dip;

    if (shape === -4000) return true;

    // Bitmaps - draw relative to origin
    if (shape instanceof ImageBitmap) {
        context.drawImage(shape, -size * shape.p1, -size * shape.p2, size * shape.p3, size * shape.p4);
        return true;
    }

    // Path2Ds
    if (shape instanceof Path2D) {
        const sizeDiv = shape.path2dDiv || 1;
        const scaledSize = size / sizeDiv;
        context.save();
        context.scale(scaledSize, scaledSize);
        context.lineWidth /= scaledSize;
        if (stroke) context.stroke(shape);
        if (fill) context.fill(shape);
        context.restore();
        return true;
    }

    // Arrays/Objects (SVG paths or dot-to-dot)
    if (Array.isArray(shape)) {
        if (!shape[2] && typeof shape[0] === 'string') {
            const sizeDiv = shape[1] || 1;
            const path = new Path2D(shape[0]);
            const scaledSize = size / sizeDiv;
            context.save();
            context.scale(scaledSize, scaledSize);
            context.lineWidth /= scaledSize;
            if (stroke) context.stroke(path);
            if (fill) context.fill(path);
            context.restore();
            return true;
        }

        context.beginPath();
        for (let i = 0; i < shape.length; i++) {
            context.lineTo(size * shape[i][0], size * shape[i][1]);
        }
        context.closePath();
        if (stroke) context.stroke();
        if (fill) context.fill();
        return true;
    }

    context.beginPath();

    // Traps (negative shapes with quadratic curves)
    if (shape < 0) {
        const dip = dipOverride ?? (1 - 6 / (shape * shape));
        const sides = -shape;
        context.moveTo(size, 0);
        for (let i = 0; i < sides; i++) {
            const theta = ((i + 1) / sides) * 2 * Math.PI * arcLen;
            const htheta = ((i + 0.5) / sides) * 2 * Math.PI * arcLen;
            const cx = size * dip * Math.cos(htheta);
            const cy = size * dip * Math.sin(htheta);
            const px = size * Math.cos(theta);
            const py = size * Math.sin(theta);
            context.quadraticCurveTo(cx, cy, px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    // Circle
    if (shape === 0) {
        context.arc(0, 0, size, 0, 2 * Math.PI * arcLen, false);
        if (ring !== false) {
            context.arc(0, 0, size * ring, 2 * Math.PI * arcLen, 0, true);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    // Regular polygons (1-101)
    if (shape > 0 && shape < 102) {
        if (shape === 4 && widthHeightRatio != null && (widthHeightRatio[0] !== 1 || widthHeightRatio[1] !== 1)) {
            const sides = Math.ceil(4 * arcLen);
            const allPoints = [
                widthHeightRatio,
                [-widthHeightRatio[0], widthHeightRatio[1]],
                [-widthHeightRatio[0], -widthHeightRatio[1]],
                [widthHeightRatio[0], -widthHeightRatio[1]]
            ];
            for (let i = 0; i < sides; i++) {
                const [rx, ry] = allPoints[i];
                context.lineTo(size * rx + (rx - 1) * 1.1, size * ry + (ry - 1) * 1.1);
            }
        } else {
            const sides = Math.ceil(shape * arcLen);
            const polyAngleOffset = shape % 2 ? 0 : Math.PI / shape;
            for (let i = 0; i < sides; i++) {
                const theta = (i / shape) * 2 * Math.PI + polyAngleOffset;
                context.lineTo(size * Math.cos(theta), size * Math.sin(theta));
            }
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    // Special shapes 102+
    if (shape === 102) {
        for (let [scale, theta] of [
            [1, 0], [1, 0.4 * Math.PI], [1, 0.8 * Math.PI],
            [-0.1, 0], [1, 1.2 * Math.PI], [1, 1.6 * Math.PI]
        ]) context.lineTo(size * scale * Math.cos(theta), size * scale * Math.sin(theta));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 103) { // Aquamarine Body Type
        for (let i = 0; i < 360; i++) {
            const theta = (i / 360) * 2 * Math.PI;
            let px = size * Math.cos(theta);
            let py = size * Math.sin(theta);
            if (i === 135) {
                px = 0; py = 0;
            } else if (i > 135) {
                px = size * Math.cos((((i + 90) / 360) * 2) * Math.PI);
                py = size * Math.sin((((i + 90) / 360) * 2) * Math.PI);
            }
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 104) { // Star
        const dip = 0.25;
        context.moveTo(size, size);
        for (let i = 0; i < 6; i++) {
            const theta = ((i + 1) / 6) * 2 * Math.PI;
            const htheta = ((i + 0.5) / 6) * 2 * Math.PI;
            context.quadraticCurveTo(
                size * dip * Math.cos(htheta), size * dip * Math.sin(htheta),
                size * Math.cos(theta), size * Math.sin(theta)
            );
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 105) { // Nautica shell shape
        for (let i = 0; i < 16; i++) {
            const theta = (i / 16) * 2 * Math.PI;
            let px = size * Math.cos(theta + 0.4);
            let py = size * Math.sin(theta + 0.4);
            if (i === 1 || i === 5 || i === 9 || i === 13) {
                px = 0; py = 0;
            }
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 106) { // Flash Crasher
        for (let [scale, theta] of [
            [1, 0], [1, 0.4 * Math.PI], [1, 0.8 * Math.PI],
            [0.36, Math.PI / 2], [0.36, -(Math.PI / 2)],
            [1, 1.2 * Math.PI], [1, 1.6 * Math.PI]
        ]) context.lineTo(size * scale * Math.cos(theta), size * scale * Math.sin(theta));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 107) { // Crusher
        for (let [scale, theta] of [
            [1, 0], [1, 0.286 * Math.PI], [1, 0.571 * Math.PI],
            [0.36, Math.PI / 2], [-0.75, 0], [0.36, -(Math.PI / 2)],
            [1, 1.429 * Math.PI], [1, 1.714 * Math.PI]
        ]) context.lineTo(size * scale * Math.cos(theta), size * scale * Math.sin(theta));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 108) { // Tri-Blade
        for (let i = 0; i < 12; i++) {
            const theta = (i / 12) * 2 * Math.PI;
            let s = size;
            if (i === 2 || i === 10 || i === 6) s = size * 0.5;
            else if (i === 0 || i === 4 || i === 8) s = size * 1.25;
            context.lineTo(s * Math.cos(theta), s * Math.sin(theta));
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 109) { // Phaser
        for (let i = 0; i < 4; i++) {
            let theta = (i / 3) * 2 * Math.PI;
            let px = size * Math.cos(theta);
            let py = size * Math.sin(theta);
            if (i === 2) {
                px = size * -0.25;
                py = 0;
            } else if (i > 2) {
                theta = ((i - 1) / 3) * 2 * Math.PI;
                px = size * Math.cos(theta);
                py = size * Math.sin(theta);
            }
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 111) { // Diamond
        for (let i = 0; i < 4; i++) {
            const theta = (i / 4) * 2 * Math.PI;
            let px = size * Math.cos(theta);
            let py = size * Math.sin(theta);
            if (i === 2) {
                px = size * -1.5; py = 0;
            } else if (i === 0 || i === 4) {
                px = size * 1.5; py = 0;
            }
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 112) { // Destroyer
        for (let [scale, theta] of [
            [1, 0], [1, Math.PI / 2], [-1.16, -1.047], [-1.3, -0.3],
            [-0.425, -1.047], [-0.425, 1.047], [-1.3, 0.3], [-1.16, 1.047], [-1, Math.PI / 2]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.025), size * scale * Math.sin(theta - 0.025));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 113) { // Waller
        for (let [scale, theta] of [
            [1, 0.611], [1, 1.571], [-1.25, -0.698], [-0.5, -0.698],
            [-0.5, 0.698], [-1.25, 0.698], [1, -1.571], [1, -0.611]
        ]) context.lineTo(size * scale * Math.cos(theta), size * scale * Math.sin(theta));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 114) { // Vis Destructia
        for (let [scale, theta] of [
            [0.25, 0.611], [-1, -0.838], [-0.5, -0.436], [0, 0],
            [-0.5, 0.436], [-1, 0.838], [0.25, -0.611]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.025), size * scale * Math.sin(theta - 0.025));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 115) { // Grouper
        for (let [scale, theta] of [
            [1, 0.489], [-1, -1.257], [-0.5, -0.96], [-0.75, 0],
            [-0.5, 0.96], [-1, 1.257], [1, -0.489]
        ]) context.lineTo(size * scale * Math.cos(theta), size * scale * Math.sin(theta));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 116) { // Rodrigo's Destroyer Ship
        for (let [scale, theta] of [
            [1.5, 0.14], [1.1, 0.335], [0.75, 0.593], [0.475, 1.047], [0.517, 1.466],
            [-0.55, -1.187], [-0.55, -0.838], [-1, -0.419], [-1.2, -0.312], [-1.375, -0.192],
            [-1.45, -0.087], [-1.45, 0.087], [-1.375, 0.192], [-1.2, 0.312], [-1, 0.419],
            [-0.55, 0.838], [-0.55, 1.187], [0.517, -1.466], [0.475, -1.047], [0.75, -0.593],
            [1.1, -0.335], [1.5, -0.14]
        ]) context.lineTo(size * (scale * 1.5) * Math.cos(theta - 0.0261), size * (scale * 1.5) * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 117) { // Frigate
        for (let [scale, theta] of [
            [1.95, 0], [0.95, 0.578], [-1, -0.82], [-1.12, -0.715], [-1.32, -0.873],
            [-2.155, -0.489], [-2.155, 0.489], [-1.32, 0.873], [-1.12, 0.715], [-1, 0.82], [0.95, -0.578]
        ]) context.lineTo(size * (scale * 0.9) * Math.cos(theta), size * (scale * 0.9) * Math.sin(theta));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 118) { // Blue Runner
        for (let [scale, theta] of [
            [0.9, 0], [0.625, 0.698], [-0.35, -1.361], [-0.75, -1.204], [-1, -0.453],
            [-0.563, -0.559], [-0.563, 0.559], [-1, 0.453], [-0.75, 1.204], [-0.35, 1.361], [0.625, -0.698]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.0261), size * scale * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 119) { // Varp
        for (let [scale, theta] of [
            [1, 0], [0.75, 0.559], [-1, -0.89], [-0.938, -0.262], [-0.5, -0.681],
            [-0.312, 0], [-0.5, 0.681], [-0.938, 0.262], [-1, 0.89], [0.75, -0.559]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.0261), size * scale * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 120) { // Spiked Runner
        for (let [scale, theta] of [
            [0.625, 0], [1, 0.489], [0.313, 0.576], [0.5, 1.518], [-0.875, -1.03],
            [-0.375, -0.768], [-0.938, 0], [-0.375, 0.768], [-0.875, 1.03], [0.5, -1.518],
            [0.313, -0.576], [1, -0.489]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.0261), size * scale * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 121) { // Clutter
        for (let [scale, theta] of [
            [0.438, 0], [1, 0.681], [0.625, 1.047], [0.438, 1.065], [-0.5, -1.1],
            [-0.34, -0.698], [-0.75, 0], [-0.34, 0.698], [-0.5, 1.1], [0.438, -1.065],
            [0.625, -1.047], [1, -0.681]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.0261), size * scale * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 122) {
        for (let [scale, theta] of [
            [1, 0], [1.315, 0.331613], [1.315, 0.715585], [1, 1.0472], [1.315, 1.37881],
            [1.315, 1.76278], [1, 2.0944], [1.315, 2.42601], [1.315, 2.80998], [1, 3.14159],
            [1.315, -2.80998], [1.315, -2.42601], [1, -2.0944], [1.315, -1.76278],
            [1.315, -1.37881], [1, -1.0472], [1.315, -0.715585], [1.315, -0.331613], [1, 0]
        ]) context.lineTo(size * scale * Math.cos(theta + 1.5447), size * scale * Math.sin(theta + 1.5447));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 123) { // Golden Rectangle
        for (let [scale, theta] of [
            [1, 0.541], [-1, -0.541], [-1, 0.541], [1, -0.541]
        ]) context.lineTo(size * scale * Math.cos(theta + 1.5447), size * scale * Math.sin(theta + 1.5447));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 124) { // Ring
        context.arc(0, 0, size, 0, 2 * Math.PI, true);
        context.arc(0, 0, size / 1.15, 0, 2 * Math.PI, false);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 125 || shape === 126) { // Caravan / Rounded Rect
        const bordersize = 0.4;
        const centerAway = size * (1 - bordersize);
        const scalesize = size * bordersize;
        context.arc(centerAway, centerAway, scalesize, 0, 0.5 * Math.PI);
        context.arc(-centerAway, centerAway, scalesize, 0.5 * Math.PI, Math.PI);
        context.arc(-centerAway, -centerAway, scalesize, Math.PI, 1.5 * Math.PI);
        context.arc(centerAway, -centerAway, scalesize, -0.5 * Math.PI, 0);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 127) { // Triangle With Round Edges
        const bordersize = 0.4;
        const centerAway = size * (1 - bordersize);
        const scalesize = size * bordersize;
        context.arc(centerAway, 0, scalesize, -0.272 * Math.PI, 0.272 * Math.PI);
        context.arc(-centerAway, centerAway, scalesize, 0.272 * Math.PI, Math.PI);
        context.arc(-centerAway, -centerAway, scalesize, Math.PI, 1.544 * Math.PI);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 128) { // Triangle (Rotated)
        const realShape = 3;
        for (let i = 0; i < realShape; i++) {
            const theta = (i / realShape) * 2 * Math.PI;
            const px = size * 1.5 * Math.cos(theta + 45);
            const py = size * 1.5 * Math.sin(theta + 45);
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 129) { // TK-3 Minion Shape
        const realShape = 3;
        const dip = 1 - 8 / 9;
        context.moveTo(size, 0);
        for (let i = 0; i < realShape; i++) {
            const theta = ((i + 1) / realShape) * 2 * Math.PI;
            const htheta = ((i + 0.5) / realShape) * 2 * Math.PI;
            context.quadraticCurveTo(
                size * dip * Math.cos(htheta), size * dip * Math.sin(htheta),
                size * Math.cos(theta), size * Math.sin(theta)
            );
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 130) { // genericEntity
        const realShape = 11;
        const dip = 1 - 6 / 121;
        context.moveTo(size, 0);
        for (let i = 0; i < realShape; i++) {
            const theta = ((i + 1) / realShape) * Math.PI;
            const htheta = ((i + 0.5) / realShape) * Math.PI;
            context.quadraticCurveTo(
                size * dip * Math.cos(htheta), size * dip * Math.sin(htheta),
                size * Math.cos(theta), size * Math.sin(theta)
            );
        }
        context.closePath();
        context.lineJoin = "miter";
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 131) { // Minesweeper Ring
        context.arc(0, 0, size, 0, 2 * Math.PI, true);
        context.arc(0, 0, size / 1.05, 0, 2 * Math.PI, false);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 132 || shape === 156) { // Donut Ring / Glass Smasher
        context.arc(0, 0, size, 0, 2 * Math.PI, true);
        context.arc(0, 0, size / 1.5, 0, 2 * Math.PI, false);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 133) { // Hendecagon (Rotated)
        for (let i = 0; i < 11; i++) {
            const theta = (i / 11) * 2 * Math.PI;
            const px = size * 1.5 * Math.cos(180 / 11 + theta + 1.635);
            const py = size * 1.5 * Math.sin(180 / 11 + theta + 1.635);
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 134) { // Square (Rotated)
        for (let i = 0; i < 4; i++) {
            const theta = (i / 4) * 2 * Math.PI;
            const px = size * 1.5 * Math.cos(180 / 4 + theta + 0.52);
            const py = size * 1.5 * Math.sin(180 / 4 + theta + 0.52);
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 135) { // Hexagon (Rotated)
        for (let i = 0; i < 6; i++) {
            const theta = (i / 6) * 2 * Math.PI;
            const px = size * 1.1 * Math.cos(180 / 6 + theta + 0.385);
            const py = size * 1.1 * Math.sin(180 / 6 + theta + 0.385);
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 136) { // Revolutionist
        context.arc(0, 0, size, 0, 2 * Math.PI, true);
        context.arc(0, 0, size * 0.999999, 0, 2 * Math.PI, false);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 137) { // Vanguard
        for (let [scale, theta] of [
            [1, 0], [-1, -0.959], [-0.125, 0], [-1, 0.959]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.0261), size * scale * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 138) { // Trapperzoid
        for (let [scale, theta] of [
            [0.75, 0.768], [-1, -1.282], [-1, 1.292], [0.75, -0.768]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.0261), size * scale * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 139) { // Tri-Seeker
        for (let [scale, theta] of [
            [1, 0.139], [1, 1.954], [1, 2.234], [1, -2.234], [1, -1.954], [1, -0.139]
        ]) context.lineTo(size * scale * Math.cos(theta - 0.0261), size * scale * Math.sin(theta - 0.0261));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 140) {
        context.arc(0, 0, size * 1.45, 0, 2 * Math.PI);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 141) { // Plasma Rocket
        for (let i = 0; i < 4; i++) {
            const theta = (i / 4) * 2 * Math.PI;
            let px = size * Math.cos(theta);
            let py = size * Math.sin(theta);
            if (i === 0) px = size * 1.7;
            context.lineTo(px, py);
        }
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 147) { // Long Boy
        for (let [scale, theta] of [
            [12, 0], [1, 120], [1, 240]
        ]) context.lineTo(size * scale * Math.cos((theta * Math.PI) / 180), size * scale * Math.sin((theta * Math.PI) / 180));
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 149) { // Semicircle
        context.arc(0, 0, size, Math.PI / 2, 3 * Math.PI / 2);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 157) { // Injector
        context.arc(0, 0, size, 0, 2 * Math.PI, true);
        context.arc(0, 0, size * 0.475, 0, 2 * Math.PI, false);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape > 157 && shape < 190) { // Shape Transform
        const bordersize = (shape - 158) / 31;
        const centerAway = size * (1 - bordersize);
        const scalesize = size * bordersize;
        context.arc(centerAway, centerAway, scalesize, 0, 0.5 * Math.PI);
        context.arc(-centerAway, centerAway, scalesize, 0.5 * Math.PI, Math.PI);
        context.arc(-centerAway, -centerAway, scalesize, Math.PI, 1.5 * Math.PI);
        context.arc(centerAway, -centerAway, scalesize, -0.5 * Math.PI, 0);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    if (shape === 191) { // Pyromancer
        context.rotate(Math.PI / 4);
        const bordersize = 0.4;
        const centerAway = size * (1 - bordersize);
        const scalesize = size * bordersize;
        context.arc(centerAway, centerAway, scalesize, 0, 0.5 * Math.PI);
        context.arc(-centerAway, centerAway, scalesize, 0.5 * Math.PI, Math.PI);
        context.arc(-centerAway, -centerAway, scalesize, Math.PI, 1.5 * Math.PI);
        context.arc(centerAway, -centerAway, scalesize, -0.5 * Math.PI, 0);
        context.closePath();
        if (fill) context.fill();
        if (stroke) context.stroke();
        return true;
    }

    // High-index Path2D Shapes (200-997)
    if (shape > 200 && shape < 998) {
        let cached = path2dCache.get(shape);
        let path = null;
        let sizeDiv = 1;
        if (cached) {
            path = cached.path;
            sizeDiv = cached.sizeDiv;
        } else {
            switch (shape) {
                case 201: path = new Path2D("m -1.2745055,-0.73559036 .8496635,-1.54e-5 L -5.9657109e-7,-1.4711814 .42484199,-0.73560576 1.2745055,-0.73559036 .84968469,-1.7597132e-6 1.2745055,0.73558804 .42484199,0.73560224 -5.9657109e-7,1.4711779 -0.424842,0.73559964 -1.2745055,0.73558804 -0.8496847,-1.7597132e-6 Z"); break;
                case 203: path = new Path2D("M 0 0 L 1 -4 L 4 -1 z M 2 -5 L 10 -13 L 13 -10 L 5 -2 zM 11 -14 L 13 -16 L 14 -16 L 16 -14 L 16 -13 L 14 -11 z"); sizeDiv = 8; break;
                case 209: path = new Path2D("m-3.1884842 -0.007504462l0.84110737 -0.46545094l-0.59896183 -0.75189334l0.9552134 -0.10814953l-0.26564586 -0.92389536l0.92389536 .26564574l0.10814953 -0.9552133l0.7518934 .5989616l0.46545094 -0.84110713l0.46545094 .84110713l0.7518933 -0.5989616l0.10814953 .9552133l0.9238956 -0.26564574l-0.26564598 .92389536l0.95521355 .10814953l-0.59896183 .75189334l0.84110713 .46545094l-0.84110713 .46545094l0.59896183 .75189334l-0.95521355 .10814953l0.26564598 .9238956l-0.9238956 -0.26564598l-0.10814953 .9552133l-0.7518933 -0.5989616l-0.46545094 .84110713l-0.46545094 -0.84110713l-0.7518934 .5989616l-0.10814953 -0.9552133l-0.92389536 .26564598l0.26564586 -0.9238956l-0.9552134 -0.10814953l0.59896183 -0.75189334z"); sizeDiv = 2.2; break;
                case 213: path = new Path2D("m-164.9029 -40.75328l0 79.07611l258.03412 0l58.267723 -15.262466l152.60104 -23.582678l-147.05249 -22.19685l-58.267723 -18.03412z"); sizeDiv = 80; break;
                case 214: path = new Path2D("M 3551.0797000000002 -81.83389999999963 C 11146.0797 2660.1661000000004 3551.0797000000002 13319.6661 -6213.9203 -90.83389999999963 3551.0797000000002 -13483.3339 11146.0797 -2809.8338999999996 3551.0797000000002 -81.83389999999963 Z"); sizeDiv = 6400; break;
                case 253: path = new Path2D("m -105.40841,-390.25675 -60,236.99999 V 83.74128 l 60,237 h 117 l 60,-237 v -236.99804 l -60,-236.99999 z"); sizeDiv = 60; break;
                case 254: path = new Path2D("m -82.113342,-18.506025 a 35.113776,34.741102 0 0 0 35.11439,34.738922 35.113776,34.741102 0 0 0 35.1144,-34.738922 35.113776,34.741102 0 0 0 -3.98814,-16.048604 35.113776,34.741102 0 0 0 3.98814,-16.020681 35.113776,34.741102 0 0 0 -35.1144,-34.741723 35.113776,34.741102 0 0 0 -35.11439,34.741723 35.113776,34.741102 0 0 0 3.98815,16.048604 35.113776,34.741102 0 0 0 -3.98815,16.020681 z"); sizeDiv = 60; break;
                case 255: path = new Path2D("M -19169.9038 -18519.129 C -8794.682489678713 -28891.0366018223 8024.188598177694 -28888.350310321293 18396.0962 -18513.129000000008 24656.0962 -12251.129 30916.0962 -5989.129000000001 37176.0962 272.8709999999992 30914.0962 6532.870999999999 24652.0962 12792.871 18390.0962 19052.871 8014.874889678711 29424.778601822298 -8803.996198177698 29422.092310321284 -19175.903799999996 19046.871 -29547.8114018223 8671.649689678714 -29545.125110321285 -8147.221398177695 -19169.9038 -18519.128999999997 Z"); sizeDiv = 26500; break;
                case 271: path = new Path2D("M -38155.2158 -196.9519999999975 C -38155.2158 -21189.295341068457 -21137.55914106847 -38206.952 -145.21580000001268 -38206.952000000005 9935.662978801054 -38206.952000000005 19603.655208090873 -34202.33849771047 26731.912952900668 -27074.08075290068 33860.17069771047 -19945.823008090887 37864.7842 -10277.830778801072 37864.7842 -196.95200000000477 37864.7842 20795.391341068454 20847.12754106846 37813.048 -145.21579999999813 37813.048 -21137.559141068454 37813.048 -38155.21579999999 20795.39134106846 -38155.2158 -196.9519999999975 Z M 20801 -14160.860359999999 C 20801 -18016.989604361064 17674.989604361068 -21143 13818.86036 -21143 L -14108.860360000006 -21143 C -15960.638926890344 -21143 -17736.573464731344 -20407.383828539463 -19045.978646635413 -19097.9786466354 -20355.383828539474 -17788.573464731337 -21091.000000000015 -16012.638926890337 -21091.000000000015 -14160.860359999999 L -21091 13766.860360000006 C -21091 17622.98960436107 -17964.98960436107 20749 -14108.860360000006 20749 L 13818.860359999999 20749 C 17674.989604361064 20749 20801 17622.98960436107 20801 13766.860360000006 Z"); sizeDiv = 38000; break;
                case 302: path = new Path2D("M -0.5 0 L -1 0.5 L -0.5 1 L 1 0 L -0.5 -1 L -1 -0.5 L -0.5 0"); sizeDiv = 1; break;
                case 310: path = new Path2D('M -1 0 L 0 -1 C 1 0 2 0 2 0 C 2 0 1 0 0 1 L -1 0'); sizeDiv = 1; break;
                case 311: path = new Path2D('M 1.5 0 L 0 -1 L 0 -0.425 L -1.5 -0.425 L -2 0 L -1.5 0.425 L 0 0.425 L 0 1 L 1.5 0'); sizeDiv = 1; break;
                case 314: path = new Path2D('M 1.5 -1.5 v -1 h -3 v 5 h 3 v -1 h -2 v -1 h 2 v -1 h -2 v -1 h 2'); sizeDiv = 1; break;
                case 319: path = new Path2D('m 0 -0.9643 l 0.3013 0.2376 l 0.381 0.0451 l 0.0451 0.381 l 0.2376 0.3013 l -0.2376 0.3013 l -0.0451 0.381 l -0.381 0.0451 l -0.3013 0.2376 l -0.3013 -0.2376 l -0.381 -0.0451 l -0.0451 -0.381 l -0.2376 -0.3013 l 0.2376 -0.3013 l 0.0451 -0.381 l 0.381 -0.0451 z'); sizeDiv = 1; break;
                case 320: path = new Path2D('M 0 -25 l 6 17 h 18 l -14 11 l 5 17 l -15 -10 l -15 10 l 5 -17 l -14 -11 h 18 z'); sizeDiv = 25; break;
                case 321: path = new Path2D('M 1.25,0 C 1.06917,0 0.89576,-0.047 0.7679,-0.13054 0.64004,-0.21414 0.5682,-0.32748 0.5682,-0.44568 L -0.80929,-0.66162 -1.25,0 -0.80929,0.66162 0.5682,0.44568 Z'); sizeDiv = 1.25; break;
                case 325: path = new Path2D("M -0.5 -0.75 L 0.5 -0.75 L 0.9 0 L -0.9 0 L -0.5 -0.75"); sizeDiv = 0.9; break;
                default: path = new Path2D(); break;
            }
            path2dCache.set(shape, { path, sizeDiv });
        }
        if (path) {
            size /= sizeDiv;
            context.save();
            context.scale(size, size);
            context.lineWidth /= size;

            // Adjust specific paths that need it
            if (shape === 270) context.rotate(Math.PI / 2);
            if (shape === 257) context.rotate(Math.PI);

            if (stroke) context.stroke(path);
            if (fill) context.fill(path);
            context.restore();
            return true;
        }
    }

    if (shape === 998) {
        context.arc(0, 0, size, 0, Math.PI);
        context.closePath();
        if (stroke) context.stroke();
        if (fill) context.fill();
        return true;
    }

    if (shape === 999) {
        context.arc(0, 0, size, 0, Math.PI, true);
        context.closePath();
        if (stroke) context.stroke();
        if (fill) context.fill();
        return true;
    }

    return false;
}

// ==========================================
// GUN PATH & RENDERING
// ==========================================

function makeGunPath(context, length, height, aspect, skin) {
    const h = aspect > 0 ? [height * aspect, height] : [height, -height * aspect];

    // Using the implicit moveTo behavior from original drawing logic:
    // The original `lineTo` first call implicitly creates a `moveTo`
    switch (skin) {
        case 0: // Normal Barrel
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 1: // Flamethrower Barrel
            context.moveTo(length * Math.cos(-h[0] / 3), length * Math.sin(-h[0] / 3));
            context.lineTo(length * 1.25, 0);
            context.lineTo(length * Math.cos(h[0] / 3), length * Math.sin(h[0] / 3));
            context.lineTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 2: // Scramjet Thruster Base
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
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
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length * 1.25, 0);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 5: // L Triangle Barrel
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            break;

        case 6: // R Triangle Barrel
            context.moveTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 7: // L Coilgun Barrel
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1] * 4.25);
            context.lineTo(length, -h[0]);
            break;

        case 8: // R Coilgun Barrel
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1] * 4.25);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 9: // R Triangle 2
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length * 2, -h[0]);
            break;

        case 10: // L Triangle 2
            context.moveTo(length * 2, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 11: // Split Barrel
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            context.lineTo(length, 0);
            context.lineTo(-length, 0);
            context.lineTo(length, 0);
            break;

        case 12: // Veloc B
        case 14: // Terminus Barrel
            context.moveTo(length, h[0]);
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
            context.moveTo(length, h[0]);
            context.lineTo(-length, 0);
            context.lineTo(length, -h[0]);
            break;

        case 15: // Empty
            break;

        case 16: // Notched Barrel
            context.moveTo(length * 0.5, 0);
            context.lineTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 17: // Ring Barrel
            context.ellipse(0, 0, length, height, 0, 0, 2 * Math.PI, true);
            context.ellipse(0, 0, length * 0.8, height * 0.8, 0, 0, 2 * Math.PI, false);
            break;

        case 18: // Pyromancer Barrel
            context.moveTo(length * Math.cos(-h[0] / 10), length * Math.sin(-h[0] / 10) - 1);
            context.lineTo(length * 1.25, 0);
            context.lineTo(length * Math.cos(h[0] / 10), length * Math.sin(h[0] / 10) - 1);
            context.lineTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;

        case 19: // Laser Rod
            let count = Math.max(1, (length * 4) | 0);
            const maxCount = count;
            const unit = length / count;
            context.roundRect(-length, -unit / 4, length * 2 - unit / 2, unit / 2, 5);
            while (count > 0) {
                let alpha = (maxCount - count + 1) / maxCount;
                context.roundRect(length * (1 - alpha), -height * alpha, unit / 2, 2 * height * alpha, 5);
                count--;
            }
            break;

        default:
            context.moveTo(length, h[0]);
            context.lineTo(-length, h[1]);
            context.lineTo(-length, -h[1]);
            context.lineTo(length, -h[0]);
            break;
    }
}

const gunCache = new Map();

function renderGunsAtLayer(context, entity, layer) {
    const entitySize = entity.size || 1;
    const guns = entity.guns;
    if (!guns) return;

    for (let i = 0; i < guns.length; i++) {
        const gun = guns[i];
        const gunLayer = gun.layer ?? 0;
        if (gunLayer !== layer) continue;

        const gunSkin = gun.skin || 0;
        const gunColor = gun.color === -1 ? entity.color : (gun.color ?? 16);
        const gunAspect = gun.aspect ?? 1;
        const gunDirection = gun.direction || 0;
        const gunOffset = gun.offset || 0;
        const gunLength = gun.length || 1;
        const gunWidth = gun.width || 1;
        const gunPosition = gun.position || 0;

        const gunAngle = gun.angle ?? 0;
        const directionAngle = gunDirection + gunAngle;

        const cosGunAngle = Math.cos(gunAngle);
        const sinGunAngle = Math.sin(gunAngle);

        const positionDivisor = gunAspect === 1 ? 2 : 1;
        const positionOffset = gunPosition / positionDivisor;

        const offsetX = gunOffset * Math.cos(directionAngle);
        const offsetY = gunOffset * Math.sin(directionAngle);

        const lengthTerm = gunLength / 2 - positionOffset;

        const gx = (offsetX + lengthTerm * cosGunAngle) * entitySize;
        const gy = (offsetY + lengthTerm * sinGunAngle) * entitySize;

        const gColor = getColor(gunColor);
        setColors(context, gColor);

        const gunDrawLength = (((gunLength / 2) * 1000) | 0) / 1000;
        const gunDrawWidth = (((gunWidth / 2) * 1000) | 0) / 1000;

        const key = `${gunDrawLength}|${gunDrawWidth}|${gunAspect}|${gunSkin}`;
        let path = gunCache.get(key);
        if (path === undefined) {
            path = new Path2D();
            makeGunPath(path, gunDrawLength, gunDrawWidth, gunAspect, gunSkin);
            path.closePath();
            gunCache.set(key, path);
        }

        context.save();
        context.translate(gx, gy);
        context.rotate(gunAngle);
        context.scale(entitySize, entitySize);
        context.lineWidth /= entitySize;
        context.fill(path);
        context.stroke(path);
        context.restore();
    }

    if (gunCache.size > 2000) {
        gunCache.clear();
    }
}

// ==========================================
// PROPS & AURAS
// ==========================================

const gradientCache = new Map();

function getGradient(ctx, color, colorStop = 0) {
    let key = `${color}|${colorStop}`;
    let grad = gradientCache.get(key);
    if (grad === undefined) {
        grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(colorStop, `${color}FF`);
        grad.addColorStop(1, `${color}00`);
        gradientCache.set(key, grad);
    }
    return grad;
}

setInterval(() => {
    gradientCache.clear();
}, 60000);

function renderProp(ctx, entity, prop, propColor) {
    const entitySize = entity.size || 1;
    let rpmAngle = ((Date.now() * (prop.rpm || 0)) / 1000) % (2 * Math.PI);
    let propX = (prop.x || 0) * entitySize;
    let propY = (prop.y || 0) * entitySize;
    let propSize = (prop.size ?? 1) * entitySize;
    let propRot = (prop.angle || 0) + rpmAngle;
    if (prop.lockRot === false) propRot += (entity.facing || 0);

    const shouldFill = prop.fill ?? true;

    ctx.save();
    ctx.translate(propX, propY);
    ctx.rotate(propRot);

    if (prop.isAura) {
        let grad = getGradient(ctx, propColor);
        ctx.scale(propSize, propSize);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
    }

    if (Array.isArray(prop.shape)) {
        ctx.beginPath();
        for (let [x, y, cx1, cy1, cx2, cy2] of prop.shape) {
            let scale = Math.hypot(x, y);
            let angle = Math.atan2(y, x);
            let px = propSize * scale * Math.cos(angle);
            let py = propSize * scale * Math.sin(angle);

            if (cx2 !== undefined) {
                let c1Scale = Math.hypot(cx1, cy1);
                let c1Angle = Math.atan2(cy1, cx1);
                let c2Scale = Math.hypot(cx2, cy2);
                let c2Angle = Math.atan2(cy2, cx2);
                ctx.bezierCurveTo(
                    propSize * c1Scale * Math.cos(c1Angle), propSize * c1Scale * Math.sin(c1Angle),
                    propSize * c2Scale * Math.cos(c2Angle), propSize * c2Scale * Math.sin(c2Angle),
                    px, py
                );
            } else if (cx1 !== undefined) {
                let c1Scale = Math.hypot(cx1, cy1);
                let c1Angle = Math.atan2(cy1, cx1);
                ctx.quadraticCurveTo(
                    propSize * c1Scale * Math.cos(c1Angle), propSize * c1Scale * Math.sin(c1Angle),
                    px, py
                );
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        if (!prop.borderless) ctx.stroke();
        if (shouldFill) ctx.fill();

    } else if (typeof prop.shape === 'number') {
        drawShape(ctx, prop.shape, propSize, !prop.borderless, shouldFill, {
            dip: prop.shape < 0 ? prop.dip : undefined,
            arcLen: prop.arclen || 1,
            ring: prop.ring
        });

    } else if (prop.shape instanceof Path2D) {
        ctx.scale(propSize, propSize);
        ctx.lineWidth /= propSize;
        drawShape(ctx, prop.shape, 1, !prop.borderless, shouldFill);
    }

    ctx.restore();
}

function handlePropAnimations(entity) {
    if (!entity.id) return;
    let animations = roomState.propAnimations.get(entity.id);
    if (animations) {
        for (let i = 0; i < animations.length; i++) {
            let animation = animations[i];
            let prop = entity.props[animation.index];
            if (!prop) continue;
            prop.shape = animation.shape;
            prop.size = animation.size;
            prop.x = animation.x;
            prop.y = animation.y;
            prop.angle = animation.angle;
            prop.layer = animation.layer;
            prop.color = animation.color;
        }
    }
}

function renderPropsAtLayer(context, entity, layer) {
    for (let i = 0; i < entity.props.length; i++) {
        const prop = entity.props[i];
        if ((prop.layer ?? 0) !== layer) continue;

        let propColor = getColor(prop.color === -1 ? entity.color : prop.color);
        setColors(context, propColor);
        if (!prop.stroke) context.strokeStyle = context.fillStyle;
        renderProp(context, entity, prop, propColor);
    }
}

function renderTurretsAtLayer(ctx, entity, layer) {
    for (let i = 0; i < entity.turrets.length; i++) {
        const turretItem = entity.turrets[i];

        // ---------------------------------------------
        // MOCKUP RENDERING (Icon / Menu Previews)
        // ---------------------------------------------
        if (turretItem.isMockupTurret) {
            const bound = turretItem.bound;
            const turretLayer = bound.layer ?? 0;
            if (turretLayer !== layer) continue;

            const mockup = mockups.get(turretItem.index);
            if (!mockup) continue;

            ctx.save();
            const ang = (bound.direction || 0) + (bound.angle || 0);
            const len = (bound.offset || 0) * (entity.size || 1);
            ctx.translate(len * Math.cos(ang), len * Math.sin(ang));
            ctx.rotate(bound.angle || 0);

            // Default to color 16 (grey) unless specified, or -1 to inherit entity color
            const rawColor = bound.color ?? turretItem.color ?? mockup.color;
            const turretColor = rawColor === -1 ? entity.color : (rawColor ?? 16);

            renderEntity(ctx, mockup);
            ctx.restore();

            // ---------------------------------------------
            // LIVE WORLD RENDERING (In-game Entities)
            // ---------------------------------------------
        } else {
            const turret = entities.get(turretItem);
            if (!turret) continue;

            const turretLayer = turret.layer ?? 0;
            if (turretLayer !== layer) continue;

            ctx.save();
            const dx = (turret.x || 0) - (entity.x || 0);
            const dy = (turret.y || 0) - (entity.y || 0);
            const ef = entity.facing || 0;
            const cos = Math.cos(-ef);
            const sin = Math.sin(-ef);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            ctx.translate(localX, localY);
            ctx.rotate((turret.facing || 0) - ef);
            renderEntity(ctx, turret);
            ctx.restore();
        }
    }
}

// ==========================================
// MAIN ENTITY RENDERER
// ==========================================

function renderEntity(ctx, entity) {
    ctx.lineCap = "round";
    ctx.lineJoin = currentSettings.pointy?.value?.enabled ? "miter" : "round";
    ctx.lineWidth = (gameState.fovScale || 1) * (currentSettings.borderWidth?.value?.number || 2);

    if (entity.props && entity.props.length > 0) {
        handlePropAnimations(entity);
    }

    const hasProps = entity.props && entity.props.length > 0;
    const hasGuns = entity.guns && entity.guns.length > 0;
    const hasTurrets = entity.turrets && entity.turrets.length > 0;

    // Layer -2: Far background
    if (hasProps) renderPropsAtLayer(ctx, entity, -2);
    if (hasTurrets) renderTurretsAtLayer(ctx, entity, -2);
    if (hasGuns) renderGunsAtLayer(ctx, entity, -2);

    // Layer -1: Behind body
    if (hasProps) renderPropsAtLayer(ctx, entity, -1);
    if (hasTurrets) renderTurretsAtLayer(ctx, entity, -1);
    if (hasGuns) renderGunsAtLayer(ctx, entity, -1);

    // Layer 0: Normal guns & accessories
    if (hasProps) renderPropsAtLayer(ctx, entity, 0);
    if (hasTurrets) renderTurretsAtLayer(ctx, entity, 0);
    if (hasGuns) renderGunsAtLayer(ctx, entity, 0);

    // Entity body
    setColors(ctx, getColor(entity.color));
    drawShape(ctx, entity.shape, entity.size || 1, true, true, {
        widthHeightRatio: entity.widthHeightRatio,
        angle: entity.facing || 0
    });

    // Layer 1: In front of body
    if (hasProps) renderPropsAtLayer(ctx, entity, 1);
    if (hasTurrets) renderTurretsAtLayer(ctx, entity, 1);
    if (hasGuns) renderGunsAtLayer(ctx, entity, 1);

    // Layer 2: Top overlay
    if (hasProps) renderPropsAtLayer(ctx, entity, 2);
    if (hasTurrets) renderTurretsAtLayer(ctx, entity, 2);
    if (hasGuns) renderGunsAtLayer(ctx, entity, 2);
}

// ==========================================
// MAXIMUM EXTENT CALCULATION (MEC)
// ==========================================

function calculateMEC(entity) {
    const size = entity.size || 1;
    let maxRadius = size;

    // 1. Check body shape extents
    const shape = entity.shape;
    if (shape > 0 && shape < 102) {
        if (shape === 4 && entity.widthHeightRatio && (entity.widthHeightRatio[0] !== 1 || entity.widthHeightRatio[1] !== 1)) {
            maxRadius = Math.max(maxRadius, Math.hypot(entity.widthHeightRatio[0], entity.widthHeightRatio[1]) * size);
        }
    } else if (shape >= 102 && shape < 200) {
        switch (shape) {
            case 147: maxRadius = Math.max(maxRadius, 12 * size); break;
            case 116: maxRadius = Math.max(maxRadius, 2.25 * size); break;
            case 117: maxRadius = Math.max(maxRadius, 2.0 * size); break;
            case 140: maxRadius = Math.max(maxRadius, 1.45 * size); break;
            case 141: maxRadius = Math.max(maxRadius, 1.7 * size); break;
            case 111:
            case 128:
            case 133:
            case 134: maxRadius = Math.max(maxRadius, 1.5 * size); break;
            default: maxRadius = Math.max(maxRadius, 1.35 * size); break;
        }
    } else if (shape >= 200 && shape < 998) {
        maxRadius = Math.max(maxRadius, 3 * size);
    }

    // 2. Accurate calculation for Gun Corners
    const guns = entity.guns;
    if (guns && guns.length > 0) {
        for (let i = 0; i < guns.length; i++) {
            const gun = guns[i];
            const gLen = gun.length || 1;
            const gWid = gun.width || 1;
            const gOff = gun.offset || 0;
            const gPos = gun.position || 0;
            const gAsp = gun.aspect ?? 1;

            const posDiv = gAsp === 1 ? 2 : 1;
            const posOff = gPos / posDiv;

            const gunCenterDist = Math.abs(gOff) + Math.abs(gLen / 2 - posOff);

            let fLen = gLen / 2;
            let bLen = -gLen / 2;
            let h0 = gAsp > 0 ? (gWid / 2) * gAsp : (gWid / 2);
            let h1 = gAsp > 0 ? (gWid / 2) : -(gWid / 2) * gAsp;

            if (gun.skin === 1 || gun.skin === 18) fLen *= 1.25;
            else if (gun.skin === 4) bLen *= 1.25;
            else if (gun.skin === 7 || gun.skin === 8) h1 *= 4.25;
            else if (gun.skin === 9 || gun.skin === 10) fLen *= 2.0;

            const maxLen = Math.max(Math.abs(fLen), Math.abs(bLen));
            const maxWid = Math.max(Math.abs(h0), Math.abs(h1));

            const gunExtent = (gunCenterDist + Math.hypot(maxLen, maxWid)) * size;
            if (gunExtent > maxRadius) maxRadius = gunExtent;
        }
    }

    // 3. Props Bounds
    const props = entity.props;
    if (props && props.length > 0) {
        for (let i = 0; i < props.length; i++) {
            const prop = props[i];
            const px = prop.x || 0;
            const py = prop.y || 0;
            const pSize = prop.size || 1;
            const pDist = (Math.hypot(px, py) + pSize * 2) * size;
            if (pDist > maxRadius) maxRadius = pDist;
        }
    }

    // 4. Turrets Bounds
    const turrets = entity.turrets;
    if (turrets && turrets.length > 0) {
        for (let i = 0; i < turrets.length; i++) {
            const t = turrets[i];
            const turret = t.isMockupTurret ? mockups.get(t.index) : entities.get(t);
            if (!turret) continue;

            let distFromParent = 0;
            if (t.isMockupTurret) {
                distFromParent = (t.bound.offset || 0) * size;
            } else if (turret.x !== undefined && entity.x !== undefined) {
                distFromParent = Math.hypot(turret.x - entity.x, turret.y - entity.y);
            }

            // Recursively calculate turret's extent (divided by 2 since calculateMEC returns diameter)
            const turretExtentRadius = calculateMEC(turret) / 2;
            const totalTurretReach = distFromParent + turretExtentRadius;

            if (totalTurretReach > maxRadius) {
                maxRadius = totalTurretReach;
            }
        }
    }

    return maxRadius * 2;
}

// ==========================================
// OFFSCREEN BITMAP CACHING
// ==========================================

const entityImgCache = new Map();
const canvas = new OffscreenCanvas(1, 1);
const ctx = canvas.getContext("2d");

function getEntityImage(entity, liveRender, padding = 1) {
    const imgCacheKey = `${currentSettings.entityResolution?.value?.number || 200}|${padding}|${entity.index}|${entity.guns?.length || 0}|${entity.props?.length || 0}|${entity.shape}|${(entity.size || 1) | 0}|${entity.widthHeightRatio}|${entity.color}`;

    if (!liveRender) {
        const savedImg = entityImgCache.get(imgCacheKey);
        if (savedImg) {
            return savedImg;
        }
    }

    const CANVAS_SIZE = currentSettings.entityResolution?.value?.number || 200;
    const width = (CANVAS_SIZE * padding) | 0;
    const height = (CANVAS_SIZE * padding) | 0;

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = currentSettings.imageSmoothing?.value?.enabled ?? true;

    // Critical to flush the canvas buffer for clean renders!
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    const maxExtent = calculateMEC(entity);
    const targetSize = CANVAS_SIZE;
    const entityScale = targetSize / maxExtent;
    ctx.scale(entityScale, entityScale);

    renderEntity(ctx, entity);
    ctx.restore();

    const upscaleVal = maxExtent / CANVAS_SIZE;

    let turretMockupsLoaded = true;
    function turretsLoaded(entity) {
        if (typeof entity === "number") entity = entities.get(entity);
        if (!entity) return;
        for (let turret of entity.turrets) {
            if (turret.isMockupTurret) turret = mockups.get(turret.index);
            if (!turret) return turretMockupsLoaded = false;
            turretsLoaded(turret);
        }
    }
    turretsLoaded(entity);

    if (!liveRender && turretMockupsLoaded) {
        // Zero-copy, GPU-hardware-resident mapping. Instantly available.
        const bmp = canvas.transferToImageBitmap();
        bmp.upscaleVal = upscaleVal;
        entityImgCache.set(imgCacheKey, bmp);
        return bmp;
    }

    canvas.upscaleVal = upscaleVal;
    return canvas;
}

export { getEntityImage, renderGunsAtLayer, renderTurretsAtLayer, renderEntity, calculateMEC };
