<template>
  <div class="role-screen">
    <div class="role-box bands-box">
      <img :src="logo" alt="Jubal" class="role-logo">

      <p class="bands-greeting" v-if="auth.user">
        Hola, {{ auth.user.user_metadata?.full_name || auth.user.email }}
      </p>

      <h2 class="bands-title">Mis bandas</h2>

      <!-- Lista de bandas -->
      <div v-if="band.bands.length" class="bands-list">
        <button
          v-for="b in band.bands"
          :key="b.id"
          class="band-card"
          @click="enter(b.id)"
        >
          <span class="band-card__name">{{ b.name }}</span>
          <span class="band-card__role" :class="'role-' + b.role">{{ roleLabel(b.role) }}</span>
        </button>
      </div>
      <p v-else class="bands-empty">Aún no perteneces a ninguna banda. Crea la primera.</p>

      <!-- Crear banda -->
      <div class="bands-create">
        <template v-if="creating">
          <input
            ref="nameInput"
            v-model="newName"
            type="text"
            placeholder="Nombre de la banda"
            maxlength="60"
            @keydown.enter="create"
          >
          <div class="bands-create__actions">
            <button class="btn btn-primary btn-sm" :disabled="busy || !newName.trim()" @click="create">
              {{ busy ? 'Creando…' : 'Crear' }}
            </button>
            <button class="btn btn-sm" @click="cancelCreate">Cancelar</button>
          </div>
        </template>
        <button v-else class="btn btn-primary bands-create__btn" @click="startCreate">+ Crear banda</button>
      </div>

      <p v-if="error" class="auth-msg auth-msg--error">{{ error }}</p>
      <p v-if="inviteError" class="auth-msg auth-msg--error">{{ inviteError }}</p>

      <button class="role-signout" @click="signOut">Cerrar sesión</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useBandStore } from '../stores/band'
import { useAuthStore } from '../stores/auth'
import logo from '../assets/jubal_logo.png'

const band = useBandStore()
const auth = useAuthStore()

// Error de una invitación que no se pudo canjear (inválida/expirada/revocada).
const inviteError = computed(() =>
  band.inviteResult && !band.inviteResult.ok ? band.inviteResult.message : '')

const creating  = ref(false)
const newName   = ref('')
const busy      = ref(false)
const error     = ref('')
const nameInput = ref(null)

function roleLabel(r) {
  return { leader: 'Líder', musician: 'Músico', singer: 'Corista' }[r] || r
}

function enter(id) {
  band.selectBand(id)
}

async function startCreate() {
  creating.value = true
  error.value = ''
  await nextTick()
  nameInput.value?.focus()
}

function cancelCreate() {
  creating.value = false
  newName.value = ''
}

async function create() {
  if (!newName.value.trim() || busy.value) return
  busy.value = true
  error.value = ''
  try {
    await band.createBand(newName.value)   // crea, recarga y entra a la banda
  } catch (e) {
    error.value = e.message || 'No se pudo crear la banda.'
  } finally {
    busy.value = false
  }
}

async function signOut() {
  band.reset()
  await auth.signOut()
}
</script>

<style scoped>
.bands-box { width: min(380px, 92vw); }
.bands-greeting { color: var(--text-muted, #aaa); font-size: 14px; margin: 4px 0 14px; }
.bands-title { font-size: 18px; margin-bottom: 12px; }

.bands-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.band-card {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; padding: 14px 16px; cursor: pointer;
  background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08);
  border-radius: 12px; color: inherit; text-align: left;
}
.band-card:hover { background: rgba(255,255,255,.09); }
.band-card__name { font-weight: 600; font-size: 15px; }
.band-card__role {
  font-size: 12px; padding: 3px 10px; border-radius: 999px;
  background: rgba(255,255,255,.1); color: var(--text-muted, #ccc);
}
.band-card__role.role-leader { background: var(--accent, #c8a04b); color: #1a1a1a; }

.bands-empty { color: var(--text-muted, #888); font-size: 14px; margin: 8px 0 18px; }

.bands-create { margin-bottom: 6px; }
.bands-create__btn { width: 100%; padding: 12px; }
.bands-create input {
  width: 100%; padding: 11px 12px; margin-bottom: 8px; border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04);
  color: inherit; font-size: 15px;
}
.bands-create__actions { display: flex; gap: 8px; }
.bands-create__actions .btn { flex: 1; }

.auth-msg { margin-top: 14px; font-size: 13px; }
.auth-msg--error { color: #ff6b6b; }

.role-signout {
  margin-top: 22px; background: none; border: none; cursor: pointer;
  color: var(--text-muted, #888); font-size: 13px; text-decoration: underline;
}
</style>
