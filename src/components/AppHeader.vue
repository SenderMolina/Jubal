<template>
  <header class="app-header">
    <div class="app-header__left">
      <h1 class="app-header__title">{{ pageTitle }}</h1>
    </div>

    <RouterLink class="app-header__user" to="/perfil" aria-label="Perfil">
      <img v-if="avatarUrl" :src="avatarUrl" class="app-header__avatar" alt="">
      <span v-else class="app-header__avatar app-header__avatar--ph">{{ initial }}</span>
    </RouterLink>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()

const pageTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/actividades') || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/tipos')) return 'Tipos'
  if (path.startsWith('/banda')) return 'Banda'
  if (path.startsWith('/perfil')) return 'Perfil'
  if (path.startsWith('/entrenar') || path.startsWith('/skill/')) return 'Entrenar'
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
