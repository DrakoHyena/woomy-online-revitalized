const roomState = {
	roomId: "Loading...",
	serverTargetMs: 30,
	width: 1,
	height: 1,
	mapType: 0,
	gridSize: 15,
	cells: [[]],
	cellSkins: {
		default: {
			assets: ["defaultCellSkin1", "defaultCellSkin2", "defaultCellSkin3", "defaultCellSkin4", "defaultCellSkin5"],
			tintColor: "#000",
			tintOpacity: 0,
			frameInterval: 75,
		}
	},
	blackout: false,
	propAnimations: new Map(),
	chatMessageLimit: 50,
	chatMessages: []
}

export { roomState };