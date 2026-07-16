<template>
  <div>
    <!-- Topbar (modo vista) -->
    <div v-if="!editing" class="detail-topbar">
      <button class="icon-circle-btn" aria-label="Volver" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>
      <div class="song-topbar-info">
        <div class="song-topbar-title">
          {{ song?.title }}
          <span v-if="song?.key" class="song-topbar-key">{{ song.key }}</span>
        </div>
      </div>
      <button v-if="roleStore.isLeader" class="icon-circle-btn" aria-label="Opciones" @click="openMenu">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      <div v-else class="song-topbar-spacer"></div>
    </div>

    <!-- Header (modo edición) -->
    <div v-else>
      <h1 class="section-title">Editar alabanza</h1>
      <p class="section-subtitle">Modifica la información de la canción.</p>
    </div>

    <!-- Mini menú: navegación entre canciones + Play -->
    <div v-if="!editing && song" class="song-navbar">
      <button class="song-nav-btn" aria-label="Canción anterior" :disabled="navIndex <= 0" @click="goTo(-1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="song-navbar__center">
        <button v-if="canPlay" class="song-play-btn" @click="openPlayer">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>
          Play
        </button>
        <span v-if="navList.length > 1" class="song-nav-count">{{ navIndex + 1 }} de {{ navList.length }}</span>
      </div>
      <button class="song-nav-btn" aria-label="Canción siguiente" :disabled="navIndex < 0 || navIndex >= navList.length - 1" @click="goTo(1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <ActionSheet ref="sheet" />

    <!-- Edit form (mismo formato que crear alabanza) -->
    <div v-if="editing">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Título <span class="req">*</span></label>
          <input
            ref="editTitleInput"
            class="form-input"
            :class="{ 'form-input--error': titleError }"
            v-model="form.title"
            type="text"
            placeholder="Ej: Santo, Santo, Santo"
            @input="titleError = ''"
          >
          <p v-if="titleError" class="form-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ titleError }}
          </p>
        </div>
        <div class="form-group">
          <label class="form-label">Autor / Artista</label>
          <UiCombobox v-model="form.author" :options="authorSuggestions" placeholder="Ej: Marcos Witt" aria-label="Autor o artista" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tono (Key)</label>
          <UiSelect v-model="form.key" :options="keyOptions" placeholder="— Sin especificar —" aria-label="Tono de la canción" />
        </div>
        <div class="form-group">
          <label class="form-label">Tempo (BPM)</label>
          <input class="form-input" v-model.number="form.bpm" type="number" placeholder="Ej: 75" min="40" max="200">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Duración (min:seg)</label>
        <input class="form-input" v-model="form.durationText" type="text" inputmode="numeric" placeholder="Ej: 4:30">
        <div class="form-hint">Se usa para el autoscroll de la letra en modo Play.</div>
      </div>

      <div class="form-group">
        <label class="form-label">Tipos</label>
        <div class="type-pills type-pills--form">
          <button
            v-for="t in store.songTypes"
            :key="t.id"
            type="button"
            class="type-pill"
            :class="{ active: form.types.includes(t.id) }"
            @click="toggleFormType(t.id)"
          >{{ t.name }}</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Letra y acordes</label>
        <textarea class="form-textarea" v-model="form.lyrics" :placeholder="lyricsPlaceholder"></textarea>
        <div class="form-hint">Acordes inline: <code>[C]Sublime [G]gra[Am]cia</code> — el acorde se coloca sobre la sílaba (también funciona el acorde en su propia línea). Usa [Coro], [Verso]… para secciones; con tiempo opcional [Intro 0:25] el autoscroll se pausa ahí. A las coristas no se les muestran los acordes.</div>
      </div>

      <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
        <button class="btn btn-ghost" @click="cancelEdit">Cancelar</button>
        <button class="btn btn-primary" @click="saveEdit">Guardar cambios</button>
      </div>
    </div>

    <!-- View mode: letra y acordes -->
    <div v-else class="lyrics-block">
      <template v-if="renderedLines.length">
        <template v-for="(line, i) in renderedLines" :key="i">
          <div v-if="line.type === 'spacer'" style="height:10px;"></div>
          <ChordLine v-else-if="line.type === 'chordpro'" :pairs="line.pairs" :hide-chords="roleStore.isCantante" />
          <div v-else :class="line.type">{{ line.text }}</div>
        </template>
      </template>
      <div v-else style="text-align:center;padding:40px;color:var(--text-muted)">
        Esta canción aún no tiene letra.
        <span v-if="roleStore.isLeader" style="display:block;margin-top:8px">
          <button class="btn btn-ghost btn-sm" @click="startEdit">Agregar letra</button>
        </span>
      </div>
    </div>

    <!-- Reproductor: pantalla completa con autoscroll -->
    <Teleport to="body">
      <div v-if="playerOpen" class="player-overlay">
        <div class="player-progress">
          <div class="player-progress__bar" :style="{ width: (progress * 100) + '%' }"></div>
        </div>
        <div class="player-topbar">
          <div class="player-title">
            {{ song?.title }}
            <span v-if="song?.key" class="song-topbar-key">{{ song.key }}</span>
          </div>
          <button class="icon-circle-btn" aria-label="Cerrar" @click="closePlayer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div ref="playerBody" class="player-body">
          <template v-for="(line, i) in renderedLines" :key="i">
            <div v-if="line.type === 'spacer'" style="height:10px;"></div>
            <ChordLine v-else-if="line.type === 'chordpro'" :pairs="line.pairs" :hide-chords="roleStore.isCantante" />
            <div v-else :class="line.type">{{ line.text }}</div>
          </template>
        </div>
        <div class="player-controls">
          <button class="player-ctrl-btn" aria-label="Canción anterior" :disabled="navIndex <= 0" @click="playerGoTo(-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="player-ctrl-btn" aria-label="Reiniciar" @click="restartPlayer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
          <button class="player-ctrl-btn player-ctrl-btn--main" :aria-label="playing ? 'Pausar' : 'Reproducir'" @click="togglePlay">
            <svg v-if="playing" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor"><polygon points="7 4 21 12 7 20"/></svg>
          </button>
          <button class="player-ctrl-btn" aria-label="Canción siguiente" :disabled="navIndex < 0 || navIndex >= navList.length - 1" @click="playerGoTo(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span class="player-duration">{{ formatDuration(effectiveDuration) }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useLiveStore } from '../stores/live'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { parseDuration, formatDuration } from '../utils/duration'
import { parseSections } from '../utils/sections'
import ActionSheet from '../components/ActionSheet.vue'
import ChordLine from '../components/ChordLine.vue'
import UiSelect from '../components/UiSelect.vue'
import UiCombobox from '../components/UiCombobox.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const live      = useLiveStore()
const { showToast } = useToast()
const { confirm }   = useConfirm()

const sheet       = ref(null)
const editing     = ref(false)
const form        = ref({})
const showDetails = ref(false)
const titleError  = ref('')
const editTitleInput = ref(null)

const lyricsPlaceholder = `[Intro]
G  Em  C  D

[Verso 1]
[G]Cuán [Em]grande es Él
[C]Su amor [D]sin fin

[Coro]
[G]Santo, [D]Santo, [Em]Santo[C]...`

const keys = ['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab']
const keyOptions = [
  { value: '', label: '— Sin especificar —' },
  ...keys.map(key => ({ value: key, label: key })),
]

const song = computed(() => store.songs.find(s => s.id === Number(route.params.id)))

const authorSuggestions = computed(() =>
  [...new Set(store.songs.map(s => s.author).filter(Boolean))]
)

function openMenu() {
  sheet.value?.open({
    title: song.value?.title,
    actions: [
      // La sesión en vivo es de banda; en el espacio personal no aplica.
      ...(roleStore.personalMode ? [] : [{ label: '▶ Iniciar en vivo', onSelect: startLive }]),
      { label: 'Editar canción', icon: 'edit', onSelect: startEdit },
      { label: 'Eliminar canción', icon: 'trash', danger: true, onSelect: deleteSong },
    ],
  })
}

async function startLive() {
  if (!song.value) return
  try {
    await live.start({ source: 'song', songIds: [song.value.id] })
    router.push('/live')
  } catch (e) { showToast('No se pudo iniciar la sesión en vivo') }
}

async function deleteSong() {
  const ok = await confirm('¿Eliminar canción?', `"${song.value?.title}"`)
  if (!ok) return
  store.songs = store.songs.filter(s => s.id !== song.value.id)
  store.saveSongs()
  showToast('Canción eliminada')
  router.back()
}

function startEdit() {
  const s = song.value
  const types = Array.isArray(s.types) ? [...s.types] : (s.type ? [s.type] : [])
  form.value = { title: s.title, author: s.author || '', key: s.key || '', bpm: s.bpm || null, durationText: formatDuration(s.duration), types, lyrics: s.lyrics || '' }
  editing.value = true
}

function toggleFormType(id) {
  const idx = form.value.types.indexOf(id)
  if (idx >= 0) form.value.types.splice(idx, 1)
  else form.value.types.push(id)
}

function cancelEdit() {
  editing.value = false
  showDetails.value = false
}

function saveEdit() {
  if (!form.value.title.trim()) { titleError.value = 'Ponle un título para guardar.'; editTitleInput.value?.focus(); return }
  const idx = store.songs.findIndex(s => s.id === Number(route.params.id))
  if (idx === -1) return
  const { durationText, ...fields } = form.value
  store.songs[idx] = { ...store.songs[idx], ...fields, title: form.value.title.trim(), lyrics: form.value.lyrics.trim(), bpm: form.value.bpm || null, duration: parseDuration(durationText), types: form.value.types.length ? form.value.types : [] }
  store.saveSongs()
  editing.value = false
  showDetails.value = false
  showToast('Canción actualizada ✓')
}

// Aplanado de parseSections() — mismo parser que la vista en vivo, para que
// canción, vivo y reproductor rendericen idéntico. El ChordLine oculta los
// acordes a coristas; las líneas de acordes sueltas (formato viejo) se filtran.
const renderedLines = computed(() => {
  const hideChords = roleStore.isCantante
  const out = []
  for (const sec of parseSections(song.value?.lyrics)) {
    if (sec.label) out.push({ type: 'section-label', text: sec.label, secs: sec.secs })
    for (const l of sec.lines) {
      if (l.type === 'spacer') out.push({ type: 'spacer' })
      else if (l.type === 'chordpro') out.push({ type: 'chordpro', pairs: l.pairs })
      else if (l.type === 'chord') { if (!hideChords) out.push({ type: 'chord-line', text: l.text }) }
      else out.push({ type: 'lyric-line', text: l.text })
    }
  }
  return out
})

// ── Navegación entre canciones ──
// El contexto llega por query: ?rep=<id> (repertorio) o ?act=<id> (actividad).
// Sin contexto se navega sobre toda la biblioteca.
const navList = computed(() => {
  const repId = Number(route.query.rep)
  if (repId) {
    const rep = store.repertoires.find(r => r.id === repId)
    if (rep?.songs?.length) return rep.songs
  }
  const actId = Number(route.query.act)
  if (actId) {
    const act = store.activities.find(a => a.id === actId)
    const ids = (act?.tiempos || []).flatMap(t => t.songs || [])
    if (ids.length) return ids
  }
  return store.songs.map(s => s.id)
})

const navIndex = computed(() => navList.value.indexOf(Number(route.params.id)))

function goTo(offset) {
  const id = navList.value[navIndex.value + offset]
  if (id == null) return
  router.replace({ path: '/cancion/' + id, query: route.query })
}

// ── Reproductor con autoscroll ──
const canPlay = computed(() => renderedLines.value.length > 0)

// Sin duración guardada se estima por la cantidad de líneas.
const effectiveDuration = computed(() =>
  song.value?.duration || Math.min(420, Math.max(120, renderedLines.value.length * 4))
)

const playerOpen  = ref(false)
const playing     = ref(false)
const playerBody  = ref(null)
const progress    = ref(0)
let rafId  = null
let lastTs = 0
let elapsed = 0          // segundos transcurridos de la línea de tiempo
let expectedPos = 0      // scrollTop esperado (con decimales; scrollTop redondea)
let timeline = null      // { segs, total } — tramos px↔tiempo según secciones
let wakeLock = null

// Construye la línea de tiempo del autoscroll. Cada sección con tiempo
// explícito ([Coro 1:10]) pausa el scroll en esa sección durante ese tiempo;
// el resto de la duración total se usa para scrollear todo el contenido,
// proporcional a su altura.
function buildTimeline() {
  const el = playerBody.value
  if (!el) return null
  const px = el.scrollHeight - el.clientHeight
  if (px <= 0) return null
  const elTop = el.getBoundingClientRect().top - el.scrollTop
  const clampPx = v => Math.min(px, Math.max(0, v))
  const bounds = []
  renderedLines.value.forEach((line, i) => {
    const node = el.children[i]
    if (line.type !== 'section-label' || !node) return
    bounds.push({ px: clampPx(node.getBoundingClientRect().top - elTop), secs: line.secs })
  })
  if (!bounds.length || bounds[0].px > 0) bounds.unshift({ px: 0, secs: null })
  const segs = []
  bounds.forEach((b, i) => {
    const to = i + 1 < bounds.length ? Math.max(b.px, bounds[i + 1].px) : px
    // Sección con tiempo: segmento de pausa (sin avance) antes de scrollear.
    if (b.secs != null) segs.push({ from: b.px, to: b.px, secs: b.secs })
    if (to > b.px) segs.push({ from: b.px, to, secs: null })
  })
  const explicitSum = bounds.reduce((a, b) => a + (b.secs ?? 0), 0)
  let scrollTime = effectiveDuration.value - explicitSum
  // Si las pausas consumen toda la duración, el scroll va a velocidad promedio.
  if (scrollTime <= 0) scrollTime = effectiveDuration.value
  let t = 0
  for (const s of segs) {
    s.dur = s.secs != null ? s.secs : ((s.to - s.from) / px) * scrollTime
    s.start = t
    t += s.dur
  }
  return { segs, total: t, px }
}

function posAtTime(t) {
  for (const s of timeline.segs) {
    if (t < s.start + s.dur) {
      return s.dur > 0 ? s.from + (s.to - s.from) * ((t - s.start) / s.dur) : s.from
    }
  }
  return timeline.px
}

function timeAtPos(p) {
  for (const s of timeline.segs) {
    if (p <= s.to && s.to > s.from) {
      return p < s.from ? s.start : s.start + s.dur * ((p - s.from) / (s.to - s.from))
    }
  }
  return timeline.total
}

async function requestWakeLock() {
  try { wakeLock = await navigator.wakeLock?.request('screen') } catch { wakeLock = null }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {})
  wakeLock = null
}

function openPlayer() {
  playerOpen.value = true
  progress.value = 0
  elapsed = 0
  expectedPos = 0
  requestWakeLock()
  nextTick(() => {
    if (playerBody.value) playerBody.value.scrollTop = 0
    timeline = buildTimeline()
    play()
  })
}

function closePlayer() {
  pause()
  playerOpen.value = false
  timeline = null
  releaseWakeLock()
}

function play() {
  if (playing.value || !playerBody.value) return
  if (!timeline) timeline = buildTimeline()
  if (!timeline) return
  playing.value = true
  lastTs = performance.now()
  rafId = requestAnimationFrame(step)
}

function pause() {
  playing.value = false
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
}

function togglePlay() {
  playing.value ? pause() : play()
}

// Cambia de canción dentro del reproductor: queda en pausa, al inicio,
// lista para darle play.
function playerGoTo(offset) {
  if (navList.value[navIndex.value + offset] == null) return
  pause()
  goTo(offset)
  timeline = null
  elapsed = 0
  expectedPos = 0
  progress.value = 0
  nextTick(() => {
    if (playerBody.value) playerBody.value.scrollTop = 0
  })
}

function restartPlayer() {
  pause()
  if (playerBody.value) playerBody.value.scrollTop = 0
  progress.value = 0
  elapsed = 0
  expectedPos = 0
  play()
}

function step(ts) {
  const el = playerBody.value
  if (!el || !playing.value || !timeline) return
  const dt = (ts - lastTs) / 1000
  lastTs = ts
  // Si el usuario movió el scroll a mano, seguimos desde ese punto.
  if (Math.abs(el.scrollTop - expectedPos) > 2) elapsed = timeAtPos(el.scrollTop)
  elapsed = Math.min(timeline.total, elapsed + dt)
  expectedPos = posAtTime(elapsed)
  el.scrollTop = expectedPos
  progress.value = timeline.total > 0 ? elapsed / timeline.total : 1
  if (elapsed >= timeline.total) { playing.value = false; return }
  rafId = requestAnimationFrame(step)
}

onBeforeUnmount(() => {
  pause()
  releaseWakeLock()
})
</script>
