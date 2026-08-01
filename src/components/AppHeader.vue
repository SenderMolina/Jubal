<template>
  <header class="app-header">
    <div class="app-header__left">
      <button class="app-header__menu" aria-label="Menú" @click="drawerOpen = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <span class="app-header__mark" aria-hidden="true">♪</span>
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
  if (path.startsWith('/inicio')) return 'Banda'
  if (path.startsWith('/practica')) return 'Práctica'
  if (path.startsWith('/actividades') || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/tipos')) return 'Tipos'
  if (path.startsWith('/banda')) return 'Banda'
  if (path.startsWith('/perfil')) return 'Perfil'
  if (path.startsWith('/entrenar') || path.startsWith('/skill/')) return 'Tracker de práctica'
  if (path.startsWith('/estadisticas')) return 'Estadística'
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
.app-header__left { min-width: 0; display: flex; align-items: center; gap: 9px; }
.app-header__menu {
  width: 44px; height: 44px; flex: 0 0 44px; background: var(--surface2); border: 1px solid var(--border); cursor: pointer; padding: 10px;
  border-radius: 14px; box-shadow: 0 3px 0 #091b22;
  color: var(--text); display: flex; align-items: center;
}
.app-header__menu svg { width: 20px; height: 20px; }
.app-header__menu:active { transform: translateY(2px); box-shadow: 0 1px 0 #091b22; }
.app-header__mark { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 10px; background: linear-gradient(145deg, var(--jubal-yellow), var(--jubal-orange)); color: var(--jubal-navy-dark); font-size: 18px; font-weight: 900; box-shadow: 0 3px 0 #ad5b00, inset 0 2px 0 rgba(255,255,255,.28); transform: rotate(-4deg); }

.app-header__user {
  background: none; border: none; cursor: pointer; padding: 0;
  border-radius: 50%; -webkit-tap-highlight-color: transparent;
}
.app-header__avatar {
  width: 44px; height: 44px; border-radius: 50%; object-fit: cover; display: block;
  border: 3px solid rgba(142,202,230,.5); box-shadow: 0 3px 0 #091b22;
}
.app-header__avatar--ph {
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(145deg, var(--accent), var(--accent2)); color: #fff; font-weight: 900; font-size: 1rem;
}

@media (max-width: 359px) {
  .app-header__mark { display: none; }
}
</style>
