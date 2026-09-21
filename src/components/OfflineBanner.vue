<template>
  <Transition name="offline-banner">
    <div v-if="!online" class="offline-banner" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18M8.5 8.5A8.8 8.8 0 0 1 20 10M5 10a10.5 10.5 0 0 1 1.2-.9M8.8 13.1a5 5 0 0 1 6.4 0M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span>Sin conexión. Los cambios y el en vivo se actualizarán al volver internet.</span>
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  transform: translateX(-50%);
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--color-warning);
  background: var(--color-warning-soft);
  color: var(--color-warning-text);
  box-shadow: var(--shadow-medium);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
}

.offline-banner svg {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
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
