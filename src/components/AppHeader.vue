<template>
  <header class="app-header">
    <div class="app-header__left">
      <h1 class="app-header__title">{{ pageTitle }}</h1>
    </div>
    <button class="app-header__back" @click="roleStore.changeRole()" aria-label="Cambiar rol">
      <svg class="app-header__back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    </button>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRoleStore } from '../stores/role'

const route = useRoute()
const roleStore = useRoleStore()

const pageTitle = computed(() => {
  const path = route.path
  if (path === '/' || path.startsWith('/actividad/')) return 'Actividades'
  if (path.startsWith('/repertorio')) return 'Repertorios'
  if (path.startsWith('/canciones') || path.startsWith('/cancion/')) return 'Canciones'
  if (path.startsWith('/tipos')) return 'Tipos'
  if (path.startsWith('/banda')) return 'Banda'
  if (path.startsWith('/agregar')) return 'Canciones'
  return 'Jubal'
})

</script>
