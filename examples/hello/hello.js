// web server on tab example
window.addEventListener("load", async ev => {
    //const proxyUrl = "http://localhost:3000/";
    const proxyUrl = "https://radiant-sea-42997.herokuapp.com/";
    const target = await ReverseTarget.connect(proxyUrl);
    target.addEventListener("fetch", ev => {
        ev.respondWith((async () => {
            console.log("request arrived", ev.request.url);
            const headers = new Headers({
                "content-type": "text/plain;charset=utf-8",
                "access-control-allow-origin": "*",
            });
            const body = `Hello World! from a Browser Tab: ${ev.request.url}`;
            return new Response(body, {status: 200, headers});
        })());
    }, false);
    
    // UI: show a proxy link for the generator page
    const a = document.createElement("a");
    a.href = `${proxyUrl}${target.ident.id}/`;
    a.target = "_blank";
    a.innerHTML = `open proxy page: ${a.href}`;
    document.body.appendChild(a);
}, false);
