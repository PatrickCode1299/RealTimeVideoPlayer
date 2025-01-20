<script setup>
import { ref } from "vue";
import VideoPlayer from "./VideoPlayer.vue";
const videoFile = ref(null);
const videoUrl = ref(null);

const setVideo = (e) => {
  const file = e.target.files[0];

  if (file && file.type.startsWith("video/")) {
    videoFile.value = file;
    videoUrl.value = URL.createObjectURL(file);
  } else {
    console.warn("Please select a valid video file.");
  }
};

const uploadVideo = (e) => {
  e.preventDefault();
  if (videoFile.value) {
    console.log("Uploading video file:", videoFile.value);
  } else {
    console.warn("No video file selected.");
  }
};

const launchFile = () => {
  let video = document.getElementById("video");
  video.click();
};
</script>

<template>
  <div v-if="videoFile === null" class="video-selector block">
    <div class="flex launch-video-player">
      <h4 class="font-bold m-4">Upload a Video File to Start</h4>
      <span @click="launchFile" class="text-5xl cursor-pointer"
        ><i class="fa-light fa-cloud-arrow-up"></i
      ></span>
      <form @submit="uploadVideo">
        <input
          @change="setVideo"
          class="hidden"
          type="file"
          name="video"
          accept="video/*"
          id="video"
        />
        <button type="submit" class="text-xl m-4 launch-btn cursor-pointer bg-green-400">
          Start Watching
        </button>
      </form>
    </div>
  </div>
  <div v-else id="video-container">
    <VideoPlayer
      v-if="videoUrl != null || videoUrl != 'null' || videoUrl != undefined"
      :videoUrl="videoUrl"
    />
  </div>
</template>

<style scoped></style>
