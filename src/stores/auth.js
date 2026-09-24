import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const session = ref(null)
  const ready   = ref(false)   // true tras intentar restaurar la sesión inicial
  const initializationError = ref(null)

  const isAuthenticated = computed(() => !!user.value)

  // Restaurar sesión guardada y escuchar cambios (login, logout, OAuth redirect).
  let receivedAuthEvent = false
  function applySession(s) {
    initializationError.value = null
    session.value = s
    user.value = s?.user ?? null
    ready.value = true
  }

  supabase.auth.getSession().then(({ data, error }) => {
    // Un login/logout más reciente tiene prioridad sobre la lectura inicial.
    if (receivedAuthEvent) return
    if (error) throw error
    applySession(data.session)
  }).catch((error) => {
    if (!receivedAuthEvent) initializationError.value = error
  })
  supabase.auth.onAuthStateChange((_event, s) => {
    receivedAuthEvent = true
    applySession(s)
  })

  function signUp(email, password) {
    return supabase.auth.signUp({ email, password })
  }

  function signInWithPassword(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      // Volver a la misma URL base (sin el hash del router).
      options: { redirectTo: window.location.origin + window.location.pathname },
    })
  }

  function signOut() {
    return supabase.auth.signOut()
  }

  return {
    user, session, ready, isAuthenticated, initializationError,
    signUp, signInWithPassword, signInWithGoogle, signOut,
  }
})
