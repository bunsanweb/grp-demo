# Example: WebRTC Offer/Answer on tab server

How to establish a WebRTC peer channel between the Offer side and Answer side:

0. (Start `node proxyd.js` at `http://localhost:3000/`)
1. Open `answer.html` (as `file://...` URL) in a chrome tab
    - setup finished on display 
      the `offer to` URL as `http://localhost:3000/.../`:
      it is a tab web server for accepting Offer SDP POST
2. Open `offer.html` (as `file://...` URL) in another chrome tab
3. Copy the `offer to` url in `answer.html`
4. Paste it into `answer url` on `offer.html` then press the `offer` button
5. Wait a minute... then display the `[open]` log at `offer.html`
6. Send text messages with the `send` buttons from both sides

NOTE:

- Firefox may be required TURN Servers
