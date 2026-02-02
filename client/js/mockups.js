import { ASSET_MAGIC, loadAsset } from "../../shared/assets.js";
import { clientPackets } from "../../shared/packetIds.js";
import { socket } from "./socket.js";

let mockups = {
	mockupData: new Map(),
	pendingMockupRequests: new Set(),

	get: (entityIndex) => {
		let entity = mockups.mockupData.get(entityIndex)
		if (entity) {// We have the entity
			return entity
		} else if (mockups.pendingMockupRequests.has(entityIndex)) {// We are getting the entity
			return mockups.defaults
		} else { // We need to queue the entity
			mockups.pendingMockupRequests.add(entityIndex)
		}
		return mockups.defaults
	},
	
	set: (entityIndex, data) => {
		console.log("New mockup", entityIndex, data)
		mockups.mockupData.set(entityIndex, data)
	},

	flushPending: () => {
		if(mockups.pendingMockupRequests.size === 0) return;
		socket.send(clientPackets.requestEntityMockups, ...mockups.pendingMockupRequests)
	},

	// Defaults
	defaults: {
		isLoading: true,
		index: -1,
		label: "Loading..",
		shape: 0,
		size: 1,
		color: 12,
		facing: 0,
		widthHeightRatio: [1, 1],
		guns: [],
		turrets: [],
		props: [],
		upgrades: []
	}
};

window.sendMockupEdit = (code) => {
	if (socket === null) {
		throw new Error("You need to be in a game to edit mockups!")
	}
	socket.send("muEdit", code)
}

export { mockups }