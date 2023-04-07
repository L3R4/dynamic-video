const peerConnections = {};
const disconnectTimes = {};
const audioOutputs = [];

const peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' },
  ]
};

let localID;
let audioTrackOnly = false;
let localVideoTrack;
let localAudioTrack;
let localVideoTrackLoaded = false;
let localAudioTrackLoaded = false;
let cameraIds = null;
let micIds = null;
let cameraLabels = null;
let micLabels = null;
let gotCameraDevices = false;
let gotMicDevices = false;
let begunIceSearch = false;
let callStartedTime = 0;

function cons(x, xs) { return {_head: x, _tail: xs}}

function _gatherMediaDeviceIds(type) {
  let mediaDeviceIds = null;
  let mediaDeviceLabels = null;
  navigator.mediaDevices.enumerateDevices().then(function(devices) {
    devices.forEach(function(device) {
      if (device.kind == type) {
        mediaDeviceIds = cons(device.deviceId, mediaDeviceIds);
        mediaDeviceLabels = cons(device.label, mediaDeviceLabels);
      }
    });
    if (type == "videoinput") {
      cameraIds = mediaDeviceIds;
      cameraLabels = mediaDeviceLabels;
      gotCameraDevices = true;
    } else {
      micIds = mediaDeviceIds;
      micLabels = mediaDeviceLabels;
      gotMicDevices = true;
    }
  })
}

function _checkDevicesGathered(type) {
  return type == "videoinput" ? gotCameraDevices : gotMicDevices;
}

function _getMediaDeviceIds(type) {
  return type == "videoinput" ? cameraIds : micIds;
}

function _getMediaDeviceLabels(type) {
  return type == "videoinput" ? cameraLabels : micLabels;
}

function _checkIfCameraLoaded() {
  return localVideoTrackLoaded;
}

function _checkIfMicLoaded() {
  return localAudioTrackLoaded;
}

function _getCameraReady(camId, width=null, height=null, fps=null) {
  const constraints = {
    video: {
      width: {max: !!width ? width : 200},
      height: {max: !!height ? height : 150},
      frameRate: {max: !!fps ? fps : 60},
      deviceId: camId != "_" ? camId : null
    },
    audio: false
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    localVideoTrack = stream.getVideoTracks()[0];
    localVideoTrackLoaded = true;
  }).catch(error => {
    console.error('Error opening video camera.', error);
  });
}

function _getMicReady(micId) {
  if (micId == "_") {
    micId = null;
  }
  const constraints = {
    video: false,
    audio: {
      deviceId: micId
    }
  };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    localAudioTrack = stream.getAudioTracks()[0];
    localAudioTrackLoaded = true;
    const audioContext = new AudioContext();
    const mediaStreamSource = audioContext.createMediaStreamSource(stream);
    const analyserNode = audioContext.createAnalyser();
    mediaStreamSource.connect(analyserNode);
    const audioData = new Float32Array(analyserNode.fftSize);
    window.setInterval(() => {
      analyserNode.getFloatTimeDomainData(audioData);
      let sumOfSquares = 0;
      for (const amplitude of audioData) { sumOfSquares += amplitude**2 };
      audioOutputs.push(Math.sqrt(sumOfSquares / audioData.length));
      if (audioOutputs.length > 10) {
        audioOutputs.shift();
      }
    }, 500);
  }).catch(error => {
    console.error('Error opening audio device', error);
  });
}

function _getAudioOutputs() {
  let outputs = null;
  for (let i = 0; i < audioOutputs.length; i++) {
    outputs = cons(audioOutputs[i], outputs);
  }
  return outputs;
}

function _createLocalStreamElement() {
  let vidElement = document.createElement('video');
  vidElement.setAttribute('id', 'localVideoTemp');
  vidElement.setAttribute('autoplay', 'true');
  vidElement.setAttribute('hidden', 'true');
  vidElement.muted = true;
  vidElement.srcObject = new MediaStream([localVideoTrack, localAudioTrack]);
  document.body.appendChild(vidElement);
}

function _setAudioOnly() {
  audioTrackOnly = true;
}

function _setUpPC(peerID, connectionID) {
  let connID;
  if (connectionID != "_") {
    connID = connectionID;
  } else {
    connID = getUniqueID();
  }
  if (Object.keys(peerConnections).length == 0) {
    callStartedTime = Date.now();
    _getCameraReady('_', 200, 150, 60);
  }
  peerConnections[peerID] = {'pc': new RTCPeerConnection(peerConnectionConfig),
                              'iceCandidates': [],
                              'localDescSet': false,
                              'remoteDescSet': false,
                              'streamAdded': false,
                              'videoTrack': null,
                              'audioTrack': null,
                              'timeConnected': Date.now() + 100000,
                              'connectionID': connID
                            };
  peerConnections[peerID].pc.onicecandidate = event => {
    if (peerConnections[peerID] && event.candidate != null) {
      peerConnections[peerID].iceCandidates.push(event.candidate);
    }
  }
  peerConnections[peerID].pc.ontrack = event => {
    gotRemoteTrack(event, peerID);
  }
  peerConnections[peerID].pc.oniceconnectionstatechange = event => {
    checkPeerStateChange(event, peerID);
  }
  if (audioTrackOnly == false) {
    peerConnections[peerID].pc.addTrack(localVideoTrack);
  }
  peerConnections[peerID].pc.addTrack(localAudioTrack);
}

function _updateResolution(width, height, fps) {
  console.log(width, height);
  _getCameraReady("_", width, height, fps);
  setTimeout(() => {
    for (peerID in peerConnections) {
      const sender = peerConnections[peerID].pc.getSenders().find(function(s) {
        return s.track.kind == localVideoTrack.kind;
      });
      console.log("Replacing track!");
      sender.replaceTrack(localVideoTrack);
    }
  }, 500);
}

function _updateConnectionID(peerID, connID) {
  if (peerConnections[peerID]) {
    peerConnections[peerID].connectionID = connID;
  }
}

function _connectionInitiatedWithPeer(peerID) {
  if (peerConnections[peerID]) {
    return true;
  } else {
    return false;
  }
}

function _setLocalDescForPC(peerID, sdpType) {
  if (!peerConnections[peerID] || _checkIfConnectedToPeer(peerID)) return;
  if (sdpType == "offer") {
    peerConnections[peerID].pc.createOffer().then(function(description) {
      if (!peerConnections[peerID]) return;
      peerConnections[peerID].pc.setLocalDescription(description).then(() => {
        if (!peerConnections[peerID]) return;
        peerConnections[peerID].localDescSet = true;
      });
    });
  } else {
    peerConnections[peerID].pc.createAnswer().then(function(description) {
      if (!peerConnections[peerID]) return;
      peerConnections[peerID].pc.setLocalDescription(description).then(() => {
        if (!peerConnections[peerID]) return;
        peerConnections[peerID].localDescSet = true;
      });
    });
  }
}

function _setRemoteDescForPC(peerID, desc) {
  if (!peerConnections[peerID]) return;
  const localDesc = peerConnections[peerID].pc.localDescription;
  const remoteDesc = peerConnections[peerID].pc.remoteDescription;
  if (!!localDesc && !!remoteDesc) return;
  let sdpObj = JSON.parse(desc);
  let rtcDesc = new RTCSessionDescription(sdpObj.sdp);
  peerConnections[peerID].pc.setRemoteDescription(rtcDesc).then(function() {
    if (!peerConnections[peerID]) return;
    peerConnections[peerID].remoteDescSet = true;
  });
}

function _checkIfLocalDescSetForPC(peerID) {
  return !!peerConnections[peerID] ? peerConnections[peerID].localDescSet : false;
}

function _checkIfRemoteDescSetForPC(peerID) {
  return !!peerConnections[peerID] ? peerConnections[peerID].remoteDescSet : false;
}

function _getLocalDescForPC(peerID) {
  if (peerConnections[peerID]) {
    return JSON.stringify({'sdp': peerConnections[peerID].pc.localDescription});
  }
  return "_";
}

function gotRemoteTrack(event, peerID) {
  const track = event.track;
  const tempVid = document.getElementById('remoteVideo_' + peerID + 'Temp');
  if (peerConnections[peerID] && !tempVid) {
    if (track.kind == "video") {
      peerConnections[peerID].videoTrack = track;
    } else {
      peerConnections[peerID].audioTrack = track;
    }
    const videoTrack = peerConnections[peerID].videoTrack;
    const audioTrack = peerConnections[peerID].audioTrack;
    if (videoTrack && audioTrack) {
      const vidElement = document.createElement('video');
      vidElement.setAttribute('id', 'remoteVideo_' + peerID + 'Temp');
      vidElement.srcObject = new MediaStream([videoTrack, audioTrack]);
      document.body.appendChild(vidElement);
    } else if (!!audioTrack && audioTrackOnly == true) {
      const audElement = document.createElement('audio');
      audElement.setAttribute('id', 'remoteAudio_' + peerID + 'Temp');
      audElement.srcObject = new MediaStream([audioTrack]);
      document.body.appendChild(audElement);
    }
  }
}

function checkPeerStateChange(event, peerID) {
  if (peerConnections[peerID]) {
    const state = peerConnections[peerID].pc.iceConnectionState;
    console.log(`connection with peer, ${peerID} ${state}`);
    if (state == "connected") {
      peerConnections[peerID].timeConnected = Date.now();
    }
    if (state == "failed" || state == "closed" || state == "disconnected") {
      delete peerConnections[peerID];
    }
  }
}

function _checkIfConnectedToPeer(peerID) {
  if (peerConnections[peerID]) {
    let state = peerConnections[peerID].pc.iceConnectionState;
    return state == "connected" ? true : false;
  }
}

function _checkIfPCObjectExists(peerID) {
  return !!peerConnections[peerID];
}

function _oneSecondElapsed(id) {
  if (!peerConnections[id]) return false;
  const timeConnected = peerConnections[id].timeConnected;
  const currentTime = Date.now();
  const timeElapsed = currentTime - timeConnected;
  return timeElapsed >= 1000;
}

function _getBegunIceSearch() {
  return begunIceSearch;
}

function _setBegunIceSearch() {
  begunIceSearch = true;
}

function _disconnectedForSecond(id) {
  if (!disconnectTimes[id]) return true;
  const timeElapsed = Date.now() - disconnectTimes[id];
  return timeElapsed >= 1000;
}

function _disconnectFromUser(peerID) {
  if (peerConnections[peerID]) {
    console.log(`disconnecting from peer, ${peerID}`);
    peerConnections[peerID].pc.close();
    delete peerConnections[peerID];
    disconnectTimes[peerID] = Date.now();
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

function _addCandidates(candidates, peerID) {
  if (!peerConnections[peerID]) return;
  let iceCandidates = JSON.parse(candidates);
  for (const ID in iceCandidates) {
    if (ID == localID) {
      let iceList = iceCandidates[ID];
      for (let i = 0; i < iceList.length; i++) {
        let newIce = new RTCIceCandidate(iceList[i]);
        peerConnections[peerID].pc.addIceCandidate(newIce);
      }
    }
  }
}

function _getTimeInCall() {
  if (Object.keys(peerConnections).length > 0) {
    return (Date.now() - callStartedTime) / 1000;
  } else {
    return 0;
  }
}

function _getConnectionID(peerID) {
  if (peerConnections[peerID]) {
    return peerConnections[peerID].connectionID;
  } else {
    return "No PC object";
  }
}

function getUniqueID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function _setLocalID(id) {
  /*
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  localID = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  */
  localID = id;
}

function _getLocalID() {
  return localID
}

let gatherMediaDeviceIds = LINKS.kify(_gatherMediaDeviceIds);
let checkDevicesGathered = LINKS.kify(_checkDevicesGathered);
let getMediaDeviceIds = LINKS.kify(_getMediaDeviceIds);
let getMediaDeviceLabels = LINKS.kify(_getMediaDeviceLabels);
let checkIfCameraLoaded = LINKS.kify(_checkIfCameraLoaded);
let checkIfMicLoaded = LINKS.kify(_checkIfMicLoaded);
let getCameraReady = LINKS.kify(_getCameraReady);
let getMicReady = LINKS.kify(_getMicReady);
let getAudioOutputs = LINKS.kify(_getAudioOutputs);
let createLocalStreamElement = LINKS.kify(_createLocalStreamElement);
let setAudioOnly = LINKS.kify(_setAudioOnly);
let setLocalID = LINKS.kify(_setLocalID);
let getLocalID = LINKS.kify(_getLocalID);
let setUpPC = LINKS.kify(_setUpPC);
let updateResolution = LINKS.kify(_updateResolution);
let updateConnectionID = LINKS.kify(_updateConnectionID);
let connectionInitiatedWithPeer = LINKS.kify(_connectionInitiatedWithPeer);
let setLocalDescForPC = LINKS.kify(_setLocalDescForPC);
let checkIfLocalDescSetForPC = LINKS.kify(_checkIfLocalDescSetForPC);
let getLocalDescForPC = LINKS.kify(_getLocalDescForPC);
let setRemoteDescForPC = LINKS.kify(_setRemoteDescForPC);
let checkIfRemoteDescSetForPC = LINKS.kify(_checkIfRemoteDescSetForPC);
let checkIfConnectedToPeer = LINKS.kify(_checkIfConnectedToPeer);
let checkIfPCObjectExists= LINKS.kify(_checkIfPCObjectExists);
let oneSecondElapsed = LINKS.kify(_oneSecondElapsed);
let getBegunIceSearch = LINKS.kify(_getBegunIceSearch);
let setBegunIceSearch = LINKS.kify(_setBegunIceSearch);
let disconnectedForSecond = LINKS.kify(_disconnectedForSecond);
let disconnectFromUser = LINKS.kify(_disconnectFromUser);
let collectCandidates = LINKS.kify(_collectCandidates);
let addCandidates = LINKS.kify(_addCandidates);
let getTimeInCall = LINKS.kify(_getTimeInCall);
let getConnectionID = LINKS.kify(_getConnectionID);