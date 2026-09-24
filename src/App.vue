<template>
  <ConfigError v-if="!supabaseConfigured" />
  <template v-else>
    <!-- Mientras se restaura la sesión guardada, evitamos parpadeos -->
    <div v-if="!authStore.ready" class="role-screen"></div>
    <LoginView v-else-if="!authStore.isAuthenticated" />
    <div v-else-if="!bandStore.ready" class="role-screen"></div>
    <template v-else>
      <AppHeader v-if="!isFullscreen" :menu-open="menuOpen" @open-menu="menuOpen = true" />
      <main class="page app-shell active" :class="{ 'page--no-nav': hideNav }">
        <RouterView v-slot="{ Component, route: viewRoute }">
          <Transition name="route-view" mode="out-in">
            <component :is="Component" :key="viewRoute.path" />
          </Transition>
        </RouterView>
      </main>
      <AppNav v-if="!hideNav" />
      <AppDrawer :open="menuOpen" @close="menuOpen = false" />
      <Toast />
      <ConfirmModal />
    </template>
  </template>
  <OfflineBanner />
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useBandStore } from './stores/band'
import { usePracticeStore } from './stores/practice'
import { supabaseConfigured } from './supabase'
import { useToast } from './composables/useToast'
import LoginView    from './views/LoginView.vue'
import AppHeader    from './components/AppHeader.vue'
import AppNav       from './components/AppNav.vue'
import AppDrawer    from './components/AppDrawer.vue'
import Toast        from './components/Toast.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import OfflineBanner from './components/OfflineBanner.vue'
import ConfigError  from './components/ConfigError.vue'
import { setStartupLoading } from './utils/startupSplash'

const authStore = useAuthStore()
const bandStore = useBandStore()
const practiceStore = usePracticeStore()
const route = useRoute()
const router = useRouter()
const routeReady = ref(false)
const restoringSession = ref(false)
onMounted(async () => {
  await router.isReady()
  routeReady.value = true
})
const startupLoading = computed(() => supabaseConfigured && (
  !routeReady.value || !authStore.ready || restoringSession.value ||
  (authStore.isAuthenticated && !bandStore.ready)
))
watch(startupLoading, setStartupLoading, { immediate: true, flush: 'post' })
const menuOpen = ref(false)
watch(() => route.fullPath, () => { menuOpen.value = false })
const { showToast } = useToast()

// Avisar del resultado de una invitación (unido o inválida/expirada).
watch(() => bandStore.inviteResult, (r) => {
  if (!r) return
  showToast(r.ok ? `Te uniste a ${r.name}` : r.message)
})

// Cargar bandas (y canjear invitación pendiente) al autenticarse; limpiar al salir.
watch(() => authStore.isAuthenticated, async (authed) => {
  if (authed) {
    restoringSession.value = true
    try {
      if (!bandStore.ready) await bandStore.init()
      const isPersonalRoute = ['/practica', '/entrenar', '/skill', '/estadisticas', '/rutina', '/metronomo']
        .some(path => route.path.startsWith(path))
      if (isPersonalRoute && !bandStore.personalMode) {
        bandStore.enterPersonal()
      } else if (route.path === '/actividades' && !bandStore.currentBandId) {
        if (bandStore.bands.length) {
          bandStore.selectBand(bandStore.bands[0].id)
        } else {
          await router.replace('/practica')
        }
      } else if (!bandStore.currentBandId && ['/actividad', '/banda'].some(path => route.path.startsWith(path))) {
        await router.replace('/practica')
      }
    } finally {
      restoringSession.value = false
    }
  } else {
    bandStore.reset()
    practiceStore.reset()
  }
}, { immediate: true })

// Detalle de actividad y canción van a pantalla completa
const isFullscreen = computed(() =>
  route.path.startsWith('/actividad/') || route.path.startsWith('/cancion/') || route.path.startsWith('/rutina/jugar/')
)

// Canción y formularios ocultan la navegación inferior
const hideNav = computed(() =>
  route.meta.form || route.path.startsWith('/cancion/') || route.path.startsWith('/rutina/jugar/')
)
</script>
