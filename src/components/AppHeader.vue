<template>
  <header>
    <div class="logo">
      <img :src="logo" alt="Jubal">
    </div>
    <div class="header-actions">
      <span class="role-badge">{{ roleLabels[roleStore.currentRole] }}</span>
      <button v-if="roleStore.isLeader" class="btn btn-primary btn-sm" @click="router.push('/agregar')">+ Añadir</button>
      <button class="btn btn-ghost btn-sm" @click="roleStore.changeRole()">Cambiar rol</button>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useRoleStore } from '../stores/role'
import logo from '../assets/jubal_logo.png'

const router    = useRouter()
const roleStore = useRoleStore()

const roleLabels = { lider: 'Líder', musico: 'Músico', cantante: 'Cantante' }
</script>
