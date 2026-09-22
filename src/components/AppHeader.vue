<template>
  <header class="app-header app-header--compact">
    <button
      class="app-header__menu"
      :class="{ active: menuOpen }"
      :aria-expanded="menuOpen"
      aria-haspopup="dialog"
      aria-controls="app-menu"
      aria-label="Abrir menú"
      @click="$emit('open-menu')"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <div class="app-header__left">
      <div class="app-header__context" aria-label="Espacio activo">
        <img v-if="!band.personalMode && band.currentBand?.avatar_url" :src="band.currentBand.avatar_url" class="app-header__brand-image" alt="">
        <span v-else class="app-header__brand" aria-hidden="true">♪</span>
        <span class="app-header__context-name" :title="band.personalMode ? 'Mi espacio' : band.currentBand?.name || 'Jubal'">
          {{ band.personalMode ? 'Mi espacio' : band.currentBand?.name || 'Jubal' }}
        </span>
      </div>
    </div>
    <RouterLink class="app-header__user" to="/perfil" aria-label="Ver mi perfil">
      <img v-if="avatarUrl" :src="avatarUrl" class="app-header__avatar" alt="">
      <span v-else class="app-header__avatar app-header__avatar--ph">{{ initial }}</span>
    </RouterLink>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useBandStore } from '../stores/band'

const auth = useAuthStore()
const band = useBandStore()
defineProps({ menuOpen: Boolean })
defineEmits(['open-menu'])

const avatarUrl = computed(() => auth.user?.user_metadata?.avatar_url || '')
const initial = computed(() => {
  const n = auth.user?.user_metadata?.full_name || auth.user?.email || '?'
  return n.charAt(0).toUpperCase()
})
</script>

<style scoped>
.app-header__left { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 0; }
.app-header__menu { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 44px; padding: 0; border: 1px solid transparent; border-radius: 12px; background: transparent; color: var(--color-text-secondary); cursor: pointer; }
.app-header__menu svg { width: 24px; height: 24px; }
.app-header__menu:hover, .app-header__menu.active { border-color: var(--color-border); background: var(--color-surface-secondary); color: var(--color-primary); }
.app-header__context { display: flex; align-items: center; gap: 10px; max-width: 100%; min-height: 36px; margin-block: -2px 0; color: var(--color-text-primary); font-size: 14px; font-weight: 700; }
.app-header--compact { min-height: 66px; padding-block: calc(7px + env(safe-area-inset-top)) 7px; }
.app-header--compact .app-header__left { flex: 1; }
.app-header--compact .app-header__context { min-height: 44px; margin-block: 0; font-size: 16px; }
.app-header__context-name { min-width: 0; overflow: hidden; color: var(--color-text-primary); font-family: var(--font-display); font-weight: 600; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.app-header__brand { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; border-radius: 11px; background: var(--color-accent-soft); color: var(--color-accent); font-size: 20px; }
.app-header__brand-image { width: 36px; height: 36px; flex: 0 0 36px; display: block; border: 1px solid var(--color-border); border-radius: 11px; background: var(--color-surface-secondary); object-fit: cover; }
.app-header__user { flex-shrink: 0; border-radius: 50%; text-decoration: none; }
.app-header__avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; display: block; border: 1px solid var(--color-border); }
.app-header__avatar--ph { display: grid; place-items: center; background: var(--color-primary-soft); color: var(--color-primary); font-weight: 800; }
</style>
