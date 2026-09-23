<template>
  <Transition name="offline-banner">
    <div v-if="!online" class="offline-banner" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18M8.5 8.5A8.8 8.8 0 0 1 20 10M5 10a10.5 10.5 0 0 1 1.2-.9M8.8 13.1a5 5 0 0 1 6.4 0M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span>Sin conexión. Los cambios y el en vivo se actualizarán al volver internet.</span>
    </div>
    <div v-else-if="hasLoadErrors" class="offline-banner offline-banner--error" role="alert">
      <span>No se pudo cargar parte de la información.</span>
      <button type="button" class="offline-banner__retry" :disabled="retrying" @click="retry">{{ retrying ? 'Cargando…' : 'Reintentar' }}</button>
    </div>
  </Transition>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useLoadErrors } from '../composables/useLoadErrors'

const online = ref(navigator.onLine)
const retrying = ref(false)
const { hasLoadErrors, retryAll } = useLoadErrors()

async function retry() {
  retrying.value = true
  try { await retryAll() } finally { retrying.value = false }
}

function updateOnline() {
  online.value = navigator.onLine
  // Al volver internet, reintentar lo que falló por la caída.
  if (online.value && hasLoadErrors.value) retry()
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

.offline-banner--error {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
  color: var(--color-danger-text);
}

.offline-banner__retry {
  flex-shrink: 0;
  min-height: 32px;
  padding: 4px 12px;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
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
