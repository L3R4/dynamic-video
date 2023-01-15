let peerUuids = {};
let imgURL = "";
const adjectives = ["Excited", "Anxious", "Demonic", "Jumpy", 
                   "Misunderstood", "Squashed", "Gargantuan","Broad", "Crooked", 
                   "Curved", "Deep", "Even", "Impartial", "Certain", "Eight", 
                   "Grubby", "Wiry", "Half", "Merciful", "Uppity", 
                   "Ahead", "Rainy", "Sunny", "Boorish", "Spiffy", "Flat", "Hilly", 
                   "Jagged", "Round", "Shallow", "Square", "Steep", "Straight", 
                   "Thick", "Thin", "Cooing", "Deafening", "Faint", "Harsh", 
                   "High-pitched", "Hissing", "Hushed", "Husky", "Loud", "Melodic", 
                   "Moaning", "Mute", "Noisy", "Purring", "Quiet", "Raspy", 
                   "Screeching", "Shrill", "Silent", "Soft", "Squeaky", "Squealing", 
                   "Thundering", "Voiceless", "Whispering", "Stupid", "Dumb", 
                   "Lovely", "Horrid", "Weird", "Flabby", "Silly", "Mup", "Blab", 
                   "Green", "Blue", "Yelly", "Pure", "Maroon", "Flump", "Flob", 
                   "Red", "Poop", "Sloop", "Fyip", "Gymby", "Stapid", "Mallop",
                   "Vexing", "Aback", "Scared", "Wimp", "Weakly", "Intery", "Massive", 
                   "Party", "Teensy", "Meany", "Malder", "Coper", "Seether", "Crap",
                   "OOTW", "GOAT", "Overweight"];

function _getName(id) {
  return adjectives[id-1];
}

function _checkLocalVidExists() {
  const localVid = document.getElementById('localVideoDiv');
  return !!localVid ? true : false;
}

function arrangeVideoDivs() {
  let multiplier = 0;
  for (uuid in peerUuids) {
    let divElement = document.getElementById('remoteVideo_' + uuid + 'Div');
    divElement.setAttribute('style', 'position: absolute; top: 20%; transform: translate(-50%, -50%); left: ' + (20 + (12*multiplier)).toString() + '%;');
    multiplier += 1;
  }
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
  if (local) {
    divElement.setAttribute('class', 'cameraMode');
    newLocalVid.muted = true;
  }
  divElement.appendChild(newLocalVid);
  document.body.appendChild(divElement);
  document.body.removeChild(localVid);
  arrangeVideoDivs();
}

function _addAudio(id) {
  const divElement = document.createElement('div');
  divElement.setAttribute('id', 'remoteAudio_' + id + 'Div');
  const localAud = document.getElementById('remoteAudio_' + id + 'Temp')
  const newLocalAud = document.createElement('audio');
  newLocalAud.setAttribute('id', id);
  newLocalAud.setAttribute('autoplay', 'true');
  newLocalAud.srcObject = localAud.srcObject;
  divElement.appendChild(newLocalAud);
  document.body.appendChild(divElement);
  document.body.removeChild(localAud);
}

function _displayLiveStream(id) {
  if (id == 0 && !!document.getElementById('localVideoTemp') && !document.getElementById('localVideoDiv')) {
    appendVidToDiv('localVideo', true);
  } else if (id != 0 && !!document.getElementById('remoteVideo_' + id + 'Temp') && !document.getElementById('remoteVideo_' + id + 'Div')){
    _addPeerToList(id);
    appendVidToDiv('remoteVideo_' + id, false);
  }
}

function _displayedPeerStream(id) {
  const peerVidDiv = document.getElementById('remoteVideo_' + id + 'Div');
  const peerAudDiv = document.getElementById('remoteAudio_' + id + 'Div');
  if (!!peerVidDiv || !!peerAudDiv) {
    return true;
  } else {
    return false;
  }
}

function _removePeerVideoDiv(peerUuid) {
  let div = document.getElementById('remoteVideo_' + peerUuid + 'Div');
  let div2 = document.getElementById('remoteVideo_' + peerUuid + 'Temp');
  if (div) {
    document.body.removeChild(div);
    delete peerUuids[peerUuid];
    arrangeVideoDivs();
  } else if (div2) {
    document.body.removeChild(div2);
  }
}

function _removePeerAudioDiv(peerUuid) {
  let div = document.getElementById('remoteAudio_' + peerUuid + 'Div');
  let div2 = document.getElementById('remoteAudio_' + peerUuid + 'Temp');
  if (div) {
    document.body.removeChild(div);
    delete peerUuids[peerUuid];
  } else if (div2) {
    document.body.removeChild(div2);
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

function _getSelectedOptions() {
  let selectElementCam = document.getElementById("selectCamera");
  let selectElementMic = document.getElementById("selectMic");
  let indexCam = selectElementCam.selectedIndex;
  let indexMic = selectElementMic.selectedIndex;
  let camId = selectElementCam.options[indexCam].value;
  let micId = selectElementMic.options[indexMic].value;
  let deviceIds = null;
  deviceIds = cons(camId, deviceIds);
  deviceIds = cons(micId, deviceIds);
  return deviceIds;
}

function _addPeerToList(uuid) {
  peerUuids[uuid] = uuid;
}

let addAudio = LINKS.kify(_addAudio);
let displayLiveStream = LINKS.kify(_displayLiveStream);
let displayedPeerStream = LINKS.kify(_displayedPeerStream);
let removePeerVideoDiv = LINKS.kify(_removePeerVideoDiv);
let removePeerAudioDiv = LINKS.kify(_removePeerAudioDiv);
let takePicture = LINKS.kify(_takePicture);
let getPictureURL = LINKS.kify(_getPictureURL);
let displayIcon = LINKS.kify(_displayIcon);
let getSelectedOptions = LINKS.kify(_getSelectedOptions);
let addPeerToList = LINKS.kify(_addPeerToList);
let getName = LINKS.kify(_getName);
let checkLocalVidExists = LINKS.kify(_checkLocalVidExists);