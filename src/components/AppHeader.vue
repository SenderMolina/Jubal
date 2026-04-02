<template>
  <header class="app-header">
    <div class="app-header__left">
      <h1 class="app-header__title">{{ pageTitle }}</h1>
      <span v-if="pageCount !== null" class="app-header__count">{{ pageCount }}</span>
    </div>
    <button class="app-header__back" @click="roleStore.changeRole()" aria-label="Cambiar rol">
      <img src="../assets/out_ico.png" alt="Salir" class="app-header__back-icon">
    </button>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRoleStore } from '../stores/role'
import { useAppStore } from '../stores/app'

const route = useRoute()
const roleStore = useRoleStore()
const store = useAppStore()

const pageTitle = computed(() => {
  const path = route.path
  if (path === '/' || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/tipos')) return 'Tipos'
  if (path.startsWith('/agregar')) return 'Canciones'
  return 'Jubal'
})

const pageCount = computed(() => {
  const path = route.path
  if (path === '/' || path.startsWith('/actividad/')) return store.activities.length || null
  if (path === '/repertorio') return store.repertoires.length || null
  if (path === '/canciones' || path.startsWith('/cancion/')) return store.songs.length || null
  if (path === '/tipos') return store.songTypes.length || null
  return null
})
</script>
