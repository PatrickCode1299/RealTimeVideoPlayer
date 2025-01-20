// router/index.js

import { createRouter, createWebHistory } from 'vue-router';

import App from "../App.vue"
import Watch from "../components/Watch.vue"
import StartVideo from '../components/StartVideo.vue';


const routes = [
  {
    path: '/',
    name: 'home',
    component:StartVideo,
  },
  
  {
    path: '/watch',
    name: 'watch',
    component: Watch,
  },
 
  // Add more routes here...
];

// Create the router instance
const router = createRouter({
  history: createWebHistory(), // Use history mode for clean URLs
  routes, // Your routes array
});

export default router;
