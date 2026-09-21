<template>
  <Teleport to="body">
    <Transition name="confirm-popup">
      <div v-if="isOpen" class="confirm-overlay" @click.self="close(false)">
        <section
          class="confirm-dialog"
          :class="`confirm-dialog--${tone}`"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          :aria-describedby="hasDescription ? 'confirm-dialog-description' : undefined"
        >
          <div class="confirm-dialog__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <path d="M12 16.5v.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
              <path d="M10.3 4.1 3.1 17a2 2 0 0 0 1.75 3h14.3a2 2 0 0 0 1.75-3L13.7 4.1a2 2 0 0 0-3.4 0Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />
            </svg>
          </div>

          <h2 id="confirm-dialog-title" class="confirm-dialog__title">{{ title }}</h2>

          <div v-if="hasDescription" id="confirm-dialog-description">
            <p v-if="subtitle" class="confirm-dialog__subtitle">{{ subtitle }}</p>
            <p v-if="note" class="confirm-dialog__note">{{ note }}</p>
          </div>

          <div class="confirm-dialog__actions">
            <button ref="cancelButton" type="button" class="btn btn-ghost" @click="close(false)">
              {{ cancelLabel }}
            </button>
            <button
              type="button"
              class="btn confirm-dialog__confirm"
              :class="tone === 'danger' ? 'btn-danger' : 'confirm-dialog__confirm--warning'"
              @click="close(true)"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useConfirm } from '../composables/useConfirm'

const {
  isOpen,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  tone,
  note,
  close,
} = useConfirm()

const cancelButton = ref(null)
const hasDescription = computed(() => Boolean(subtitle.value || note.value))
let previousOverflow = ''
let previousFocus = null

function onKeydown(event) {
  if (event.key === 'Escape') close(false)
}

watch(isOpen, async (open) => {
  if (open) {
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
    await nextTick()
    cancelButton.value?.focus()
    return
  }

  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', onKeydown)
  previousFocus?.focus?.()
  previousFocus = null
})

onBeforeUnmount(() => {
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: var(--color-overlay);
  backdrop-filter: blur(5px);
}

.confirm-dialog {
  width: min(100%, 22rem);
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 1.25rem;
  background: var(--color-surface-raised);
  box-shadow: var(--shadow-modal);
  text-align: center;
}

.confirm-dialog__icon {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  margin: 0 auto 0.9rem;
  border-radius: 50%;
  background: var(--color-warning-soft);
  color: var(--color-warning-text);
}

.confirm-dialog--danger .confirm-dialog__icon {
  background: color-mix(in srgb, var(--color-danger) 14%, transparent);
  color: var(--color-danger-text);
}

.confirm-dialog__icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.confirm-dialog__title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 1.08rem;
  line-height: 1.35;
}

.confirm-dialog__subtitle,
.confirm-dialog__note {
  margin: 0.5rem 0 0;
  color: var(--color-text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.confirm-dialog__note {
  font-size: 0.78rem;
}

.confirm-dialog__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
  margin-top: 1.2rem;
}

.confirm-dialog__actions .btn {
  min-height: 2.75rem;
  padding-inline: 0.75rem;
  white-space: normal;
}

.confirm-dialog__confirm--warning {
  border-color: var(--color-warning);
  background: var(--color-warning-soft);
  color: var(--color-warning-text);
}

.confirm-popup-enter-active,
.confirm-popup-leave-active {
  transition: opacity 160ms ease;
}

.confirm-popup-enter-active .confirm-dialog,
.confirm-popup-leave-active .confirm-dialog {
  transition: transform 160ms ease, opacity 160ms ease;
}

.confirm-popup-enter-from,
.confirm-popup-leave-to {
  opacity: 0;
}

.confirm-popup-enter-from .confirm-dialog,
.confirm-popup-leave-to .confirm-dialog {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.97);
}

@media (max-width: 360px) {
  .confirm-dialog__actions {
    grid-template-columns: 1fr;
  }
}
</style>
