<template>
  <ConfigError v-if="!supabaseConfigured" />
  <template v-else>
    <!-- Mientras se restaura la sesión guardada, evitamos parpadeos -->
    <div v-if="!authStore.ready" class="role-screen"></div>
    <LoginView v-else-if="!authStore.isAuthenticated" />
    <div v-else-if="!bandStore.ready" class="role-screen"></div>
    <template v-else>
      <AppHeader v-if="!isFullscreen" />
      <main class="page active" :class="{ 'page--no-nav': hideNav }">
        <RouterView />
      </main>
      <AppNav v-if="!hideNav" />
      <LiveBanner />
      <Toast />
      <ConfirmModal />
    </template>
  </template>
  <OfflineBanner />
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useBandStore } from './stores/band'
import { usePracticeStore } from './stores/practice'
import { supabaseConfigured } from './supabase'
import { useToast } from './composables/useToast'
import LoginView    from './views/LoginView.vue'
import AppHeader    from './components/AppHeader.vue'
import AppNav       from './components/AppNav.vue'
import LiveBanner   from './components/LiveBanner.vue'
import Toast        from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import OfflineBanner from './components/OfflineBanner.vue'
import ConfigError  from './components/ConfigError.vue'

const authStore = useAuthStore()
const bandStore = useBandStore()
const practiceStore = usePracticeStore()
const route = useRoute()
const { showToast } = useToast()

// Avisar del resultado de una invitación (unido o inválida/expirada).
watch(() => bandStore.inviteResult, (r) => {
  if (!r) return
  showToast(r.ok ? `Te uniste a ${r.name}` : r.message)
})

// Cargar bandas (y canjear invitación pendiente) al autenticarse; limpiar al salir.
watch(() => authStore.isAuthenticated, (authed) => {
  if (authed) {
    if (!bandStore.ready) bandStore.init()
  } else {
    bandStore.reset()
    practiceStore.reset()
  }
}, { immediate: true })

// Detalle de actividad, canción y la sesión en vivo van a pantalla completa
const isFullscreen = computed(() =>
  route.path.startsWith('/actividad/') || route.path.startsWith('/cancion/') || route.path.startsWith('/live')
)

// Canción y sesión en vivo ocultan la navegación inferior (pantalla completa)
const hideNav = computed(() =>
  route.path.startsWith('/cancion/') || route.path.startsWith('/live')
)
</script>
