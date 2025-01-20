<script setup>
// Import components for use (If needed in your template later)
import Header from "./Header.vue";
import LaunchPlayer from "./LaunchPlayer.vue";
</script>

<template>
 <Header />
 <LaunchPlayer />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
