<template>
  <header class="app-header">
    <div class="app-header__left">
      <button class="app-header__menu" aria-label="Menú" @click="drawerOpen = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <h1 class="app-header__title">{{ pageTitle }}</h1>
    </div>

    <RouterLink class="app-header__user" to="/perfil" aria-label="Perfil">
      <img v-if="avatarUrl" :src="avatarUrl" class="app-header__avatar" alt="">
      <span v-else class="app-header__avatar app-header__avatar--ph">{{ initial }}</span>
    </RouterLink>
  </header>

  <AppDrawer :open="drawerOpen" @close="drawerOpen = false" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppDrawer from './AppDrawer.vue'

const route = useRoute()
const auth = useAuthStore()
const drawerOpen = ref(false)

const pageTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/actividades') || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/tipos')) return 'Tipos'
  if (path.startsWith('/banda')) return 'Banda'
  if (path.startsWith('/perfil')) return 'Perfil'
  if (path.startsWith('/entrenar') || path.startsWith('/skill/')) return 'Entrenar'
  if (path.startsWith('/estadisticas')) return 'Estadística'
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
.app-header__left { display: flex; align-items: center; gap: 10px; }
.app-header__menu {
  background: none; border: none; cursor: pointer; padding: 4px;
  color: var(--text); display: flex; align-items: center;
}
.app-header__menu svg { width: 24px; height: 24px; }

.app-header__user {
  background: none; border: none; cursor: pointer; padding: 0;
  border-radius: 50%; -webkit-tap-highlight-color: transparent;
}
.app-header__avatar {
  width: 36px; height: 36px; border-radius: 50%; object-fit: cover; display: block;
  border: 1px solid var(--border);
}
.app-header__avatar--ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--accent); color: #fff; font-weight: 700; font-size: .95rem;
}
</style>
