function _displayWebCam(uuid) {
  let vidElement = document.createElement('video');
  vidElement.setAttribute('id', uuid);
  
}

let displayWebCam = LINKS.kify(_displayWebCam);

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

let toggleCam = LINKS.kify(_toggleCam);
