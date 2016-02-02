/* global chrome  */
import ipfsAPI from 'ipfs-api'

const settingsKeys = ['host', 'apiPort', 'apiInterval']
let settings = {}

let ipfs
let updateInterval

function connectToAPI () {
  ipfs = ipfsAPI(settings.host, settings.apiPort)
  console.log('changed api to', settings.host, settings.apiPort)

  ipfs.id((err, peer) => {
    if (err) return

    chrome.storage.local.set({
      id: peer.Id,
      agentVersion: peer.AgentVersion,
      protocolVersion: peer.ProtocolVersion
    })
  })
}

function updatePeersCount () {
  ipfs.swarm.peers((err, res) => {
    if (err) {
      chrome.storage.local.set({
        peersCount: 0,
        running: false
      })
      return
    }

    chrome.storage.local.set({
      peersCount: res.Strings.length,
      running: true
    })
  })
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  let needsRestart = false
  Object.keys(changes).forEach(key => {
    var storageChange = changes[key]

    if (settingsKeys.indexOf(key) !== -1) {
      settings[key] = storageChange.newValue
    }

    needsRestart = (key === 'host' || key === 'apiPort')

    if (key === 'apiInterval' && updateInterval) {
      clearInterval(updateInterval)
      updateInterval = setInterval(updatePeersCount, settings.apiInterval)
      console.log('changed update interval to', settings.apiInterval)
    }
  })

  if (needsRestart) {
    connectToAPI()
  }
})

chrome.storage.sync.get(settingsKeys, (result) => {
  settings = result

  connectToAPI()

  updatePeersCount()
  updateInterval = setInterval(updatePeersCount, settings.apiInterval)
})
