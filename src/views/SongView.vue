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
    <div v-else class="song-view-header">
      <div style="flex:1">
        <input class="form-input" v-model="form.title" placeholder="Título" style="font-size:1.1rem;font-weight:600;margin-bottom:6px">
      </div>
      <span class="sf-cancel-link" @click="cancelEdit">Cancelar</span>
      <button class="sf-save-btn sf-save-btn-sm" @click="saveEdit">Guardar</button>
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

    <!-- Edit form -->
    <div v-if="editing">

      <!-- Letra y acordes -->
      <div class="sf-block">
        <div class="sf-block-label">Letra y acordes</div>
        <textarea class="sf-lyrics" v-model="form.lyrics"></textarea>
        <div class="form-hint">Secciones: [Coro], [Verso]… Con tiempo opcional: [Intro 0:25], [Coro 1:10] — el autoscroll se pausa ahí ese tiempo.</div>
      </div>

      <!-- Presentación para coristas -->
      <div class="sf-block">
        <div class="sf-block-label">Presentación para coristas (Genially)</div>
        <textarea class="sf-lyrics" v-model="form.embedCantante" placeholder="Código <iframe> o enlace de Genially. Se mostrará a los coristas en lugar de la letra."></textarea>
      </div>

      <!-- Presentación para músicos -->
      <div class="sf-block">
        <div class="sf-block-label">Presentación para músicos (Genially)</div>
        <textarea class="sf-lyrics" v-model="form.embedMusico" placeholder="Código <iframe> o enlace de Genially. Se mostrará a los músicos en lugar de la letra y acordes."></textarea>
      </div>

      <!-- Tono + Autor -->
      <div class="sf-inline-row">
        <div class="sf-field">
          <label class="sf-label">Tono (Key)</label>
          <select class="form-select" v-model="form.key">
            <option value="">— Sin especificar —</option>
            <option v-for="k in keys" :key="k">{{ k }}</option>
          </select>
        </div>
        <div class="sf-field">
          <label class="sf-label">Autor / Artista</label>
          <input class="form-input" v-model="form.author" placeholder="Ej: Marcos Witt" list="sf-authors-edit">
          <datalist id="sf-authors-edit">
            <option v-for="a in authorSuggestions" :key="a" :value="a"></option>
          </datalist>
        </div>
      </div>

      <!-- Detalles adicionales -->
      <button class="sf-details-toggle" @click="showDetails = !showDetails">
        {{ showDetails ? '▲' : '▶' }} Detalles adicionales
      </button>
      <div v-if="showDetails" class="sf-details">
        <div class="sf-inline-row">
          <div class="sf-field">
            <label class="sf-label">Tempo (BPM)</label>
            <input class="form-input" v-model.number="form.bpm" type="number" placeholder="Ej: 75" min="40" max="200">
          </div>
          <div class="sf-field">
            <label class="sf-label">Duración (min:seg)</label>
            <input class="form-input" v-model="form.durationText" type="text" inputmode="numeric" placeholder="Ej: 4:30">
          </div>
        </div>
        <div class="sf-field" style="margin-top:10px">
          <label class="sf-label">Tipos</label>
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
      </div>

    </div>

    <!-- View mode: presentación embebida (abre ya maximizada) -->
    <div v-else-if="embedSrc" class="embed-block embed-block--full">
      <iframe :src="embedSrc" frameborder="0" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" loading="lazy"></iframe>
    </div>

    <!-- View mode: letra y acordes -->
    <div v-else class="lyrics-block">
      <template v-if="renderedLines.length">
        <template v-for="(line, i) in renderedLines" :key="i">
          <div v-if="line.type === 'spacer'" style="height:10px;"></div>
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
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { parseDuration, formatDuration } from '../utils/duration'
import ActionSheet from '../components/ActionSheet.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()
const { confirm }   = useConfirm()

const sheet       = ref(null)
const editing     = ref(false)
const form        = ref({})
const showDetails = ref(false)

const keys = ['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab']

const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/

const song = computed(() => store.songs.find(s => s.id === Number(route.params.id)))

const authorSuggestions = computed(() =>
  [...new Set(store.songs.map(s => s.author).filter(Boolean))]
)

// Extrae solo la URL del código embebido (evita inyectar HTML crudo / XSS).
// Acepta el <iframe> completo de Genially o un enlace pelado.
function extractSrc(raw) {
  const s = (raw || '').trim()
  if (!s) return ''
  const m = s.match(/src=["']([^"']+)["']/i)
  if (m) return m[1]
  if (/^https?:\/\//i.test(s)) return s
  return ''
}

// Elige la presentación según el rol. El líder ve la de músico, y si no hay,
// la de corista, para poder previsualizar.
const embedSrc = computed(() => {
  const s = song.value
  if (!s) return ''
  if (roleStore.isCantante) return extractSrc(s.embedCantante)
  if (roleStore.isMusico)   return extractSrc(s.embedMusico)
  return extractSrc(s.embedMusico) || extractSrc(s.embedCantante)
})

function openMenu() {
  sheet.value?.open({
    title: song.value?.title,
    actions: [
      { label: 'Editar canción', icon: 'edit', onSelect: startEdit },
      { label: 'Eliminar canción', icon: 'trash', danger: true, onSelect: deleteSong },
    ],
  })
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
  form.value = { title: s.title, author: s.author || '', key: s.key || '', bpm: s.bpm || null, durationText: formatDuration(s.duration), types, lyrics: s.lyrics || '', embedCantante: s.embedCantante || '', embedMusico: s.embedMusico || '' }
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
  if (!form.value.title.trim()) { alert('El título es obligatorio.'); return }
  const idx = store.songs.findIndex(s => s.id === Number(route.params.id))
  if (idx === -1) return
  const { durationText, ...fields } = form.value
  store.songs[idx] = { ...store.songs[idx], ...fields, title: form.value.title.trim(), lyrics: form.value.lyrics.trim(), embedCantante: (form.value.embedCantante || '').trim(), embedMusico: (form.value.embedMusico || '').trim(), bpm: form.value.bpm || null, duration: parseDuration(durationText), types: form.value.types.length ? form.value.types : [] }
  store.saveSongs()
  editing.value = false
  showDetails.value = false
  showToast('Canción actualizada ✓')
}

const renderedLines = computed(() => {
  if (!song.value?.lyrics) return []
  const hideChords = roleStore.isCantante
  return song.value.lyrics.split('\n').reduce((acc, line) => {
    if (!line.trim()) {
      acc.push({ type: 'spacer' })
      return acc
    }
    // [Coro] o [Coro 1:10] — el tiempo es opcional (autoscroll) y no se muestra.
    // Se acepta contenido después de la etiqueta, ej: "[Intro 0:29] C#m7 A/C#".
    const section = line.trim().match(/^\[(.+?)(?:\s+(\d+):([0-5]?\d))?\]\s*(.*)$/)
    if (section) {
      acc.push({ type: 'section-label', text: section[1], secs: section[2] != null ? Number(section[2]) * 60 + Number(section[3]) : null })
      const rest = section[4]
      if (rest) {
        if (chordRegex.test(rest)) { if (!hideChords) acc.push({ type: 'chord-line', text: rest }) }
        else acc.push({ type: 'lyric-line', text: rest })
      }
      return acc
    }
    const isChord = chordRegex.test(line.trim())
    if (hideChords && isChord) return acc
    if (isChord) acc.push({ type: 'chord-line', text: line })
    else acc.push({ type: 'lyric-line', text: line })
    return acc
  }, [])
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
const canPlay = computed(() => !embedSrc.value && renderedLines.value.length > 0)

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
