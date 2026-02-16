const serverPackets = {
	mockupRequest: 0,
	layerInfo: 1,
	gameMessage: 2,
	assetDownload: 3,
	chatMessage: 4,
	roomId: 5,
	viewUpdate: 6,
	slowGuiUpdate: 7,
	vignette: 8,
	disconnect: 9,
	deathScreen: 10,
	pepperSprayFilter: 11,
	lsdFilter: 12,
	displayText: 13,
	propAnimations: 14,
	serverInfo: 15,
	log: 16,
}

const clientPackets = {
	requestLiveEntityInfo: 0,
	requestEntityMockups: 1,
	inputUpdate: 2,
	levelUp: 3,
	upgradeRequest: 4,
	switchToBasic: 5,
	chatMessage: 6
}

export { serverPackets, clientPackets }