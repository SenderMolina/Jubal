<template>
  <Teleport to="body">
    <Transition name="song-picker">
      <div v-if="open" class="song-picker-overlay" @click.self="$emit('close')" @keydown.esc="$emit('close')">
        <section class="song-picker" role="dialog" aria-modal="true" :aria-labelledby="`${uid}-title`">
          <div class="song-picker__handle" aria-hidden="true"></div>

          <header class="song-picker__head">
            <div>
              <span>{{ eyebrow }}</span>
              <h2 :id="`${uid}-title`">Agregar canciones</h2>
            </div>
            <button type="button" aria-label="Cerrar" @click="$emit('close')">×</button>
          </header>

          <div v-if="withRepertoires" class="song-picker__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'songs'"
              :class="{ active: tab === 'songs' }"
              @click="tab = 'songs'"
            >Canciones</button>
            <button
              type="button"
              role="tab"
              :aria-selected="tab === 'repertoires'"
              :class="{ active: tab === 'repertoires' }"
              @click="tab = 'repertoires'"
            >Repertorios</button>
          </div>

          <template v-if="tab === 'songs'">
            <div class="search-box song-picker__search">
              <span class="search-box__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>
                </svg>
              </span>
              <input
                ref="searchInput"
                v-model="query"
                class="search-box__input"
                type="search"
                placeholder="Buscar canción…"
                aria-label="Buscar canción"
              >
            </div>

            <div v-if="store.songTypes.length" class="type-pills song-picker__types">
              <button type="button" class="type-pill" :class="{ active: !type }" :aria-pressed="!type" @click="type = ''">Todos</button>
              <button
                v-for="t in store.songTypes"
                :key="t.id"
                type="button"
                class="type-pill"
                :class="{ active: type === String(t.id) }"
                :aria-pressed="type === String(t.id)"
                @click="type = String(t.id)"
              >{{ t.name }}</button>
            </div>
          </template>

          <div class="song-picker__summary">
            <span>{{ pendingIds.length }} canci{{ pendingIds.length === 1 ? 'ón' : 'ones' }} por agregar</span>
            <button v-if="selectedSongs.size || selectedReps.size" type="button" @click="clearSelection">Limpiar</button>
          </div>

          <div v-if="tab === 'repertoires'" class="song-picker__list">
            <button
              v-for="rep in store.repertoires"
              :key="rep.id"
              class="song-picker__row"
              :class="{ selected: selectedReps.has(rep.id), locked: !newIdsOf(rep).length }"
              type="button"
              :disabled="!newIdsOf(rep).length"
              :aria-pressed="selectedReps.has(rep.id)"
              @click="selectedReps = toggled(selectedReps, rep.id)"
            >
              <span class="song-picker__row-body">
                <strong>{{ rep.name }}</strong>
                <small>
                  {{ (rep.songs || []).length }} canci{{ (rep.songs || []).length === 1 ? 'ón' : 'ones' }}
                  <template v-if="newIdsOf(rep).length && newIdsOf(rep).length < (rep.songs || []).length"> · {{ newIdsOf(rep).length }} nueva{{ newIdsOf(rep).length === 1 ? '' : 's' }}</template>
                </small>
              </span>
              <span v-if="!newIdsOf(rep).length" class="song-picker__label">{{ (rep.songs || []).length ? 'Ya agregado' : 'Vacío' }}</span>
              <span v-else class="song-picker__status" aria-hidden="true">{{ selectedReps.has(rep.id) ? '✓' : '+' }}</span>
            </button>

            <div v-if="!store.repertoires.length" class="song-picker__empty">Aún no tienes repertorios</div>
          </div>

          <div v-else class="song-picker__list">
            <button
              v-for="song in visibleSongs"
              :key="song.id"
              class="song-picker__row"
              :class="{ selected: selectedSongs.has(song.id), locked: lockedLabels[song.id] }"
              type="button"
              :disabled="Boolean(lockedLabels[song.id])"
              :aria-pressed="selectedSongs.has(song.id)"
              @click="selectedSongs = toggled(selectedSongs, song.id)"
            >
              <span class="song-picker__row-body">
                <strong>{{ song.title }}</strong>
                <small>{{ [song.author, song.key && `Tono ${song.key}`].filter(Boolean).join(' · ') || 'Sin datos adicionales' }}</small>
              </span>
              <span v-if="lockedLabels[song.id]" class="song-picker__label">{{ lockedLabels[song.id] }}</span>
              <span v-else class="song-picker__status" aria-hidden="true">{{ selectedSongs.has(song.id) ? '✓' : '+' }}</span>
            </button>

            <div v-if="!visibleSongs.length" class="song-picker__empty">
              {{ query || type ? 'No se encontraron canciones' : emptyText }}
            </div>
          </div>

          <footer class="song-picker__actions">
            <button class="btn btn-ghost" type="button" @click="$emit('close')">Cancelar</button>
            <button class="btn btn-primary" type="button" :disabled="!pendingIds.length" @click="$emit('accept', pendingIds)">
              Agregar<span v-if="pendingIds.length"> ({{ pendingIds.length }})</span>
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useAppStore } from '../stores/app'

// Hoja para elegir canciones de la biblioteca (y opcionalmente repertorios
// completos). Emite `accept` con los ids nuevos, sin repetidos; el padre guarda.
const props = defineProps({
  open: { type: Boolean, default: false },
  eyebrow: { type: String, default: '' },
  // Canciones que ya están en el destino: no se listan.
  excludeIds: { type: Array, default: () => [] },
  // Canciones que se ven pero no se pueden elegir: { [songId]: 'motivo' }.
  lockedLabels: { type: Object, default: () => ({}) },
  withRepertoires: { type: Boolean, default: false },
  emptyText: { type: String, default: 'Todas las canciones ya están agregadas' },
})
defineEmits(['close', 'accept'])

const store = useAppStore()
const uid = useId()
const searchInput = ref(null)
const tab = ref('songs')
const query = ref('')
const type = ref('')
const selectedSongs = ref(new Set())
const selectedReps = ref(new Set())

const excluded = computed(() => new Set(props.excludeIds.map(String)))
const songIds = computed(() => new Set(store.songs.map(song => String(song.id))))

const visibleSongs = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.songs.filter(song => {
    if (excluded.value.has(String(song.id))) return false
    const matchesQuery = !q ||
      song.title.toLowerCase().includes(q) ||
      (song.author || '').toLowerCase().includes(q) ||
      (song.key || '').toLowerCase().includes(q)
    const matchesType = !type.value || (song.types || []).map(String).includes(type.value)
    return matchesQuery && matchesType
  }).sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }))
})

// Canciones de un repertorio que se agregarían: existentes, ni excluidas ni bloqueadas.
function newIdsOf(rep) {
  return (rep.songs || []).filter(id =>
    songIds.value.has(String(id)) && !excluded.value.has(String(id)) && !props.lockedLabels[id])
}

const pendingIds = computed(() => {
  const ids = [...selectedSongs.value]
  for (const rep of store.repertoires) {
    if (selectedReps.value.has(rep.id)) ids.push(...newIdsOf(rep))
  }
  return [...new Set(ids)]
})

// Set nuevo en cada cambio: Vue no rastrea add/delete dentro de un Set en ref.
function toggled(selection, id) {
  const next = new Set(selection)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

function clearSelection() {
  selectedSongs.value = new Set()
  selectedReps.value = new Set()
}

// Al abrir: estado limpio, foco en la búsqueda y sin scroll de fondo.
let previousOverflow = ''
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    tab.value = 'songs'
    query.value = ''
    type.value = ''
    clearSelection()
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    searchInput.value?.focus()
  } else {
    document.body.style.overflow = previousOverflow
  }
})
onBeforeUnmount(() => { if (props.open) document.body.style.overflow = previousOverflow })
</script>

<style scoped>
.song-picker-overlay { position: fixed; z-index: 1300; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding-top: 54px; background: var(--color-overlay); }
.song-picker { width: min(100%, 600px); height: min(86dvh, 780px); display: flex; flex-direction: column; overflow: hidden; padding: 8px 16px calc(14px + env(safe-area-inset-bottom)); border: 1px solid var(--color-border); border-bottom: 0; border-radius: 24px 24px 0 0; background: var(--color-background); box-shadow: var(--shadow-modal); }
.song-picker__handle { width: 42px; height: 4px; flex: 0 0 4px; margin: 0 auto 10px; border-radius: 999px; background: var(--color-border-strong); }
.song-picker__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 2px 2px 12px; }
.song-picker__head > div { min-width: 0; }
.song-picker__head span { display: block; max-width: 250px; overflow: hidden; color: var(--color-accent); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.song-picker__head h2 { margin-top: 2px; font-size: 21px; }
.song-picker__head button { width: 40px; height: 40px; flex: 0 0 40px; border: 1px solid var(--color-border); border-radius: 50%; background: var(--color-surface); color: var(--color-text-primary); font-size: 22px; cursor: pointer; }
.song-picker__tabs { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px; padding: 4px; border-radius: 12px; background: var(--color-surface-secondary); }
.song-picker__tabs button { min-height: 36px; border: 0; border-radius: 9px; background: transparent; color: var(--color-text-muted); font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s, color .15s; }
.song-picker__tabs button.active { background: var(--color-surface); color: var(--color-primary); box-shadow: var(--shadow-small); }
.song-picker__search { flex: 0 0 auto; }
.song-picker__search svg { width: 18px; height: 18px; }
.song-picker__types { flex: 0 0 auto; margin-top: 8px; }
.song-picker__summary { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 5px 2px; color: var(--color-text-secondary); font-size: 12px; }
.song-picker__summary button { padding: 6px 0; border: 0; background: transparent; color: var(--color-link); font-size: 12px; cursor: pointer; }
.song-picker__list { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; margin-top: 3px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface); }
.song-picker__row { width: 100%; min-height: 62px; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--color-border); background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; transition: background .15s ease; }
.song-picker__row:last-of-type { border-bottom: 0; }
.song-picker__row:hover { background: var(--color-surface-hover); }
.song-picker__row.selected { background: var(--color-secondary-soft); }
.song-picker__row.locked { cursor: default; opacity: .68; }
.song-picker__row-body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.song-picker__row-body strong { max-width: 100%; overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__row-body small { max-width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__status { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 50%; background: var(--color-secondary-soft); color: var(--color-primary); font-family: var(--font-display); font-size: 20px; }
.song-picker__row.selected .song-picker__status { background: var(--color-success); color: var(--color-text-on-primary); font-size: 16px; }
.song-picker__label { max-width: 92px; overflow: hidden; padding: 5px 8px; border-radius: 8px; background: var(--color-surface-secondary); color: var(--color-text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__empty { display: grid; place-items: center; min-height: 150px; padding: 20px; color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.song-picker__actions { display: grid; grid-template-columns: 1fr 1.35fr; gap: 10px; padding-top: 12px; }
.song-picker__actions .btn { width: 100%; }

.song-picker-enter-active, .song-picker-leave-active { transition: opacity .2s ease; }
.song-picker-enter-active .song-picker, .song-picker-leave-active .song-picker { transition: transform .25s ease; }
.song-picker-enter-from, .song-picker-leave-to { opacity: 0; }
.song-picker-enter-from .song-picker, .song-picker-leave-to .song-picker { transform: translateY(100%); }

@media (prefers-reduced-motion: reduce) {
  .song-picker-enter-active, .song-picker-leave-active,
  .song-picker-enter-active .song-picker, .song-picker-leave-active .song-picker { transition: none; }
}
</style>
