
const crypto = require("crypto");
const http = require("http");
// npm install elliptic websocket
const elliptic = require("elliptic");
const websocket = require("websocket");

function verify(ident, nonce) {
    const ec = new elliptic.ec("secp256k1");
    const pub = ec.keyFromPublic(ident.pub, "hex");
    const pubBuf = Buffer.from(ident.pub, "hex");
    const pubHash = crypto.createHash("sha256").update(pubBuf).digest("Hex");
    const buf = Buffer.from(`${ident.id}${nonce}`, "hex");
    const hash = crypto.createHash("sha256").update(buf).digest("Hex");
    const sign = Buffer.from(ident.sign, "hex");
    return ident.id === pubHash && pub.verify(hash, sign);
}

const proxies = new Map();
class Proxy {
    constructor(ident, conn, nonce) {
        console.log("[new proxy]", ident.id);;
        console.assert(ident.id.match(/^[a-f\d]{64}$/), "hash must be 64-hex");
        console.assert(verify(ident, nonce), "invalid self sign");
        proxies.set(ident.id, this);
        this.ident = ident;
        this.conn = conn;
        this.responses = new Map();
        conn.on("message", this.onResponse.bind(this));
        conn.once("close", (reason, desc) => {
            console.log("closed", this.ident.id);
            for (const {res, started} of this.responses.values()) {
                if (!started) res.writeHead(404, {});
                res.end();
            }
            proxies.delete(this.ident.id);
            conn.removeAllListeners();
        });
    }
    // start outside to proxy
    doRequest(req, res) {
        console.log("[forward]", req.method, req.url);
        const idBuf = crypto.randomBytes(32);
        const id = idBuf.toString("hex");
        this.responses.set(id, {res, started: false});

        const proto = req.headers["x-forwarded-proto"] || "http";
        const url = `${proto}://${req.headers.host}${req.url}`;
        const head = {
            method: req.method,
            url: url,
            headers: req.headers,
        };
        const headBuf = Buffer.from(JSON.stringify(head), "utf8");
        // the first message as header
        this.conn.sendBytes(Buffer.concat([idBuf, headBuf]));
        req.on("readable", () => {
            const buf = req.read();
            if (buf && buf.length > 0) {
                this.conn.sendBytes(Buffer.concat([idBuf, buf]));
            }
        });
        req.once("end", () => {
            // the last empty message as close
            this.conn.sendBytes(idBuf);
        });
    }
    // proxy to outside
    onResponse(msg) {
        try {
            console.log("[response]");
            console.assert(msg.type === "binary");
            console.assert(msg.binaryData.length >= 32);
            const id = msg.binaryData.subarray(0, 32).toString("hex");
            const body = msg.binaryData.subarray(32);
            const res = this.responses.get(id);
            //console.assert(res, id);
            if (!res.started) {
                console.log("[response head]");
                // the first message as header
                const head = JSON.parse(body.toString("utf8"));
                res.started = true;
                res.res.writeHead(head.status, head.headers);
            } else if (body.length > 0) {
                console.log("[response body]");
                res.res.write(body);
            } else {
                console.log("[response close]");
                // the last empty message as close
                this.responses.delete(id);
                res.res.end();
            }
        } catch (err) {
            console.log("[invalid message as]", err);
        }
    }
}


// HTTP server
function handler(req, res) {
    console.log("[access]", req.url);
    if (req.url.match(/^\/[a-f\d]{64}\//)) {
        const hash = req.url.slice(1, 65);
        if (!proxies.has(hash)) {
            res.writeHead(404);
            res.end();
        } else {
            proxies.get(hash).doRequest(req, res);
        }
    } else {
        res.writeHead(404);
        res.end();
    }
}
const httpServer = http.createServer(handler);

// WebSocket Server
const wsServer = new websocket.server({
    httpServer, autoAcceptConnections: false,
    // default implementation is limited at 16 bit length
    // but spec allows to 64bit length, it sets 32bit max
    maxReceivedFrameSize: 0xffffffff,
    maxReceivedMessageSize: 0xffffffff,
});
wsServer.on("request", req => {
    console.log("accept");
    const conn = req.accept("proxy", req.origin);
    const nonce = crypto.randomBytes(32).toString("hex");
    conn.sendUTF(nonce);
    conn.once("message", msg => {
        console.log("[open socket]");
        if (msg.type === "utf8") {
            try {
                const ident = JSON.parse(msg.utf8Data);
                new Proxy(ident, conn, nonce);
            } catch (err) {
                console.log("[invalid connection as]", err);
                conn.close(websocket.connection.CLOSE_REASON_INVALID_DATA);
            }
        } else {
            conn.close(websocket.connection.CLOSE_REASON_INVALID_DATA);
        }
    });
});

// run server
const port = process.env.PORT || 3000;
const ip = process.env.IP || "0.0.0.0";
httpServer.listen(port, ip, () => {
    console.log(`proxy host started on http://${ip}:${port}/`);
});
