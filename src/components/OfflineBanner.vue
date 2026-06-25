<template>
  <Transition name="offline-banner">
    <div v-if="!online" class="offline-banner" role="status" aria-live="polite">
      Sin conexión. Los cambios y el en vivo se actualizarán al volver internet.
    </div>
  </Transition>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const online = ref(navigator.onLine)

function updateOnline() {
  online.value = navigator.onLine
}

onMounted(() => {
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
})
</script>

<style scoped>
.offline-banner {
  position: fixed;
  left: 50%;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  z-index: 800;
  width: min(420px, calc(100vw - 28px));
  transform: translateX(-50%);
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--c-ink);
  color: #fff;
  box-shadow: 0 8px 24px rgba(var(--ink-rgb), 0.18);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
}

.offline-banner-enter-active,
.offline-banner-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.offline-banner-enter-from,
.offline-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (prefers-reduced-motion: reduce) {
  .offline-banner-enter-active,
  .offline-banner-leave-active {
    transition: none;
  }
}
</style>
