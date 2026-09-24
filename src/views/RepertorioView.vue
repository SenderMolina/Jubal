<template>
  <div>
    <!-- ── Crear nuevo repertorio ── -->
    <div v-if="band.can.editLibrary && !creating" class="page-actions">
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
      <!-- Opciones con botón visible: el long-press (contextmenu) no existe en iOS. -->
      <div
        v-for="r in store.repertoires"
        :key="r.id"
        class="repertoire-card"
        @contextmenu.prevent="band.can.editLibrary && openMenu(r)"
      >
        <RouterLink class="repertoire-card__link" :to="'/repertorio/' + r.id">
          <span class="repertoire-card__name">{{ r.name }}</span>
          <span class="repertoire-card__count">
            {{ (r.songs || []).length }} canción{{ (r.songs || []).length === 1 ? '' : 'es' }}
          </span>
        </RouterLink>
        <button v-if="band.can.editLibrary" class="dots-btn repertoire-card__menu" type="button" :aria-label="`Opciones de ${r.name}`" @click="openMenu(r)">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>
    </div>

    <ActionSheet ref="sheet" />
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import ActionSheet from '../components/ActionSheet.vue'

const store     = useAppStore()
const band = useBandStore()
const { attempt } = useToast()
const { confirm }   = useConfirm()

const creating    = ref(false)
const newName     = ref('')
const createInput = ref(null)
const sheet       = ref(null)

function startCreate() {
  creating.value = true
  newName.value = ''
  nextTick(() => createInput.value?.focus())
}

async function confirmCreate() {
  const name = newName.value.trim()
  if (!name) return
  const ok = await attempt(() => store.createRepertoire(name), { success: 'Repertorio creado', error: 'No se pudo crear el repertorio.' })
  if (!ok) return
  creating.value = false
  newName.value = ''
}

function cancelCreate() {
  creating.value = false
  newName.value = ''
}

function openMenu(r) {
  sheet.value?.open({
    title: r.name,
    actions: [
      { label: 'Eliminar repertorio', icon: 'trash', danger: true, onSelect: () => deleteRepertoire(r) },
    ],
  })
}

async function deleteRepertoire(r) {
  const ok = await confirm('¿Eliminar repertorio?', `"${r.name}"`)
  if (!ok) return
  await attempt(() => store.deleteRepertoire(r.id), { success: 'Repertorio eliminado', error: 'No se pudo eliminar el repertorio.' })
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
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  transition: background .15s ease;
}
.repertoire-card__link {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-self: stretch;
  justify-content: center;
  padding: 15px 4px 15px 17px;
  color: inherit;
  text-decoration: none;
}
.repertoire-card__link:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; border-radius: 12px; }
.repertoire-card__menu { width: 44px; height: 44px; justify-content: center; margin-right: 8px; border-radius: 50%; }
.repertoire-card__menu:focus-visible { outline: 2px solid var(--color-primary); }

.repertoire-card:last-child { border-bottom: 0; }
.repertoire-card:hover { background: var(--color-surface-hover); }
.repertoire-card:active { background: var(--color-primary-soft); }
.repertoire-card__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-text-primary); font-family: var(--font-display); font-size: 16px; font-weight: 600; }
.repertoire-card__count { margin-top: 3px; color: var(--color-text-secondary); font-size: 13px; }
</style>
