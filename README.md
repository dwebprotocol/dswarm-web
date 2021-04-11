# dswarm-web
Implementation of the dSwarm API for use in web browsers


## Using in an application

```
npm i -s dswarm-web
```

```js
// Based on example in dSwarm repo
// Try running the regular dSwarm demo with node
const dswarm = require('dswarm-web')
const crypto = require('crypto')

const swarm = dswarm({
  // Specify a server list of DSwarmServer instances
  bootstrap: ['ws://dswarmserver'],
  // You can also specify proxy and signal servers separated
  wsProxy: [
    'ws://proxy1.com',
    'ws://proxy2.com'
  ],
  webrtcBootstrap: [
    'ws://signal1.com',
    'ws://signal2.com'
  ],
  // The configuration passed to the SimplePeer constructor
  //See https://github.com/feross/simple-peer#peer--new-peeropts
  // for more options
  simplePeer:{
    // The configuration passed to the RTCPeerConnection constructor,for more details see
    // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#RTCConfiguration_dictionary
    config:{
      // List of STUN and TURN setvers to connect
      // Without the connection is limited to local peers
      iceServers:require("./ice-servers.json")
    }
  }
})

// look for peers listed under this topic
const topic = crypto.createHash('sha256')
  .update('my-dswarm-topic')
  .digest()

swarm.join(topic)

swarm.on('connection', (socket, details) => {
  console.log('new connection!', details)

  // you can now use the socket as a stream, eg:
  // socket.pipe(ddatabase.replicate()).pipe(socket)
})
```

Build it with [Browserify](http://browserify.org/) to get it running on the web.

You could also compile an existing codebase relying on dswarm to run on the web by adding a `browser` field set to `{"dswarm": "dswarm-web"}` to have Browserify alias it when compiling dependencies.

## Setting up a proxy server

`DSwarmServer` provides two services:

  - [dSwarmProxyWS](https://github.com/RangerMauve/dswarm-proxy-ws): to proxy dswarm connections over websockets. Path: `ws://yourserver/proxy`
  - [SignalServer](https://github.com/dwebprotocol/discovery-swarm-webrtc#server): for P2P WebRTC signaling connections. Path: `ws://yourserver/signal`

Running a `DSwarmServer` will allows you to use both services in one single process.

```
npm i -g dswarm-web

# Run it! Default port is 4977 (DWEB on a phone pad)
dswarm-web

# Run it with a custom port
dswarm-web --port 42069
```

### Running as a Linux service with SystemD

```bash
sudo cat << EOF > /etc/systemd/system/dswarm-web.service
[Unit]
Description=DSwarm proxy server which webpages can connect to.

[Service]
Type=simple
# Check that dswarm-web is present at this location
# If it's not, replace the path with its location
# You can get the location with 'whereis dswarm-web'
# Optionally add a --port parameter if you don't want 4977
ExecStart=/usr/local/bin/dswarm-web
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo chmod 644 /etc/systemd/system/dswarm-web.service

sudo systemctl daemon-reload
sudo systemctl enable dswarm-web
sudo systemctl start dswarm-web

sudo systemctl status dswarm-web
```
