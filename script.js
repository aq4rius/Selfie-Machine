import vision from "https://cdn.skypack.dev/@mediapipe/tasks-vision@latest";
const { GestureRecognizer, FilesetResolver } = vision;

const cameraSection = document.getElementById("container");
let gestureRecognizer;
let runningMode = "image";
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "648px";
const videoWidth = "846px";

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function runRecognition() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "gesture_recognizer.task",
    },
    runningMode: runningMode,
    numHands: 1,
  });
  cameraSection.classList.remove("invisible");
}
runRecognition();

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam() {
  if (!gestureRecognizer) {
    alert("Please wait for gestureRecognizer to load");
    return;
  }

  webcamRunning = true;

  // getUsermedia parameters.
  const constraints = {
    video: true,
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let gestureRecognitionPaused = false;
let snapshotTaken = false;

async function predictWebcam() {
  const webcamElement = document.getElementById("webcam");
  // Now let's start detecting the stream.
  if (runningMode === "image") {
    runningMode = "video";
    gestureOutput.style.display = "block";
    gestureOutput.style.width = videoWidth;
    gestureOutput.innerText = "Make a closed fist gesture to TAKE A PHOTO";
    await gestureRecognizer.setOptions({ runningMode: runningMode });
  }
  let nowInMs = Date.now();
  const results = await gestureRecognizer.recognizeForVideo(video, nowInMs);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasElement.style.height = videoHeight;
  webcamElement.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  webcamElement.style.width = videoWidth;
  cameraSection.style.height = videoHeight;
  cameraSection.style.width - videoWidth;

  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "red",
        lineWidth: 2,
      });
      drawLandmarks(canvasCtx, landmarks, { color: "green", lineWidth: 2 });
    }
  }
  canvasCtx.restore();

  if (results.gestures.length > 0 && !gestureRecognitionPaused) {
    gestureOutput.innerText = "Make a closed fist gesture to TAKE A PHOTO";
    if (results.gestures[0][0].categoryName == "Closed_Fist") {
      takeSelfie(3);
      gestureRecognitionPaused = true;
      setTimeout(() => {
        gestureRecognitionPaused = false;
      }, 3000);
    } else if (results.gestures[0][0].categoryName == "Thumb_Down") {
      gestureRecognitionPaused = true;
      setTimeout(() => {
        gestureRecognitionPaused = false;
      }, 3000);
      if (snapshotTaken) {
        snapshotTaken = false;
        document.getElementById("snapshot").remove();
        video.style.display = "block";
        canvasElement.style.display = "block";
      } else {
        gestureOutput.innerText = "No selfie taken";
      }
    } else if (results.gestures[0][0].categoryName == "Thumb_Up") {
      gestureRecognitionPaused = true;
      setTimeout(() => {
        gestureRecognitionPaused = false;
      }, 3000);
      if (snapshotTaken) {
        snapshotTaken = false;
        const snapshot = document.getElementById("snapshot").src;
        downloadSnapshot(snapshot);
        document.getElementById("snapshot").remove();
        video.style.display = "block";
        canvasElement.style.display = "block";
      } else {
        gestureOutput.innerText = "No selfie taken, nothing to download";
      }
    }
  }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

// countdown function
const takeSelfie = (seconds) => {
  const interval = setInterval(() => {
    gestureOutput.innerText = `Selfie in (${seconds})`;
    seconds--;
    if (seconds < 0) {
      clearInterval(interval);
      gestureOutput.innerText =
        "Thumb up to download or Thumb down to try again";
      if (snapshotTaken) {
        alert("selfie already taken");
      } else {
        snapshotTaken = true;
        const snapshot = takeSnapshot();
        video.style.display = "none";
        canvasElement.style.display = "none";
        const img = document.createElement("img");
        img.id = "snapshot";
        img.src = snapshot;
        cameraSection.appendChild(img);
      }
    }
  }, 1000);
};

const takeSnapshot = () => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 846;
  canvas.height = 648;
  context.scale(-1, 1); // flip horizontally
  context.drawImage(video, 0, 0, -canvas.width, canvas.height); // negative width parameter will draw the image flipped horizontally
  video.style.display = "none";
  canvasElement.style.display = "block";
  gestureOutput.style.display = "block";
  return canvas.toDataURL("image/png");
};

// download the snapshot
const downloadSnapshot = (snapshot) => {
  const link = document.createElement("a");
  link.href = snapshot;
  link.download = "selfie.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
};
