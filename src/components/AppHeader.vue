<template>
  <header class="app-header">
    <span class="app-header__role">{{ roleLabels[roleStore.currentRole] }}</span>
    <button class="app-header__change" @click="roleStore.changeRole()">Cambiar rol</button>
  </header>
</template>

<script setup>
import { useRoleStore } from '../stores/role'

const roleStore = useRoleStore()
const roleLabels = { lider: 'Líder', musico: 'Músico', cantante: 'Cantante' }
</script>
