<template>
  <header class="app-header" :class="{ 'app-header--compact': !showPageTitle }">
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
        <span>{{ band.personalMode ? 'Mi espacio' : band.currentBand?.name || 'Jubal' }}</span>
      </div>
      <h1 v-if="showPageTitle" class="app-header__title">{{ pageTitle }}</h1>
    </div>
    <RouterLink class="app-header__user" to="/perfil" aria-label="Ver mi perfil">
      <img v-if="avatarUrl" :src="avatarUrl" class="app-header__avatar" alt="">
      <span v-else class="app-header__avatar app-header__avatar--ph">{{ initial }}</span>
    </RouterLink>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBandStore } from '../stores/band'

const route = useRoute()
const auth = useAuthStore()
const band = useBandStore()
defineProps({ menuOpen: Boolean })
defineEmits(['open-menu'])

const mainMenuPaths = new Set([
  '/inicio',
  '/practica',
  '/actividades',
  '/repertorio',
  '/canciones',
  '/entrenar',
  '/rutina',
])
const showPageTitle = computed(() => !mainMenuPaths.has(route.path))

const pageTitle = computed(() => {
  if (route.meta.title) return route.meta.title
  const path = route.path
  if (path.startsWith('/inicio')) return 'Banda'
  if (path.startsWith('/practica')) return 'Práctica'
  if (path.startsWith('/actividades') || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/configuracion')) return 'Configuraciones'
  if (path.startsWith('/banda')) return 'Administrar banda'
  if (path.startsWith('/perfil')) return 'Perfil'
  if (path.startsWith('/entrenar') || path.startsWith('/skill/')) return 'Mis objetivos'
  if (path.startsWith('/estadisticas')) return 'Mi progreso'
  if (path.startsWith('/rutina')) return 'Rutina'
  if (path.startsWith('/metronomo')) return 'Metrónomo'
  if (path.startsWith('/agregar')) return 'Canciones'
  return 'Jubal'
})

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
.app-header__context { display: flex; align-items: center; gap: 7px; max-width: 100%; min-height: 24px; margin-block: -2px 0; color: var(--color-text-muted); font-size: 12px; }
.app-header--compact { min-height: 66px; padding-block: calc(7px + env(safe-area-inset-top)) 7px; }
.app-header--compact .app-header__left { flex: 1; }
.app-header--compact .app-header__context { min-height: 44px; margin-block: 0; font-size: 13px; }
.app-header__context > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-header__brand { color: var(--color-accent); font-size: 20px; }
.app-header__brand-image { width: 24px; height: 24px; flex: 0 0 24px; border-radius: 7px; object-fit: cover; }
.app-header__user { flex-shrink: 0; border-radius: 50%; text-decoration: none; }
.app-header__avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; display: block; border: 1px solid var(--color-border); }
.app-header__avatar--ph { display: grid; place-items: center; background: var(--color-primary-soft); color: var(--color-primary); font-weight: 800; }
</style>
