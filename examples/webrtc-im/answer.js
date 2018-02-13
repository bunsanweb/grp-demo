window.addEventListener("load", async ev => {
    const ctx = {
        url: document.querySelector("#url"),
        copy: document.querySelector("#copy"),
        log: document.querySelector("#log"),
        input: document.querySelector("#input"),
        send: document.querySelector("#send"),
    };
    ctx.copy.addEventListener("click", ev => {
        ctx.url.select();
        document.execCommand("copy");
    }, false);
    
    const proxyUrl = "http://localhost:3000/";
    const target = await ReverseTarget.connect(proxyUrl);
    target.addEventListener("fetch", ev => {
        console.log("request arrived", ev.request.method, ev.request.url);
        if (ev.request.method === "OPTIONS") {
            ev.respondWith((async () => {
                const headers = new Headers({
                    "content-type": "text/plain;charset=utf-8",
                    "access-control-allow-origin": "*",
                    "access-control-allow-methods": "GET,POST,OPTIONS",
                });
                const body = ``;
                return new Response(body, {status: 200, headers});
            })());
        } else if (ev.request.method === "POST") {
            ev.respondWith((async () => {
                const offerSdp = await ev.request.text();
                ctx.log.textContent += `\n[accpet offer]`;
                console.log("[offer sdp]", offerSdp);
                const answer = await doAnswer(ctx, offerSdp);
                console.log("[answer sdp]", answer);
                ctx.send.addEventListener("click", ev => {
                    const msg = ctx.input.value;
                    ctx.log.textContent += `\n[answer] ${msg}`;
                    ctx.dc.send(msg);
                }, false);
                const headers = new Headers({
                    "content-type": "text/plain;charset=utf-8",
                    "access-control-allow-origin": "*",
                });
                const body = answer.sdp;
                ctx.log.textContent += `\n[accepted offer]`;
                return new Response(body, {status: 200, headers});
            })());
        } else if (ev.request.method === "GET") {
            ev.respondWith((async () => {
                if (ctx.answer) {
                    console.log("[send answer sdp]");
                    const headers = new Headers({
                        "content-type": "text/plain;charset=utf-8",
                        "access-control-allow-origin": "*",
                    });
                    ctx.log.textContent += `\n[send answer]`;
                    return new Response(ctx.answer, {status: 200, headers});
                } else {
                    console.log("[pending answer sdp]");
                    const headers = new Headers({
                        "access-control-allow-origin": "*",
                    });
                    ctx.log.textContent += `\n[pending]`;
                    return new Response("", {status: 202, headers});
                }
            })());
        }
    }, false);

    ctx.url.value = `${proxyUrl}${target.ident.id}/`;
}, false);

function newPC(ctx) {
    const pc = new RTCPeerConnection({iceServers: [
        {urls: "stun:stun.services.mozilla.com:3478"},
        {urls: "stun:stun.l.google.com:19302"},
    ]});
    pc.addEventListener("datachannel", ev => {
        // receiver channel from remote
        console.log("datachannel", ev);
        ctx.log.textContent += `\n[open]`;
        ev.channel.addEventListener("message", ev => {
            const message = ev.data;
            ctx.log.textContent += `\n[offer] ${message}`;
        }, false);
        ev.channel.addEventListener("close", ev => {
            console.log("close");
            ctx.log.textContent += `\n[close]`;
        }, false);
    }, false);
    const dc = pc.createDataChannel("answer");
    return Object.assign(ctx, {pc, dc});
}
async function doAnswer(ctx, offerSdp) {
    newPC(ctx);
    const offer = new RTCSessionDescription({
        type: "offer", sdp: offerSdp,
    });
    await ctx.pc.setRemoteDescription(offer);
    console.log("remote");
    ctx.pc.addEventListener("icecandidate", ev => {
        console.log("icecandidate", ev);
        ctx.log.textContent += `\n[icecandidate]`;
        if (!ev.candidate) ctx.answer = ctx.pc.localDescription.sdp;;
    }, false);
    const answer = await ctx.pc.createAnswer();
    ctx.pc.setLocalDescription(answer);
    return answer;
}
