// MATH
function _root(x) {
  return Math.sqrt(x);
}

var root = LINKS.kify(_root);

// STRINGS
function _objToStr(obj) {
  let str = obj._value;
  return str;
}

function _sub(str, start, finish) {
  return str.substring(start, finish);
}

var objToStr = LINKS.kify(_objToStr);
var sub = LINKS.kify(_sub);

// WEBRTC
let peerConnections = {};

let peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

var constraints = {
    video: {
      width: {max: 320},
      height: {max: 240},
      frameRate: {max: 30},
    },
    audio: true,
  };

let localDisplayName = "";
let localUuid = createUUID();
let localStreamLoaded = false;
let localStream;
let messageString = "Still waiting";

function _getResponseIfFinished(msg) {
  if (msg != "start") {
    let signal = JSON.parse(msg);
    let peerUuid = signal.uuid;
    if (peerConnections[peerUuid]) {
      if (peerConnections[peerUuid].connected) return "connected";
    }
  }
  let str = messageString;
  messageString = "Still waiting";
  return str;
}

function _getInitialMessage() {
  console.log(localUuid);
  localDisplayName = prompt('Enter your name', '');
  let msg = JSON.stringify({'displayName': localDisplayName,
                            'uuid': localUuid,
                            'dest': 'all'});
  messageString = msg;
}

function _gotMessageFromServer(message) {
  var signal = JSON.parse(message);
  var peerUuid = signal.uuid;

  // Ignore messages that are not for us or from ourselves
  if (peerUuid == localUuid || (signal.dest != localUuid && signal.dest != 'all')) {
    messageString = "Not for us";
    return;
  }

  if (signal.displayName && signal.dest == 'all') {
    // set up peer connection object for a newcomer peer
    setUpPeer(peerUuid, signal.displayName);
    messageString = JSON.stringify({ 'displayName': localDisplayName, 'uuid': localUuid, 'dest': peerUuid });
    return;

  } else if (signal.displayName && signal.dest == localUuid) {
    // initiate call if we are the newcomer peer
    setUpPeer(peerUuid, signal.displayName, true);
    return;

  } else if (signal.sdp) {
    peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid)).catch(errorHandler);
      }
    }).catch(errorHandler);
    return;

  } else if (signal.ice) {
    addCandidates(signal.ice, peerUuid);
    messageString = "Not for us";
    return;
  }
}

function setUpPeer(peerUuid, displayName, initCall = false) {
  peerConnections[peerUuid] = {'displayName': displayName,
                               'pc': new RTCPeerConnection(peerConnectionConfig),
                               'connected': false,
                               'iceCandidates': []};
  peerConnections[peerUuid].pc.onicecandidate = event => {
    if (event.candidate != null) {
      peerConnections[peerUuid].iceCandidates.push(event.candidate);
    }
  }
  peerConnections[peerUuid].pc.ontrack = event => gotRemoteStream(event, peerUuid);
  peerConnections[peerUuid].pc.oniceconnectionstatechange = event => checkPeerDisconnect(event, peerUuid);
  peerConnections[peerUuid].pc.addStream(localStream);

  if (initCall) {
    peerConnections[peerUuid].pc.createOffer().then(description => createdDescription(description, peerUuid)).catch(errorHandler);
  }
}

function createdDescription(description, peerUuid) {
  console.log(`got description, peer ${peerUuid}`);
  peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
    messageString = JSON.stringify({ 'sdp': peerConnections[peerUuid].pc.localDescription, 'uuid': localUuid, 'dest': peerUuid });
  }).catch(errorHandler);
}

function gotRemoteStream(event, peerUuid) {
  //if (peerConnections[peerUuid].gotVideo) return;
  peerConnections[peerUuid].gotVideo = true;
  console.log(`got remote stream, peer ${peerUuid}`);

  if (document.getElementById('remoteVideo_' + peerUuid)) {
    var vid = document.getElementById('vid_' + peerUuid);
    vid.srcObject = event.streams[0];
  } else {
    var vidElement = document.createElement('video');
    vidElement.setAttribute('id', 'vid_' + peerUuid);
    vidElement.setAttribute('autoplay', 'true');
    vidElement.srcObject = event.streams[0];

    var vidContainer = document.createElement('div');
    vidContainer.setAttribute('id', 'remoteVideo_' + peerUuid);
    vidContainer.setAttribute('class', 'videoContainer');
    vidContainer.appendChild(vidElement);
    document.getElementById('otherVideos').appendChild(vidContainer);
  }

}

function checkPeerDisconnect(event, peerUuid) {
  var state = peerConnections[peerUuid].pc.iceConnectionState;
  if (state === "connected") peerConnections[peerUuid].connected = true;
  console.log(`connection with peer ${peerUuid} ${state}`);
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
      return JSON.stringify({'ice': candidates, 'uuid': localUuid, 'dest': 'all'});
    }
  }
  return "No candidates";
}

function addCandidates(candidates, peerId) {
  let iceCandidates = candidates;
  for (const uuid in iceCandidates) {
    if (uuid == localUuid) {
      let iceList = iceCandidates[uuid];
      for (let i = 0; i < iceList.length; i++) {
        console.log("ADDING");
        console.log(iceList[i]);
        peerConnections[peerId].pc.addIceCandidate(new RTCIceCandidate(iceList[i]));
      }
    }
  }
}

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
    localStreamLoaded = true;
  }).catch(error => {
    console.error('Error opening video camera.', error);
  });
}

function _togglePeerCamera(id, mode) {
  var elem = document.getElementById('remoteVideo_' + id);
  if (elem) {
    if (mode == "show") {
      elem.style.display = "block";
    } else {
      elem.style.display = "none";
    }
  } else {
    console.log("stupid id = " + id);
  }
}

function errorHandler(error) {
  console.log(error);
}

function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function _getUUID() {
  return localUuid;
}

var getInitialMessage = LINKS.kify(_getInitialMessage);
var gotMessageFromServer = LINKS.kify(_gotMessageFromServer);
var getResponseIfFinished = LINKS.kify(_getResponseIfFinished);
var collectCandidates = LINKS.kify(_collectCandidates);
var attachWebCam = LINKS.kify(_attachWebCam);
var webCamLoaded = LINKS.kify(_webCamLoaded);
var getUUID = LINKS.kify(_getUUID);
var togglePeerCamera = LINKS.kify(_togglePeerCamera);
