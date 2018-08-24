window.addEventListener("load", async ev => {
    const ctx = {
        files: document.querySelector("#files"),
        url: document.querySelector("#url"),
    };
    if (!location.hash || !location.hash.match(/^#[a-f\d]{64}$/)) {
        const priv = crypto.getRandomValues(new Uint8Array(32));
        location.hash = `#${toHex(priv)}`;
    }
    const priv = fromHex(location.hash.slice(1));

    //const proxyUrl = "http://localhost:3000/";
    const proxyUrl = "https://radiant-sea-42997.herokuapp.com/";
    const target = await ReverseTarget.connect(proxyUrl, priv);
    const rootUrl = `${proxyUrl}${target.ident.id}/`;
    ctx.url.textContent = ctx.url.href = rootUrl;
    target.addEventListener("fetch", ev => {
        console.log(ev.request.url);
        if (ev.request.method === "GET" && ev.request.url === rootUrl) {
            ev.respondWith(indexResponse(ctx.files.files));
            return;
        }
        if (ev.request.method === "GET" &&
            ev.request.url.startsWith(rootUrl)) {
            const name = decodeURIComponent(
                ev.request.url.slice(rootUrl.length));
            const file = Array.from(ctx.files.files).find(
                file => file.name === name);
            if (file) {
                ev.respondWith(fileResponse(file));
                return;
            }
        }
    }, false);

    async function indexResponse(files) {
        const lis = Array.from(
            files, file => `<li><a href="${encodeURIComponent(file.name)
                            }" target="_blank">${file.name}</a>`);
        const body = `<!doctype html><html><head></head>
<body><h1>files</h1><ul>${lis.join("") || "<li>none</li>"}</ul></body></html>`;
        return new Response(body, {
            status: 200,
            headers: new Headers({
                refresh: 5,
                "last-modified": new Date().toUTCString(),
                "content-type": "text/html;charset=utf-8",
                "cache-control": "no-cache, no-store, must-revalidate",
            }),
        });
    }

    async function fileResponse(file) {
        return new Response(file, {
            status: 200,
            headers: new Headers({
                "last-modified": new Date(file.lastModified).toUTCString(),
                "content-length": file.size,
                "content-type": file.type,
            }),
        });
    }

    function toHex(u8a) {
        return Array.from(
            u8a, u8 => u8.toString(16).padStart(2, "0")).join("");
    }
    function fromHex(hex) {
        return new Uint8Array(
            hex.match(/[a-f\d]{2}/g).map(h2 => parseInt(h2, 16)));
    }
}, false);
