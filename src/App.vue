<template>
  <RoleScreen v-if="!roleStore.currentRole" />
  <template v-else>
    <AppHeader v-if="!isFullscreen" />
    <main class="page active" :class="{ 'page--no-nav': hideNav }">
      <RouterView />
    </main>
    <AppNav v-if="!hideNav" />
    <Toast />
    <ConfirmModal />
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRoleStore } from './stores/role'
import RoleScreen   from './components/RoleScreen.vue'
import AppHeader    from './components/AppHeader.vue'
import AppNav       from './components/AppNav.vue'
import Toast        from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const roleStore = useRoleStore()
const route = useRoute()

// Detalle de actividad y canción se muestran a pantalla completa (sin header global)
const isFullscreen = computed(() =>
  route.path.startsWith('/actividad/') || route.path.startsWith('/cancion/')
)

// En la canción también se oculta la navegación inferior (más espacio para letra/notas)
const hideNav = computed(() => route.path.startsWith('/cancion/'))
</script>
