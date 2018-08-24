# `grp-demo`

This repository is for working examples linked to `proxyd.js` run on `heroku`:

- [hello](https://raw.githack.com/bunsanweb/grp-demo/master/examples/hello/hello.html): A basic example just send a html from your tab
- [hello-es6module](https://raw.githack.com/bunsanweb/grp-demo/master/examples/hello-es6module/hello.m.html): ES6 module version of the `hello` example
- [file-transfer](https://raw.githack.com/bunsanweb/grp-demo/master/examples/file-transfer/file-transfer.html): A simple application example to share files to others from your browser without any specific services
- [file-transfer-es6module](https://raw.githack.com/bunsanweb/grp-demo/master/examples/file-transfer-es6module/file-transfer.m.html): ES6 module version of the `file-transfer` example
- [webrtc-im](https://github.com/bunsanweb/grp-demo/tree/master/examples/webrtc-im/): Chatting via WebRTC connection with no signaling services.
    - an offer side (tab) directly does request/response to an answer side (tab) with `fetch()` API
    - [answer side](https://raw.githack.com/bunsanweb/grp-demo/master/examples/webrtc-im/answer.html)
    - [offer side](https://raw.githack.com/bunsanweb/grp-demo/master/examples/webrtc-im/offer.html)



---

# `grp`

NOTE: This implementation is a prototype.

## What is `grp`

`grp` is a general-purpose HTTP reverse proxy system for JavaScript programs
that can run on modern browsers.

`grp` consists of two parts:

- `proxyd.js`: a node.js program as a HTTP reverse proxy server
- `browserlib`: a JavaScript module for connecting to the proxyd.js server in
  the programming style of 
  [`FetchEvent`](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent) 
  on `ServiceWorker`.

## How to use `grp`

### 1. Run `proxyd.js` server

```sh
$ npm i
$ npm start

proxy host started on http://0.0.0.0:3000/
```

After that, it can access the server at `http://localhost:3000/`
called `proxyUrl` in examples.

NOTE: You can also specify an accessible `IP` address and `PORT` number with 
environmental variables using:

```sh
$ IP=127.0.0.1 PORT=8080 npm start

proxy host started on http://127.0.0.1:8080/
```

### 2. Use `browserlib` to connect the `proxyd.js` in scripts for modern browsers

The `browserlib` directory contains:

- `grp.js`: A library script for embedding with the traditional `script` tag.
     - it also requires embedding the 
       [`elliptic.js`](https://github.com/indutny/elliptic) library in HTML.
- `grp.m.js`: A ES6 module for modern browsers.

The following is an example of a simple Web server on a browser tab using `grp.m.js`:

```html
<!-- hello.m.html -->
<!doctype html>
<html>
<head>
<script type="module">
import ReverseTarget from "./grp.m.js";

main().catch(console.error);

// web server on tab example
async function main() {
    const proxyUrl = "http://localhost:3000/";
    const target = await ReverseTarget.connect(proxyUrl);
    // async request handler same as "fetch" event on `ServiceWorker` scripts
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
}  
</script>
</head>
<body></body>
</html>
```

Put the `grp.m.js` file into the same directory as `hello.m.html`.

After `proxyd.js` runs at localhost, 
directly open the `hello.m.js` file with a modern browser enabled ES module
(firefox-60), or via a simple http server such as 
`python3 -m http.server` (chrome).

Wait a little, then the page will show some links to a URL on `proxyUrl`.
After clicking the link, 
the text `Hello World! from ...` will be generated in the browser tab.

For more details, see [examples](./examples/).

## Interface for client side scripting

NOTE: These are experimental structures.

- static `ReverseTarget.connect(proxyUrl, privateKey = null)`: 
  returns a `Promise` of [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) object called as `target`
  after handshake to the `proxyUrl` reverse proxy server.
    - `privateKey`:  32-byte random bytes `Uint8Array`, usually generated with 
      [`crypto.getRandomValues()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
      in Web Cryptography API. Or generated inside when `null`.
- `target`: `ReverseTarget`
    - event `"fetch"`: spawn `ReverseEvent`  when proxy access from the Web.
    - event `"close"`: spawn [`Event`](https://developer.mozilla.org/en-US/docs/Web/API/Event) to notice when the connection closed at
      [`WebSocket`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) layer
    - `target.ident`: an object as `{id, pub, sign}`
         - `pub`: hex string of the public key
         - `id`: hex string of SHA256 hash value of public key
         - `sign`: hex string of a signature signed to `id`
    - `target.close()`: close the connection
- `event`: `ReverseEvent`
    - `event.request`: standard 
      [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) 
      object to the proxy access
        - `event.request.url`: a URL string which is used 
          for accessing from outside.
    - `event.respondWith(responsePromise)`: respond with the standard
      [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) 
      object or its `Promise`

## License

GPLv3


