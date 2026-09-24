<template>
  <div class="song-view">
    <!-- Barra superior flotante (modo vista) -->
    <header class="song-float-top">
      <button class="song-fab" aria-label="Volver" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>
      <div class="song-float-top__info">
        <h1 class="song-float-top__title">{{ song?.title }}</h1>
        <p v-if="songMeta" class="song-float-top__meta">{{ songMeta }}</p>
      </div>
      <button v-if="band.can.editLibrary && song" class="song-fab" aria-label="Opciones" @click="openMenu">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      <span v-else class="song-fab-spacer" aria-hidden="true"></span>
    </header>

    <ActionSheet ref="sheet" />

    <!-- Letra y acordes: ocupan toda la vista -->
    <article class="song-sheet" :class="{ 'song-sheet--dock': hasNav }">
      <template v-if="renderedLines.length">
        <template v-for="(line, i) in renderedLines" :key="i">
          <div v-if="line.type === 'spacer'" class="song-sheet__spacer"></div>
          <ChordLine v-else-if="line.type === 'chordpro'" :pairs="line.pairs" :hide-chords="!band.can.seeChords" />
          <div v-else :class="line.type">{{ line.text }}</div>
        </template>
      </template>
      <div v-else class="song-sheet__empty">
        Esta canción aún no tiene letra.
        <button v-if="band.can.editLibrary" class="btn btn-ghost btn-sm" @click="startEdit">Agregar letra</button>
      </div>
    </article>

    <!-- Controles flotantes: siempre a mano con el pulgar -->
    <nav v-if="song && hasNav" class="song-dock" aria-label="Controles de la canción">
      <button class="song-dock__nav" aria-label="Canción anterior" :disabled="navIndex <= 0" @click="goTo(-1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span v-if="navIndex >= 0" class="song-dock__count">{{ navIndex + 1 }} de {{ navList.length }}</span>
      <button v-if="SHOW_PRACTICE_TOOLS && canPlay" class="song-dock__play" @click="openPlayer">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20"/></svg>
        Play
      </button>
      <button v-if="SHOW_PRACTICE_TOOLS" class="song-dock__practice" :disabled="practiceBusy" @click="openPractice">
        {{ linkedSkill ? 'Ver práctica' : (practiceBusy ? 'Agregando…' : 'Practicar') }}
      </button>
      <button class="song-dock__nav" aria-label="Canción siguiente" :disabled="navIndex < 0 || navIndex >= navList.length - 1" @click="goTo(1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </nav>

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
            <ChordLine v-else-if="line.type === 'chordpro'" :pairs="line.pairs" :hide-chords="!band.can.seeChords" />
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
import { ref, computed, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useLiveStore } from '../stores/live'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { formatDuration } from '../utils/duration'
import { parseSections } from '../utils/sections'
import ActionSheet from '../components/ActionSheet.vue'
import ChordLine from '../components/ChordLine.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const band = useBandStore()
const live      = useLiveStore()
const practice  = usePracticeStore()
const { showError, attempt } = useToast()
const { confirm }   = useConfirm()

const sheet       = ref(null)
// ponytail: Play (autoscroll) y Practicar quedan ocultos hasta que maduren; su código
// sigue funcionando. Para volver a mostrarlos, cambiar a true.
const SHOW_PRACTICE_TOOLS = false
const practiceBusy = ref(false)

const song = computed(() => store.songs.find(s => s.id === Number(route.params.id)))
const linkedSkill = computed(() => practice.skills.find(skill => Number(skill.song_id) === Number(song.value?.id)))

async function openPractice() {
  if (!song.value || practiceBusy.value) return
  practiceBusy.value = true
  try {
    const skill = linkedSkill.value || await practice.createSkillFromSong(song.value)
    band.enterPersonal()
    router.push(`/skill/${skill.id}`)
  } catch (reason) {
    showError(reason, 'No se pudo agregar a la práctica')
  } finally { practiceBusy.value = false }
}

function openMenu() {
  sheet.value?.open({
    title: song.value?.title,
    actions: [
      // La sesión en vivo es de banda; en el espacio personal no aplica.
      ...(band.can.conductLive ? [{ label: '▶ Iniciar en vivo', onSelect: startLive }] : []),
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
  } catch (e) { showError(e, 'No se pudo iniciar la sesión en vivo.') }
}

async function deleteSong() {
  const ok = await confirm('¿Eliminar canción?', `"${song.value?.title}"`)
  if (!ok) return
  const deleted = await attempt(() => store.deleteSong(song.value.id), { success: 'Canción eliminada', error: 'No se pudo eliminar la canción.' })
  if (deleted) router.back()
}

function startEdit() {
  router.push({ path: `/canciones/${song.value.id}/editar`, query: route.query })
}

// Aplanado de parseSections() — mismo parser que la vista en vivo, para que
// canción, vivo y reproductor rendericen idéntico. El ChordLine oculta los
// acordes a coristas; las líneas de acordes sueltas (formato viejo) se filtran.
const renderedLines = computed(() => {
  const hideChords = !band.can.seeChords
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
// Solo ids de canciones que existen: repertorios y tiempos pueden guardar
// canciones ya borradas.
const navList = computed(() => {
  const exists = new Set(store.songs.map(s => s.id))
  const repId = Number(route.query.rep)
  if (repId) {
    const rep = store.repertoires.find(r => r.id === repId)
    const ids = (rep?.songs || []).filter(id => exists.has(id))
    if (ids.length) return ids
  }
  const actId = Number(route.query.act)
  if (actId) {
    const act = store.activities.find(a => a.id === actId)
    const ids = (act?.tiempos || []).flatMap(t => t.songs || []).filter(id => exists.has(id))
    if (ids.length) return ids
  }
  return store.songs.map(s => s.id)
})

const navIndex = computed(() => navList.value.indexOf(Number(route.params.id)))
const hasNav = computed(() => navList.value.length > 1)

// Subtítulo de la barra: artista · tono · tempo · posición en la lista.
const songMeta = computed(() => {
  const s = song.value
  if (!s) return ''
  return [
    s.author,
    s.key && `Tono ${s.key}`,
    s.bpm && `${s.bpm} BPM`,
  ].filter(Boolean).join(' · ')
})

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

onMounted(() => { if (SHOW_PRACTICE_TOOLS && !practice.ready) practice.loadSkills() })
</script>

<style scoped>
/* Vista de canción: la letra es la protagonista; los controles flotan encima. */
.song-view { position: relative; }

/* Cápsulas flotantes: translúcidas para que la letra se intuya por debajo. */
.song-float-top,
.song-dock {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-navigation) 84%, transparent);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-medium);
}

.song-float-top {
  position: sticky;
  top: calc(8px + env(safe-area-inset-top));
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 22px;
}
.song-float-top__info { flex: 1; min-width: 0; text-align: center; }
.song-float-top__title {
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.song-float-top__meta {
  overflow: hidden;
  margin-top: 1px;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-fab,
.song-fab-spacer { width: 44px; height: 44px; flex: 0 0 44px; }
.song-fab {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.song-fab:hover { background: var(--color-surface-secondary); }
.song-fab:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.song-fab svg { width: 22px; height: 22px; }

/* Letra a todo el ancho, sin tarjeta. El padding inferior deja libre el dock. */
.song-sheet {
  padding: 18px 2px 40px;
  font-size: 1rem;
  line-height: 2;
  white-space: pre-wrap;
}
.song-sheet--dock { padding-bottom: calc(100px + env(safe-area-inset-bottom)); }
.song-sheet__spacer { height: 10px; }
/* Mismo tamaño para los dos formatos de acordes: la alineación depende de ello. */
.song-sheet :deep(.chord-line),
.song-sheet :deep(.lyric-line),
.song-sheet :deep(.cp-line) { font-size: 0.95rem; }
.song-sheet__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 16px;
  color: var(--color-text-muted);
  text-align: center;
  white-space: normal;
}

.song-dock {
  position: fixed;
  left: 50%;
  bottom: calc(14px + env(safe-area-inset-bottom));
  z-index: 30;
  width: max-content;
  max-width: calc(100% - 28px);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px;
  border-radius: 999px;
  transform: translateX(-50%);
}
.song-dock__nav {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text-primary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.song-dock__nav:disabled { opacity: .35; cursor: default; }
.song-dock__count { min-width: 56px; color: var(--color-text-secondary); font-size: .8rem; font-weight: 700; text-align: center; white-space: nowrap; }
.song-dock__nav svg { width: 20px; height: 20px; }
.song-dock__play,
.song-dock__practice {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 999px;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.song-dock__play { border: 0; background: var(--color-accent); color: var(--color-text-on-accent); }
.song-dock__play:hover { background: var(--color-accent-hover); }
.song-dock__play:active { background: var(--color-accent-pressed); }
.song-dock__play svg { width: 14px; height: 14px; }
.song-dock__practice { border: 1px solid var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary-hover); }
.song-dock__practice:disabled { opacity: .6; cursor: wait; }
.song-dock button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* Reproductor: letra un poco más grande, mismo tamaño en los dos formatos de acordes. */
.player-body :deep(.chord-line),
.player-body :deep(.lyric-line),
.player-body :deep(.cp-line) { font-size: 1rem; }

@media (min-width: 768px) {
  .song-sheet :deep(.chord-line),
  .song-sheet :deep(.lyric-line),
  .song-sheet :deep(.cp-line) { font-size: 1.05rem; }
}
</style>
