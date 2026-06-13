<template>
  <div class="role-screen">
    <div class="role-box auth-box">
      <img :src="logo" alt="Jubal" class="role-logo">

      <!-- Continuar con Google -->
      <button class="btn auth-google" :disabled="loading" @click="google">
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 009 18z"/>
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.94H.96a9 9 0 000 8.12l3.01-2.34z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        <span>Continuar con Google</span>
      </button>

      <div class="auth-divider"><span>o</span></div>

      <!-- Tabs -->
      <div class="auth-tabs">
        <button :class="{ active: mode === 'login' }"  @click="setMode('login')">Entrar</button>
        <button :class="{ active: mode === 'signup' }" @click="setMode('signup')">Crear cuenta</button>
      </div>

      <form class="auth-form" @submit.prevent="submit">
        <label class="form-label">Correo</label>
        <input v-model="email" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" required>

        <label class="form-label">Contraseña</label>
        <input v-model="password" type="password" autocomplete="current-password" placeholder="••••••••" required>

        <button class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Un momento…' : (mode === 'login' ? 'Entrar' : 'Crear cuenta') }}
        </button>
      </form>

      <p v-if="error" class="auth-msg auth-msg--error">{{ error }}</p>
      <p v-if="info"  class="auth-msg auth-msg--info">{{ info }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/jubal_logo.png'

const auth = useAuthStore()

const mode     = ref('login')   // 'login' | 'signup'
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')
const info     = ref('')

function setMode(m) {
  mode.value = m
  error.value = ''
  info.value = ''
}

async function submit() {
  error.value = ''
  info.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      const { error: e } = await auth.signInWithPassword(email.value, password.value)
      if (e) throw e
      // El gate de App.vue reacciona solo al cambio de sesión.
    } else {
      const { data, error: e } = await auth.signUp(email.value, password.value)
      if (e) throw e
      // Si el proyecto exige confirmación de correo, no habrá sesión todavía.
      if (!data.session) {
        info.value = 'Te enviamos un correo para confirmar tu cuenta. Revísalo y luego entra.'
        mode.value = 'login'
      }
    }
  } catch (e) {
    error.value = traducir(e.message)
  } finally {
    loading.value = false
  }
}

async function google() {
  error.value = ''
  loading.value = true
  const { error: e } = await auth.signInWithGoogle()
  if (e) { error.value = traducir(e.message); loading.value = false }
  // Si no hay error, el navegador redirige a Google.
}

function traducir(msg = '') {
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/already registered/i.test(msg))        return 'Ese correo ya tiene una cuenta. Entra en su lugar.'
  if (/at least 6 characters/i.test(msg))     return 'La contraseña debe tener al menos 6 caracteres.'
  if (/Email not confirmed/i.test(msg))       return 'Debes confirmar tu correo antes de entrar.'
  return msg || 'Ocurrió un error. Intenta de nuevo.'
}
</script>

<style scoped>
.auth-box {
  width: min(380px, 92vw);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 28px 24px 24px;
}
.auth-box .role-logo { width: min(260px, 80%); height: auto; margin-bottom: 8px; }

.auth-google {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 12px; border-radius: 10px;
  background: var(--surface); color: var(--text); font-weight: 600; font-size: .95rem;
  border: 1px solid var(--border); cursor: pointer; transition: all .15s;
}
.auth-google:hover { border-color: var(--teal); box-shadow: var(--shadow); }
.auth-google:disabled { opacity: .6; cursor: default; }

.auth-divider {
  display: flex; align-items: center; gap: 12px;
  color: var(--text-muted); margin: 18px 0; font-size: 13px;
}
.auth-divider::before, .auth-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

.auth-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.auth-tabs button {
  flex: 1; padding: 9px; border: 1px solid var(--border); cursor: pointer;
  background: var(--surface2); color: var(--text-mid);
  border-radius: 10px; font-weight: 600; font-size: .88rem; transition: all .15s;
}
.auth-tabs button.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.auth-form { display: flex; flex-direction: column; gap: 4px; text-align: left; }
.form-label { font-size: .8rem; color: var(--text-mid); font-weight: 600; margin-top: 6px; }
.auth-form input {
  width: 100%; padding: 11px 12px; margin-bottom: 6px;
  border-radius: 10px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--text); font-size: 15px; outline: none;
}
.auth-form input:focus { border-color: var(--teal); }
.auth-form .btn-primary { width: 100%; justify-content: center; padding: 12px; margin-top: 10px; }

.auth-msg { margin-top: 14px; font-size: 13px; }
.auth-msg--error { color: var(--red); }
.auth-msg--info  { color: var(--teal); }
</style>
