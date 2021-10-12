// WEBRTC
let peerConnections = {};

let peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

let constraints = {
  video: true,
  audio: true,
}

let localDisplayName = "";
let localUuid = createUUID();
let localStreamLoaded = false;
let localStream;
let messageString = "Still waiting";

function _getResponseIfFinished() {
  let str = messageString;
  messageString = "Still waiting";
  return str;
}

function _getInitialMessage() {
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
  }

  if (signal.displayName && signal.dest == 'all') {
    // set up peer connection object for a newcomer peer
    setUpPeer(peerUuid, signal.displayName);
    messageString = JSON.stringify({ 'displayName': localDisplayName, 'uuid': localUuid, 'dest': peerUuid });

  } else if (signal.displayName && signal.dest == localUuid) {
    // initiate call if we are the newcomer peer
    setUpPeer(peerUuid, signal.displayName, true);

  } else if (signal.sdp) {
    peerConnections[peerUuid].pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function () {
      // Only create answers in response to offers
      if (signal.sdp.type == 'offer') {
        peerConnections[peerUuid].pc.createAnswer().then(description => createdDescription(description, peerUuid)).catch(errorHandler);
      }
    }).catch(errorHandler);

  } else if (signal.ice) {
    peerConnections[peerUuid].pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function setUpPeer(peerUuid, displayName, initCall = false) {
  peerConnections[peerUuid] = { 'displayName': displayName, 'pc': new RTCPeerConnection(peerConnectionConfig) };
  //peerConnections[peerUuid].pc.onicecandidate = event => gotIceCandidate(event, peerUuid);
  peerConnections[peerUuid].pc.ontrack = event => gotRemoteStream(event, peerUuid);
  //peerConnections[peerUuid].pc.oniceconnectionstatechange = event => checkPeerDisconnect(event, peerUuid);
  peerConnections[peerUuid].pc.addStream(localStream);

  if (initCall) {
    peerConnections[peerUuid].pc.createOffer().then(description => createdDescription(description, peerUuid)).catch(errorHandler);
  }
}

function gotIceCandidate(event, peerUuid) {
  if (event.candidate != null) {
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': localUuid, 'dest': peerUuid }));
  }
}

function createdDescription(description, peerUuid) {
  console.log(`got description, peer ${peerUuid}`);
  peerConnections[peerUuid].pc.setLocalDescription(description).then(function () {
    messageString = JSON.stringify({ 'sdp': peerConnections[peerUuid].pc.localDescription, 'uuid': localUuid, 'dest': peerUuid });
  }).catch(errorHandler);
}

function gotRemoteStream(event, peerUuid) {
  console.log(`got remote stream, peer ${peerUuid}`);
  //assign stream to new HTML video element
  var vidElement = document.createElement('video');
  vidElement.setAttribute('id', 'remoteVideo' + peerUuid);
  vidElement.setAttribute('autoplay', 'true');
  vidElement.srcObject = event.streams[0];
  var vidContainer = document.getElementById('videos');
  vidContainer.appendChild(vidElement);
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

function errorHandler(error) {
  console.log(error);
}

function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

var getInitialMessage = LINKS.kify(_getInitialMessage);
var gotMessageFromServer = LINKS.kify(_gotMessageFromServer);
var getResponseIfFinished = LINKS.kify(_getResponseIfFinished);
var attachWebCam = LINKS.kify(_attachWebCam);
var webCamLoaded = LINKS.kify(_webCamLoaded);
