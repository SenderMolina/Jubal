<template>
  <RouterLink v-if="show" to="/live" class="live-banner">
    <span class="live-banner__dot"></span>
    <span>En vivo — Unirse</span>
  </RouterLink>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLiveStore } from '../stores/live'

const live  = useLiveStore()
const route = useRoute()
const show = computed(() => live.isActive && !route.path.startsWith('/live'))
</script>

<style scoped>
.live-banner {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 78px; z-index: 300;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 999px;
  background: var(--red); color: #fff; font-weight: 700; font-size: .9rem;
  text-decoration: none; box-shadow: var(--shadow-hover);
}
.live-banner__dot { width: 9px; height: 9px; border-radius: 50%; background: #fff; animation: lb 1.3s infinite; }
@keyframes lb { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
</style>
