<template>
  <h1>Viewer Page</h1>
  <video id="remoteVideo" width="600" controls></video>
</template>

<script setup>
import { onMounted } from "vue";

let peerConnection;
let signalingServer;
let remoteVideo; // Declare remoteVideo for use later

onMounted(() => {
  // Access DOM elements only after the component has mounted
  remoteVideo = document.getElementById("remoteVideo");
  
  signalingServer = new WebSocket("ws://localhost:8080");
  
  let remoteDescriptionSet = false; // Track whether the remote description is set
  
  // Setup peer connection
  peerConnection = new RTCPeerConnection();
  
  // Handle incoming video streams from the streamer
  peerConnection.ontrack = (event) => {
    const remoteStream = event.streams[0];
    if (remoteVideo) {
      remoteVideo.srcObject = remoteStream;
    } else {
      console.error("Remote video element not found");
    }
  };
  
  // Handle incoming ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // Send ICE candidate only when remote description is set
      if (remoteDescriptionSet) {
        signalingServer.send(
          JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          })
        );
      }
    }
  };
  
  // Handle incoming messages from the signaling server (offer/answer)
  signalingServer.onmessage = async (message) => {
    let data;
    if (message.data instanceof Blob) {
      // Handle Blob data
      const reader = new FileReader();
      reader.onload = () => {
        try {
          data = JSON.parse(reader.result);
          handleSignalingMessage(data);
        } catch (error) {
          console.error("Failed to parse signaling message as JSON:", error);
        }
      };
      reader.readAsText(message.data);
    } else {
      // Handle string (JSON) data
      try {
        data = JSON.parse(message.data);
        handleSignalingMessage(data);
      } catch (error) {
        console.error("Failed to parse message data as JSON:", error);
      }
    }
  };

  // Function to handle the signaling message based on type
  const handleSignalingMessage = async (data) => {
    try {
      if (data.type === "offer") {
        const desc = new RTCSessionDescription(data.offer);
        await peerConnection.setRemoteDescription(desc);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        remoteDescriptionSet = true; // Ensure remote description is tracked
        signalingServer.send(
          JSON.stringify({
            type: "answer",
            answer,
          })
        );
      }

      if (data.type === "answer") {
        const desc = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(desc);
        remoteDescriptionSet = true;
      }

      if (data.type === "candidate") {
        const candidate = new RTCIceCandidate(data.candidate);
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error("Error during WebRTC signaling:", error);
    }
  };
  
  signalingServer.onopen = () => {
    console.log("Connected to WebSocket signaling server");
  };
});
</script>

<style scoped></style>
