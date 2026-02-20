import { roomState } from "../state/room.js";
import { ASSET_MAGIC, getAsset } from "../../../shared/assets.js";

/**
 * Resolve a cell-skin key to its skin descriptor and the currently active asset Image/Path2D.
 * The caller must provide a `frame` counter (integer); the function uses `skin.frameInterval`
 * to select the proper animation frame.
 *
 * Returns null when the skin / asset is not available yet.
 */
function resolveSkinAsset(skinKey, frame = 0) {
	frame = Math.max(0, Math.floor(frame));
	const skin = roomState.cellSkins[skinKey];
	if (!skin || !Array.isArray(skin.assets) || skin.assets.length === 0) return null;

	const frameIndex = (skin.frameInterval > 0)
		? Math.floor(frame / skin.frameInterval) % skin.assets.length
		: 0;
	const assetObj = getAsset(skin.assets[frameIndex]);
	if (!assetObj?.data) return null;

	return { skin, asset: assetObj.data };
}

/**
 * Draws a single cell tile using the resolved skin + asset.
 * This mirrors the logic previously in `game.js` so minimap and world rendering stay consistent.
 */
function drawCellTile(ctx, skin, asset, left, top, scaledW, scaledH, offsetX, offsetY, scale) {
	// Draw base image (slightly padded so borders don't seam)
	ctx.drawImage(asset, left - 1, top - 1, scaledW + 2, scaledH + 2);

	// Colour tint overlay
	if (skin.tintOpacity > 0) {
		ctx.globalAlpha = skin.tintOpacity;
		ctx.fillStyle = skin.tintColor;
		ctx.fillRect(left - 1, top - 1, scaledW + 2, scaledH + 2);
		ctx.globalAlpha = 1;
	}
}

export { resolveSkinAsset, drawCellTile };
