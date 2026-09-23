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
      <button v-if="band.isLeader" class="icon-circle-btn" aria-label="Opciones" @click="openMenu">
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
    </div>

    <ActionSheet ref="sheet" />

    <!-- ══════════ VISTA LÍDER ══════════ -->
    <template v-if="band.isLeader">
      <div>

              <!-- Estado vacío -->
              <div v-if="!activity?.tiempos?.length && !tiempoForm" class="setlist-zero-state">
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
                  <div class="tiempo-id">
                    <h2 class="tiempo-name">{{ tiempoTitle(tiempo) }}</h2>
                    <p v-if="tiempoMeta(tiempo)" class="tiempo-meta">{{ tiempoMeta(tiempo) }}</p>
                  </div>
                  <div class="tiempo-header__actions">
                    <button
                      class="tiempo-action-btn tiempo-action-btn--add"
                      type="button"
                      :aria-label="`Agregar canciones a ${tiempoTitle(tiempo)}`"
                      @click.stop="openLibrary(tiempo)"
                    >+</button>
                    <button
                      class="tiempo-action-btn"
                      type="button"
                      :aria-label="`Editar ${tiempoTitle(tiempo)}`"
                      @click.stop="startEditTiempo(tiempo)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>
                      </svg>
                    </button>
                    <button
                      class="tiempo-action-btn tiempo-action-btn--danger"
                      type="button"
                      :aria-label="`Eliminar ${tiempoTitle(tiempo)}`"
                      @click.stop="deleteTiempo(tiempo.id)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Editar este tiempo, en su lugar -->
                <TiempoForm
                  v-if="tiempoForm?.id === tiempo.id"
                  :form="tiempoForm"
                  @save="saveTiempoForm"
                  @cancel="cancelTiempoForm"
                  @click.stop
                />

                <draggable
                  v-if="tiempo.songs?.length"
                  :model-value="tiempoSongObjects(tiempo)"
                  @update:model-value="v => setTiempoSongs(tiempo, v)"
                  item-key="id"
                  handle=".tiempo-song-drag"
                  ghost-class="drag-ghost"
                  class="tiempo-song-list"
                >
                  <template #item="{ element: song, index }">
                    <div class="tiempo-song-row">
                      <span class="tiempo-song-drag" aria-label="Reordenar">⠿</span>
                      <span class="tiempo-song-row__number">{{ index + 1 }}</span>
                      <button
                        class="tiempo-song-row__content"
                        type="button"
                        @click.stop="router.push('/cancion/' + song.id + '?act=' + route.params.id)"
                      >
                        <strong>{{ song.title }}</strong>
                        <small>{{ [song.author, song.key && `Tono ${song.key}`].filter(Boolean).join(' · ') || 'Sin datos adicionales' }}</small>
                      </button>
                      <button
                        class="tiempo-song-row__remove"
                        type="button"
                        :aria-label="`Quitar ${song.title}`"
                        @click.stop="removeSong(tiempo, song.id)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
                          <path d="M7 7l10 10M17 7 7 17"/>
                        </svg>
                      </button>
                    </div>
                  </template>
                </draggable>

                <!-- Acción primaria del tiempo -->
                <button
                  v-if="tiempo.songs?.length"
                  class="tiempo-live-btn"
                  @click.stop="startLive(tiempo)"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                  Iniciar en vivo
                </button>
              </div>

              <!-- Form de crear tiempo nuevo (al final) -->
              <TiempoForm
                v-if="tiempoForm && !tiempoForm.id"
                :form="tiempoForm"
                @save="saveTiempoForm"
                @cancel="cancelTiempoForm"
              />

              <!-- Footer: crear tiempo -->
              <div v-if="!tiempoForm" class="setlist-column-footer">
                <button class="btn-create-tiempo" @click="startCreateTiempo">+ Crear tiempo</button>
              </div>

      </div>

      <!-- ── Selector de canciones ── -->
      <Teleport to="body">
        <Transition name="song-picker">
          <div v-if="libraryOpen" class="song-picker-overlay" @click.self="closeLibrary" @keydown.esc="closeLibrary">
            <section class="song-picker" role="dialog" aria-modal="true" aria-labelledby="activity-song-picker-title">
              <div class="song-picker__handle" aria-hidden="true"></div>

              <header class="song-picker__head">
                <div>
                  <span>{{ tiempoTitle(selectedTiempo) }}</span>
                  <h2 id="activity-song-picker-title">Agregar canciones</h2>
                </div>
              </header>

              <div class="song-picker__tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  :aria-selected="libraryTab === 'songs'"
                  :class="{ active: libraryTab === 'songs' }"
                  @click="libraryTab = 'songs'"
                >Canciones</button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="libraryTab === 'repertoires'"
                  :class="{ active: libraryTab === 'repertoires' }"
                  @click="libraryTab = 'repertoires'"
                >Repertorios</button>
              </div>

              <div v-if="libraryTab === 'songs'" class="search-box song-picker__search">
                <span class="search-box__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>
                  </svg>
                </span>
                <input
                  ref="librarySearch"
                  v-model="libraryQuery"
                  class="search-box__input"
                  type="search"
                  placeholder="Buscar canción…"
                  aria-label="Buscar canción"
                >
              </div>

              <div v-if="libraryTab === 'songs' && store.songTypes.length" class="type-pills" style="margin-top:8px">
                <button class="type-pill" :class="{ active: !libraryType }" @click="libraryType = ''">Todos</button>
                <button
                  v-for="t in store.songTypes"
                  :key="t.id"
                  class="type-pill"
                  :class="{ active: libraryType === String(t.id) }"
                  @click="libraryType = String(t.id)"
                >{{ t.name }}</button>
              </div>

              <div class="song-picker__summary">
                <span>{{ pendingSongIds.length }} canci{{ pendingSongIds.length === 1 ? 'ón' : 'ones' }} por agregar</span>
                <button v-if="selectedSongIds.size || selectedRepIds.size" type="button" @click="clearSongSelection">Limpiar</button>
              </div>

              <div v-if="libraryTab === 'repertoires'" class="song-picker__list">
                <button
                  v-for="rep in store.repertoires"
                  :key="rep.id"
                  class="song-picker__row"
                  :class="{ selected: selectedRepIds.has(rep.id), assigned: !repNewCount(rep) }"
                  type="button"
                  :disabled="!repNewCount(rep)"
                  :aria-pressed="selectedRepIds.has(rep.id)"
                  @click="toggleRepSelection(rep.id)"
                >
                  <span class="song-picker__row-body">
                    <strong>{{ rep.name }}</strong>
                    <small>
                      {{ (rep.songs || []).length }} canci{{ (rep.songs || []).length === 1 ? 'ón' : 'ones' }}
                      <template v-if="repNewCount(rep) && repNewCount(rep) < (rep.songs || []).length"> · {{ repNewCount(rep) }} nueva{{ repNewCount(rep) === 1 ? '' : 's' }}</template>
                    </small>
                  </span>
                  <span v-if="!repNewCount(rep)" class="song-picker__assignment">{{ (rep.songs || []).length ? 'Ya agregado' : 'Vacío' }}</span>
                  <span v-else class="song-picker__status" aria-hidden="true">{{ selectedRepIds.has(rep.id) ? '✓' : '+' }}</span>
                </button>

                <div v-if="!store.repertoires.length" class="song-picker__empty">
                  Aún no tienes repertorios
                </div>
              </div>

              <div v-else class="song-picker__list">
                <button
                  v-for="song in filteredLibrary"
                  :key="song.id"
                  class="song-picker__row"
                  :class="{ selected: selectedSongIds.has(song.id), assigned: songAssignments[song.id] }"
                  type="button"
                  :disabled="Boolean(songAssignments[song.id])"
                  :aria-pressed="selectedSongIds.has(song.id)"
                  @click="toggleSongSelection(song.id)"
                >
                  <span class="song-picker__row-body">
                    <strong>{{ song.title }}</strong>
                    <small>{{ [song.author, song.key && `Tono ${song.key}`].filter(Boolean).join(' · ') || 'Sin datos adicionales' }}</small>
                  </span>
                  <span v-if="songAssignments[song.id]" class="song-picker__assignment">{{ songAssignments[song.id] }}</span>
                  <span v-else class="song-picker__status" aria-hidden="true">{{ selectedSongIds.has(song.id) ? '✓' : '+' }}</span>
                </button>

                <div v-if="!filteredLibrary.length" class="song-picker__empty">
                  {{ libraryQuery ? 'No se encontraron canciones' : 'Todas las canciones ya están en este tiempo' }}
                </div>
              </div>

              <footer class="song-picker__actions">
                <button class="btn btn-primary" type="button" :disabled="!pendingSongIds.length" @click="acceptSongSelection">
                  Agregar<span v-if="pendingSongIds.length"> ({{ pendingSongIds.length }})</span>
                </button>
              </footer>
            </section>
          </div>
        </Transition>
      </Teleport>
    </template>

    <!-- ══════════ VISTA MÚSICO / CANTANTE ══════════ -->
    <template v-else>
      <div v-if="!activity?.tiempos?.length" class="setlist-empty" style="margin-top:16px">
        <svg class="setlist-empty__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <p>El líder aún no ha armado el setlist para esta actividad.</p>
      </div>

      <!-- Orden del servicio: los tiempos como movimientos encadenados -->
      <ol v-else class="orden">
        <li v-for="tiempo in activity.tiempos" :key="tiempo.id" class="orden__movt">
          <span class="orden__node" aria-hidden="true"></span>
          <div class="orden__head">
            <h2 class="orden__name">{{ tiempoLabel(tiempo) || tiempo.name }}</h2>
            <span v-if="tiempoDuration(tiempo)" class="orden__time">{{ tiempoDuration(tiempo) }}</span>
            <span v-if="tiempo.songs?.length" class="orden__count">
              {{ tiempo.songs.length }} canción{{ tiempo.songs.length !== 1 ? 'es' : '' }}
            </span>
          </div>

          <p v-if="!tiempo.songs?.length" class="orden__empty">Sin canciones.</p>
          <ol v-else class="orden__songs">
            <li
              v-for="(songId, si) in tiempo.songs"
              :key="songId"
              class="orden__song"
              role="link"
              tabindex="0"
              @click="router.push('/cancion/' + songId + '?act=' + route.params.id)"
              @keyup.enter="router.push('/cancion/' + songId + '?act=' + route.params.id)"
            >
              <span class="orden__num">{{ si + 1 }}</span>
              <span class="orden__song-main">
                <span class="orden__song-title">{{ songById(songId)?.title || 'Canción eliminada' }}</span>
                <span v-if="songById(songId)?.author" class="orden__song-author">{{ songById(songId).author }}</span>
              </span>
              <span v-if="songById(songId)?.key" class="orden__key">{{ fmtKey(songById(songId).key) }}</span>
            </li>
          </ol>
        </li>
      </ol>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useLiveStore } from '../stores/live'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import draggable from 'vuedraggable'
import ActionSheet from '../components/ActionSheet.vue'
import TiempoForm from '../components/TiempoForm.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const band = useBandStore()
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

const sheet             = ref(null)
const selectedTiempoId  = ref(null)
const tiempoForm        = ref(null)   // { id?, name, start, end } — null = cerrado
const libraryOpen       = ref(false)
const libraryQuery      = ref('')
const libraryType       = ref('')
const librarySearch     = ref(null)
const libraryTab        = ref('songs')  // 'songs' | 'repertoires'
const selectedSongIds   = ref(new Set())
const selectedRepIds    = ref(new Set())
let previousBodyOverflow = ''

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

const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const formattedDate = computed(() => {
  if (!activity.value?.date) return ''
  const [y, m, d] = activity.value.date.split('-').map(Number)
  return `${d} de ${monthNames[m - 1]} ${y}`
})

function songById(id) { return store.songs.find(s => s.id === id) }

// "A#/Bb" -> "A♯". Mismo lenguaje visual del tono que en la lista de canciones.
function fmtKey(k) {
  return (k.split('/')[0] || '').replace('#', '♯').replace('b', '♭')
}

function tiempoSongObjects(tiempo) {
  return (tiempo.songs || []).map(id => songById(id)).filter(Boolean)
}
function setTiempoSongs(tiempo, songs) {
  tiempo.songs = songs.map(s => s.id)
  save()
}

// Biblioteca: oculta las canciones ya incluidas en el tiempo activo.
const filteredLibrary = computed(() => {
  const inSelected = new Set((selectedTiempo.value?.songs || []).map(String))
  const q = libraryQuery.value.trim().toLowerCase()
  return store.songs.filter(s => {
    if (inSelected.has(String(s.id))) return false
    const matchQuery = !q ||
      s.title.toLowerCase().includes(q) ||
      (s.author || '').toLowerCase().includes(q) ||
      (s.key || '').toLowerCase().includes(q)
    const sTypes = Array.isArray(s.types) ? s.types.map(String) : (s.type ? [String(s.type)] : [])
    const matchType = !libraryType.value || sTypes.includes(libraryType.value)
    return matchQuery && matchType
  }).sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }))
})

// Canciones de un repertorio que aún no están en ningún tiempo de la actividad
// (misma regla que la pestaña de canciones: una canción, un tiempo).
function repNewSongIds(rep) {
  return (rep.songs || []).filter(id => !songAssignments.value[id] && songById(id))
}
function repNewCount(rep) { return repNewSongIds(rep).length }

// Lo que agrega el botón: canciones elegidas + las nuevas de cada repertorio elegido, sin repetir.
const pendingSongIds = computed(() => {
  const ids = [...selectedSongIds.value]
  for (const rep of store.repertoires) {
    if (selectedRepIds.value.has(rep.id)) ids.push(...repNewSongIds(rep))
  }
  return [...new Set(ids)]
})

function save() { store.saveActivities() }

// "20:05" -> "8:05 pm"
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

// Etiqueta del tiempo: "Nombre - De inicio a fin" (vista músico)
function tiempoLabel(tiempo) {
  const range = (tiempo.start || tiempo.end)
    ? `De ${fmtTime(tiempo.start)} a ${fmtTime(tiempo.end)}`
    : ''
  return [tiempo.name, range].filter(Boolean).join(' - ')
}

// Rango de reloj compacto: "8:25 – 8:50 am" (am/pm una vez si coinciden)
function tiempoRange(tiempo) {
  if (!tiempo.start && !tiempo.end) return ''
  if (!tiempo.start || !tiempo.end) return fmtTime(tiempo.start || tiempo.end)
  const samePeriod = (Number(tiempo.start.split(':')[0]) < 12) === (Number(tiempo.end.split(':')[0]) < 12)
  const ini = samePeriod ? fmtTime(tiempo.start).replace(/ (am|pm)$/, '') : fmtTime(tiempo.start)
  return `${ini} – ${fmtTime(tiempo.end)}`
}

// Título: el nombre, o el rango si no hay nombre
function tiempoTitle(tiempo) {
  return (tiempo.name && tiempo.name.trim()) || tiempoRange(tiempo) || 'Sin nombre'
}

// Línea callada de datos: rango · duración (sin repetir el rango si ya es el título)
function tiempoMeta(tiempo) {
  const hasName = !!(tiempo.name && tiempo.name.trim())
  return [hasName ? tiempoRange(tiempo) : '', tiempoDuration(tiempo)].filter(Boolean).join(' · ')
}

// Duración entre inicio y fin (soporta cruce de medianoche)
function tiempoDuration(tiempo) {
  if (!tiempo.start || !tiempo.end) return ''
  const [sh, sm] = tiempo.start.split(':').map(Number)
  const [eh, em] = tiempo.end.split(':').map(Number)
  let mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60), m = mins % 60
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`
}

function startCreateTiempo() {
  tiempoForm.value = { name: '', start: '', end: '' }
}

function startEditTiempo(tiempo) {
  tiempoForm.value = { id: tiempo.id, name: tiempo.name || '', start: tiempo.start || '', end: tiempo.end || '' }
  selectedTiempoId.value = tiempo.id
}

function saveTiempoForm() {
  const f = tiempoForm.value
  if (!f.name.trim() && !f.start && !f.end) return   // algo debe tener
  const data = { name: f.name.trim(), start: f.start, end: f.end }
  if (f.id) {
    const t = activity.value.tiempos.find(t => t.id === f.id)
    if (t) Object.assign(t, data)
    showToast('Tiempo actualizado')
  } else {
    if (!activity.value.tiempos) activity.value.tiempos = []
    const nuevo = { id: Date.now(), songs: [], ...data }
    activity.value.tiempos.push(nuevo)
    selectedTiempoId.value = nuevo.id
    showToast(`Tiempo "${tiempoLabel(nuevo)}" creado`)
  }
  tiempoForm.value = null
  save()
}

function cancelTiempoForm() {
  tiempoForm.value = null
}

async function deleteTiempo(tiempoId) {
  const tiempo = activity.value.tiempos.find(t => t.id === tiempoId)
  const nombre = tiempoTitle(tiempo)
  const songCount = tiempo?.songs?.length || 0
  const detail = songCount
    ? `"${nombre}" y sus ${songCount} canción${songCount === 1 ? '' : 'es'} se quitarán de la actividad.`
    : `"${nombre}" se quitará de la actividad.`
  const ok = await confirm('¿Eliminar este tiempo?', detail)
  if (!ok) return
  activity.value.tiempos = activity.value.tiempos.filter(t => t.id !== tiempoId)
  if (selectedTiempoId.value === tiempoId) {
    selectedTiempoId.value = activity.value.tiempos[0]?.id ?? null
  }
  save()
  showToast(`Tiempo "${nombre}" eliminado`)
}

function openLibrary(tiempo) {
  selectedTiempoId.value = tiempo.id
  libraryQuery.value = ''
  libraryType.value = ''
  libraryTab.value = 'songs'
  selectedSongIds.value = new Set()
  selectedRepIds.value = new Set()
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  libraryOpen.value = true
  nextTick(() => librarySearch.value?.focus())
}

function closeLibrary() {
  libraryOpen.value = false
  selectedSongIds.value = new Set()
  selectedRepIds.value = new Set()
  document.body.style.overflow = previousBodyOverflow
}

function toggleSongSelection(songId) {
  if (songAssignments.value[songId]) return
  const next = new Set(selectedSongIds.value)
  if (next.has(songId)) next.delete(songId)
  else next.add(songId)
  selectedSongIds.value = next
}

function toggleRepSelection(repId) {
  const next = new Set(selectedRepIds.value)
  if (next.has(repId)) next.delete(repId)
  else next.add(repId)
  selectedRepIds.value = next
}

function clearSongSelection() {
  selectedSongIds.value = new Set()
  selectedRepIds.value = new Set()
}

function acceptSongSelection() {
  if (!selectedTiempo.value || !pendingSongIds.value.length) return
  const existing = new Set((selectedTiempo.value.songs || []).map(String))
  const additions = pendingSongIds.value.filter(id => !existing.has(String(id)))
  selectedTiempo.value.songs = [...(selectedTiempo.value.songs || []), ...additions]
  save()
  showToast(`${additions.length} canción${additions.length === 1 ? '' : 'es'} agregada${additions.length === 1 ? '' : 's'} a ${tiempoTitle(selectedTiempo.value)}`)
  closeLibrary()
}

function removeSong(tiempo, songId) {
  tiempo.songs = tiempo.songs.filter(id => id !== songId)
  save()
}

function openMenu() {
  sheet.value?.open({
    title: activity.value?.title,
    actions: [
      { label: 'Editar actividad', icon: 'edit', onSelect: () => router.push(`/actividades/${activity.value.id}/editar`) },
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

onBeforeUnmount(() => {
  if (libraryOpen.value) document.body.style.overflow = previousBodyOverflow
})
</script>

<style scoped>
/* Estado vacío con icono SVG en vez de emoji */
.setlist-empty__svg { width: 40px; height: 40px; color: var(--color-text-muted); opacity: .6; margin: 0 auto 12px; display: block; }

/* ── ORDEN DEL SERVICIO: tiempos encadenados en un riel (la firma) ── */
.orden { list-style: none; margin: 10px 0 0; padding: 0; padding-bottom: 24px; }

.orden__movt { position: relative; padding-left: 24px; }
.orden__movt + .orden__movt { margin-top: 18px; }
/* El riel que une un movimiento con el siguiente */
.orden__movt::before {
  content: '';
  position: absolute;
  left: 4px; top: 7px; bottom: -18px;
  width: 2px;
  background: var(--color-border);
}
.orden__movt:last-child::before { display: none; }
/* El nodo de cada tiempo, sentado sobre el riel */
.orden__node {
  position: absolute;
  left: 0; top: 5px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-background);
}

.orden__head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 9px; }
.orden__name { font-weight: 700; font-size: 1.05rem; color: var(--color-text-primary); }
.orden__count { font-size: .72rem; font-weight: 600; color: var(--color-text-muted); white-space: nowrap; }
.orden__time {
  font-size: .76rem; font-weight: 700; color: var(--color-primary);
  font-variant-numeric: tabular-nums; white-space: nowrap;
}

/* ── Bloque de tiempo (vista líder) ── */
.tiempo-id { min-width: 0; flex: 1; }
.tiempo-meta {
  margin: 3px 0 0;
  font-size: .78rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  letter-spacing: .01em;
}
.tiempo-header__actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.tiempo-action-btn {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface-secondary);
  color: var(--color-text-secondary);
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: transform .12s ease, background .15s ease, border-color .15s ease, color .15s ease;
}
.tiempo-action-btn svg { width: 16px; height: 16px; }
.tiempo-action-btn:hover { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary); }
.tiempo-action-btn:active { transform: scale(.94); }
.tiempo-action-btn--add { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-text-on-primary); }
.tiempo-action-btn--add:hover { background: var(--color-primary-hover); color: var(--color-text-on-primary); }
.tiempo-action-btn--danger { color: var(--color-danger); }
.tiempo-action-btn--danger:hover { border-color: var(--color-danger); background: var(--color-danger-soft); color: var(--color-danger); }

.tiempo-song-list { overflow: hidden; margin: 2px -8px 0; background: var(--color-surface); }
.tiempo-song-row { min-height: 64px; display: flex; align-items: center; gap: 7px; padding: 8px; border-bottom: 1px solid var(--color-border); }
.tiempo-song-row:last-child { border-bottom: 0; }
.tiempo-song-drag { width: 22px; flex: 0 0 22px; display: grid; place-items: center; color: var(--color-text-muted); font-size: 17px; cursor: grab; touch-action: none; }
.tiempo-song-drag:active { cursor: grabbing; }
.tiempo-song-row__number { width: 20px; flex: 0 0 20px; color: var(--color-primary); font-family: var(--font-display); font-size: 14px; font-weight: 600; text-align: center; }
.tiempo-song-row__content { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 3px 2px; border: 0; background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; }
.tiempo-song-row__content strong { max-width: 100%; overflow: hidden; font-size: 14px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.tiempo-song-row__content small { max-width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.tiempo-song-row__remove { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 10px; background: var(--color-danger-soft); color: var(--color-danger); cursor: pointer; }
.tiempo-song-row__remove svg { width: 14px; height: 14px; display: block; }
.tiempo-song-row__remove:active { background: var(--color-danger); color: var(--color-text-on-primary); }

.song-picker-overlay { position: fixed; z-index: 1300; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding-top: 54px; background: var(--color-overlay); }
.song-picker { width: min(100%, 600px); height: min(86dvh, 780px); display: flex; flex-direction: column; overflow: hidden; padding: 8px 16px calc(14px + env(safe-area-inset-bottom)); border: 1px solid var(--color-border); border-bottom: 0; border-radius: 24px 24px 0 0; background: var(--color-background); box-shadow: var(--shadow-modal); }
.song-picker__handle { width: 42px; height: 4px; flex: 0 0 4px; margin: 0 auto 10px; border-radius: 999px; background: var(--color-border-strong); }
.song-picker__head { display: flex; align-items: flex-start; gap: 14px; padding: 2px 2px 12px; border: 0; background: transparent; }
.song-picker__head span { display: block; max-width: 250px; overflow: hidden; color: var(--color-accent); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.song-picker__head h2 { margin-top: 2px; font-size: 21px; }
.song-picker__tabs { flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px; padding: 4px; border-radius: 12px; background: var(--color-surface-secondary); }
.song-picker__tabs button { min-height: 36px; border: 0; border-radius: 9px; background: transparent; color: var(--color-text-muted); font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s, color .15s; }
.song-picker__tabs button.active { background: var(--color-surface); color: var(--color-primary); box-shadow: var(--shadow-small); }
.song-picker__search { flex: 0 0 auto; }
.song-picker__search svg { width: 18px; height: 18px; }
.song-picker__summary { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 5px 2px; color: var(--color-text-secondary); font-size: 12px; }
.song-picker__summary button { padding: 6px 0; border: 0; background: transparent; color: var(--color-link); font-size: 12px; cursor: pointer; }
.song-picker__list { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; margin-top: 3px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface); }
.song-picker__row { width: 100%; min-height: 62px; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-bottom: 1px solid var(--color-border); background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; transition: background .15s ease; }
.song-picker__row:last-of-type { border-bottom: 0; }
.song-picker__row:hover { background: var(--color-surface-hover); }
.song-picker__row.selected { background: var(--color-secondary-soft); }
.song-picker__row.assigned { cursor: default; opacity: .68; }
.song-picker__row-body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.song-picker__row-body strong { max-width: 100%; overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__row-body small { max-width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__status { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; border-radius: 50%; background: var(--color-secondary-soft); color: var(--color-primary); font-family: var(--font-display); font-size: 20px; }
.song-picker__row.selected .song-picker__status { background: var(--color-success); color: var(--color-text-on-primary); font-size: 16px; }
.song-picker__assignment { max-width: 92px; overflow: hidden; padding: 5px 8px; border-radius: 8px; background: var(--color-surface-secondary); color: var(--color-text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.song-picker__empty { display: grid; place-items: center; min-height: 150px; padding: 20px; color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.song-picker__actions { display: grid; grid-template-columns: 1fr; padding-top: 12px; }
.song-picker__actions .btn { width: 100%; }
.song-picker-enter-active, .song-picker-leave-active { transition: opacity .2s ease; }
.song-picker-enter-active .song-picker, .song-picker-leave-active .song-picker { transition: transform .25s ease; }
.song-picker-enter-from, .song-picker-leave-to { opacity: 0; }
.song-picker-enter-from .song-picker, .song-picker-leave-to .song-picker { transform: translateY(100%); }

/* Acción primaria: una sola, clara, en acento (no rojo) */
.tiempo-live-btn {
  margin-top: 12px;
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px;
  border: none;
  border-radius: 12px;
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-size: .9rem; font-weight: 700;
  box-shadow: var(--shadow-small);
  cursor: pointer;
  transition: background .15s, transform .05s;
}
.tiempo-live-btn svg { width: 15px; height: 15px; }
.tiempo-live-btn:hover { background: var(--color-primary-hover); }
.tiempo-live-btn:active { transform: translateY(1px); }

.orden__empty { font-size: .82rem; color: var(--color-text-muted); padding: 2px 2px 4px; }

.orden__songs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.orden__song {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  border-radius: 10px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.orden__song + .orden__song { border-top: 1px solid var(--color-border); }
.orden__song:active { background: var(--color-primary-soft); }
.orden__song:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }

.orden__num {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  font-size: .8rem;
  font-weight: 700;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.orden__song-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.orden__song-title {
  font-size: .92rem; font-weight: 600; color: var(--color-text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.orden__song-author {
  font-size: .76rem; color: var(--color-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
/* Mismo distintivo de tono que en la lista de canciones */
.orden__key {
  flex-shrink: 0;
  min-width: 30px;
  text-align: center;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: .8rem;
  font-weight: 800;
  letter-spacing: -.01em;
  padding: 4px 9px;
  border-radius: 9px;
}

@media (hover: hover) {
  .orden__song:hover { background: var(--color-primary-soft); }
}

@media (max-width: 360px) {
  .tiempo-block { padding-inline: 14px; }
  .tiempo-song-list { margin-inline: -6px; }
  .tiempo-song-row { gap: 5px; padding-inline: 6px; }
}

@media (prefers-reduced-motion: reduce) {
  .song-picker-enter-active, .song-picker-leave-active,
  .song-picker-enter-active .song-picker, .song-picker-leave-active .song-picker { transition: none; }
}
</style>
