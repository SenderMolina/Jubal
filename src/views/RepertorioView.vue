<template>
  <div>
    <!-- ── Header ── -->
    <div class="songs-header">
      <div>
        <h1 class="songs-header__title">Repertorios</h1>
        <p class="songs-header__subtitle">Listas reutilizables de canciones</p>
      </div>
      <span class="songs-header__count">{{ store.repertoires.length }}</span>
    </div>

    <!-- ── Crear nuevo repertorio ── -->
    <div v-if="roleStore.isLeader && !creating" class="repertorio-create-trigger" @click="startCreate">
      <span class="repertorio-create-trigger__icon">+</span>
      <span>Crear repertorio</span>
    </div>

    <div v-if="creating" class="repertorio-inline-create">
      <input
        ref="createInput"
        class="search-box__input"
        v-model="newName"
        placeholder="Nombre del repertorio…"
        @keydown.enter="confirmCreate"
        @keydown.escape="cancelCreate"
      >
      <div class="repertorio-inline-create__actions">
        <button class="btn btn-primary btn-sm" @click="confirmCreate">Crear</button>
        <button class="btn btn-ghost btn-sm" @click="cancelCreate">Cancelar</button>
      </div>
    </div>

    <!-- ── Lista vacía ── -->
    <div v-if="store.repertoires.length === 0 && !creating" class="songs-empty">
      <span class="songs-empty__icon">🎶</span>
      <p>Aún no hay repertorios creados</p>
    </div>

    <!-- ── Lista de repertorios ── -->
    <div v-else class="songs-grid">
      <div
        v-for="r in store.repertoires"
        :key="r.id"
        class="song-card"
        @click="router.push('/repertorio/' + r.id)"
        @contextmenu.prevent="roleStore.isLeader && openCtx($event, r)"
      >
        <div class="song-card__body">
          <div class="song-card__title">{{ r.name }}</div>
          <div class="song-card__author">{{ (r.songs || []).length }} canciones</div>
          <div class="song-card__meta">
            <span
              v-for="songId in (r.songs || []).slice(0, 3)"
              :key="songId"
              class="song-card__tag song-card__tag--type"
            >{{ songTitle(songId) }}</span>
            <span v-if="(r.songs || []).length > 3" class="song-card__tag song-card__tag--type">+{{ r.songs.length - 3 }}</span>
          </div>
        </div>
        <span class="song-card__chevron">›</span>
      </div>
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div v-if="ctx.visible" class="ctx-overlay" @click="closeCtx">
        <div class="ctx-menu" :style="{ top: ctx.y + 'px', left: ctx.x + 'px' }">
          <button class="ctx-menu__item ctx-menu__item--danger" @click="deleteFromCtx">
            🗑 Eliminar repertorio
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()
const { confirm }   = useConfirm()

const creating    = ref(false)
const newName     = ref('')
const createInput = ref(null)
const ctx         = ref({ visible: false, x: 0, y: 0, item: null })

function songTitle(id) {
  return store.songs.find(s => s.id === id)?.title || '?'
}

function startCreate() {
  creating.value = true
  newName.value = ''
  nextTick(() => createInput.value?.focus())
}

function confirmCreate() {
  if (!newName.value.trim()) return
  store.repertoires.push({
    id: Date.now(),
    name: newName.value.trim(),
    songs: [],
  })
  store.saveRepertoires()
  showToast('Repertorio creado')
  creating.value = false
  newName.value = ''
}

function cancelCreate() {
  creating.value = false
  newName.value = ''
}

function openCtx(e, item) {
  const x = Math.min(e.clientX, window.innerWidth - 200)
  const y = Math.min(e.clientY, window.innerHeight - 60)
  ctx.value = { visible: true, x, y, item }
}

function closeCtx() {
  ctx.value = { visible: false, x: 0, y: 0, item: null }
}

async function deleteFromCtx() {
  const r = ctx.value.item
  closeCtx()
  if (!r) return
  const ok = await confirm('¿Eliminar repertorio?', `"${r.name}"`)
  if (!ok) return
  store.repertoires = store.repertoires.filter(x => x.id !== r.id)
  store.saveRepertoires()
  showToast('Repertorio eliminado')
}
</script>
