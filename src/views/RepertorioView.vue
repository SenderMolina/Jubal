<template>
  <div>
    <!-- ── Crear nuevo repertorio ── -->
    <div v-if="roleStore.isLeader && !creating" class="page-actions">
      <button class="btn-pill btn-pill--primary" @click="startCreate">
        <span class="btn-pill__icon">+</span> Crear repertorio
      </button>
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
    <div v-else class="repertoire-list">
      <div
        v-for="r in store.repertoires"
        :key="r.id"
        class="repertoire-card"
        @click="router.push('/repertorio/' + r.id)"
        @contextmenu.prevent="roleStore.isLeader && openCtx($event, r)"
      >
        <div>
          <div class="repertoire-card__name">{{ r.name }}</div>
          <div class="repertoire-card__count">
            {{ (r.songs || []).length }} canción{{ (r.songs || []).length === 1 ? '' : 'es' }}
          </div>
        </div>
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

<style scoped>
.repertoire-list {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-surface);
}

.repertoire-card {
  min-height: 72px;
  padding: 15px 17px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background .15s ease;
}

.repertoire-card:last-child { border-bottom: 0; }
.repertoire-card:hover { background: var(--color-surface-hover); }
.repertoire-card:active { background: var(--color-primary-soft); }
.repertoire-card__name { color: var(--color-text-primary); font-family: var(--font-display); font-size: 16px; font-weight: 600; }
.repertoire-card__count { margin-top: 3px; color: var(--color-text-secondary); font-size: 13px; }
</style>
