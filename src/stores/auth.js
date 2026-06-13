import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const session = ref(null)
  const ready   = ref(false)   // true tras intentar restaurar la sesión inicial

  const isAuthenticated = computed(() => !!user.value)

  // Restaurar sesión guardada y escuchar cambios (login, logout, OAuth redirect).
  supabase.auth.getSession().then(({ data }) => {
    session.value = data.session
    user.value    = data.session?.user ?? null
    ready.value   = true
  })
  supabase.auth.onAuthStateChange((_event, s) => {
    session.value = s
    user.value    = s?.user ?? null
    ready.value   = true
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
    user, session, ready, isAuthenticated,
    signUp, signInWithPassword, signInWithGoogle, signOut,
  }
})
