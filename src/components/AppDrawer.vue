<template>
  <Teleport to="body">
    <dialog id="app-menu" ref="dialog" class="drawer-dialog" aria-labelledby="menu-title" @cancel.prevent="$emit('close')" @click="($event.target === dialog) && $emit('close')">
      <div class="drawer">
        <div class="drawer-handle" aria-hidden="true" />
        <div class="drawer-heading">
          <div><span>JUBAL</span><h2 id="menu-title">Tu música, en orden</h2></div>
          <button class="drawer-close" aria-label="Cerrar menú" autofocus @click="$emit('close')">×</button>
        </div>
        <div class="drawer-content">
          <p class="drawer-section">Espacio activo</p>
          <button class="drawer-item" :class="{ active: band.personalMode }" :aria-pressed="band.personalMode" @click="goPractice">
            <JubalNavIcon name="home" /><span>Mi espacio personal</span><span v-if="band.personalMode" aria-hidden="true">✓</span>
          </button>
          <button v-for="b in band.bands" :key="b.id" class="drawer-item" :class="{ active: band.currentBandId === b.id }" :aria-pressed="band.currentBandId === b.id" @click="goBand(b.id)">
            <JubalNavIcon name="band" /><span>{{ b.name }}</span><small>{{ roleLabel(b.role) }}</small>
          </button>

          <p class="drawer-section">{{ band.personalMode ? 'Mi biblioteca' : 'Biblioteca de la banda' }}</p>
          <button v-for="item in libraryLinks" :key="item.to" class="drawer-item" :class="{ active: isPath(item.to) }" @click="go(item.to)">
            <JubalNavIcon :name="item.icon" /><span>{{ item.label }}</span><span class="drawer-chevron">›</span>
          </button>
          <button v-if="band.currentBand && band.isLeader" class="drawer-item" :class="{ active: isPath('/banda') }" @click="go('/banda')">
            <JubalNavIcon name="band" /><span>Administrar banda</span><span class="drawer-chevron">›</span>
          </button>
          <button v-if="band.isLeader" class="drawer-item" :class="{ active: isPath('/tipos') }" @click="go('/tipos')">
            <JubalNavIcon name="repertoire" /><span>Tipos de canción</span><span class="drawer-chevron">›</span>
          </button>

          <p class="drawer-section">Práctica personal</p>
          <div class="drawer-tools">
            <button v-for="item in personalLinks" :key="item.to" :class="{ active: isPath(item.to) }" @click="goPersonal(item.to)">
              <JubalNavIcon :name="item.icon" /><span>{{ item.label }}</span>
            </button>
          </div>

          <p class="drawer-section">Mi cuenta</p>
          <RouterLink class="drawer-user" to="/perfil" @click="$emit('close')">
            <img v-if="avatarUrl" :src="avatarUrl" class="drawer-user__avatar" alt="">
            <span v-else class="drawer-user__avatar drawer-user__avatar--ph">{{ initial }}</span>
            <span class="drawer-user__info"><strong>{{ fullName }}</strong><small>Ver mi perfil</small></span>
            <span class="drawer-chevron">›</span>
          </RouterLink>
          <form v-if="creating" class="drawer-create" @submit.prevent="create">
            <label class="form-label" for="new-band-name">Nombre de la banda</label>
            <input id="new-band-name" ref="nameInput" v-model="newName" class="form-input" maxlength="60" placeholder="Mi banda">
            <div class="drawer-create__actions">
              <button class="btn btn-primary btn-sm" :disabled="busy || !newName.trim()">{{ busy ? 'Creando…' : 'Crear banda' }}</button>
              <button type="button" class="btn btn-ghost btn-sm" @click="creating = false">Cancelar</button>
            </div>
          </form>
          <button v-else class="drawer-item" @click="startCreate"><span class="drawer-plus">＋</span><span>Crear una banda</span></button>
          <button class="drawer-item drawer-item--muted" @click="signOut"><span>Cerrar sesión</span></button>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBandStore } from '../stores/band'
import { useAuthStore } from '../stores/auth'
import JubalNavIcon from './JubalNavIcon.vue'
import { useToast } from '../composables/useToast'

const props = defineProps({ open: Boolean })
const emit  = defineEmits(['close'])

const route  = useRoute()
const router = useRouter()
const band   = useBandStore()
const auth   = useAuthStore()
const { showToast } = useToast()

const dialog = ref(null)
let previousOverflow = ''
watch(() => props.open, async (open) => {
  if (open) {
    await nextTick()
    if (!props.open) return
    previousOverflow = document.body.style.overflow
    dialog.value?.showModal()
    document.body.style.overflow = 'hidden'
  } else {
    dialog.value?.close()
    document.body.style.overflow = previousOverflow
  }
})
onBeforeUnmount(() => { if (props.open) document.body.style.overflow = previousOverflow })

const personalLinks = [
  { to: '/entrenar', label: 'Mis objetivos', icon: 'tracker' },
  { to: '/rutina', label: 'Mis rutinas', icon: 'activities' },
  { to: '/metronomo', label: 'Metrónomo', icon: 'metronome' },
  { to: '/estadisticas', label: 'Mi progreso', icon: 'stats' },
]
const libraryLinks = [
  { to: '/canciones', label: 'Canciones', icon: 'songs' },
  { to: '/repertorio', label: 'Repertorios', icon: 'repertoire' },
]

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

function goPersonal(path) {
  band.enterPersonal()
  go(path)
}

function go(path) {
  router.push(path)
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
.drawer-dialog { position: fixed; inset: auto 0 0; width: min(100%, 520px); max-width: 100%; max-height: 90dvh; margin: auto auto 0; padding: 0; border: 1px solid var(--border); border-bottom: 0; border-radius: 28px 28px 0 0; background: var(--surface); color: var(--text); overflow: visible; }
.drawer-dialog::backdrop { background: rgba(3, 12, 19, .72); backdrop-filter: blur(5px); }
.drawer { display: flex; flex-direction: column; max-height: 90dvh; border: 0; border-radius: inherit; box-shadow: 0 -12px 60px #0004; }
.drawer-handle { width: 36px; height: 4px; margin: 10px auto 0; border-radius: 4px; background: var(--border); flex-shrink: 0; }
.drawer-heading { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; gap: 12px; border-bottom: 1px solid var(--border); }
.drawer-heading span { color: var(--jubal-blue-light); font-size: 10px; letter-spacing: .18em; }
.drawer-heading h2 { margin-top: 3px; font-size: 20px; }
.drawer-close { width: 44px; height: 44px; flex-shrink: 0; border: 1px solid var(--border); border-radius: 50%; background: var(--surface2); color: var(--text); font-size: 26px; cursor: pointer; }
.drawer-content { padding: 4px 16px calc(20px + env(safe-area-inset-bottom)); overflow-y: auto; overscroll-behavior: contain; }
.drawer-section { margin: 22px 8px 8px; color: var(--text-muted); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.drawer-item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 50px; padding: 10px 12px; border: 1px solid transparent; border-radius: 12px; background: transparent; color: var(--text); text-align: left; font-size: 14px; cursor: pointer; }
.drawer-item > span:nth-last-child(2), .drawer-item > span:only-child { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.drawer-item svg { color: var(--text-muted); width: 22px; height: 22px; }
.drawer-item small { color: var(--text-muted); font-size: 11px; }
.drawer-item:hover, .drawer-tools button:hover { background: var(--surface2); }
.drawer-item.active, .drawer-tools .active { background: var(--accent-soft); border-color: rgba(var(--brand-rgb), .3); color: var(--jubal-blue-light); }
.drawer-chevron { margin-left: auto; color: var(--text-muted); font-size: 22px; }
.drawer-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.drawer-tools button { display: flex; align-items: center; gap: 10px; min-height: 64px; padding: 12px; border: 1px solid var(--border); border-radius: 14px; color: var(--text); background: var(--surface2); text-align: left; font-size: 13px; cursor: pointer; }
.drawer-tools svg { color: var(--jubal-blue-light); width: 21px; height: 21px; }
.drawer-user { display: flex; align-items: center; gap: 12px; padding: 10px; color: var(--text); text-decoration: none; }
.drawer-user__avatar { width: 42px; height: 42px; flex-shrink: 0; border-radius: 50%; object-fit: cover; }
.drawer-user__avatar--ph { display: grid; place-items: center; background: var(--accent-soft); color: var(--jubal-blue-light); }
.drawer-user__info { display: flex; flex-direction: column; min-width: 0; gap: 3px; }
.drawer-user__info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.drawer-user__info small { font-size: 12px; color: var(--text-muted); }
.drawer-create { padding: 12px; }.drawer-create__actions { display: flex; gap: 10px; margin-top: 12px; }
.drawer-plus { width: 22px; font-size: 23px; }.drawer-item--muted { margin-top: 10px; color: var(--text-muted); }
@media (prefers-reduced-motion: no-preference) { .drawer-dialog[open] { animation: menu-rise .2s ease-out; } @keyframes menu-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } }
</style>
