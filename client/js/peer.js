window.iceServers = [
    { url: 'stun:stun.l.google.com:19302' },
    { url: 'stun:stun1.l.google.com:19302' },
    { url: 'stun:stun2.l.google.com:19302' },
    { url: 'stun:stun3.l.google.com:19302' },
    { url: 'stun:stun4.l.google.com:19302' },
];
window.iceServers.fetchTurnCredentials = async function() {
    try {
        const response = await fetch('/api/get-turn-credentials');
        if (!response.ok) {
            throw new Error(`Failed to fetch TURN credentials: ${response.statusText}`);
        }
        const turnConfig = await response.json();
        console.log("Successfully fetched TURN credentials.");
        return [{
            url: turnConfig.urls[0] + "?transport=udp",
            username: turnConfig.username,
            credential: turnConfig.password
        }];
    } catch (error) {
        console.error("Could not get TURN credentials, continuing without them.", error);
        return []; // Return null so the connection can proceed without TURN
    }
}
class PeerWrapper {
    constructor(iceServersParam) {
        const servers = window.iceServers.concat(iceServersParam)
        console.log(servers)
        this.peer = new Peer({
            host: window.location.host === "localhost:3000" ? "0.peerjs.com" : "signaling.woomy.online",
            path: window.location.host === "localhost:3000" ? "/" : "/peerjs",
            port: "443",
            config: {
                iceServers: servers
            }
        });
        this.conn = null;
        this.id = null;
        this.onmessage = undefined;
        this.onclose = undefined;

        this.initialized = new Promise((resolve, reject) => {
            this.peer.on('open', id => {
                this.id = id;
                resolve();
            });
            this.peer.on("disconnected", console.error)
            this.peer.on('error', (err) => {
                console.log("Error initlaizing peer")
                reject(err)
            });
        });

        this._readyResolve = null;
        this._readyRej = null;
        this.ready = new Promise((res, rej) => {
            this._readyResolve = res;
            this._readyRej = rej;
        });

        this.peer.on('connection', conn => this._handleConnection(conn));
    }

    _handleConnection(conn) {
        let disconnectTimeout = setTimeout(() => {
            console.log(`[Peer ${this.id}] Destroying peer, connection took too long`)
            this.destroy();
            this._readyRej?.("Connection took too long")
        }, 120000)
        conn.on('open', () => {
            this.conn = conn;
            this._setupConn(conn);
            this._readyResolve?.();
            clearTimeout(disconnectTimeout)
        });
        conn.on('error', (err) => {
            alert("connection error")
            console.log(err)
        });
    }

    connectTo(targetId) {
        const conn = this.peer.connect(targetId);
        return new Promise((resolve, reject) => {
            conn.on('open', () => {
                this.conn = conn;
                this._setupConn(conn);
                this._readyResolve?.();
                resolve();
            });
            conn.on('error', (err) => {
                alert("connection error")
                console.log(err)
            });
        });
    }

    _setupConn(conn) {
        conn.on('data', data => {
            // console.log(`[Peer ${this.id}] Received:`, data)
            if (this.onmessage) this.onmessage(data)
        });
        conn.on('close', () => {
            console.log(`[Peer ${this.id}] Connection closed`);
            if (this.conn === conn) this.conn = null;
            if (this.onclose) this.onclose()
        });
    }

    send(data) {
        if (this.conn?.open) {
            const dc = this.conn.dataChannel; // Access the raw WebRTC data channel
            const highWaterMark = 4 * 1024 * 1024; // 4MB threshold
            const checkInterval = 100; // ms

            const trySend = () => {
                if (dc.bufferedAmount < highWaterMark) {
                    this.conn.send(data);
                    // console.log(`[Peer ${this.id}] Sent:`, data);
                } else {
                    setTimeout(trySend, checkInterval);
                }
            };

            trySend();
        } else {
            console.warn(`[Peer ${this.id}] No open connection`);
        }
    }


    destroy() {
        this.conn?.close();
        this.peer.destroy();
        console.log(`[Peer ${this.id}] Destroyed`);
    }
}

export { PeerWrapper }
