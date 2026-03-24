<template>
  <RoleScreen v-if="!roleStore.currentRole" />
  <template v-else>
    <AppHeader />
    <AppNav />
    <main class="page active">
      <RouterView />
    </main>
    <Toast />
    <ConfirmModal />
  </template>
</template>

<script setup>
import { useRoleStore } from './stores/role'
import RoleScreen   from './components/RoleScreen.vue'
import AppHeader    from './components/AppHeader.vue'
import AppNav       from './components/AppNav.vue'
import Toast        from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const roleStore = useRoleStore()
</script>
