<template>
  <div class="repertoire-detail">
    <header class="repertoire-heading">
      <div class="repertoire-heading__info">
        <div v-if="!editingName" class="activity-detail-title" @click="band.isLeader && startEditName()">
          {{ repertoire?.name }}
        </div>
        <input
          v-else
          ref="nameInput"
          class="repertorio-name-input"
          v-model="editName"
          @keydown.enter="confirmEditName"
          @keydown.escape="editingName = false"
          @blur="confirmEditName"
        >
        <div class="activity-detail-meta">
          {{ (repertoire?.songs || []).length }} canción{{ (repertoire?.songs || []).length === 1 ? '' : 'es' }}
        </div>
      </div>
      <button
        v-if="band.isLeader"
        class="repertoire-heading__add"
        type="button"
        aria-label="Agregar canciones"
        @click="openSongPicker"
      >+</button>
    </header>

    <template v-if="repertoire">
      <section class="repertoire-section" aria-label="Canciones del repertorio">
        <div v-if="!songObjects.length" class="repertoire-empty">
          Aún no hay canciones en este repertorio.
        </div>

        <draggable
          v-else
          :model-value="songObjects"
          @update:model-value="onReorder"
          item-key="id"
          handle=".drag-handle"
          ghost-class="drag-ghost"
          class="repertoire-song-list"
        >
          <template #item="{ element: song, index }">
            <div class="repertoire-song-row">
              <div class="repertoire-song-row__main">
                <span v-if="band.isLeader" class="drag-handle" aria-label="Reordenar">⠿</span>
                <span class="repertoire-song-row__number">{{ index + 1 }}</span>
                <button
                  class="repertoire-song-row__content"
                  type="button"
                  @click="router.push('/cancion/' + song.id + '?rep=' + repertoire.id)"
                >
                  <strong>{{ song.title }}</strong>
                  <small>{{ [song.author, song.key && `Tono ${song.key}`].filter(Boolean).join(' · ') || 'Sin datos adicionales' }}</small>
                </button>
                <button
                  v-if="band.isLeader"
                  class="repertoire-song-row__remove"
                  type="button"
                  :aria-label="`Quitar ${song.title}`"
                  @click="removeSong(song.id)"
                >×</button>
              </div>

            </div>
          </template>
        </draggable>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="song-picker">
        <div v-if="pickerOpen" class="song-picker-overlay" @click.self="closeSongPicker" @keydown.esc="closeSongPicker">
          <section class="song-picker" role="dialog" aria-modal="true" aria-labelledby="song-picker-title">
            <div class="song-picker__handle" aria-hidden="true"></div>

            <header class="song-picker__head">
              <div>
                <span>Repertorio</span>
                <h2 id="song-picker-title">Agregar canciones</h2>
              </div>
              <button type="button" aria-label="Cerrar" @click="closeSongPicker">×</button>
            </header>

            <div class="search-box song-picker__search">
              <span class="search-box__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>
                </svg>
              </span>
              <input
                ref="pickerSearch"
                v-model="libQuery"
                class="search-box__input"
                type="search"
                placeholder="Buscar canción…"
                aria-label="Buscar canción"
              >
            </div>

            <div class="song-picker__summary">
              <span>{{ selectedSongIds.size }} seleccionada{{ selectedSongIds.size === 1 ? '' : 's' }}</span>
              <button v-if="selectedSongIds.size" type="button" @click="clearSongSelection">Limpiar</button>
            </div>

            <div class="song-picker__list">
              <button
                v-for="song in pickerSongs"
                :key="song.id"
                class="song-picker__row"
                :class="{ selected: selectedSongIds.has(song.id) }"
                type="button"
                :aria-pressed="selectedSongIds.has(song.id)"
                @click="toggleSongSelection(song.id)"
              >
                <span class="song-picker__row-body">
                  <strong>{{ song.title }}</strong>
                  <small>{{ [song.author, song.key && `Tono ${song.key}`].filter(Boolean).join(' · ') || 'Sin datos adicionales' }}</small>
                </span>
                <span class="song-picker__status" aria-hidden="true">
                  {{ selectedSongIds.has(song.id) ? '✓' : '+' }}
                </span>
              </button>

              <div v-if="!pickerSongs.length" class="song-picker__empty">
                {{ libQuery ? 'No se encontraron canciones' : 'Todas las canciones ya están en el repertorio' }}
              </div>
            </div>

            <footer class="song-picker__actions">
              <button class="btn btn-ghost" type="button" @click="closeSongPicker">Cancelar</button>
              <button class="btn btn-primary" type="button" :disabled="!selectedSongIds.size" @click="acceptSongSelection">
                Aceptar<span v-if="selectedSongIds.size"> ({{ selectedSongIds.size }})</span>
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import draggable from 'vuedraggable'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const band = useBandStore()
const { showToast } = useToast()

const libQuery    = ref('')
const pickerOpen = ref(false)
const pickerSearch = ref(null)
const selectedSongIds = ref(new Set())
const linkedSongs = ref([])
const editingName = ref(false)
const editName    = ref('')
const nameInput   = ref(null)
let songSaveRunning = false
let songSaveQueued = false
let previousBodyOverflow = ''

const repertoire = computed(() =>
  store.repertoires.find(r => r.id === Number(route.params.id))
)

const songById = computed(() => new Map(
  [...store.songs, ...linkedSongs.value].map(song => [String(song.id), song])
))

const songObjects = computed(() =>
  (repertoire.value?.songs || []).map(id => songById.value.get(String(id))).filter(Boolean)
)

const pickerSongs = computed(() => {
  const inSet = new Set((repertoire.value?.songs || []).map(String))
  const q = libQuery.value.trim().toLowerCase()
  return store.songs.filter(s => {
    if (inSet.has(String(s.id))) return false
    if (!q) return true
    return s.title.toLowerCase().includes(q) ||
      (s.author || '').toLowerCase().includes(q) ||
      (s.key || '').toLowerCase().includes(q)
  }).sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }))
})

function openSongPicker() {
  libQuery.value = ''
  selectedSongIds.value = new Set()
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  pickerOpen.value = true
  nextTick(() => pickerSearch.value?.focus())
}

function closeSongPicker() {
  pickerOpen.value = false
  selectedSongIds.value = new Set()
  document.body.style.overflow = previousBodyOverflow
}

function toggleSongSelection(songId) {
  const next = new Set(selectedSongIds.value)
  if (next.has(songId)) next.delete(songId)
  else next.add(songId)
  selectedSongIds.value = next
}

function clearSongSelection() {
  selectedSongIds.value = new Set()
}

function acceptSongSelection() {
  if (!selectedSongIds.value.size || !repertoire.value) return
  const existing = new Set((repertoire.value.songs || []).map(String))
  const additions = [...selectedSongIds.value].filter(id => !existing.has(String(id)))
  if (additions.length) {
    repertoire.value.songs = [...(repertoire.value.songs || []), ...additions]
    queueSongSave()
  }
  closeSongPicker()
}

async function save() {
  try { await store.saveRepertoires(); return true }
  catch (reason) { showToast(reason.message || 'No se pudo guardar el repertorio'); return false }
}

function queueSongSave() {
  songSaveQueued = true
  if (!songSaveRunning) flushSongSave()
}

async function flushSongSave() {
  if (songSaveRunning) return
  songSaveRunning = true
  while (songSaveQueued) {
    songSaveQueued = false
    const current = repertoire.value
    if (!current) break
    try {
      await store.saveRepertoireSongs(current.id, current.songs || [])
    } catch (reason) {
      songSaveQueued = false
      showToast(reason.message || 'No se pudieron guardar las canciones')
      await store.loadRepertoires()
      break
    }
  }
  songSaveRunning = false
}

function removeSong(songId) {
  repertoire.value.songs = repertoire.value.songs.filter(id => String(id) !== String(songId))
  queueSongSave()
}

function onReorder(newList) {
  repertoire.value.songs = newList.map(s => s.id)
  queueSongSave()
}

function startEditName() {
  editName.value = repertoire.value.name
  editingName.value = true
  nextTick(() => nameInput.value?.focus())
}

async function confirmEditName() {
  if (editName.value.trim() && editName.value.trim() !== repertoire.value.name) {
    const previous = repertoire.value.name
    repertoire.value.name = editName.value.trim()
    if (await save()) showToast('Nombre actualizado')
    else repertoire.value.name = previous
  }
  editingName.value = false
}

onMounted(async () => {
  await store.loadSongs()
  linkedSongs.value = await store.getSongsByIds(repertoire.value?.songs || [])
})
onBeforeUnmount(() => {
  if (pickerOpen.value) document.body.style.overflow = previousBodyOverflow
})
</script>

<style scoped>
.repertoire-detail { display: flex; flex-direction: column; gap: 0; }

.repertoire-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 4px 2px 16px;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
}

.repertoire-heading__info { min-width: 0; flex: 1; }
.repertoire-heading__add { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border: 0; border-radius: 13px; background: var(--color-primary); color: var(--color-text-on-primary); font-size: 24px; cursor: pointer; }
.repertoire-heading__add:active { background: var(--color-primary-pressed); transform: scale(.97); }
.activity-detail-title { cursor: pointer; }
.activity-detail-meta { margin-top: 4px; color: var(--color-text-secondary); font-size: 13px; }
.repertorio-name-input { width: 100%; }

.repertoire-section { min-width: 0; }

.repertoire-song-list {
  overflow: hidden;
  background: var(--color-surface);
}

.repertoire-song-row { border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.repertoire-song-row:last-child { border-bottom: 0; }
.repertoire-song-row__main { min-height: 66px; display: flex; align-items: center; gap: 8px; padding: 9px 10px; }
.drag-handle { width: 22px; flex: 0 0 22px; display: grid; place-items: center; color: var(--color-text-muted); font-size: 17px; cursor: grab; touch-action: none; }
.drag-handle:active { cursor: grabbing; }
.repertoire-song-row__number { width: 22px; flex: 0 0 22px; color: var(--color-primary); font-family: var(--font-display); font-size: 14px; font-weight: 600; text-align: center; }
.repertoire-song-row__content { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 3px 2px; border: 0; background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; }
.repertoire-song-row__content strong { max-width: 100%; overflow: hidden; font-size: 14px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.repertoire-song-row__content small { max-width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.repertoire-song-row__remove { width: 34px; height: 34px; flex: 0 0 34px; border: 0; border-radius: 10px; background: var(--color-danger-soft); color: var(--color-danger); font-size: 18px; cursor: pointer; }
.repertoire-song-row__remove:active { background: var(--color-danger); color: var(--color-text-on-primary); }

.song-picker-overlay { position: fixed; z-index: 1300; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding-top: 54px; background: var(--color-overlay); }
.song-picker { width: min(100%, 600px); height: min(82dvh, 760px); display: flex; flex-direction: column; overflow: hidden; padding: 8px 16px calc(14px + env(safe-area-inset-bottom)); border: 1px solid var(--color-border); border-bottom: 0; border-radius: 24px 24px 0 0; background: var(--color-background); box-shadow: var(--shadow-modal); }
.song-picker__handle { width: 42px; height: 4px; flex: 0 0 4px; margin: 0 auto 10px; border-radius: 999px; background: var(--color-border-strong); }
.song-picker__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 2px 2px 14px; border: 0; background: transparent; }
.song-picker__head span { color: var(--color-accent); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.song-picker__head h2 { margin-top: 2px; font-size: 21px; }
.song-picker__head button { width: 40px; height: 40px; flex: 0 0 40px; border: 1px solid var(--color-border); border-radius: 50%; background: var(--color-surface); color: var(--color-text-primary); font-size: 22px; cursor: pointer; }
.song-picker__search { flex: 0 0 auto; }
.song-picker__search svg { width: 18px; height: 18px; }
.song-picker__summary { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 5px 2px; color: var(--color-text-secondary); font-size: 12px; }
.song-picker__summary button { padding: 6px 0; border: 0; background: transparent; color: var(--color-link); font-size: 12px; cursor: pointer; }
.song-picker__list { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; margin-top: 3px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface); }
.song-picker__row { width: 100%; min-height: 62px; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--color-border); background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; transition: background .15s ease; }
.song-picker__row:last-of-type { border-bottom: 0; }
.song-picker__row:hover { background: var(--color-surface-hover); }
.song-picker__row.selected { background: var(--color-secondary-soft); }
.song-picker__row-body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.song-picker__row-body strong { max-width: 100%; overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__row-body small { max-width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__status { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 50%; background: var(--color-secondary-soft); color: var(--color-primary); font-family: var(--font-display); font-size: 20px; }
.song-picker__row.selected .song-picker__status { background: var(--color-success); color: var(--color-text-on-primary); font-size: 16px; }
.song-picker__empty { display: grid; place-items: center; min-height: 150px; padding: 20px; color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.song-picker__actions { display: grid; grid-template-columns: 1fr 1.35fr; gap: 10px; padding-top: 12px; }
.song-picker__actions .btn { width: 100%; }

.song-picker-enter-active, .song-picker-leave-active { transition: opacity .2s ease; }
.song-picker-enter-active .song-picker, .song-picker-leave-active .song-picker { transition: transform .25s ease; }
.song-picker-enter-from, .song-picker-leave-to { opacity: 0; }
.song-picker-enter-from .song-picker, .song-picker-leave-to .song-picker { transform: translateY(100%); }

.repertoire-empty { padding: 26px 4px; background: transparent; color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.drag-ghost { background: var(--color-primary-soft); opacity: .55; }

@media (max-width: 360px) {
  .repertoire-song-row__main { gap: 5px; padding-inline: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .song-picker-enter-active, .song-picker-leave-active,
  .song-picker-enter-active .song-picker, .song-picker-leave-active .song-picker { transition: none; }
}
</style>
