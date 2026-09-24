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
      <button v-if="band.can.manageActivities" class="icon-circle-btn" aria-label="Opciones" @click="openMenu">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
    </div>

    <!-- ── Encabezado: directo sobre el fondo, la fecha en color ── -->
    <div class="activity-head">
      <p class="activity-head__when">{{ whenLabel }}</p>
      <h1 class="activity-head__title">{{ activity?.title }}</h1>
      <p v-if="activity?.description && activity.description !== activity.title" class="activity-head__desc">{{ activity.description }}</p>
    </div>

    <ActionSheet ref="sheet" />

    <!-- ══════════ VISTA LÍDER ══════════ -->
    <template v-if="band.can.manageActivities">
      <div>

              <!-- Sin tiempos: arrancar el setlist con un toque -->
              <div v-if="!activity?.tiempos?.length && !tiempoForm" class="setlist-start">
                <p class="setlist-start__title">Arma el setlist</p>
                <p class="setlist-start__hint">Empieza con un tiempo; después eliges sus canciones.</p>
                <div class="setlist-start__chips">
                  <button v-for="name in TIEMPO_SUGGESTIONS" :key="name" type="button" class="setlist-start__chip" @click="createTiempo({ name, start: '', end: '' })">{{ name }}</button>
                  <button type="button" class="setlist-start__chip setlist-start__chip--other" @click="startCreateTiempo">+ Otro</button>
                </div>
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
                      class="tiempo-add-btn"
                      type="button"
                      :aria-label="`Agregar canciones a ${tiempoTitle(tiempo)}`"
                      @click.stop="openLibrary(tiempo)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                    <button
                      class="dots-btn tiempo-menu-btn"
                      type="button"
                      :aria-label="`Opciones de ${tiempoTitle(tiempo)}`"
                      @click.stop="openTiempoMenu(tiempo)"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
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
                        <small v-if="song.author">{{ song.author }}</small>
                      </button>
                      <span v-if="song.key" class="song-key">{{ fmtKey(song.key) }}</span>
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
              </div>

              <!-- Form de crear tiempo nuevo (al final) -->
              <TiempoForm
                v-if="tiempoForm && !tiempoForm.id"
                :form="tiempoForm"
                @save="saveTiempoForm"
                @cancel="cancelTiempoForm"
              />

              <!-- Footer: crear tiempo -->
              <div v-if="!tiempoForm && activity?.tiempos?.length" class="setlist-column-footer">
                <button class="btn-create-tiempo" @click="startCreateTiempo">+ Crear tiempo</button>
              </div>

      </div>

      <!-- ── Selector de canciones ── -->
      <SongPicker
        :open="libraryOpen"
        :eyebrow="pickerTiempo ? tiempoTitle(pickerTiempo) : ''"
        :exclude-ids="pickerTiempo?.songs || []"
        :locked-labels="songTiempoLabels"
        with-repertoires
        empty-text="Todas las canciones ya están en este tiempo"
        @close="libraryOpen = false"
        @accept="addSongs"
      />
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
              <span v-if="songById(songId)?.key" class="song-key">{{ fmtKey(songById(songId).key) }}</span>
            </li>
          </ol>
        </li>
      </ol>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import { fmtKey } from '../utils/keys'
import SongPicker from '../components/SongPicker.vue'
import { useConfirm } from '../composables/useConfirm'
import draggable from 'vuedraggable'
import ActionSheet from '../components/ActionSheet.vue'
import TiempoForm from '../components/TiempoForm.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const band = useBandStore()

const { showToast, showError, attempt } = useToast()
const { confirm }   = useConfirm()

const sheet             = ref(null)
const selectedTiempoId  = ref(null)
const tiempoForm        = ref(null)   // { id?, name, start, end } — null = cerrado
const libraryOpen       = ref(false)

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

// Destino del selector de canciones, aparte del resaltado: el clic "afuera"
// que deselecciona (contenedor raíz) no debe dejar al selector sin tiempo.
const pickerTiempoId = ref(null)
const pickerTiempo = computed(() =>
  activity.value?.tiempos?.find(t => t.id === pickerTiempoId.value)
)

// Mapa songId → nombre del tiempo donde está asignada
const songTiempoLabels = computed(() => {
  const map = {}
  for (const tiempo of activity.value?.tiempos || []) {
    for (const songId of tiempo.songs || []) {
      if (!map[songId]) map[songId] = tiempoTitle(tiempo)
    }
  }
  return map
})

const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
// "Sáb 26 sep · 18:00" (se muestra en mayúsculas)
const whenLabel = computed(() => {
  if (!activity.value?.date) return ''
  const [y, m, d] = activity.value.date.split('-').map(Number)
  const weekday = dayNames[new Date(y, m - 1, d).getDay()]
  const date = `${weekday} ${d} ${monthNames[m - 1].slice(0, 3)}`
  return activity.value.time ? `${date} · ${activity.value.time}` : date
})
function songById(id) { return store.songs.find(s => s.id === id) }

function tiempoSongObjects(tiempo) {
  return (tiempo.songs || []).map(id => songById(id)).filter(Boolean)
}
function setTiempoSongs(tiempo, songs) {
  tiempo.songs = songs.map(s => s.id)
  save()
}

// Los cambios se aplican primero en pantalla y se guardan en cola (en orden).
// Si el guardado falla, se avisa y se recarga para deshacer el cambio local.
let saveChain = Promise.resolve()
function save(success) {
  const { id, tiempos } = activity.value
  const snapshot = JSON.parse(JSON.stringify(tiempos || []))
  saveChain = saveChain.then(async () => {
    try {
      await store.updateActivityTiempos(id, snapshot)
      if (success) showToast(success)
    } catch (reason) {
      showError(reason, 'No se pudieron guardar los cambios de la actividad.')
      await store.loadActivities()
    }
  })
  return saveChain
}

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
    save('Tiempo actualizado')
  } else {
    createTiempo(data)
  }
  tiempoForm.value = null
}

const TIEMPO_SUGGESTIONS = ['Alabanza', 'Adoración', 'Ofrenda']

// Crear un tiempo abre de una vez el selector de canciones para ese tiempo:
// el flujo sigue solo a elegir canciones (o se cierra si no se quiere).
function createTiempo(data) {
  if (!activity.value.tiempos) activity.value.tiempos = []
  const nuevo = { id: Date.now(), songs: [], ...data }
  activity.value.tiempos.push(nuevo)
  save(`Tiempo "${tiempoLabel(nuevo)}" creado`)
  if (store.songs.length) openLibrary(nuevo)
  else selectedTiempoId.value = nuevo.id
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
  save(`Tiempo "${nombre}" eliminado`)
}

function openLibrary(tiempo) {
  selectedTiempoId.value = tiempo.id
  pickerTiempoId.value = tiempo.id
  libraryOpen.value = true
}

function addSongs(songIds) {
  libraryOpen.value = false
  const target = pickerTiempo.value
  if (!target || !songIds.length) return
  target.songs = [...(target.songs || []), ...songIds]
  save(`${songIds.length} canción${songIds.length === 1 ? '' : 'es'} agregada${songIds.length === 1 ? '' : 's'} a ${tiempoTitle(target)}`)
}

function removeSong(tiempo, songId) {
  tiempo.songs = tiempo.songs.filter(id => id !== songId)
  save()
}

function openTiempoMenu(tiempo) {
  sheet.value?.open({
    title: tiempoTitle(tiempo),
    actions: [
      { label: 'Editar tiempo', icon: 'edit', onSelect: () => startEditTiempo(tiempo) },
      { label: 'Eliminar tiempo', icon: 'trash', danger: true, onSelect: () => deleteTiempo(tiempo.id) },
    ],
  })
}

function openMenu() {
  sheet.value?.open({
    title: activity.value?.title,
    actions: [
      { label: 'Editar información', icon: 'edit', onSelect: () => router.push(`/actividades/${activity.value.id}/editar`) },
      { label: 'Eliminar actividad', icon: 'trash', danger: true, onSelect: handleDelete },
    ],
  })
}

async function handleDelete() {
  const ok = await confirm('¿Estás seguro que quieres eliminar esta actividad?', `"${activity.value?.title}"`)
  if (!ok) return
  const deleted = await attempt(() => store.deleteActivity(activity.value.id), { success: 'Actividad eliminada', error: 'No se pudo eliminar la actividad.' })
  if (deleted) router.push('/actividades')
}

</script>

<style scoped>
/* ── Encabezado de la actividad: sin tarjeta, jerarquía por color ── */
.activity-head { margin: 4px 2px 22px; }
.activity-head__when { color: var(--color-section); font-family: var(--font-display); font-size: .8rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.activity-head__title { margin-top: 4px; color: var(--color-text-primary); font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; line-height: 1.2; }
.activity-head__desc { margin-top: 8px; color: var(--color-text-secondary); font-size: .9rem; line-height: 1.5; }

/* ── Tiempo (líder): nombre + "+ Canciones" + ⋯ ── */
.tiempo-name { color: var(--color-section); font-family: var(--font-display); font-size: 1.05rem; }
.tiempo-block :is(.tiempo-header) { align-items: center; }
/* Mismo tamaño y color que el ⋯ de al lado: se leen como un par. */
.tiempo-add-btn { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); cursor: pointer; }
.tiempo-add-btn svg { width: 20px; height: 20px; }
.tiempo-add-btn:hover { color: var(--color-text-primary); }
.tiempo-add-btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.tiempo-menu-btn { width: 36px; height: 36px; justify-content: center; }

/* Tono: misma pastilla naranja que la agenda y el setlist */
.song-key { flex: 0 0 auto; min-width: 32px; padding: 3px 8px; border-radius: 8px; background: var(--color-accent-soft); color: var(--color-chord); font-family: var(--font-display); font-size: .8rem; font-weight: 700; text-align: center; }

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

.tiempo-song-list { overflow: hidden; margin: 2px -8px 0; background: var(--color-surface); }
.tiempo-song-row { min-height: 64px; display: flex; align-items: center; gap: 7px; padding: 8px; border-bottom: 1px solid var(--color-border); }
.tiempo-song-row:last-child { border-bottom: 0; }
.tiempo-song-drag { width: 22px; flex: 0 0 22px; display: grid; place-items: center; color: var(--color-text-muted); font-size: 17px; cursor: grab; touch-action: none; }
.tiempo-song-drag:active { cursor: grabbing; }
.tiempo-song-row__number { width: 20px; flex: 0 0 20px; color: var(--color-primary); font-family: var(--font-display); font-size: 14px; font-weight: 600; text-align: center; }
.tiempo-song-row__content { min-width: 0; flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 3px 2px; border: 0; background: transparent; color: var(--color-text-primary); text-align: left; cursor: pointer; }
.tiempo-song-row__content strong { max-width: 100%; overflow: hidden; font-size: 14px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.tiempo-song-row__content small { max-width: 100%; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.tiempo-song-row__remove { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-muted); cursor: pointer; }
.tiempo-song-row__remove svg { width: 14px; height: 14px; display: block; }
.tiempo-song-row__remove:hover,
.tiempo-song-row__remove:active { background: var(--color-danger-soft); color: var(--color-danger); }

/* Acción primaria: una sola, clara, en acento (no rojo) */

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

@media (hover: hover) {
  .orden__song:hover { background: var(--color-primary-soft); }
}

@media (max-width: 360px) {
  .tiempo-block { padding-inline: 14px; }
  .tiempo-song-list { margin-inline: -6px; }
  .tiempo-song-row { gap: 5px; padding-inline: 6px; }
}

.setlist-start { padding: 22px 16px; border: 1px dashed var(--color-border-strong); border-radius: 20px; background: var(--color-surface-secondary); text-align: center; }
.setlist-start__title { color: var(--color-text-primary); font-family: var(--font-display); font-size: 1rem; font-weight: 700; }
.setlist-start__hint { margin-top: 4px; color: var(--color-text-muted); font-size: .82rem; line-height: 1.45; }
.setlist-start__chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 14px; }
.setlist-start__chip { min-height: 40px; padding: 0 16px; border: 1px solid var(--color-primary); border-radius: 999px; background: var(--color-surface); color: var(--color-primary); font: inherit; font-size: .88rem; font-weight: 700; cursor: pointer; }
.setlist-start__chip:hover { background: var(--color-primary-soft); }
.setlist-start__chip--other { border-style: dashed; border-color: var(--color-border-strong); color: var(--color-text-secondary); }
</style>
