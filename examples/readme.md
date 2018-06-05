# Examples

Here are several example applications to connet `proxyd.js`.

You can **open the HTML file** in your browser.
The application will automatically
connect to a `proxyd.js` server specified as a `proxyUrl` in its js file,
then it provides proxy based URLs access from remote browsers.

- [hello](./hello/): 
  A basic example for simply serving 
  a dynamically generated text with a proxy-based URL
- [hello-es6module](./hello-es6module/): 
  "hello" example with ES6 module `import`
- [file-transfer](./file-transfer/):
  Sharing local files via `grp` which uses standard 
  [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) 
  objects as a `Response` body.
- [file-transfer-es6module](./file-transfer-es6module/):
  "file-transfer" example with ES6 module `import`
- [webrtc-im](./webrtc-im/):
  Signaling server less WebRTC text chat for which 
  the `offer`-side accesses to the `answer`-side via `grp` for SDP negotiations
    - For playing with two browsers, see 
      [webrtc-im/readme.md](./webrtc-im/readme.md) 

## NOTE for ES6 module

Firefox can load the ES6 module from local files in local HTML files, 
but Chrome's security prohibits it.
On Chrome, in order to import ES6 module js files they must be served from a web server.

We recommend you use built-in Web servers for programming languages:

- `ruby -run -e httpd . -p 8000`
- `python3 -m http.server 8000`
- `php -S 0.0.0.0:8000`
- or using node.js packages such as 
  [serve](https://www.npmjs.com/package/serve)
  
