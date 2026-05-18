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
      <h4 @click="launchFile" class="font-bold text-center cursor-pointer m-4">Upload a Video File to Start
          <span style="color:white; font-weight:bold;"  class="text-5xl text-white font-bold cursor-pointer"
        ><i class="fa fa-youtube-play"></i
      ></span></h4>
    
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
