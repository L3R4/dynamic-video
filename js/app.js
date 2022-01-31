let localVidAppended = false;
let remoteVidsAppended = {};
let imgURL = "";

function _appendVidToDiv(id) {
  if (id == "local" && localVidAppended == false) {
    let divElement = document.createElement('div');
    divElement.setAttribute('id', 'localVideoDiv');
    let localVid = document.getElementById('localVideoTemp');
    let newLocalVid = document.createElement('video');
    newLocalVid.setAttribute('id', 'localVideo');
    newLocalVid.setAttribute('class', 'webcam');
    newLocalVid.setAttribute('autoplay', 'true');
    newLocalVid.srcObject = localVid.srcObject;
    newLocalVid.muted = true;
    divElement.appendChild(newLocalVid);
    document.getElementById('videos').appendChild(divElement);
    localVidAppended = true;
  } else if (id != "local" && remoteVidsAppended[id] == null){
    if (document.getElementById('remoteVideoTemp_' + id)) {
      let divElement = document.createElement('div');
      divElement.setAttribute('id', 'remoteVideoDiv_' + id);
      let remoteVid = document.getElementById('remoteVideoTemp_' + id);
      let newRemoteVid = document.createElement('video');
      newRemoteVid.setAttribute('id', 'remoteVideo_' + id);
      newRemoteVid.setAttribute('class', 'webcam');
      newRemoteVid.setAttribute('autoplay', 'true');
      newRemoteVid.srcObject = remoteVid.srcObject;
      divElement.appendChild(newRemoteVid);
      document.getElementById('videos').appendChild(divElement);
      remoteVidsAppended[id] = true;
    }
  }
}

function _removePeerVideoDiv(peerUuid) {
  let div = document.getElementById('remoteVideoDiv_' + peerUuid);
  if (div) {
    document.getElementById('videos').removeChild(div);
    delete remoteVidsAppended[peerUuid];
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

let appendVidToDiv = LINKS.kify(_appendVidToDiv);
let removePeerVideoDiv = LINKS.kify(_removePeerVideoDiv);
let takePicture = LINKS.kify(_takePicture);
let getPictureURL = LINKS.kify(_getPictureURL);
let displayIcon = LINKS.kify(_displayIcon);
