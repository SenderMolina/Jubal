import { ref } from 'vue'

const isOpen   = ref(false)
const title    = ref('')
const subtitle = ref('')
let resolveFn  = null

export function useConfirm() {
  function confirm(t, s = '') {
    title.value    = t
    subtitle.value = s
    isOpen.value   = true
    return new Promise(resolve => { resolveFn = resolve })
  }

  function close(result) {
    isOpen.value = false
    resolveFn?.(result)
  }

  return { isOpen, title, subtitle, confirm, close }
}
