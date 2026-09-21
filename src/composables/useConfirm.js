import { ref } from 'vue'

const isOpen = ref(false)
const title = ref('')
const subtitle = ref('')
const confirmLabel = ref('Confirmar')
const cancelLabel = ref('Cancelar')
const tone = ref('warning')
const note = ref('')
let resolveFn = null

export function useConfirm() {
  function confirm(t, s = '', options = {}) {
    if (typeof s === 'object') {
      options = s
      s = options.subtitle || ''
    }

    if (resolveFn) resolveFn(false)

    const destructive = /eliminar|quitar|revocar|borrar/i.test(t)

    title.value = t
    subtitle.value = s
    confirmLabel.value = options.confirmLabel || (destructive ? 'Eliminar' : 'Confirmar')
    cancelLabel.value = options.cancelLabel || 'Cancelar'
    tone.value = options.tone || (destructive ? 'danger' : 'warning')
    note.value = options.note ?? (destructive ? 'Esta acción no se puede deshacer.' : '')
    isOpen.value = true
    return new Promise(resolve => { resolveFn = resolve })
  }

  function close(result) {
    if (!isOpen.value) return

    isOpen.value = false
    const resolve = resolveFn
    resolveFn = null
    resolve?.(result)
  }

  return {
    isOpen,
    title,
    subtitle,
    confirmLabel,
    cancelLabel,
    tone,
    note,
    confirm,
    close,
  }
}
