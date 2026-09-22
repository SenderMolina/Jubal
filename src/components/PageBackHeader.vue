<template>
  <header class="page-back-header">
    <RouterLink v-if="to" class="page-back-header__back" :to="to" :aria-label="backLabel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </RouterLink>
    <button v-else class="page-back-header__back" type="button" :aria-label="backLabel" @click="$emit('back')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </button>

    <div class="page-back-header__copy">
      <span>{{ eyebrow }}</span>
      <h1 :id="titleId">{{ title }}</h1>
    </div>
  </header>
</template>

<script setup>
defineProps({
  backLabel: { type: String, default: 'Volver' },
  eyebrow: { type: String, required: true },
  title: { type: String, required: true },
  titleId: { type: String, default: undefined },
  to: { type: [String, Object], default: null },
})
defineEmits(['back'])
</script>

<style scoped>
.page-back-header { width: 100%; display: grid; grid-template-columns: 44px minmax(0, 1fr); align-items: center; justify-content: initial; gap: 14px; margin: -8px 0 24px; padding: 0; border: 0; background: transparent; }
.page-back-header__back { width: 44px; height: 44px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 12px; background: transparent; color: var(--color-text-secondary); cursor: pointer; transition: background-color var(--motion-fast) ease, color var(--motion-fast) ease, transform var(--motion-fast) ease; }
.page-back-header__back svg { width: 29px; height: 29px; display: block; }
.page-back-header__back:hover { background: var(--color-surface-secondary); color: var(--color-primary); }
.page-back-header__back:active { transform: scale(.94); }
.page-back-header__copy { min-width: 0; }
.page-back-header__copy span { display: block; margin-bottom: 4px; color: var(--color-accent); font-size: 11px; font-weight: 900; letter-spacing: .08em; line-height: 1.2; text-transform: uppercase; }
.page-back-header__copy h1 { margin: 0; overflow-wrap: anywhere; color: var(--color-text-primary); font-family: var(--font-display); font-size: 24px; line-height: 1.18; }
@media (prefers-reduced-motion: reduce) { .page-back-header__back { transition: none; } }
</style>
