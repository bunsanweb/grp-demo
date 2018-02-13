this.ReverseTarget = function () {
    // broeswer side interface like ServiceWorker "fetch" event process
    function toHex(bytes) {
        return Array.from(
            bytes, n => n.toString(16).padStart(2, "0")).join("");
    }
    function fromHex(hex) {
        return new Uint8Array(hex.match(/.{2}/g).map(h2 => parseInt(h2, 16)));
    }
    function concat(u8s) {
        const ret = new Uint8Array(u8s.reduce((s, u8) => s + u8.length, 0));
        let offs = 0;
        for (const u8 of u8s) {
            ret.set(u8, offs);
            offs += u8.length;
        }
        return ret;
    }
    async function sha256(bytes) {
        return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    }
    async function newIdent(nonce, priv = null) {
        if (!priv) priv = crypto.getRandomValues(new Uint8Array(32));
        const ec = new elliptic.ec("secp256k1");
        const key = ec.keyFromPrivate(priv);
        const pub = key.getPublic().encode("hex");
        const id = toHex(await sha256(fromHex(pub)));
        const hash = await sha256(fromHex(`${id}${nonce}`));
        const sign = toHex(key.sign(hash).toDER());
        return {id, pub, sign};
    }
    async function connect(url, priv = null) {
        const wsurl = url.replace(/^http/, "ws");
        const socket = new WebSocket(wsurl, "proxy");
        const nonce = await new Promise((resolve, reject) => {
            const init = ev => {
                if (typeof ev.data !== "string") return;
                socket.removeEventListener("message", init, false);
                const nonce = ev.data;
                resolve(nonce);
            };
            socket.addEventListener("message", init, false);
        });
        const ident = await newIdent(nonce, priv);
        socket.binaryType = "arraybuffer"; //NOTE: default is "blob"
        socket.send(JSON.stringify(ident));
        return {ident, port: socket};
    }

    // reverse proxy connector interface behind the Web Standard APIs
    async function sendResponse(port, idBuf, response) {
        const headers = Array.from(response.headers.entries()).reduce(
            (t, [k, v]) => Object.assign(t, {[k]: v}), {});
        const head = {
            status: response.status, headers,
        };
        const headBuf = new TextEncoder().encode(JSON.stringify(head));
        port.send(concat([idBuf, headBuf]));
        
        if (response.body) {
            // ReadableStream supported
            const reader = response.body.getReader();
            let chunk;
            while (!(chunk = await reader.read()).done) {
                sendBytes(port, idBuf, chunk.value);
            }
            reader.releaseLock();
            port.send(idBuf);
        } else {
            // ReadableStream not supported
            const body = new Uint8Array(await response.arrayBuffer());
            sendBytes(port, idBuf, body);
            port.send(idBuf);
        }
    }
    function sendBytes(port, idBuf, u8, size = 8192) {
        let begin = 0;
        for (let end = size; end < u8.length; begin += size, end += size) {
            port.send(concat([idBuf, u8.subarray(begin, end)]));
        }
        port.send(concat([idBuf, u8.subarray(begin)]));
    }
    
    async function sendError(port, idBuf, status = 404) {
        const head = {
            status: status.toString(), headers: {},
        };
        const headBuf = new TextEncoder().encode(JSON.stringify(head));
        port.send(concat([idBuf, headBuf]));
        port.send(idBuf);
    }

    
    // similar interface with ServiceWorker's FetchEvent
    const privates = new WeakMap();
    class ReverseEvent extends Event {
        constructor(type, init) {
            super(type, init);
            privates.set(this, {
                request: init.request,
                respondWith: init.respondWith,
            });
        }
        get request() {
            return privates.get(this).request;
        }
        respondWith(promise) {
            this.stopImmediatePropagation();
            this.preventDefault();
            privates.get(this).respondWith(promise);
        }
    }
    function spawnFetchEvent(target, port, idBuf, request) {
        const asyncRespondWith = async promise => {
            try {
                const response = await Promise.resolve(promise);
                console.assert(
                    response instanceof Response,
                    "respondWith should accept Response");
                await sendResponse(port, idBuf, response);
            } catch (error) {
                console.error(error);
                sendError(port, idBuf, 500);
            }
        };
        let called = false;
        const event = new ReverseEvent("fetch", {
            request, respondWith(promise) {
                if (called) return; 
                called = true;
                asyncRespondWith(promise);
            },
        });
        target.dispatchEvent(event);
        if (!called) {
            // when no listener called `respondWith`
            sendError(port, idBuf, 404);
        }
    }

    // request handler implementations
    function handleAsArrayBufferRequest(target, port) {
        const reqs = new Map();
        port.addEventListener("message", ev => {
            if (typeof ev.data === "string") return;
            const idBuf = new Uint8Array(ev.data, 0, 32);
            const id = toHex(idBuf);
            const body = new Uint8Array(ev.data, 32);
            if (!reqs.has(id)) {
                const head = JSON.parse(new TextDecoder().decode(body));
                reqs.set(id, {head, body: []});
            } else if (body.length > 0) {
                reqs.get(id).body.push(body.slice());
            } else {
                const {head: {url, method, headers}, body} = reqs.get(id);
                reqs.delete(id);
                const opts = {method, headers: new Headers(headers),};
                if (method !== "GET" && method !== "HEAD") {
                    opts.body = concat(body);
                }
                const request = new Request(url, opts);
                spawnFetchEvent(target, port, idBuf, request);
            }
        }, false);
    }
    function handleAsStreamRequest(target, port) {
        //NOTE: it is for futer, no supported browsers exist 
        const controllers = new Map();
        port.addEventListener("message", ev => {
            if (typeof ev.data === "string") return;
            const idBuf = new Uint8Array(ev.data, 0, 32);
            const id = toHex(idBuf);
            const body = new Uint8Array(ev.data, 32);
            if (!controllers.has(id)) {
                const stream = new ReadableStream({
                    type: "bytes",
                    start(controller) {
                        controllers.set(id, controller);
                    },
                });
                const {url, method, headers} =
                      JSON.parse(new TextDecoder().decode(body));
                const opts = {method, headers: new Headers(headers),};
                if (method !== "GET" && method !== "HEAD") {
                    opts.body = stream;
                }
                try {
                    const request = new Request(url, opts);
                    spawnFetchEvent(target, port, idBuf, request);
                } catch (err) {
                    controllers.delete(id);
                }
            } else if (body.length > 0) {
                controllers.get(id).enqueue(body.slice());
            } else {
                controllers.get(id).close();
                controllers.delete(id);
            }
        }, false);
    }
    function isSupportedStreamBodyInRequest() {
        if (typeof ReadableStream !== "function") return false;
        try {
            const body = new ReadableStream(
                {type: "bytes", start(c) {c.close();}});
            return new Request("/", {method: "PUT", body}).body !== undefined;
        } catch (err) {return false;}
    }
    const handleAsRequest = isSupportedStreamBodyInRequest() ?
          handleAsStreamRequest : handleAsArrayBufferRequest;
    
    // Only reveals `target = await ReverseTarget.connect(proxyUrl, privkey)`
    return class ReverseTarget {
        static async connect(url, priv = null) {
            //NOTE: something EventTarget
            const target = new Worker("data:text/javascript,true");
            //const target = document.createElement("div");
            const {ident, port} = await connect(url, priv);
            target.ident = ident;
            target.close = () => {port.close();};
            port.addEventListener("close", ({code, wasClean, reason}) => {
                // TBD: which event used
                if (!wasClean || code != 1000) {
                    const event = new ErrorEvent("error" , {
                        message: "closed",
                        error: {code, wasClean, reason},
                    });
                    target.dispatchEvent(event);
                }
            }, false);
            handleAsRequest(target, port);
            return target;
        }
    };
}();
