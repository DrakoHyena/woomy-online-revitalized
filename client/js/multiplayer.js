import { global } from "./global.js";
import { PeerWrapper } from "./peer.js";

const WRM = window.location.host === "localhost:3000" ? "localhost:3000" : "woomy.online"
const wsUrl = window.location.protocol === "http:" ? "ws://" : "wss://"
const httpUrl = window.location.protocol === "http:" ? "http://" : "https://"
const WRM_WS = `${wsUrl}${WRM}`
const WRM_HTTP = `${httpUrl}${WRM}`

const multiplayer = {
    roomWs: undefined,
    roomPeers: new Map(),
    hostRoomId: undefined,
    playerPeer: undefined,
    playerWs: undefined,
}
multiplayer.wrmHost = async function() {
    this.roomWs = new WebSocket(`${WRM_WS}/host`)
    let openPromise = new Promise((res, rej) => {
        this.roomWs.onopen = () => {
            console.log("Room socket opened with room manager")
            res()
        }
        this.roomWs.onerror = (err) => {
            console.log("Error opening room socket to room manager")
            rej(err)
        }
    })
    this.roomWs.onmessage = async (msg) => {
        try {
            const { type, data } = JSON.parse(msg.data)
            switch (type) {
                // Add timeout if its a fake request
                case "playerJoin":
                    console.log("Accepting new peer connection")
                    let peer = new PeerWrapper(await window.iceServers.fetchTurnCredentials())
                    console.log("Initializing new peer connection")
                    await peer.initialized;
                    console.log("New peer connection initialized")
                    peer.connectTo(data);
                    console.log("Connecting to new peer")
                    await peer.ready
                    console.log("Connected to new peer")
                    this.roomPeers.set(peer.id, peer)
                    window.serverWorker.postMessage({ type: "playerJoin", playerId: peer.id })
                    peer.onclose = () => {
                        window.serverWorker.postMessage({ type: "playerDc", playerId: peer.id })
                        this.roomPeers.delete(peer.id)
                    }
                    peer.onmessage = (msg) => {
                        window.serverWorker.postMessage({ type: "serverMessage", data: [peer.id, msg] })
                    }
                    break;
                case "hostRoomId":
                    this.hostRoomId = data
                    break;
                case "ping":
                    this.roomWs.send(JSON.stringify({ ping: true }))
                    break;
            }
        } catch (err) {
            console.error(err)
        }
    }
    this.roomWs.onclose = async () => {
        console.log("Room socket closed with room manager. Retrying in 5 seconds.")
        this.hostRoomId = undefined
        setTimeout(async () => {
            console.log("Retrying WRM connection...")
            await multiplayer.wrmHost();
            await multiplayer.getHostRoomId();
        }, 5000)
    }
    return openPromise
}
multiplayer.getHostRoomId = async function() {
    console.log("Waiting for host room id...")
    return new Promise((res, rej) => {
        // I know it sucks
        // but its easier this way
        let interval = setInterval(() => {
            if (!this.hostRoomId) return;
            res(this.hostRoomId)
            clearInterval(interval)
            console.log("...Got host room id")
            window.serverWorker.postMessage({
                type: "roomId",
                id: this.hostRoomId
            })
        })
    })
}
multiplayer.joinRoom = async function(roomId, socket) {
    this.playerPeer = new PeerWrapper(await window.iceServers.fetchTurnCredentials())
    window.loadingTextStatus = "Initializing connection..."
    let connectingStart = Date.now();
    let initExpected = 0;
    let estabExpected = 0;
    fetch(`${WRM_HTTP}/api/getConnectionTimes`).then(res => {
        if (!res.ok) return { init: 0, estab: 0 }
        return res.json();
    }).then(dat => {
        initExpected = dat.init || 0;
        estabExpected = dat.estab || 0;
    }).catch(err => {
        console.warn('Failed to fetch connection times:', err)
    })
    let connectionPhase = 'init' // 'init' | 'estab' | 'done'
    const connectingInterval = setInterval(() => {
        const elapsed = ((Date.now() - connectingStart) / 1000).toFixed(3)
        let avgText = ''
        if (connectionPhase === 'init' && initExpected) avgText = `| ${(initExpected / 1000).toFixed(3)}s Average`
        if (connectionPhase === 'estab' && estabExpected) avgText = `| ${(estabExpected / 1000).toFixed(3)}s Average`
        window.loadingTextTooltip = `This can take a minute or two | ${elapsed}s elapsed ${avgText}`
    })
    console.log("Initializing player peer")
    await this.playerPeer.initialized;
    console.log("Player peer initialized")
    connectionPhase = 'estab'
    window.loadingTextStatus = "Establishing connection..."
    try {
        fetch(`${WRM_HTTP}/api/submitConnectionTime`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "init",
                time: Date.now() - connectingStart
            })
        })
    } catch (err) {
        console.warn('Failed to submit init connection time:', err)
    }
    connectingStart = Date.now();
    console.log("Sending join request...")
    let res = await fetch(`${WRM_HTTP}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            roomId: roomId,
            peerId: this.playerPeer.id
        })
    })
    let resText = await res.text();
    if (!res.ok) {
        clearInterval(connectingInterval);
        window.loadingTextStatus = "Connection Failed"
        window.loadingTextTooltip = "Please reload your tab"
        alert(`${resText}\nYour tab will now reload`)
        window.location.href = window.location.href;
        return;
    }
    console.log("...Join request sent", res)
    await this.playerPeer.ready
    try {
        fetch(`${WRM_HTTP}/api/submitConnectionTime`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "estab",
                time: Date.now() - connectingStart
            })
        })
    } catch (err) {
        console.warn('Failed to submit estab connection time:', err)
    }
    clearInterval(connectingInterval);
    this.playerPeer.onmessage = (msg) => {
        if (window.clientMessage) window.clientMessage(msg)
    }
    this.playerPeer.onclose = function() {
        global._disconnected = 1;
        global.message = global._disconnectReason += " (Disconnected)"
    }
}
multiplayer.getRooms = async function() {
    let res = await fetch(`${WRM_HTTP}/api/list`)
    res = await res.json()
    return res;
}
multiplayer.startServerWorker = async function(gamemodeCode, displayNameOverride, displayDescOverride, maxPlayers, maxBots) {
    window.serverWorker.postMessage({
        type: "startServer",
        server: {
            suffix: gamemodeCode,
            displayName: displayNameOverride,
            displayDesc: displayDescOverride,
            maxPlayers: maxPlayers,
            maxBots: maxBots
        }
    });
    let startPromise = new Promise((res, rej) => {
        window.serverWorker.onmessage = function(msgEvent) {
            const data = msgEvent.data;
            switch (data.type) {
                case "serverStarted":
                    res();
                    break;
                case "clientMessage":
                    let peer = multiplayer.roomPeers.get(data.playerId);
                    if (!peer) {
                        console.error(`Peer ${data.playerId} does not exist`)
                        return;
                    }
                    peer.send(data.data);
                    break;

                case "updatePlayers":
                    // WRM, RoomUpdatePlayers
                    if (multiplayer.roomWs === undefined || multiplayer.roomWs.readyState !== 1) return
                    multiplayer.roomWs.send(JSON.stringify({
                        players: data.players,
                        maxPlayers: data.maxPlayers,
                        name: data.name || gamemodeCode,
                        desc: data.desc
                    }))
                    break;
                case "serverStartText":
                    window.loadingTextStatus = data.text
                    window.loadingTextTooltip = data.tip
                    break;
            }
        };
    })
    return startPromise
}

export { multiplayer }
