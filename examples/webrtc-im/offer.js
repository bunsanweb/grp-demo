window.addEventListener("load", ev => {
    const ctx = {
        url: document.querySelector("#url"),
        offer: document.querySelector("#offer"),
        input: document.querySelector("#input"),
        send: document.querySelector("#send"),
        log: document.querySelector("#log"),
    };

    ctx.offer.addEventListener("click", async ev => {
        ctx.offer.disabled = true;
        try {
            await doOffer(ctx);
        } catch (error) {
            ctx.log.textContent = `\n[error] ${error}`;
        }
    }, false);
}, false);


function newPC(ctx) {
    const pc = new RTCPeerConnection({iceServers: [
        {urls: "stun:stun.services.mozilla.com:3478"},
        {urls: "stun:stun.l.google.com:19302"},
    ]});
    pc.addEventListener("datachannel", ev => {
        // receiver channel from remote
        console.log("datachannel", ev);
        ev.channel.addEventListener("message", ev => {
            const message = ev.data;
            ctx.log.textContent += `\n[answer] ${message}`;
        }, false);
        ev.channel.addEventListener("close", ev => {
            // NOTE: close event is not in RTCPeerConnection
            console.log("close");
            ctx.log.textContent += `\n[closed]`;
        }, false);
    }, false);
    // sender channel to remote
    const dc = pc.createDataChannel("offer");
    return Object.assign(ctx, {pc, dc});
}

async function doOffer(ctx) {
    newPC(ctx);
    ctx.log.textContent += `\n[create offer]`;
    const offerPromise = new Promise((resolve, reject) => {
        ctx.pc.addEventListener("icecandidate", ev => {
            console.log("icecandidate", ev);
            ctx.log.textContent += `\n[icecandidate]`;
            if (!ev.candidate) resolve(ctx.pc.localDescription.sdp);
        }, false);
    });
    const offer = await ctx.pc.createOffer();
    ctx.pc.setLocalDescription(offer);
    const offerSdp = await offerPromise;

    // send offer
    ctx.log.textContent += `\n[send offer]`;
    const url = ctx.url.value;
    const post = new Request(url, {
        method: "POST",
        headers: new Headers({
            "content-type": "text/plain;charset=utf-8",
        }),
        body: offerSdp,
        mode: "cors",
        cache: "no-cache",
    });
    const postResponse = await fetch(post);
    ctx.log.textContent += `\n[finish send]`;
    const answerSdp0 = await postResponse.text();
    console.log(answerSdp0);
    const answer0 = new RTCSessionDescription({
        type: "answer", sdp: answerSdp0,
    });
    ctx.pc.setRemoteDescription(answer0);
    
    // poll answer
    const get = new Request(url, {
        method: "GET",
        mode: "cors",
        cache: "no-cache",
    });
    let response = null;
    for (let trial = 0; trial < 100;  trial++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const res = await fetch(get);
        if (res.status === 200) {
            response = res;
            break;
        }
        ctx.log.textContent += `\n[retry answer after 1sec: ${trial}]`;
    }
    // process answer
    const answerSdp = await response.text();
    ctx.log.textContent += `\n[response body]`;
    const answer = new RTCSessionDescription({
        type: "answer", sdp: answerSdp,
    });
    ctx.pc.setRemoteDescription(answer);
    
    ctx.send.addEventListener("click", ev => {
        const msg = ctx.input.value;
        ctx.log.textContent += `\n[offer] ${msg}`;
        ctx.dc.send(msg);
    }, false);
    ctx.log.textContent += `\n[open]`;
}
