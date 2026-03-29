<template>
  <nav class="tabs">
    <RouterLink class="tab" :class="{ active: isActive('/') }" to="/">Actividades</RouterLink>
    <RouterLink class="tab" :class="{ active: isActive('/canciones') }" to="/canciones">Canciones</RouterLink>
    <template v-if="roleStore.isLeader">
      <RouterLink class="tab" :class="{ active: isActive('/tipos') }" to="/tipos">Tipos</RouterLink>
    </template>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useRoleStore } from '../stores/role'

const route     = useRoute()
const roleStore = useRoleStore()

function isActive(path) {
  if (path === '/') return route.path === '/' || route.path.startsWith('/actividad/')
  return route.path.startsWith(path)
}
</script>
