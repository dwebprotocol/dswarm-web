const { EventEmitter } = require('events')
const webRTCSwarm = require('dweb-discovery-swarm-webrtc')
const DSwarmClient = require('@dswarm/proxy-ws/client')
const DuplexPair = require('duplexpair')

const DEFAULT_WEBRTC_BOOTSTRAP = ['wss://webrtc.dwebx.net', 'wss://webrtc.peepsx.com', 'wss://webrtc.dsocial.network']
const DEFAULT_PROXY_SERVER = 'wss://dswarm.mauve.moe'

module.exports = function swarm (opts) {
  return new DSwarmWeb(opts)
}

function getBootstrapUrls(path, defaultUrls = [], specificUrls = []) {
  let urls = defaultUrls.map(url => {
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    return `${url}/${path}`
  })

  urls = urls.concat(specificUrls)

  if (urls.length === 0) return
  return urls
}

class DSwarmWeb extends EventEmitter {
  constructor (opts = {}) {
    super()
    const {
      bootstrap,
      webrtcBootstrap,
      wsProxy,
      maxPeers,
      simplePeer,
      wsReconnectDelay
    } = opts

    this.webrtcOpts = {
      maxPeers,
      simplePeer,
      bootstrap: getBootstrapUrls('signal', bootstrap, webrtcBootstrap) || DEFAULT_WEBRTC_BOOTSTRAP
    }
    this.wsOpts = {
      maxPeers,
      proxy: getBootstrapUrls('proxy', bootstrap, wsProxy) || DEFAULT_PROXY_SERVER
    }

    if (wsReconnectDelay) {
      this.wsOpts.reconnectDelay = wsReconnectDelay
    }

    this.isListening = false
    this.destroyed = false
  }

  _handleWS (connection, info) {
    this.emit('connection', connection, info)
  }

  _handleWebRTC (connection, info) {
    const { id, channel, initiator } = info

    const peerInfo = {
      type: 'webrtc',
      client: initiator,
      peer: {
        port: 0,
        host: id,
        topic: channel
      },
      // TODO: Add deduplication to WebRTC logic
      deduplicate: () => false
    }

    this.emit('connection', connection, peerInfo)
  }

  address () {
    // TODO: What could possibly go here?!?!?!
    return { port: 0, family: 'IPv4', address: '127.0.0.1' }
  }

  listen (port, cb) {
    if (this.isListening) return setTimeout(cb, 0)

    this.isListening = true

    this.webrtc = webRTCSwarm(this.webrtcOpts)
    this.ws = new DSwarmClient(this.wsOpts)

    this.ws.on('connection', (connection, info) => this._handleWS(connection, info))
    this.webrtc.on('connection', (connection, info) => this._handleWebRTC(connection, info))
  }

  join (key, opts) {
    this.listen()

    this.webrtc.join(key)
    this.ws.join(key, opts)
  }

  leave (key) {
    this.listen()

    this.webrtc.leave(key)
    this.ws.leave(key)
  }

  connect (peer, cb) {
    this.listen()

    this.ws.connect(peer, cb)
  }

  connectivity (cb) {
    this.listen(() => {
      cb(null, {
        bound: true,
        bootstrapped: true,
        holepunched: true
      })
    })
  }

  // No clue how to implement this, it's undocumented
  flush (cb) {
    process.nextTick(cb)
  }

  // Always return that we're looking up and not announcing
  status () {
    return {
      lookup: true,
      announce: false
    }
  }

  destroy (cb) {
    this.destroyed = true
    this.webrtc.close(() => {
      this.ws.destroy(cb)
    })
  }
}
