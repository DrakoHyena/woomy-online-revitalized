function drawBar(ctx, x, y, boxWidth, boxHeight, padding, innerColor, outterColor, scalarFilled, capStyle) {
	const centerY = y + boxHeight / 2;
	const innerLineWidth = Math.max(0, boxHeight - padding);

	const prevStroke = ctx.strokeStyle;
	const prevLineCap = ctx.lineCap;
	capStyle = capStyle || "round";
	ctx.lineCap = capStyle;

	// helper: how far a cap extends beyond the path endpoint along X
	const capExtension = (cap, lw) => cap === 'butt' ? 0 : lw / 2;

	// Draw outline (only when padding > 0). Shorten the path by the cap extension
	// so the caps (butt/round/square) remain inside [x, x + boxWidth].
	if (padding > 0) {
		const outerCap = capExtension(capStyle, boxHeight);
		const usableOuterWidth = Math.max(0, boxWidth - 2 * outerCap);
		if (usableOuterWidth > 0) {
			ctx.beginPath();
			ctx.moveTo(x + outerCap, centerY);
			ctx.lineTo(x + outerCap + usableOuterWidth, centerY);
			ctx.strokeStyle = outterColor;
			ctx.lineWidth = boxHeight;
			ctx.stroke();
		}
	}

	// Filled portion (draw only when inner height > 0 and some fill).
	// Take into account the inner stroke's cap size so the filled portion
	// doesn't visually overflow the intended box.
	if (innerLineWidth > 0 && scalarFilled > 0) {
		const innerCap = capExtension(capStyle, innerLineWidth);
		const usableInnerWidth = Math.max(0, boxWidth - 2 * innerCap);
		if (usableInnerWidth > 0) {
			const fillScalar = Math.min(1, Math.max(0, scalarFilled));
			ctx.beginPath();
			ctx.moveTo(x + innerCap + padding / 2, centerY);
			ctx.lineTo(x + innerCap - padding / 2 + usableInnerWidth * fillScalar, centerY);
			ctx.strokeStyle = innerColor;
			ctx.lineWidth = innerLineWidth;
			ctx.stroke();
		}
	}

	// restore modified ctx state
	ctx.lineCap = prevLineCap;
	ctx.strokeStyle = prevStroke;
}

export { drawBar }