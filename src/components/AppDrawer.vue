<template>
  <Teleport to="body">
    <dialog id="app-menu" ref="dialog" class="drawer-dialog" aria-label="Menú de Jubal" @cancel.prevent="$emit('close')" @click="($event.target === dialog) && $emit('close')">
      <div class="drawer">
        <div class="drawer-heading">
          <div class="drawer-logo-wrap">
            <img class="drawer-logo" :src="logoText" alt="Jubal">
          </div>
          <button class="drawer-close" aria-label="Cerrar menú" autofocus @click="$emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <path d="M7 7l10 10M17 7 7 17"/>
            </svg>
          </button>
        </div>
        <div class="drawer-content">
          <p class="drawer-section">Espacios</p>
          <button class="drawer-item" :class="{ active: band.personalMode }" :aria-pressed="band.personalMode" @click="goPractice">
            <JubalNavIcon name="home" /><span class="drawer-item__label">Mi espacio personal</span><span v-if="band.personalMode" class="drawer-selected" aria-label="Seleccionado">✓</span>
          </button>
          <button v-for="b in band.bands" :key="b.id" class="drawer-item" :class="{ active: band.currentBandId === b.id }" :aria-pressed="band.currentBandId === b.id" @click="goBand(b.id)">
            <img v-if="b.avatar_url" :src="b.avatar_url" class="drawer-band-image" alt="">
            <JubalNavIcon v-else name="band" />
            <span class="drawer-item__label">{{ b.name }}</span><small>{{ roleLabel(b.role) }}</small><span v-if="band.currentBandId === b.id" class="drawer-selected" aria-label="Seleccionada">✓</span>
          </button>
          <form v-if="creating" class="drawer-create" @submit.prevent="create">
            <label class="form-label" for="new-band-name">Nombre de la banda</label>
            <input id="new-band-name" ref="nameInput" v-model="newName" class="form-input" maxlength="60" placeholder="Mi banda">
            <div class="drawer-create__actions">
              <button class="btn btn-primary btn-sm" :disabled="busy || !newName.trim()">{{ busy ? 'Creando…' : 'Crear banda' }}</button>
              <button type="button" class="btn btn-ghost btn-sm" @click="creating = false">Cancelar</button>
            </div>
          </form>
          <button v-else class="drawer-item" @click="startCreate"><span class="drawer-plus" aria-hidden="true">＋</span><span class="drawer-item__label">Crear una banda</span></button>

          <template v-if="band.currentBand && band.isLeader">
            <p class="drawer-section">Banda</p>
            <button class="drawer-item" :class="{ active: isPath('/banda') }" @click="go('/banda')">
              <JubalNavIcon name="band" /><span class="drawer-item__label">Administrar banda</span><span class="drawer-chevron">›</span>
            </button>
            <button class="drawer-item" :class="{ active: isPath('/configuracion') }" @click="go('/configuracion')">
              <JubalNavIcon name="settings" /><span class="drawer-item__label">Configuraciones</span><span class="drawer-chevron">›</span>
            </button>
          </template>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup>
import { ref, nextTick, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBandStore } from '../stores/band'
import JubalNavIcon from './JubalNavIcon.vue'
import { useToast } from '../composables/useToast'
import logoText from '../assets/logo_text.png'

const props = defineProps({ open: Boolean })
const emit  = defineEmits(['close'])

const route  = useRoute()
const router = useRouter()
const band   = useBandStore()
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

function isPath(p) { return route.path.startsWith(p) }

function roleLabel(r) {
  return { leader: 'Líder', musician: 'Músico', singer: 'Corista' }[r] || r
}

function goPractice() {
  band.enterPersonal()
  router.push('/practica')
  emit('close')
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

const creating  = ref(false)
const busy      = ref(false)
const newName   = ref('')
const nameInput = ref(null)

async function startCreate() {
  creating.value = true
  await nextTick()
  nameInput.value?.focus()
}

async function create() {
  if (!newName.value.trim() || busy.value) return
  busy.value = true
  try {
    await band.createBand(newName.value.trim())
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

</script>

<style scoped>
.drawer-dialog { position: fixed; inset: 0 auto 0 0; width: min(88vw, 380px); max-width: 100%; height: 100dvh; max-height: none; margin: 0; padding: 0; border: 0; border-right: 1px solid var(--color-border); border-radius: 0 24px 24px 0; background: var(--color-surface-raised); color: var(--color-text-primary); overflow: hidden; }
.drawer-dialog::backdrop { background: var(--color-overlay); backdrop-filter: blur(5px); }
.drawer { display: flex; flex-direction: column; height: 100%; border: 0; border-radius: inherit; box-shadow: var(--shadow-modal); }
.drawer-heading { display: flex; justify-content: space-between; align-items: center; padding: calc(14px + env(safe-area-inset-top)) 18px 14px; gap: 12px; border-bottom: 1px solid var(--color-border); }
.drawer-logo-wrap { position: relative; width: 170px; height: 52px; overflow: hidden; }
.drawer-logo { position: absolute; top: -11px; left: -30px; width: 220px; max-width: none; height: auto; display: block; }
.drawer-close { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; padding: 0; border: 1px solid var(--color-border); border-radius: 50%; background: var(--color-surface-secondary); color: var(--color-text-primary); cursor: pointer; }
.drawer-close svg { width: 16px; height: 16px; display: block; }
.drawer-content { padding: 4px 14px calc(20px + env(safe-area-inset-bottom)); overflow-y: auto; overscroll-behavior: contain; }
.drawer-section { margin: 22px 8px 8px; color: var(--color-text-muted); font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.drawer-item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 50px; padding: 10px 12px; border: 1px solid transparent; border-radius: 12px; background: transparent; color: var(--color-text-primary); text-align: left; font-size: 14px; cursor: pointer; transition: transform var(--motion-fast) var(--motion-ease), background-color var(--motion-fast) ease, border-color var(--motion-fast) ease; }
.drawer-item__label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.drawer-item svg { color: var(--color-text-muted); width: 22px; height: 22px; }
.drawer-band-image { width: 26px; height: 26px; flex: 0 0 26px; border-radius: 8px; object-fit: cover; }
.drawer-item small { color: var(--color-text-muted); font-size: 11px; }
.drawer-item:hover { background: var(--color-surface-hover); }
.drawer-item:active { transform: scale(.98); }
.drawer-item.active { background: var(--color-secondary-soft); border-color: var(--color-secondary); border-left: 3px solid var(--color-secondary); color: var(--color-primary); }
.drawer-item.active svg { color: var(--color-primary); }
.drawer-selected { width: 20px; height: 20px; flex: 0 0 20px; display: grid; place-items: center; border-radius: 50%; background: var(--color-primary); color: var(--color-text-on-primary); font-size: 11px; font-weight: 900; }
.drawer-chevron { margin-left: auto; color: var(--color-text-muted); font-size: 22px; }
.drawer-plus { width: 22px; color: var(--color-primary); font-size: 22px; text-align: center; }
.drawer-create { padding: 12px; }
.drawer-create__actions { display: flex; gap: 10px; margin-top: 12px; }
@media (prefers-reduced-motion: no-preference) { .drawer-dialog[open] { animation: menu-slide var(--motion-slow) var(--motion-ease); } .drawer-dialog[open]::backdrop { animation: menu-backdrop var(--motion-base) ease-out; } .drawer-dialog[open] .drawer-item { animation: menu-item-in 300ms var(--motion-ease) both; } .drawer-dialog[open] .drawer-item:nth-of-type(2) { animation-delay: 35ms; } .drawer-dialog[open] .drawer-item:nth-of-type(3) { animation-delay: 70ms; } .drawer-dialog[open] .drawer-item:nth-of-type(4) { animation-delay: 105ms; } @keyframes menu-slide { from { opacity: 0; transform: translateX(-100%); } to { opacity: 1; transform: translateX(0); } } @keyframes menu-backdrop { from { opacity: 0; } to { opacity: 1; } } @keyframes menu-item-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } } }
</style>
