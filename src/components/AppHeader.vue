<template>
  <header class="app-header">
    <div class="app-header__left">
      <button class="app-header__context" :aria-expanded="menuOpen" aria-haspopup="dialog" aria-controls="app-menu" aria-label="Cambiar espacio o abrir menú" @click="$emit('open-menu')">
        <span class="app-header__brand" aria-hidden="true">♪</span>
        <span>{{ band.personalMode ? 'Mi espacio' : band.currentBand?.name || 'Jubal' }}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      <h1 class="app-header__title">{{ pageTitle }}</h1>
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

const pageTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/inicio')) return 'Banda'
  if (path.startsWith('/practica')) return 'Práctica'
  if (path.startsWith('/actividades') || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/tipos')) return 'Tipos'
  if (path.startsWith('/banda')) return 'Banda'
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
.app-header__context { display: flex; align-items: center; gap: 7px; max-width: 100%; min-height: 44px; margin-block: -8px -2px; border: 0; background: transparent; color: var(--text-muted); font-size: 12px; cursor: pointer; }
.app-header__context > span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-header__context svg { width: 16px; height: 16px; flex-shrink: 0; }
.app-header__brand { color: var(--jubal-yellow); font-size: 20px; }
.app-header__user { flex-shrink: 0; border-radius: 50%; text-decoration: none; }
.app-header__avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; display: block; border: 1px solid var(--border); }
.app-header__avatar--ph { display: grid; place-items: center; background: var(--accent-soft); color: var(--jubal-blue-light); font-weight: 800; }
</style>
