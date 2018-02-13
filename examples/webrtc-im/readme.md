# Example: WebRTC Offer/Answer on tab server

How to establish a WebRTC peer channel between Offer side and Answer side:

0. (Start `node proxyd.js` at `http://localhost:3000/`)
1. Open `answer.html` (as `file://...` URL) on a chrome tab
    - setup finished on display 
      the `ofer to` URL as `http://localhost:3000/.../`:
      it is a tab web server for accept Offer SDP POST
2. Open `offer.html` (as `file://...` URL) on other chrome tab
3. Copy the `offer to` url on `answer.html`
4. Paste it into `answer url` on `offer.html` then press `offer` button
5. Wait a minute... then display the `[open]` log at `offer.html`
6. Send text messages with `send` buttons from both sides

NOTE:

- firefox may be required TURN Servers
