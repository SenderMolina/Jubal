<template>
  <div>
    <!-- ── Header (todos los roles) ── -->
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

        <!-- Agregar tiempo -->
        <div class="add-tiempo-bar">
          <input
            class="form-input"
            v-model="newTiempoName"
            placeholder="Nombre del tiempo (ej: Coros, Adoración...)"
            @keydown.enter="addTiempo"
          >
          <button class="btn btn-primary btn-sm" @click="addTiempo">+ Agregar tiempo</button>
        </div>

        <!-- Tabs móvil -->
        <div class="editor-mobile-tabs">
          <button
            class="editor-tab"
            :class="{ active: mobilePanel === 'repertorio' }"
            @click="mobilePanel = 'repertorio'"
          >Repertorio</button>
          <button
            class="editor-tab"
            :class="{ active: mobilePanel === 'canciones' }"
            @click="mobilePanel = 'canciones'"
          >Lista de canciones</button>
        </div>

        <!-- Layout de dos columnas -->
        <div class="activity-editor-layout">

        <!-- ── Columna izquierda: Repertorio ── -->
        <div class="editor-panel" :class="{ 'panel-hidden-mobile': mobilePanel !== 'repertorio' }">
          <div class="editor-panel-header">Repertorio</div>
          <div class="editor-panel-content">
            <div v-if="!activity?.tiempos?.length" class="tiempo-empty" style="margin-top:8px">
              Agrega tiempos usando el campo de arriba.
            </div>

            <div
              v-for="tiempo in activity?.tiempos"
              :key="tiempo.id"
              class="tiempo-block"
              :class="{ 'tiempo-selected': selectedTiempoId === tiempo.id }"
              @click="selectedTiempoId = tiempo.id"
            >
              <div class="tiempo-header">
                <h2 class="tiempo-name">{{ tiempo.name }}</h2>
                <button
                  class="btn btn-danger btn-sm"
                  @click.stop="deleteTiempo(tiempo.id)"
                >✕</button>
              </div>

              <div v-if="!tiempo.songs?.length" class="tiempo-empty">Sin canciones.</div>

              <draggable
                v-if="tiempo.songs?.length"
                :model-value="tiempoSongObjects(tiempo)"
                @update:model-value="v => setTiempoSongs(tiempo, v)"
                item-key="id"
                handle=".drag-handle"
                ghost-class="drag-ghost"
              >
                <template #item="{ element: song }">
                  <div class="setlist-card compact-card" @click.stop>
                    <span class="drag-handle">⠿</span>
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
            </div>
          </div>
        </div>

        <!-- ── Columna derecha: Lista de canciones ── -->
        <div class="editor-panel" :class="{ 'panel-hidden-mobile': mobilePanel !== 'canciones' }">
          <div class="editor-panel-header">Lista de canciones</div>
          <div class="editor-panel-content">

            <!-- Búsqueda -->
            <input
              class="form-input song-library-search"
              v-model="libraryQuery"
              placeholder="Buscar canción..."
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

            <!-- Hint si no hay tiempo seleccionado -->
            <div v-if="!selectedTiempoId && activity?.tiempos?.length" class="library-hint">
              Selecciona un tiempo en el repertorio para agregar canciones.
            </div>

            <!-- Lista de canciones -->
            <div v-if="filteredLibrary.length === 0" class="tiempo-empty" style="margin-top:12px">
              Sin resultados.
            </div>
            <div
              v-for="song in filteredLibrary"
              :key="song.id"
              class="library-song-row"
            >
              <div class="library-song-info">
                <div class="library-song-title">{{ song.title }}</div>
                <div class="library-song-meta">{{ [song.author, song.key].filter(Boolean).join(' · ') }}</div>
              </div>
              <button
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
        <p>El líder aún no ha armado el repertorio para esta actividad.</p>
      </div>

      <div v-for="tiempo in activity?.tiempos" :key="tiempo.id" class="tiempo-block">
        <div class="tiempo-header">
          <h2 class="tiempo-name">{{ tiempo.name }}</h2>
        </div>
        <div v-if="!tiempo.songs?.length" class="tiempo-empty">Sin canciones.</div>
        <div
          v-for="songId in tiempo.songs"
          :key="songId"
          class="setlist-card"
          @click="router.push('/cancion/' + songId)"
        >
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
import { ref, computed, watch } from 'vue'
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

// Estado local
const newTiempoName    = ref('')
const selectedTiempoId = ref(null)
const mobilePanel      = ref('repertorio')
const libraryQuery     = ref('')
const libraryType      = ref('')

// Actividad reactiva del store
const activity = computed(() =>
  store.activities.find(a => a.id === Number(route.params.id))
)

// Auto-seleccionar primer tiempo al cargar o al agregar el primero
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

// Fechas
const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const formattedDate = computed(() => {
  if (!activity.value?.date) return ''
  const [y, m, d] = activity.value.date.split('-').map(Number)
  return `${d} de ${monthNames[m - 1]} ${y}`
})

// Helpers de canciones
function songById(id)  { return store.songs.find(s => s.id === id) }
function songMeta(s)   {
  if (!s) return ''
  return [s.author, s.key ? '🎵 ' + s.key : '', s.bpm ? '♩ ' + s.bpm + ' bpm' : ''].filter(Boolean).join(' · ')
}

// Drag & drop
function tiempoSongObjects(tiempo) {
  return (tiempo.songs || []).map(id => songById(id)).filter(Boolean)
}
function setTiempoSongs(tiempo, songs) {
  tiempo.songs = songs.map(s => s.id)
  save()
}

// Librería: excluye canciones ya en el tiempo seleccionado
const filteredLibrary = computed(() => {
  const q = libraryQuery.value.toLowerCase()
  const inTiempo = new Set(selectedTiempo.value?.songs || [])
  return store.songs.filter(s => {
    const matchQuery = !q ||
      s.title.toLowerCase().includes(q) ||
      (s.author || '').toLowerCase().includes(q)
    const matchType = !libraryType.value || String(s.type) === libraryType.value
    return matchQuery && matchType && !inTiempo.has(s.id)
  })
})

// Acciones
function save() { store.saveActivities() }

function addTiempo() {
  if (!newTiempoName.value.trim()) return
  if (!activity.value.tiempos) activity.value.tiempos = []
  const nuevo = { id: Date.now(), name: newTiempoName.value.trim(), songs: [] }
  activity.value.tiempos.push(nuevo)
  selectedTiempoId.value = nuevo.id
  newTiempoName.value = ''
  save()
}

function deleteTiempo(tiempoId) {
  activity.value.tiempos = activity.value.tiempos.filter(t => t.id !== tiempoId)
  if (selectedTiempoId.value === tiempoId) {
    selectedTiempoId.value = activity.value.tiempos[0]?.id ?? null
  }
  save()
}

function addSongToSelected(songId) {
  if (!selectedTiempo.value) return
  if (!selectedTiempo.value.songs) selectedTiempo.value.songs = []
  if (!selectedTiempo.value.songs.includes(songId)) {
    selectedTiempo.value.songs.push(songId)
    save()
  }
}

function removeSong(tiempo, songId) {
  tiempo.songs = tiempo.songs.filter(id => id !== songId)
  save()
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
