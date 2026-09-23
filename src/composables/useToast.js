import { ref } from 'vue'
import { errorMessage } from '../utils/errors'

// Estado a nivel de módulo: un solo toast compartido por toda la app.
const message = ref('')
const visible = ref(false)
const tone = ref('success') // 'success' | 'error'
let timer = null

function show(msg, nextTone) {
  message.value = msg
  tone.value = nextTone
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { visible.value = false }, nextTone === 'error' ? 4000 : 2500)
}

function showToast(msg) { show(msg, 'success') }

function showError(error, fallback) {
  console.error(error)
  show(errorMessage(error, fallback), 'error')
}

// Ejecuta una acción de escritura con el patrón estándar: toast de éxito
// (opcional) o de error. Devuelve true si la acción terminó bien.
async function attempt(action, { success, error: fallback } = {}) {
  try {
    await action()
    if (success) showToast(success)
    return true
  } catch (reason) {
    showError(reason, fallback)
    return false
  }
}

export function useToast() {
  return { message, visible, tone, showToast, showError, attempt }
}
