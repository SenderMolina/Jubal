<template>
  <header class="app-header">
    <div class="app-header__left">
      <h1 class="app-header__title">{{ pageTitle }}</h1>
    </div>

    <button class="app-header__user" @click="openMenu" aria-label="Cuenta">
      <img v-if="avatarUrl" :src="avatarUrl" class="app-header__avatar" alt="">
      <span v-else class="app-header__avatar app-header__avatar--ph">{{ initial }}</span>
    </button>

    <ActionSheet ref="sheet" />
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useBandStore } from '../stores/band'
import ActionSheet from './ActionSheet.vue'

const route = useRoute()
const auth = useAuthStore()
const band = useBandStore()
const sheet = ref(null)

const pageTitle = computed(() => {
  const path = route.path
  if (path === '/') return band.currentBand?.name || 'Inicio'
  if (path.startsWith('/actividades') || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/tipos')) return 'Tipos'
  if (path.startsWith('/banda')) return 'Banda'
  if (path.startsWith('/agregar')) return 'Canciones'
  return 'Jubal'
})

const avatarUrl = computed(() => auth.user?.user_metadata?.avatar_url || '')
const initial = computed(() => {
  const n = auth.user?.user_metadata?.full_name || auth.user?.email || '?'
  return n.charAt(0).toUpperCase()
})

function openMenu() {
  sheet.value?.open({
    title: band.currentBand?.name || 'Cuenta',
    actions: [
      { label: 'Cambiar de banda', onSelect: () => band.changeRole() },
      { label: 'Cerrar sesión', danger: true, onSelect: signOut },
    ],
  })
}

async function signOut() {
  band.reset()
  await auth.signOut()
}
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
