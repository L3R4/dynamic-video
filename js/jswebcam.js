function _attachWebCam(vidID) {
  const constraints = {
    video: true,
    audio: true,
  };
  const videoElement = document.querySelector('video#' + vidID);
  async function getWebCam() {
    try {
      videoElement.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
    } catch(error) {
      console.error('Error opening video camera.', error);
    }
  }
  getWebCam();
}

var attachWebCam = LINKS.kify(_attachWebCam);
