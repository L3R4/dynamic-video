let peerConnections = {};

let peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

let localUuid = "";
let localDisplayName = "Nothing";
let localStreamLoaded = false;
let localStream;

var constraints = {
    video: {
      width: {max: 200},
      height: {max: 150},
      frameRate: {max: 60},
    },
    audio: true,
  };

function _webCamLoaded() {
  if (localStreamLoaded == true) {
    return "true";
  } else {
    return "false";
  }
}

function _attachWebCam(vidID) {
  const videoElement = document.querySelector('video#' + vidID);
  navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    localStream = stream;
    videoElement.srcObject = stream;
    videoElement.muted = true;
    localStreamLoaded = true;
  }).catch(error => {
    console.error('Error opening video camera.', error);
  });
}

function _setUpPeer(peerUuid) {
  peerConnections[peerUuid] = {'pc': new RTCPeerConnection(peerConnectionConfig),
                              'iceCandidates': [],
                              'localDescSet': false,
                              'remoteDescSet': false};
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

function _addStreamToConnectionWithPeer(peerUuid) {
  peerConnections[peerUuid].pc.addStream(localStream);
}

function _makeOffer(peerUuid) {
  peerConnections[peerUuid].pc.createOffer().then(description => createdDescription(description, peerUuid));
}

function _makeAnswer(peerUuid) {
  peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid));
}

function createdDescription(description, peerUuid) {
  peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
    peerConnections[peerUuid].localDescSet = true;
  });
}

function _offerCompleted(peerUuid) {
  if (peerConnections[peerUuid].localDescSet == true) {
    return JSON.stringify({'sdp': peerConnections[peerUuid].pc.localDescription});
  } else {
    return "Not finished";
  }
}

function _receivedDescription(peerUuid, desc) {
  let sdpObj = JSON.parse(desc);
  peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(sdpObj.sdp)).then(function() {
    peerConnections[peerUuid].remoteDescSet = true;
  });
}

function _remoteDescriptionSet(peerUuid) {
  if (peerConnections[peerUuid].remoteDescSet == true) {
    return "Finished";
  } else {
    return "Not finished";
  }
}

function gotRemoteStream(event, peerUuid) {
  console.log(`got remote stream, peer ${peerUuid}`);

  if (!document.getElementById('remoteVideo_' + peerUuid)) {
    var vidElement = document.createElement('video');
    vidElement.setAttribute('id', peerUuid);
    vidElement.setAttribute('class', 'webcam');
    vidElement.srcObject = event.streams[0];

    var vidContainer = document.createElement('div');
    vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid);
    vidContainer.setAttribute('class', 'videoContainer');
    vidContainer.style.display = "none";
    vidContainer.appendChild(vidElement);

    document.getElementById('otherVideos').appendChild(vidContainer);
  }
}

function checkPeerStateChange(event, peerUuid) {
  var state = peerConnections[peerUuid].pc.iceConnectionState;
  console.log(`connection with peer, ${peerUuid} ${state}`);
  if (state === "failed" || state === "closed" || state === "disconnected") {
    delete peerConnections[peerUuid];
    document.getElementById('otherVideos').removeChild(document.getElementById('remoteVideo_' + peerUuid));
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

function _addCandidates(candidates, peerId) {
  let iceCandidates = JSON.parse(candidates);
  for (const uuid in iceCandidates) {
    if (uuid == localUuid) {
      let iceList = iceCandidates[uuid];
      for (let i = 0; i < iceList.length; i++) {
        peerConnections[peerId].pc.addIceCandidate(new RTCIceCandidate(iceList[i]));
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

var webCamLoaded = LINKS.kify(_webCamLoaded);
var attachWebCam = LINKS.kify(_attachWebCam);
var setLocalUuid = LINKS.kify(_setLocalUuid);
var getLocalUuid = LINKS.kify(_getLocalUuid);
var setUpPeer = LINKS.kify(_setUpPeer);
let addStreamToConnectionWithPeer = LINKS.kify(_addStreamToConnectionWithPeer);
var makeOffer = LINKS.kify(_makeOffer);
var makeAnswer = LINKS.kify(_makeAnswer);
var offerCompleted = LINKS.kify(_offerCompleted);
var receivedDescription = LINKS.kify(_receivedDescription);
var remoteDescriptionSet = LINKS.kify(_remoteDescriptionSet);
var collectCandidates = LINKS.kify(_collectCandidates);
var addCandidates = LINKS.kify(_addCandidates);
