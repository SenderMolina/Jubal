import { ref } from 'vue'

// Module-level state shared across all imports
const message = ref('')
const visible = ref(false)
let timer = null

export function useToast() {
  function showToast(msg) {
    message.value = msg
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { visible.value = false }, 2500)
  }

  return { message, visible, showToast }
}
