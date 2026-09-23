import { computed, reactive } from 'vue'

// Registro global de cargas fallidas: clave → función para reintentar.
// Los stores (y las vistas que cargan datos propios) reportan aquí; el
// OfflineBanner muestra el aviso con "Reintentar".
const failures = reactive(new Map())

export function reportLoadError(key, error, retry) {
  console.error(`Error cargando ${key}:`, error)
  failures.set(key, retry)
}

export function clearLoadError(key) {
  failures.delete(key)
}

async function retryAll() {
  const pending = [...failures.entries()]
  failures.clear()
  // Cada reintento vuelve a reportar si falla otra vez.
  await Promise.allSettled(pending.map(([, retry]) => retry?.()))
}

export function useLoadErrors() {
  return { hasLoadErrors: computed(() => failures.size > 0), retryAll }
}
