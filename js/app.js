let peerUuids = {};
let imgURL = "";

function arrangeVideoDivs() {

}

function appendVidToDiv(id, local) {
  let divElement = document.createElement('div');
  divElement.setAttribute('id', id + 'Div');
  let localVid = document.getElementById(id + 'Temp');
  let newLocalVid = document.createElement('video');
  newLocalVid.setAttribute('id', id);
  newLocalVid.setAttribute('class', 'webcam');
  newLocalVid.setAttribute('autoplay', 'true');
  newLocalVid.srcObject = localVid.srcObject;
  if (local) newLocalVid.muted = true;
  divElement.appendChild(newLocalVid);
  if (local) {
    let joinBox = document.getElementById('joinBox');
    if (joinBox) {
      joinBox.appendChild(divElement);
    }
  } else {
    let canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.appendChild(divElement);
    }
  }
}

function _moveLocalVideo() {
  let canvas = document.getElementById('canvas');
  if (canvas) {
    let videoDiv = document.getElementById('localVideoDiv');
    canvas.appendChild(videoDiv);
  }
}

function _displayLiveStream(id) {
  if (id == "local" && !document.getElementById('localVideoDiv')) {
    appendVidToDiv('localVideo', true);
  } else if (id != "local" && !document.getElementById('remoteVideo_' + id + 'Div')){
    if (document.getElementById('remoteVideo_' + id + 'Temp')) {
      appendVidToDiv('remoteVideo_' + id, false);
    }
  }
}

function _removePeerVideoDiv(peerUuid) {
  let div = document.getElementById('remoteVideo_' + peerUuid + 'Div');
  if (div) {
    document.getElementById('canvas').removeChild(div);
    delete peerUuids[peerUuid];
  }
}

function _takePicture() {
  let video = document.getElementById('localVideo');
  let canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  imgURL = canvas.toDataURL();
}

function _getPictureURL() {
  return imgURL;
}

function _displayIcon(uuid, imageURL, x, y) {
  if (!document.getElementById('iconDiv' + uuid)) {
    let icon = document.createElement('img');
    icon.setAttribute('id', 'iconImg' + uuid);
    let iconDiv = document.createElement('div');
    iconDiv.setAttribute('id', 'iconDiv' + uuid);
    iconDiv.setAttribute('class', 'crop');
    iconDiv.setAttribute('style', 'left: ' + x + 'px;top: ' + y + 'px;position: absolute;width: 150px; height: 150px; border-radius: 50%;');
    icon.src = imageURL;
    iconDiv.appendChild(icon);
    document.body.appendChild(iconDiv);
  } else {
    let iconDiv = document.getElementById('iconDiv' + uuid);
    iconDiv.setAttribute('style', 'left: ' + x + 'px;top: ' + y + 'px;position: absolute;width: 150px; height: 150px; border-radius: 50%;');
  }
}

function _addPeerToList(uuid) {
  peerUuids[uuid] = uuid;
}

let displayLiveStream = LINKS.kify(_displayLiveStream);
let moveLocalVideo = LINKS.kify(_moveLocalVideo);
let removePeerVideoDiv = LINKS.kify(_removePeerVideoDiv);
let takePicture = LINKS.kify(_takePicture);
let getPictureURL = LINKS.kify(_getPictureURL);
let displayIcon = LINKS.kify(_displayIcon);
let addPeerToList = LINKS.kify(_addPeerToList);
