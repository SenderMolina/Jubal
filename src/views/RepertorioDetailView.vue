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
        @click="pickerOpen = true"
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

    <SongPicker
      :open="pickerOpen"
      eyebrow="Repertorio"
      :exclude-ids="repertoire?.songs || []"
      empty-text="Todas las canciones ya están en el repertorio"
      @close="pickerOpen = false"
      @accept="addSongs"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import { clearLoadError, reportLoadError } from '../composables/useLoadErrors'
import draggable from 'vuedraggable'
import SongPicker from '../components/SongPicker.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const band = useBandStore()
const { showError, attempt } = useToast()

const pickerOpen = ref(false)
const linkedSongs = ref([])
const editingName = ref(false)
const editName    = ref('')
const nameInput   = ref(null)
let songSaveRunning = false
let songSaveQueued = false

const repertoire = computed(() =>
  store.repertoires.find(r => r.id === Number(route.params.id))
)

const songById = computed(() => new Map(
  [...store.songs, ...linkedSongs.value].map(song => [String(song.id), song])
))

const songObjects = computed(() =>
  (repertoire.value?.songs || []).map(id => songById.value.get(String(id))).filter(Boolean)
)

function addSongs(songIds) {
  pickerOpen.value = false
  if (!repertoire.value || !songIds.length) return
  repertoire.value.songs = [...(repertoire.value.songs || []), ...songIds]
  queueSongSave()
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
      showError(reason, 'No se pudieron guardar las canciones')
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
  const name = editName.value.trim()
  if (name && name !== repertoire.value.name) {
    await attempt(() => store.renameRepertoire(repertoire.value.id, name), { success: 'Nombre actualizado', error: 'No se pudo renombrar el repertorio.' })
  }
  editingName.value = false
}

async function loadLinkedSongs() {
  try {
    linkedSongs.value = await store.getSongsByIds(repertoire.value?.songs || [])
    clearLoadError('canciones del repertorio')
  } catch (reason) { reportLoadError('canciones del repertorio', reason, loadLinkedSongs) }
}

onMounted(async () => {
  await store.loadSongs()
  await loadLinkedSongs()
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

.repertoire-empty { padding: 26px 4px; background: transparent; color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.drag-ghost { background: var(--color-primary-soft); opacity: .55; }

@media (max-width: 360px) {
  .repertoire-song-row__main { gap: 5px; padding-inline: 8px; }
}

</style>
