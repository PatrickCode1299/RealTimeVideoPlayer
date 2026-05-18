<script setup>
import { ref, onMounted } from "vue";

// Props
const videoPlayer = defineProps(["videoUrl"]);

// Reactive state
const isMuted = ref(true);
const currentTime = ref("");
const isPlaying = ref(false);
const progress = ref(0);

// WebRTC variables
let localStream = null;
let peerConnection = null;
let signalingServer = null;

const host = window.location.hostname;

// -----------------------------
// WEBRTC SETUP
// -----------------------------
const initializeWebRTC = async (stream) => {
  if (peerConnection) return;

  peerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  });

  console.log("Initializing WebRTC...");

  // Add tracks
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });

  // ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      signalingServer.send(
        JSON.stringify({
          type: "candidate",
          candidate: event.candidate,
        })
      );
    }
  };

  // Connection state debugging
  peerConnection.onconnectionstatechange = () => {
    console.log(
      "Connection state:",
      peerConnection.connectionState
    );
  };

  // Receive remote stream
  peerConnection.ontrack = (event) => {
    console.log("Remote track received");

    const remoteVideo =
      document.getElementById("remoteVideo");

    if (remoteVideo) {
      remoteVideo.srcObject = event.streams[0];

      remoteVideo
        .play()
        .catch((err) =>
          console.error("Remote video play failed:", err)
        );
    }
  };

  // Create offer
  try {
    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    signalingServer.send(
      JSON.stringify({
        type: "offer",
        offer: peerConnection.localDescription,
      })
    );

    console.log("Offer sent");
  } catch (err) {
    console.error("Offer creation failed:", err);
  }
};

// -----------------------------
// HANDLE SIGNALING
// -----------------------------
const handleMessage = async (data) => {
  if (!peerConnection && data.type !== "offer") {
    console.error("PeerConnection not initialized");
    return;
  }

  try {
    switch (data.type) {
      case "offer": {
        console.log("Received offer");

        if (!peerConnection) {
          peerConnection = new RTCPeerConnection({
            iceServers: [
              {
                urls: "stun:stun.l.google.com:19302",
              },
            ],
          });

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              signalingServer.send(
                JSON.stringify({
                  type: "candidate",
                  candidate: event.candidate,
                })
              );
            }
          };

          peerConnection.ontrack = (event) => {
            const remoteVideo =
              document.getElementById("remoteVideo");

            remoteVideo.srcObject = event.streams[0];

            remoteVideo.play();
          };
        }

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );

        const answer =
          await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        signalingServer.send(
          JSON.stringify({
            type: "answer",
            answer,
          })
        );

        console.log("Answer sent");

        break;
      }

      case "answer": {
        console.log("Received answer");

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );

        break;
      }

      case "candidate": {
        console.log("Received ICE candidate");

        if (data.candidate) {
          await peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }

        break;
      }

      default:
        console.log("Unknown message:", data.type);
    }
  } catch (err) {
    console.error("Signaling error:", err);
  }
};

// -----------------------------
// COMPONENT MOUNT
// -----------------------------
onMounted(async () => {
  const video = document.getElementById("video");

  // WebSocket
  signalingServer = new WebSocket(
    `ws://${host}:8080`
  );

  signalingServer.onopen = () => {
    console.log("Connected to signaling server");
  };

  signalingServer.onmessage = async (message) => {
    try {
      const data =
        typeof message.data === "string"
          ? JSON.parse(message.data)
          : JSON.parse(await message.data.text());

      handleMessage(data);
    } catch (err) {
      console.error("Message parse error:", err);
    }
  };

  // Wait until video is ACTUALLY playing
  video.addEventListener(
    "playing",
    async () => {
      console.log("Video is playing");

      try {
        localStream = video.captureStream();

        console.log(
          "Captured stream:",
          localStream
        );

        console.log(
          "Tracks:",
          localStream.getTracks()
        );

        await initializeWebRTC(localStream);
      } catch (err) {
        console.error(
          "captureStream failed:",
          err
        );
      }
    },
    { once: true }
  );

  // Force playback
  try {
    await video.play();

    isPlaying.value = true;
  } catch (err) {
    console.error("Autoplay failed:", err);
  }
});

// -----------------------------
// CONTROLS
// -----------------------------
const playVideo = async () => {
  const video = document.getElementById("video");

  await video.play();

  isPlaying.value = true;
};

const pauseVideo = () => {
  const video = document.getElementById("video");

  video.pause();

  isPlaying.value = false;
};

const toggleMute = () => {
  const video = document.getElementById("video");

  video.muted = !video.muted;

  isMuted.value = video.muted;
};

const seekVideo = (event) => {
  const video = document.getElementById("video");

  if (!video.duration) return;

  const rect =
    event.target.getBoundingClientRect();

  const offsetX = event.clientX - rect.left;

  const seekTime =
    (offsetX / rect.width) * video.duration;

  video.currentTime = seekTime;

  progress.value =
    (seekTime / video.duration) * 100;
};
</script>

<template>
  <div
    class="block video-player-div relative p-4 border rounded"
  >
    <!-- LOCAL VIDEO -->
    <video
      id="video"
      :src="videoPlayer.videoUrl"
      autoplay
      muted
      playsinline
      controls
      style="width: 100%; height: auto"
    />

    <!-- REMOTE VIDEO -->
    <video
      id="remoteVideo"
      autoplay
      playsinline
      controls
      style="width: 100%; height: auto"
    />

    <!-- CONTROLS -->
    <div
      class="controls flex items-center justify-between mt-2"
    >
      <div>
        <button
          @click="playVideo"
          class="video-btn bg-green-400 text-2xl mx-2"
        >
          ▶
        </button>

        <button
          @click="pauseVideo"
          class="video-btn bg-green-400 text-2xl mx-2"
        >
          ⏸
        </button>
      </div>

      <button
        @click="toggleMute"
        class="video-btn text-2xl mx-2"
      >
        {{ isMuted ? "🔇" : "🔊" }}
      </button>

      <span>{{ currentTime }}</span>
    </div>

    <!-- PROGRESS -->
    <div
      class="progress-bar relative h-3 bg-gray-300 rounded-full mt-2 cursor-pointer"
      @click="seekVideo"
    >
      <div
        class="progress h-full bg-green-500 rounded-full"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.video-player-div {
  max-width: 800px;
  margin: auto;
  background-color: #171717;
}

.video-btn {
  border-radius: 50px;
  padding: 5px 10px;
}
</style>