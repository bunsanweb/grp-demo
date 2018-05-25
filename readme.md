# `grp`

NOTE: this implementation is a prototype.

## What is `grp`

`grp` is a general-purpose HTTP reverse proxy system for JavaScript programs
such as run on modern browsers.

The `grp` consists two parts:

- `proxyd.js`: a node.js program as a HTTP reverse proxy server
- `browserlib`: a JavaScript module for connecting to the proxyd.js server as
  a programming style of 
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
called as `proxyUrl` in examples.

NOTE: You can also specify an accessible `IP` address and `PORT` number with 
environmental variables as:

```sh
$ IP=127.0.0.1 PORT=8080 npm start

proxy host started on http://127.0.0.1:8080/
```

### 2. Use `browserlib` to connect the `proxyd.js` in scripts for modern browsers

The `browserlib` directory contains:

- `grp.js`: as a library script for embedding with traditional `script` tag.
     - it also requires embedding the 
       [`elliptic.js`](https://github.com/indutny/elliptic) library in HTML.
- `grp.m.js`: as a ES6 module for modern browsers

This is an example as simple Web server on a browser tab with `grp.m.js`:

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

Put the `grp.m.js` file into the same directory of the `hello.m.html`.

After `proxyd.js` ran at localhost, 
directly open the `hello.m.js` file with a modern browser enabled ES module
(firefox-60), or open via simple http server such as 
`python3 -m http.server` (chrome).

Wait a little, then the page shows some link to a URL on `proxyUrl`.
After clicked to open the link, 
the text `Hello World! from ...` generated on the browser tab is shown.

## Interface for client side scripting

NOTE: these are experimental structure.

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

TBD

