<template>
  <ConfigError v-if="!supabaseConfigured" />
  <template v-else>
    <!-- Mientras se restaura la sesión guardada, evitamos parpadeos -->
    <div v-if="!authStore.ready" class="role-screen"></div>
    <LoginView v-else-if="!authStore.isAuthenticated" />
    <div v-else-if="!bandStore.ready" class="role-screen"></div>
    <template v-else>
      <AppHeader v-if="!isFullscreen" :menu-open="menuOpen" @open-menu="menuOpen = true" />
      <main class="page app-shell active" :class="{ 'page--no-nav': hideNav, 'page--metronome': isMetronome }">
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
import { setStartupLoading, showStartupError } from './utils/startupSplash'

const authStore = useAuthStore()
const bandStore = useBandStore()
const practiceStore = usePracticeStore()
const route = useRoute()
const router = useRouter()
const routeReady = ref(false)
const restoringSession = ref(false)
const startupError = ref(null)
onMounted(async () => {
  try {
    await router.isReady()
    routeReady.value = true
  } catch (error) {
    startupError.value = error
  }
})
const startupLoading = computed(() => supabaseConfigured && (
  !routeReady.value || !authStore.ready || restoringSession.value ||
  (authStore.isAuthenticated && !bandStore.ready)
))
watch([startupLoading, () => authStore.initializationError, startupError], ([loading, authError, error]) => {
  if (supabaseConfigured && (authError || error)) showStartupError(authError || error)
  else setStartupLoading(loading)
}, { immediate: true, flush: 'post' })
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
    } catch (error) {
      startupError.value = error
    } finally {
      restoringSession.value = false
    }
  } else {
    bandStore.reset()
    practiceStore.reset()
  }
}, { immediate: true })

const isMetronome = computed(() => route.path === '/metronomo')

// Las vistas de práctica dedicadas ocultan el encabezado de la aplicación.
const isFullscreen = computed(() =>
  isMetronome.value || route.path.startsWith('/actividad/') || route.path.startsWith('/cancion/') || route.path.startsWith('/rutina/jugar/')
)

// Canción y formularios ocultan la navegación inferior
const hideNav = computed(() =>
  isMetronome.value || route.meta.form || route.path.startsWith('/cancion/') || route.path.startsWith('/rutina/jugar/')
)
</script>

<style scoped>
.page.app-shell.page--metronome { max-width: none; min-height: 0; padding: 0; }
</style>
