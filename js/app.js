let localVidAppended = false;

function _appendVidToDiv(id) {
  if (id == "local" && localVidAppended == false) {
    let divElement = document.createElement('div');
    divElement.setAttribute('id', 'localVideoDiv');
    let localVid = document.getElementById('localVideoTemp');
    let newLocalVid = document.createElement('video');
    newLocalVid.setAttribute('id', 'localVideo');
    newLocalVid.setAttribute('class', 'webcam');
    newLocalVid.setAttribute('autoplay', 'true');
    newLocalVid.muted = true;
    newLocalVid.srcObject = localVid.srcObject;
    divElement.appendChild(newLocalVid);
    document.body.appendChild(divElement);
    document.body.removeChild(localVid);
    localVidAppended = true;
  }
}

function _toggleCam(id, mode) {
  let elem = document.getElementById("remoteVideo_" + id);
  let vid = document.getElementById(id);
  if (mode == "show") {
    elem.style.display = "block";
    vid.play();
  } else {
    elem.style.display = "none";
    vid.pause();
  }
}

let appendVidToDiv = LINKS.kify(_appendVidToDiv);
let toggleCam = LINKS.kify(_toggleCam);
