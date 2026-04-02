<template>
  <div>
    <!-- ── Header ── -->
    <div class="activity-detail-header">
      <button class="back-btn" @click="router.back()">←</button>
      <div class="activity-detail-info">
        <div class="activity-detail-title">{{ activity?.title }}</div>
        <div class="activity-detail-meta">
          {{ formattedDate }}{{ activity?.time ? ' · ' + activity.time : '' }}
        </div>
        <div v-if="activity?.description" class="activity-detail-desc">{{ activity.description }}</div>
      </div>
      <button v-if="roleStore.isLeader" class="btn btn-danger btn-sm" @click="handleDelete">Eliminar</button>
    </div>

    <!-- ══════════ VISTA LÍDER ══════════ -->
    <template v-if="roleStore.isLeader">
      <div class="activity-workspace">

        <!-- Tabs móvil -->
        <div class="editor-mobile-tabs">
          <button
            class="editor-tab"
            :class="{ active: mobilePanel === 'setlist' }"
            @click="mobilePanel = 'setlist'"
          >Setlist</button>
          <button
            class="editor-tab"
            :class="{ active: mobilePanel === 'biblioteca' }"
            @click="mobilePanel = 'biblioteca'"
          >Biblioteca</button>
        </div>

        <!-- Layout dos columnas -->
        <div class="activity-editor-layout">

          <!-- ── Columna izquierda: Setlist ── -->
          <div class="editor-panel" :class="{ 'panel-hidden-mobile': mobilePanel !== 'setlist' }">
            <div class="editor-panel-header">Setlist</div>
            <div class="editor-panel-content">

              <!-- Estado vacío -->
              <div v-if="!activity?.tiempos?.length && !creatingTiempo" class="setlist-zero-state">
                <p>Crea el primer tiempo para comenzar a armar el setlist.</p>
              </div>

              <!-- Bloques de tiempos -->
              <div
                v-for="tiempo in activity?.tiempos"
                :key="tiempo.id"
                class="tiempo-block"
                :class="{ 'tiempo-selected': selectedTiempoId === tiempo.id }"
                @click="selectedTiempoId = tiempo.id"
              >
                <div class="tiempo-header">
                  <h2 class="tiempo-name">{{ tiempo.name }}</h2>
                  <button class="btn btn-danger btn-sm icon-btn" @click.stop="deleteTiempo(tiempo.id)">✕</button>
                </div>

                <div v-if="!tiempo.songs?.length" class="tiempo-empty">
                  Sin canciones aún.
                </div>

                <draggable
                  v-if="tiempo.songs?.length"
                  :model-value="tiempoSongObjects(tiempo)"
                  @update:model-value="v => setTiempoSongs(tiempo, v)"
                  item-key="id"
                  handle=".drag-handle"
                  ghost-class="drag-ghost"
                >
                  <template #item="{ element: song, index }">
                    <div class="setlist-card compact-card" @click.stop>
                      <span class="drag-handle">⠿</span>
                      <span class="setlist-song-num">{{ index + 1 }}</span>
                      <div class="song-info">
                        <div class="song-title">{{ song.title }}</div>
                        <div class="song-meta">{{ song.author }}</div>
                      </div>
                      <div style="display:flex; gap:4px; align-items:center;">
                        <span v-if="song.key" class="tag tag-key">{{ song.key }}</span>
                        <button class="btn btn-danger btn-sm icon-btn" @click.stop="removeSong(tiempo, song.id)">✕</button>
                      </div>
                    </div>
                  </template>
                </draggable>

                <button
                  class="btn-add-song-to-tiempo"
                  @click.stop="selectAndOpenLibrary(tiempo.id)"
                >+ Agregar canción</button>
              </div>

              <!-- Creación inline de tiempo -->
              <div v-if="creatingTiempo" class="tiempo-inline-create">
                <input
                  ref="createTiempoInput"
                  class="form-input"
                  v-model="newTiempoName"
                  placeholder="Nombre del tiempo (ej: Adoración, Alabanza...)"
                  @keydown.enter="confirmCreateTiempo"
                  @keydown.escape="cancelCreateTiempo"
                >
                <div class="tiempo-inline-actions">
                  <button class="btn btn-primary btn-sm" @click="confirmCreateTiempo">Crear</button>
                  <button class="btn btn-ghost btn-sm" @click="cancelCreateTiempo">Cancelar</button>
                </div>
              </div>

              <!-- Importar repertorio -->
              <div v-if="store.repertoires.length && selectedTiempo" class="repertorio-import-section">
                <div class="repertorio-import-label">Importar desde repertorio</div>
                <div class="repertorio-import-list">
                  <button
                    v-for="rep in store.repertoires"
                    :key="rep.id"
                    class="repertorio-import-btn"
                    @click="importRepertoire(rep)"
                  >
                    <span class="repertorio-import-btn__name">{{ rep.name }}</span>
                    <span class="repertorio-import-btn__count">{{ (rep.songs || []).length }} canciones</span>
                  </button>
                </div>
              </div>

              <!-- Footer: crear tiempo -->
              <div v-if="!creatingTiempo" class="setlist-column-footer">
                <button class="btn-create-tiempo" @click="startCreateTiempo">+ Crear tiempo</button>
              </div>

            </div>
          </div>

          <!-- ── Columna derecha: Biblioteca ── -->
          <div class="editor-panel" :class="{ 'panel-hidden-mobile': mobilePanel !== 'biblioteca' }">
            <div class="editor-panel-header">Biblioteca</div>
            <div class="editor-panel-content">

              <!-- Indicador de tiempo activo -->
              <div
                class="library-active-indicator"
                :class="{ 'library-active-indicator--active': !!selectedTiempo }"
              >
                <template v-if="selectedTiempo">
                  Agregando a: <strong>{{ selectedTiempo.name }}</strong>
                </template>
                <template v-else-if="activity?.tiempos?.length">
                  Selecciona un tiempo para agregar canciones
                </template>
                <template v-else>
                  Crea un tiempo en el setlist primero
                </template>
              </div>

              <!-- Búsqueda -->
              <input
                class="form-input song-library-search"
                v-model="libraryQuery"
                placeholder="Buscar canción..."
                style="margin-top:10px"
              >

              <!-- Filtros por tipo -->
              <div v-if="store.songTypes.length" class="type-pills" style="margin-top:10px">
                <button class="type-pill" :class="{ active: !libraryType }" @click="libraryType = ''">Todos</button>
                <button
                  v-for="t in store.songTypes"
                  :key="t.id"
                  class="type-pill"
                  :class="{ active: libraryType === String(t.id) }"
                  @click="libraryType = String(t.id)"
                >{{ t.name }}</button>
              </div>

              <!-- Lista de canciones -->
              <div v-if="filteredLibrary.length === 0" class="tiempo-empty" style="margin-top:12px">
                Sin resultados.
              </div>
              <div
                v-for="song in filteredLibrary"
                :key="song.id"
                class="library-song-row"
                :class="{ 'library-song-row--in-selected': isInSelectedTiempo(song.id) }"
              >
                <div class="library-song-info">
                  <div class="library-song-title">{{ song.title }}</div>
                  <div class="library-song-meta">{{ [song.author, song.key].filter(Boolean).join(' · ') }}</div>
                </div>
                <span v-if="isInSelectedTiempo(song.id)" class="library-assignment-badge library-assignment-badge--current">Este tiempo</span>
                <span v-else-if="songAssignments[song.id]" class="library-assignment-badge">{{ songAssignments[song.id] }}</span>
                <button
                  v-else
                  class="btn btn-primary btn-sm"
                  :disabled="!selectedTiempoId"
                  @click="addSongToSelected(song.id)"
                >+</button>
              </div>

            </div>
          </div>

        </div><!-- /activity-editor-layout -->
      </div><!-- /activity-workspace -->
    </template>

    <!-- ══════════ VISTA MÚSICO / CANTANTE ══════════ -->
    <template v-else>
      <div v-if="!activity?.tiempos?.length" class="setlist-empty" style="margin-top:16px">
        <div class="icon">🎵</div>
        <p>El líder aún no ha armado el setlist para esta actividad.</p>
      </div>

      <div v-for="tiempo in activity?.tiempos" :key="tiempo.id" class="tiempo-block">
        <div class="tiempo-header">
          <h2 class="tiempo-name">{{ tiempo.name }}</h2>
        </div>
        <div v-if="!tiempo.songs?.length" class="tiempo-empty">Sin canciones.</div>
        <div
          v-for="(songId, index) in tiempo.songs"
          :key="songId"
          class="setlist-card"
          @click="router.push('/cancion/' + songId)"
        >
          <span class="song-num">{{ index + 1 }}</span>
          <div class="song-info">
            <div class="song-title">{{ songById(songId)?.title }}</div>
            <div class="song-meta">{{ songMeta(songById(songId)) }}</div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span v-if="songById(songId)?.key" class="tag tag-key">{{ songById(songId)?.key }}</span>
            <span v-if="songById(songId)?.bpm" class="tag tag-bpm">{{ songById(songId)?.bpm }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import draggable from 'vuedraggable'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()
const { confirm }   = useConfirm()

const newTiempoName     = ref('')
const selectedTiempoId  = ref(null)
const creatingTiempo    = ref(false)
const createTiempoInput = ref(null)
const mobilePanel       = ref('setlist')
const libraryQuery      = ref('')
const libraryType       = ref('')

const activity = computed(() =>
  store.activities.find(a => a.id === Number(route.params.id))
)

watch(
  () => activity.value?.tiempos?.length,
  (len) => {
    if (len && !selectedTiempoId.value) {
      selectedTiempoId.value = activity.value.tiempos[0].id
    }
  },
  { immediate: true }
)

const selectedTiempo = computed(() =>
  activity.value?.tiempos?.find(t => t.id === selectedTiempoId.value)
)

// Mapa songId → nombre del tiempo donde está asignada
const songAssignments = computed(() => {
  const map = {}
  for (const tiempo of activity.value?.tiempos || []) {
    for (const songId of tiempo.songs || []) {
      if (!map[songId]) map[songId] = tiempo.name
    }
  }
  return map
})

function isInSelectedTiempo(songId) {
  return selectedTiempo.value?.songs?.includes(songId) ?? false
}

const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const formattedDate = computed(() => {
  if (!activity.value?.date) return ''
  const [y, m, d] = activity.value.date.split('-').map(Number)
  return `${d} de ${monthNames[m - 1]} ${y}`
})

function songById(id) { return store.songs.find(s => s.id === id) }
function songMeta(s) {
  if (!s) return ''
  return [s.author, s.key ? '🎵 ' + s.key : '', s.bpm ? '♩ ' + s.bpm + ' bpm' : ''].filter(Boolean).join(' · ')
}

function tiempoSongObjects(tiempo) {
  return (tiempo.songs || []).map(id => songById(id)).filter(Boolean)
}
function setTiempoSongs(tiempo, songs) {
  tiempo.songs = songs.map(s => s.id)
  save()
}

// Biblioteca: muestra TODAS las canciones — el estado de asignación se indica visualmente
const filteredLibrary = computed(() => {
  const q = libraryQuery.value.toLowerCase()
  return store.songs.filter(s => {
    const matchQuery = !q ||
      s.title.toLowerCase().includes(q) ||
      (s.author || '').toLowerCase().includes(q)
    const sTypes = Array.isArray(s.types) ? s.types.map(String) : (s.type ? [String(s.type)] : [])
    const matchType = !libraryType.value || sTypes.includes(libraryType.value)
    return matchQuery && matchType
  })
})

function save() { store.saveActivities() }

function startCreateTiempo() {
  creatingTiempo.value = true
  nextTick(() => createTiempoInput.value?.focus())
}

function confirmCreateTiempo() {
  if (!newTiempoName.value.trim()) return
  if (!activity.value.tiempos) activity.value.tiempos = []
  const nuevo = { id: Date.now(), name: newTiempoName.value.trim(), songs: [] }
  activity.value.tiempos.push(nuevo)
  selectedTiempoId.value = nuevo.id
  newTiempoName.value = ''
  creatingTiempo.value = false
  save()
  showToast(`Tiempo "${nuevo.name}" creado`)
}

function cancelCreateTiempo() {
  newTiempoName.value = ''
  creatingTiempo.value = false
}

function deleteTiempo(tiempoId) {
  const nombre = activity.value.tiempos.find(t => t.id === tiempoId)?.name
  activity.value.tiempos = activity.value.tiempos.filter(t => t.id !== tiempoId)
  if (selectedTiempoId.value === tiempoId) {
    selectedTiempoId.value = activity.value.tiempos[0]?.id ?? null
  }
  save()
  showToast(`Tiempo "${nombre}" eliminado`)
}

function selectAndOpenLibrary(tiempoId) {
  selectedTiempoId.value = tiempoId
  mobilePanel.value = 'biblioteca'
}

function addSongToSelected(songId) {
  if (!selectedTiempo.value) return
  if (!selectedTiempo.value.songs) selectedTiempo.value.songs = []
  if (!selectedTiempo.value.songs.includes(songId)) {
    selectedTiempo.value.songs.push(songId)
    save()
    showToast(`"${songById(songId)?.title}" agregada a ${selectedTiempo.value.name}`)
  }
}

function removeSong(tiempo, songId) {
  tiempo.songs = tiempo.songs.filter(id => id !== songId)
  save()
}

function importRepertoire(rep) {
  if (!selectedTiempo.value) return
  if (!selectedTiempo.value.songs) selectedTiempo.value.songs = []
  const existing = new Set(selectedTiempo.value.songs)
  let added = 0
  for (const songId of (rep.songs || [])) {
    if (!existing.has(songId)) {
      selectedTiempo.value.songs.push(songId)
      existing.add(songId)
      added++
    }
  }
  save()
  showToast(`${added} canciones importadas de "${rep.name}"`)
}

async function handleDelete() {
  const ok = await confirm('¿Eliminar actividad?', `"${activity.value?.title}"`)
  if (!ok) return
  store.activities = store.activities.filter(a => a.id !== activity.value.id)
  store.saveActivities()
  showToast('Actividad eliminada')
  router.push('/')
}
</script>
