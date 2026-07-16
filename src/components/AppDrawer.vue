<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-backdrop" @click.self="$emit('close')">
        <aside class="drawer">
          <!-- Usuario -->
          <RouterLink class="drawer-user" to="/perfil" @click="$emit('close')">
            <img v-if="avatarUrl" :src="avatarUrl" class="drawer-user__avatar" alt="">
            <span v-else class="drawer-user__avatar drawer-user__avatar--ph">{{ initial }}</span>
            <div class="drawer-user__info">
              <span class="drawer-user__name">{{ fullName }}</span>
              <span class="drawer-user__hint">Ver perfil</span>
            </div>
          </RouterLink>

          <!-- Dashboards -->
          <button class="drawer-item" :class="{ active: isPath('/inicio') }" @click="goHome">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
            <span>Dashboard de banda</span>
          </button>
          <p class="drawer-section">Personal</p>
          <button class="drawer-item" :class="{ active: band.personalMode && isPath('/practica') }" @click="goPractice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            <span>Práctica</span>
          </button>
          <button class="drawer-item" :class="{ active: isPath('/rutina') }" @click="goRoutine">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5M8 16h7"/><path d="M9 3v2M15 3v2"/></svg>
            <span>Rutinas</span>
          </button>
          <button class="drawer-item" :class="{ active: isPath('/estadisticas') }" @click="goStats">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Estadística</span>
          </button>

          <!-- Bandas -->
          <p class="drawer-section">Mis bandas</p>
          <button
            v-for="b in band.bands"
            :key="b.id"
            class="drawer-item"
            :class="{ active: band.currentBandId === b.id }"
            @click="goBand(b.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span>{{ b.name }}</span>
            <span class="drawer-item__role" :class="'role-' + b.role">{{ roleLabel(b.role) }}</span>
          </button>
          <p v-if="!band.bands.length" class="drawer-empty">Aún no perteneces a ninguna banda.</p>

          <div v-if="creating" class="drawer-create">
            <input
              ref="nameInput"
              v-model="newName"
              class="form-input"
              type="text"
              placeholder="Nombre de la banda"
              maxlength="60"
              @keydown.enter="create"
            >
            <div class="drawer-create__actions">
              <button class="btn btn-primary btn-sm" :disabled="busy || !newName.trim()" @click="create">
                {{ busy ? 'Creando…' : 'Crear' }}
              </button>
              <button class="btn btn-sm" @click="creating = false">Cancelar</button>
            </div>
          </div>
          <button v-else class="drawer-item drawer-item--muted" @click="startCreate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Crear banda</span>
          </button>

          <div class="drawer-spacer" />
          <button class="drawer-item drawer-item--muted" @click="signOut">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Cerrar sesión</span>
          </button>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBandStore } from '../stores/band'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'

const props = defineProps({ open: Boolean })
const emit  = defineEmits(['close'])

const route  = useRoute()
const router = useRouter()
const band   = useBandStore()
const auth   = useAuthStore()
const { showToast } = useToast()

const creating  = ref(false)
const busy      = ref(false)
const newName   = ref('')
const nameInput = ref(null)

const fullName  = computed(() => auth.user?.user_metadata?.full_name || auth.user?.email || '')
const avatarUrl = computed(() => auth.user?.user_metadata?.avatar_url || '')
const initial   = computed(() => fullName.value.charAt(0).toUpperCase() || '?')

function isPath(p) { return route.path.startsWith(p) }

function roleLabel(r) {
  return { leader: 'Líder', musician: 'Músico', singer: 'Corista' }[r] || r
}

function goPractice() {
  band.enterPersonal()
  router.push('/practica')
  emit('close')
}

function goHome() {
  if (band.currentBandId) {
    router.push('/inicio')
  } else if (band.bands.length) {
    band.selectBand(band.bands[0].id)
    router.push('/inicio')
  } else {
    band.enterPersonal()
    router.push('/practica')
  }
  emit('close')
}

function goStats() {
  band.enterPersonal()
  router.push('/estadisticas')
  emit('close')
}

function goRoutine() {
  band.enterPersonal()
  router.push('/rutina')
  emit('close')
}

function goBand(id) {
  band.selectBand(id)
  router.push('/inicio')
  emit('close')
}

async function startCreate() {
  creating.value = true
  await nextTick()
  nameInput.value?.focus()
}

async function create() {
  if (!newName.value.trim() || busy.value) return
  busy.value = true
  try {
    await band.createBand(newName.value)
    router.push('/inicio')
    creating.value = false
    newName.value = ''
    emit('close')
  } catch (e) {
    showToast(e.message || 'No se pudo crear la banda.')
  } finally {
    busy.value = false
  }
}

async function signOut() {
  emit('close')
  band.reset()
  await auth.signOut()
}
</script>

<style scoped>
.drawer-backdrop {
  position: fixed; inset: 0; z-index: 960;
  background: rgba(0, 0, 0, .45);
}
.drawer {
  position: absolute; top: 0; bottom: 0; left: 0;
  width: min(300px, 84vw);
  background: var(--surface);
  display: flex; flex-direction: column;
  padding: calc(14px + env(safe-area-inset-top)) 12px calc(14px + env(safe-area-inset-bottom));
  overflow-y: auto;
  box-shadow: var(--shadow-hover);
}

.drawer-user {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; border-radius: var(--radius);
  text-decoration: none; color: var(--text);
  background: var(--surface2); margin-bottom: 10px;
}
.drawer-user__avatar {
  width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
  border: 1px solid var(--border); flex-shrink: 0;
}
.drawer-user__avatar--ph {
  display: flex; align-items: center; justify-content: center;
  background: var(--accent); color: #fff; font-weight: 700; font-size: 1.1rem;
}
.drawer-user__info { display: flex; flex-direction: column; min-width: 0; }
.drawer-user__name { font-weight: 700; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drawer-user__hint { font-size: 12px; color: var(--text-muted); }

.drawer-section {
  font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
  color: var(--text-muted); margin: 12px 10px 6px;
}

.drawer-item {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 10px; border-radius: 10px; cursor: pointer; text-align: left;
  background: none; border: none; color: var(--text); font-size: 14px; font-weight: 600;
}
.drawer-item svg { width: 20px; height: 20px; color: var(--text-mid); flex-shrink: 0; }
.drawer-item:hover { background: var(--surface2); }
.drawer-item.active { background: var(--surface2); color: var(--accent); }
.drawer-item.active svg { color: var(--accent); }
.drawer-item span:nth-child(2) { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.drawer-item--muted { color: var(--text-mid); font-weight: 500; }

.drawer-item__role {
  font-size: 11px; padding: 2px 9px; border-radius: 999px; flex-shrink: 0;
  background: var(--surface2); color: var(--text-mid); font-weight: 600;
}
.drawer-item__role.role-leader { background: var(--accent); color: #fff; }

.drawer-empty { font-size: 13px; color: var(--text-muted); margin: 2px 10px 6px; }

.drawer-create { padding: 6px 10px; display: flex; flex-direction: column; gap: 8px; }
.drawer-create__actions { display: flex; gap: 8px; }
.drawer-create__actions .btn { flex: 1; justify-content: center; }

.drawer-spacer { flex: 1; min-height: 16px; }

.drawer-enter-active, .drawer-leave-active { transition: opacity .2s; }
.drawer-enter-active .drawer, .drawer-leave-active .drawer { transition: transform .22s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(-100%); }
</style>
