<template>
  <div @click="selectedTiempoId = null">
    <!-- ── Topbar ── -->
    <div class="detail-topbar">
      <button class="icon-circle-btn" aria-label="Volver" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>
      <button v-if="roleStore.isLeader" class="icon-circle-btn" aria-label="Opciones" @click="openMenu">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
    </div>

    <!-- ── Hero ── -->
    <div class="detail-hero">
      <div class="detail-hero__thumb">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <div class="detail-hero__title">{{ activity?.title }}</div>
      <div class="detail-hero__meta">
        {{ formattedDate }}{{ activity?.time ? ' · ' + activity.time : '' }}
      </div>
      <div v-if="activity?.description && activity.description !== activity.title" class="detail-hero__desc">{{ activity.description }}</div>
      <div v-if="roleStore.isLeader" class="detail-hero__actions">
        <button class="btn-pill btn-pill--primary" @click.stop="openLibrary">
          <span class="btn-pill__icon">+</span> Agregar
        </button>
      </div>
    </div>

    <!-- Franja de aviso -->
    <Teleport to="body">
      <Transition name="banner">
        <div v-if="banner" class="top-banner">{{ banner }}</div>
      </Transition>
    </Teleport>
    <ActivityModal ref="modal" />
    <ActionSheet ref="sheet" />

    <!-- ══════════ VISTA LÍDER ══════════ -->
    <template v-if="roleStore.isLeader">
      <div>

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
                @click.stop="selectedTiempoId = tiempo.id"
              >
                <div class="tiempo-header">
                  <h2 class="tiempo-name">{{ tiempo.name }}</h2>
                  <button
                    v-if="roleStore.isLeader && tiempo.songs?.length"
                    class="dots-btn"
                    style="color: var(--red); font-weight: 700; width: auto; padding: 4px 10px; font-size: .8rem;"
                    aria-label="Iniciar en vivo"
                    @click.stop="startLive(tiempo)"
                  >▶ En vivo</button>
                  <button class="dots-btn dots-btn--danger" aria-label="Eliminar tiempo" @click.stop="deleteTiempo(tiempo.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>

                <div v-if="!tiempo.songs?.length" class="tiempo-empty">
                  Sin canciones aún.
                </div>

                <draggable
                  v-if="tiempo.songs?.length"
                  :model-value="tiempoSongObjects(tiempo)"
                  @update:model-value="v => setTiempoSongs(tiempo, v)"
                  item-key="id"
                  handle=".song-thumb"
                  ghost-class="drag-ghost"
                >
                  <template #item="{ element: song }">
                    <div class="song-row" @click.stop="router.push('/cancion/' + song.id + '?act=' + route.params.id)">
                      <div class="song-thumb song-thumb--drag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M9 18V5l12-2v13"/>
                          <circle cx="6" cy="18" r="3"/>
                          <circle cx="18" cy="16" r="3"/>
                        </svg>
                      </div>
                      <div class="song-row__info">
                        <div class="song-row__title">{{ song.title }}</div>
                        <div class="song-row__meta">{{ song.author }}</div>
                      </div>
                      <span v-if="song.key" class="tag tag-key">{{ song.key }}</span>
                      <button class="song-remove" aria-label="Quitar canción" @click.stop="removeSong(tiempo, song.id)">✕</button>
                    </div>
                  </template>
                </draggable>
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
              <div v-if="store.repertoires.length && selectedTiempo" class="repertorio-import-section" @click.stop>
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

      <!-- ── Biblioteca (hoja inferior) ── -->
      <Teleport to="body">
        <Transition name="sheet">
          <div v-if="libraryOpen" class="sheet-overlay" @click="libraryOpen = false">
            <div class="sheet sheet--library" @click.stop>
              <div class="sheet-handle"></div>
              <div class="sheet-title">Agregar a: {{ selectedTiempo?.name }}</div>
              <input
                class="form-input"
                v-model="libraryQuery"
                placeholder="Buscar canción..."
              >
              <div v-if="store.songTypes.length" class="type-pills" style="margin-top:8px">
                <button class="type-pill" :class="{ active: !libraryType }" @click="libraryType = ''">Todos</button>
                <button
                  v-for="t in store.songTypes"
                  :key="t.id"
                  class="type-pill"
                  :class="{ active: libraryType === String(t.id) }"
                  @click="libraryType = String(t.id)"
                >{{ t.name }}</button>
              </div>
              <div class="sheet-library-list">
                <div v-if="filteredLibrary.length === 0" class="tiempo-empty">Sin resultados.</div>
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
                  <span v-if="isInSelectedTiempo(song.id)" class="library-check" aria-label="Agregada">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span v-else-if="songAssignments[song.id]" class="library-assignment-badge">{{ songAssignments[song.id] }}</span>
                  <button
                    v-else
                    class="library-add-btn"
                    :disabled="!selectedTiempoId"
                    aria-label="Agregar canción"
                    @click="addSongToSelected(song.id)"
                  >+</button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>

    <!-- ══════════ VISTA MÚSICO / CANTANTE ══════════ -->
    <template v-else>
      <div v-if="!activity?.tiempos?.length" class="setlist-empty" style="margin-top:16px">
        <div class="icon">🎵</div>
        <p>El líder aún no ha armado el setlist para esta actividad.</p>
      </div>

      <div v-for="tiempo in activity?.tiempos" :key="tiempo.id" class="tiempo-section">
        <div class="tiempo-section__label">{{ tiempo.name }}</div>
        <div v-if="!tiempo.songs?.length" class="tiempo-empty">Sin canciones.</div>
        <div
          v-for="songId in tiempo.songs"
          :key="songId"
          class="song-row"
          @click="router.push('/cancion/' + songId + '?act=' + route.params.id)"
        >
          <div class="song-thumb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <div class="song-row__info">
            <div class="song-row__title">{{ songById(songId)?.title }}</div>
            <div class="song-row__meta">{{ [songById(songId)?.author, songById(songId)?.key].filter(Boolean).join(' · ') }}</div>
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
import { useLiveStore } from '../stores/live'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import draggable from 'vuedraggable'
import ActivityModal from '../components/ActivityModal.vue'
import ActionSheet from '../components/ActionSheet.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const live      = useLiveStore()

async function startLive(tiempo) {
  if (!tiempo.songs?.length) return
  try {
    await live.start({ source: 'tiempo', activityId: activity.value.id, tiempoId: tiempo.id, songIds: tiempo.songs })
    router.push('/live')
  } catch (e) { console.error('No se pudo iniciar la sesión en vivo:', e) }
}
const { showToast } = useToast()
const { confirm }   = useConfirm()

const modal             = ref(null)
const sheet             = ref(null)
const newTiempoName     = ref('')
const selectedTiempoId  = ref(null)
const creatingTiempo    = ref(false)
const createTiempoInput = ref(null)
const libraryOpen       = ref(false)
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

async function deleteTiempo(tiempoId) {
  const nombre = activity.value.tiempos.find(t => t.id === tiempoId)?.name
  const ok = await confirm('¿Estás seguro de eliminar este tiempo?', `"${nombre}"`)
  if (!ok) return
  activity.value.tiempos = activity.value.tiempos.filter(t => t.id !== tiempoId)
  if (selectedTiempoId.value === tiempoId) {
    selectedTiempoId.value = activity.value.tiempos[0]?.id ?? null
  }
  save()
  showToast(`Tiempo "${nombre}" eliminado`)
}

const banner = ref('')
let bannerTimer = null
function showBanner(msg) {
  banner.value = msg
  clearTimeout(bannerTimer)
  bannerTimer = setTimeout(() => { banner.value = '' }, 3000)
}

function openLibrary() {
  if (!activity.value?.tiempos?.length) {
    showBanner('No hay tiempos creados. Crea un tiempo primero.')
    return
  }
  if (!selectedTiempoId.value) selectedTiempoId.value = activity.value.tiempos[0].id
  libraryOpen.value = true
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

function openMenu() {
  sheet.value?.open({
    title: activity.value?.title,
    actions: [
      { label: 'Editar actividad', icon: 'edit', onSelect: () => modal.value?.openEdit(activity.value) },
      { label: 'Eliminar actividad', icon: 'trash', danger: true, onSelect: handleDelete },
    ],
  })
}

async function handleDelete() {
  const ok = await confirm('¿Estás seguro que quieres eliminar esta actividad?', `"${activity.value?.title}"`)
  if (!ok) return
  store.activities = store.activities.filter(a => a.id !== activity.value.id)
  store.saveActivities()
  showToast('Actividad eliminada')
  router.push('/actividades')
}
</script>
