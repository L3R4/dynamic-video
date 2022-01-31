let peerConnections = {};

let peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

let localUuid = "";
let localStreamLoaded = false;
let localStream;

const constraints = {
    video: {
      width: {max: 150},
      height: {max: 150},
      frameRate: {max: 60},
    },
    audio: true,
  };

function _checkIfWebcamLoaded() {
  return localStreamLoaded;
}

function _getWebcamReady() {
  let vidElement = document.createElement('video');
  vidElement.setAttribute('id', 'localVideoTemp');
  vidElement.setAttribute('autoplay', 'true');
  vidElement.setAttribute('hidden', 'true');
  vidElement.muted = true;
  document.body.appendChild(vidElement);
  navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    localStream = stream;
    vidElement.srcObject = stream;
    localStreamLoaded = true;
  }).catch(error => {
    console.error('Error opening video camera.', error);
  });
}

function _setUpPC(peerUuid) {
  peerConnections[peerUuid] = {'pc': new RTCPeerConnection(peerConnectionConfig),
                              'iceCandidates': [],
                              'localDescSet': false,
                              'remoteDescSet': false,
                              'streamAdded': false};
  peerConnections[peerUuid].pc.onicecandidate = event => {
    if (event.candidate != null) {
      peerConnections[peerUuid].iceCandidates.push(event.candidate);
    }
  }
  peerConnections[peerUuid].pc.ontrack = event => {
    gotRemoteStream(event, peerUuid);
  }
  peerConnections[peerUuid].pc.oniceconnectionstatechange = event => {
    checkPeerStateChange(event, peerUuid);
  }
  peerConnections[peerUuid].pc.addStream(localStream);
}

function _connectionInitiatedWithPeer(peerUuid) {
  if (peerConnections[peerUuid]) {
    return true;
  } else {
    return false;
  }
}

function _setLocalDescForPC(peerUuid, sdpType) {
  if (sdpType == "offer") {
    peerConnections[peerUuid].pc.createOffer().then(description => createdDescription(description, peerUuid));
  } else {
    peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid));
  }
}

function _makeAnswerForPeer(peerUuid) {
  peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid));
}

function createdDescription(description, peerUuid) {
  peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
    peerConnections[peerUuid].localDescSet = true;
  });
}

function _checkIfLocalDescSetForPC(peerUuid) {
  return peerConnections[peerUuid].localDescSet;
}

function _getLocalDescForPC(peerUuid) {
  return JSON.stringify({'sdp': peerConnections[peerUuid].pc.localDescription});
}

function _setRemoteDescForPC(peerUuid, desc) {
  let sdpObj = JSON.parse(desc);
  peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(sdpObj.sdp)).then(function() {
    peerConnections[peerUuid].remoteDescSet = true;
  });
}

function _checkIfRemoteDescSetForPC(peerUuid) {
  return peerConnections[peerUuid].remoteDescSet;
}

function gotRemoteStream(event, peerUuid) {
  console.log(`got remote stream, peer ${peerUuid}`);
  if (!document.getElementById('remoteVideoTemp_' + peerUuid)) {
    let vidElement = document.createElement('video');
    vidElement.setAttribute('id', 'remoteVideoTemp_' + peerUuid);
    document.body.appendChild(vidElement);
    vidElement.srcObject = event.streams[0];
  }
}

function checkPeerStateChange(event, peerUuid) {
  if (!peerConnections[peerUuid]) return;
  let state = peerConnections[peerUuid].pc.iceConnectionState;
  console.log(`connection with peer, ${peerUuid} ${state}`);
  if (state == "failed" || state == "closed" || state == "disconnected") {
    delete peerConnections[peerUuid];
  }
}

function _checkIfConnectedToPeer(peerUuid) {
  if (peerConnections[peerUuid]) {
    let state = peerConnections[peerUuid].pc.iceConnectionState;
    if (state == "connected") return true;
  }
  return false;
}

function _disconnectFromUser(peerUuid) {
  if (peerConnections[peerUuid]) {
    console.log(`disconnecting from peer, ${peerUuid}`);
    delete peerConnections[peerUuid];
  }
}

function _collectCandidates() {
  let candidates = {};
  for (const peer in peerConnections) {
    candidates[peer] = [];
    for (let i = 0; i < peerConnections[peer].iceCandidates.length; i++) {
      candidates[peer].push(peerConnections[peer].iceCandidates[i]);
    }
    peerConnections[peer].iceCandidates = [];
  }
  for (const peer in candidates) {
    if (candidates[peer].length > 0) {
      return JSON.stringify(candidates);
    }
  }
  return "No candidates";
}

function _addCandidates(candidates, peerUuid) {
  let iceCandidates = JSON.parse(candidates);
  for (const uuid in iceCandidates) {
    if (uuid == localUuid) {
      let iceList = iceCandidates[uuid];
      for (let i = 0; i < iceList.length; i++) {
        peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(iceList[i]));
      }
    }
  }
}

function _setLocalUuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  localUuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function _getLocalUuid() {
  return localUuid;
}

let checkIfWebcamLoaded = LINKS.kify(_checkIfWebcamLoaded);
let getWebcamReady = LINKS.kify(_getWebcamReady);
let setLocalUuid = LINKS.kify(_setLocalUuid);
let getLocalUuid = LINKS.kify(_getLocalUuid);
let setUpPC = LINKS.kify(_setUpPC);
let connectionInitiatedWithPeer = LINKS.kify(_connectionInitiatedWithPeer);
let setLocalDescForPC = LINKS.kify(_setLocalDescForPC);
let checkIfLocalDescSetForPC = LINKS.kify(_checkIfLocalDescSetForPC);
let getLocalDescForPC = LINKS.kify(_getLocalDescForPC);
let setRemoteDescForPC = LINKS.kify(_setRemoteDescForPC);
let checkIfRemoteDescSetForPC = LINKS.kify(_checkIfRemoteDescSetForPC);
let checkIfConnectedToPeer = LINKS.kify(_checkIfConnectedToPeer);
let disconnectFromUser = LINKS.kify(_disconnectFromUser);
let collectCandidates = LINKS.kify(_collectCandidates);
let addCandidates = LINKS.kify(_addCandidates);
