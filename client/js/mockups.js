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
            return undefined;
        } else { // We need to queue the entity
            mockups.pendingMockupRequests.add(entityIndex)
        }
        return undefined;
    },

    set: (entityIndex, data) => {
        //		console.log("New mockup", entityIndex, data)
        mockups.mockupData.set(entityIndex, data)
    },

    flushPending: () => {
        if (mockups.pendingMockupRequests.size === 0) return;
        socket.send(clientPackets.requestEntityMockups, ...mockups.pendingMockupRequests)
    },
};

window.sendMockupEdit = (code) => {
    if (socket === null) {
        throw new Error("You need to be in a game to edit mockups!")
    }
    socket.send("muEdit", code)
}

export { mockups }
