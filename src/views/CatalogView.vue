<template>
  <div class="catalog-page">
    <PageBackHeader eyebrow="Ejercicios" title="Fuentes y técnicas" back-label="Volver a ejercicios" to="/entrenar" />

    <div class="catalog-tabs" role="tablist" aria-label="Catálogo">
      <button v-for="tab in TABS" :key="tab.kind" role="tab" :aria-selected="kind === tab.kind" :class="{ active: kind === tab.kind }" @click="kind = tab.kind">
        {{ tab.label }} <span>{{ tab.kind === 'source' ? store.sources.length : store.techniques.length }}</span>
      </button>
    </div>

    <p class="catalog-hint">{{ current.hint }}</p>

    <form class="catalog-add" @submit.prevent="add">
      <input v-model="newName" class="form-input" type="text" maxlength="80" :placeholder="current.placeholder" :aria-label="`Nueva ${current.singular}`">
      <button class="btn btn-primary" :disabled="!newName.trim()">Agregar</button>
    </form>

    <div v-if="!items.length" class="activity-empty">Aún no hay {{ current.label.toLocaleLowerCase('es') }}. Agrega la primera arriba.</div>
    <div v-else class="tipos-list">
      <div v-for="item in items" :key="item.id" class="tipos-item">
        <form v-if="editingId === item.id" class="catalog-rename" @submit.prevent="rename(item)">
          <input ref="renameInput" v-model="editName" class="form-input" type="text" maxlength="80" aria-label="Nuevo nombre" @keydown.esc="editingId = null">
          <button class="btn btn-primary btn-sm" :disabled="!editName.trim()">Guardar</button>
          <button type="button" class="btn btn-sm" @click="editingId = null">Cancelar</button>
        </form>
        <template v-else>
          <button class="tipos-item__info catalog-item__name" :aria-label="`Renombrar ${item.name}`" @click="startRename(item)">
            <span class="tipos-item__name">{{ item.name }}</span>
            <span class="tipos-item__count">{{ usage(item) }}</span>
          </button>
          <button class="tipos-item__delete" :aria-label="`Eliminar ${item.name}`" @click="remove(item)">✕</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import PageBackHeader from '../components/PageBackHeader.vue'

const TABS = [
  { kind: 'source', label: 'Fuentes', singular: 'fuente', placeholder: 'Ej. Manual de Julio Valle', hint: 'De dónde sale cada ejercicio: un manual, un canal de YouTube, un solo que escuchaste…' },
  { kind: 'technique', label: 'Técnicas', singular: 'técnica', placeholder: 'Ej. Sweep picking', hint: 'Qué trabaja cada ejercicio. Un ejercicio puede tener varias técnicas.' },
]

const store = usePracticeStore()
const { attempt } = useToast()
const { confirm } = useConfirm()

const kind = ref('source')
const current = computed(() => TABS.find(tab => tab.kind === kind.value))
const items = computed(() => kind.value === 'source' ? store.sources : store.techniques)
const newName = ref('')
const editingId = ref(null)
const editName = ref('')
const renameInput = ref(null)

function count(item) {
  return store.skills.filter(s => item.kind === 'source' ? s.source_id === item.id : s.technique_ids?.includes(item.id)).length
}

function usage(item) {
  const n = count(item)
  return `${n} ejercicio${n === 1 ? '' : 's'}`
}

async function add() {
  const ok = await attempt(() => store.createCatalogItem(kind.value, newName.value), { success: 'Agregada al catálogo', error: 'No se pudo agregar.' })
  if (ok) newName.value = ''
}

async function startRename(item) {
  editingId.value = item.id
  editName.value = item.name
  await nextTick()
  renameInput.value?.[0]?.focus()
}

async function rename(item) {
  if (editName.value.trim() === item.name) { editingId.value = null; return }
  const ok = await attempt(() => store.renameCatalogItem(item.id, editName.value), { success: 'Nombre actualizado', error: 'No se pudo renombrar.' })
  if (ok) editingId.value = null
}

async function remove(item) {
  const n = count(item)
  const detail = n ? `${n} ejercicio${n === 1 ? '' : 's'} quedará${n === 1 ? '' : 'n'} sin esta ${current.value.singular}.` : 'No la usa ningún ejercicio.'
  if (!await confirm(`¿Eliminar "${item.name}"?`, detail)) return
  await attempt(() => store.deleteCatalogItem(item.id), { success: 'Eliminada del catálogo', error: 'No se pudo eliminar.' })
}

onMounted(() => { if (!store.ready) store.loadSkills() })
</script>

<style scoped>
.catalog-page { max-width: 560px; margin-inline: auto; padding-bottom: 24px; }
.catalog-tabs { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 14px; background: var(--color-surface-secondary); }
.catalog-tabs button { min-height: 44px; border: 0; border-radius: 11px; background: transparent; color: var(--color-text-secondary); font: inherit; font-size: 14px; font-weight: 800; cursor: pointer; }
.catalog-tabs button span { margin-left: 4px; color: var(--color-text-muted); font-weight: 700; }
.catalog-tabs button.active { background: var(--color-surface); color: var(--color-primary-hover); box-shadow: var(--shadow-small); }
.catalog-hint { margin: 12px 2px; color: var(--color-text-muted); font-size: 13px; line-height: 1.5; }
.catalog-add { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; margin-bottom: 16px; }
.catalog-add .btn { min-height: 48px; }
.catalog-item__name { flex: 1; min-width: 0; border: 0; background: none; font: inherit; text-align: left; cursor: pointer; }
.catalog-rename { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; }
</style>
