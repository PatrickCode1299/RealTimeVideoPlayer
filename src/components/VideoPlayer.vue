<script setup>
import { ref, onMounted } from "vue";

// Props to accept the video file
const videoPlayer = defineProps(["videoUrl"]);

// Refs for dynamic values
const isMuted = ref(false);
const currentTime = ref("");
const isPlaying = ref(true);
const progress = ref(0);

// WebRTC setup
let localStream;
let peerConnection;
const signalingServer = new WebSocket("ws://localhost:8080");

// Set up WebRTC and handle controls
const setupWebRTC = () => {
  const video = document.getElementById("video");

  // Ensure the video element is ready
  video.addEventListener("canplay", () => {
  console.log(`Video readyState: ${video.readyState}`);
  if (video.readyState >= 2) { // 2 === HAVE_CURRENT_DATA
    localStream = video.captureStream();
    console.log("Local stream captured", localStream);
    initializeWebRTC(localStream);
  } else {
    console.error("Video not ready to capture stream");
  }
});


  // Handle incoming WebSocket messages
  // Handle incoming WebSocket messages
signalingServer.onmessage = (message) => {
  const data = message.data;

  if (data instanceof Blob) {
    // If the data is a Blob, read its content
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        handleMessage(parsedData);
      } catch (error) {
        console.error('Failed to parse Blob content as JSON:', error);
      }
    };
    reader.readAsText(data);
  } else if (typeof data === "string") {
    // If the data is a string, parse it as JSON directly
    try {
      const parsedData = JSON.parse(data);
      handleMessage(parsedData);
    } catch (error) {
      console.error("Failed to parse WebSocket message as JSON:", error);
    }
  } else {
    console.error("Received an unknown message format:", data);
  }
};

// Handle parsed JSON data
const handleMessage = async (data) => {
  if (!peerConnection) {
    console.error("peerConnection is not initialized.");
    return;
  }

  switch (data.type) {
    case 'offer':
      if (!data.offer || !data.offer.sdp) {
        console.error("Offer missing SDP");
        return;
      }

      const offerDesc = new RTCSessionDescription(data.offer);
      try {
        await peerConnection.setRemoteDescription(offerDesc);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalingServer.send(JSON.stringify({ type: 'answer', answer }));
      } catch (error) {
        console.error('Error during offer handling: ', error);
      }
      break;

    case 'answer':
      if (!data.answer || !data.answer.sdp) {
        console.error("Answer missing SDP");
        return;
      }
      const answerDesc = new RTCSessionDescription(data.answer);
      try {
        await peerConnection.setRemoteDescription(answerDesc);
      } catch (error) {
        console.error('Error during answer handling: ', error);
      }
      break;

    case 'candidate':
      if (data.candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate: ', error);
        }
      }
      break;

    default:
      console.log("Unknown message type: ", data.type);
  }
};

}
// Initialize WebRTC PeerConnection
const initializeWebRTC = (localStream) => {
  if (!peerConnection) {
    peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Add local video tracks to the peer connection
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingServer.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        }));
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const remoteVideo = document.getElementById("remoteVideo");
      if (remoteVideo) {
        remoteVideo.srcObject = remoteStream;
      }
    };

    // Create offer and send to signaling server
    peerConnection.createOffer()
      .then(offer => {
        return peerConnection.setLocalDescription(offer);
      })
      .then(() => {
        signalingServer.send(JSON.stringify({
          type: 'offer',
          offer: peerConnection.localDescription
        }));
      })
      .catch(error => console.error('Error creating offer: ', error));
  }
};

// Utility function for formatting time
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

onMounted(() => {
  const video = document.getElementById("video");
  isPlaying.value = true;

  setupWebRTC();
});

// Video control functions
const playVideo = () => {
  const video = document.getElementById("video");
  isPlaying.value = true;
  video.play();
  document.getElementById("play").style.display = "none";
  document.getElementById("pause").style.display = "block";
};

const pauseVideo = () => {
  const video = document.getElementById("video");
  isPlaying.value = false;
  video.pause();
  document.getElementById("play").style.display = "block";
  document.getElementById("pause").style.display = "none";
};

const toggleMute = () => {
  const video = document.getElementById("video");
  video.muted = !video.muted;
  isMuted.value = video.muted;
};

const seekVideo = (event) => {
  const video = document.getElementById("video");
  if (!video.duration || isNaN(video.duration)) {
    console.error("Video duration is not available yet!");
    return;
  }

  const boundingBox = event.target.getBoundingClientRect();
  const offsetX = event.clientX - boundingBox.left;
  const progressBarWidth = boundingBox.width;
  const seekToTime = (offsetX / progressBarWidth) * video.duration;

  if (isFinite(seekToTime)) {
    video.currentTime = seekToTime;
    progress.value = (seekToTime / video.duration) * 100;
  } else {
    console.error("Invalid seekToTime calculation:", seekToTime);
  }
};
</script>

<template>
  <div class="block video-player-div relative p-4 border rounded">
    <!-- Video Element -->
    <video
      id="video"
      style="width: 100%; height: auto"
      autoplay
      :src="videoPlayer.videoUrl"
    />

    <!-- Remote Video Stream -->
    <video id="remoteVideo" style="display:none; width: 100%; height: auto;"></video>

    <!-- Video Controls -->
    <div class="controls flex items-center justify-between mt-2">
      <!-- Play and Pause Buttons -->
      <div>
        <button id="play" @click="playVideo" class="video-btn bg-green-400 text-2xl mx-2">
          <i class="fa-light fa-play"></i>
        </button>
        <button id="pause" @click="pauseVideo" class="video-btn bg-green-400 text-2xl mx-2">
          <i class="fa-light fa-pause"></i>
        </button>
      </div>

      <!-- Mute Button -->
      <button @click="toggleMute" class="video-btn text-2xl mx-2">
        <i class="fa-light" :class="isMuted ? 'fa-volume-xmark' : 'fa-volume-high'"></i>
      </button>

      <!-- Current Time Display -->
      <span class="current-time text-lg mx-2">{{ currentTime }}</span>
    </div>

    <!-- Progress Bar -->
    <div class="progress-bar relative h-3 bg-gray-300 rounded-full mt-2 cursor-pointer" @click="seekVideo">
      <div class="progress h-full bg-green-500 rounded-full" :style="{ width: `${progress}%` }"></div>
    </div>
  </div>
</template>

<style scoped>
.video-player-div {
  max-width:800px;
  object-fit: cover;
  margin: auto;
  background-color: #171717;
}
.video-btn {
  color: #333;
  transition: color 0.2s ease;
  border-radius:50px;
  padding:5px 5px;
}
.video-btn:hover {
  color: #007bff;
}
.progress-bar {
  position: relative;
}
.progress {
  transition: width 0.2s ease;
}
</style>
