<template>
  <RouterLink v-if="show" to="/live" class="live-banner">
    <span class="live-banner__dot"></span>
    <strong>EN VIVO</strong>
    <span>Unirse</span>
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
  border: 1px solid var(--color-danger);
  background: var(--color-surface-raised); color: var(--color-text-primary); font-weight: 700; font-size: .9rem;
  text-decoration: none; box-shadow: var(--shadow-medium);
}
.live-banner strong { color: var(--color-danger); font-size: .75rem; letter-spacing: .08em; }
.live-banner__dot { width: 9px; height: 9px; border-radius: 50%; background: var(--color-danger); animation: lb 1.3s infinite; }
@keyframes lb { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
</style>
