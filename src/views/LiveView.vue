<template>
  <div class="live">
    <!-- Barra superior -->
    <div class="live-bar">
      <span class="live-dot"></span>
      <div class="live-bar__title">
        <span class="live-bar__song">{{ song?.title || '—' }}</span>
        <span v-if="section" class="live-bar__sec">{{ section.label || 'Sección' }} · {{ secIndex + 1 }}/{{ sections.length }}</span>
      </div>
      <button class="live-exit" @click="$router.back()">Salir</button>
    </div>

    <!-- Modo de espera: sesión activa pero el líder aún no da play -->
    <div v-if="standby" class="live-standby" :class="{ 'live-standby--host': live.isController }">
      <template v-if="live.isController">
        <span>Cuando todos estén listos, toca ▶ para comenzar</span>
        <span class="live-standby__count">{{ live.participants }} en línea</span>
      </template>
      <span v-else>En pausa · esperando al líder</span>
    </div>

    <!-- Sin sesión -->
    <div v-if="!live.session" class="live-empty">
      <p>No hay una sesión en vivo activa.</p>
    </div>

    <!-- Contenido de la sección actual -->
    <div v-else class="live-content" :class="{ 'live-content--singer': !band.can.seeChords }">
      <div v-if="section" class="live-section">
        <div v-if="section.label" class="live-section__label">{{ section.label }}</div>
        <template v-for="(l, i) in section.lines" :key="i">
          <ChordLine v-if="l.type === 'chordpro'" class="live-chordpro" :pairs="l.pairs" :hide-chords="!band.can.seeChords" />
          <div v-else-if="!(l.type === 'chord' && !band.can.seeChords)"
               :class="l.type === 'spacer' ? 'live-spacer' : (l.type === 'chord' ? 'live-chord' : 'live-lyric')">{{ l.text }}</div>
        </template>
      </div>
      <p v-else-if="live.currentSongId && !song" class="live-empty">
        Esta canción no está en tu banda. Pídele al líder que inicie la sesión desde la misma banda del repertorio.
      </p>
      <p v-else-if="song && !sections.length" class="live-empty">
        “{{ song.title }}” todavía no tiene letra cargada.
      </p>
      <p v-else class="live-empty">Esperando contenido…</p>

      <!-- Siguiente sección (pista para todos) -->
      <div v-if="nextLabel" class="live-next">Sigue: {{ nextLabel }}</div>
    </div>

    <!-- Consola del encargado: panel de secciones + transporte -->
    <template v-if="live.isController && live.session">
      <div v-if="sections.length" ref="secStrip" class="live-sections">
        <button
          v-for="(s, i) in sections"
          :key="i"
          class="live-sec-chip"
          :class="{ active: i === secIndex }"
          @click="goSection(i)"
        >
          <span class="live-sec-chip__n">{{ i + 1 }}</span>
          <span class="live-sec-chip__lbl">{{ s.label || 'Parte' }}</span>
        </button>
      </div>
      <div class="live-controls">
        <button class="live-ctrl" @click="prev" aria-label="Sección anterior">◀</button>
        <button class="live-ctrl live-ctrl--play" @click="togglePlay">{{ live.session.is_playing ? '⏸' : '▶' }}</button>
        <button class="live-ctrl" @click="next" aria-label="Sección siguiente">▶</button>
        <button class="live-ctrl live-ctrl--end" @click="end">■ Terminar</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useLiveStore } from '../stores/live'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { parseSections } from '../utils/sections'
import ChordLine from '../components/ChordLine.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const live  = useLiveStore()
const store = useAppStore()
const band  = useBandStore()
const { attempt } = useToast()

// Toda acción del controlador pasa por aquí: si falla, se avisa con un toast.
const send = (action) => attempt(action, { error: 'No se pudo actualizar el en vivo.' })

const song = computed(() => store.songs.find(s => s.id === live.currentSongId) || null)
const sections = computed(() => parseSections(song.value?.lyrics))
const secIndex = computed(() => live.session?.current_section_index ?? 0)
const section  = computed(() => sections.value[secIndex.value] || null)
const songs    = computed(() => live.session?.song_ids || [])
const songIndex = computed(() => live.session?.current_song_index ?? 0)
const nextLabel = computed(() => sections.value[secIndex.value + 1]?.label || null)

// Sesión activa pero sin reproducir: sala de espera / pausa del líder.
const standby = computed(() => !!live.session && !live.session.is_playing)

// Centrar la sección actual en la consola al avanzar.
const secStrip = ref(null)
watch(secIndex, async () => {
  await nextTick()
  secStrip.value?.querySelector('.live-sec-chip.active')
    ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
})

// Momento (en seg, desde el inicio) en que entra cada sección. Los marcadores
// [Sección m:ss] indican cuánto DURA cada parte (igual que el reproductor), así
// que el inicio de cada una es la suma acumulada de las anteriores. Sin
// marcadores, se reparte la duración total de la canción a partes iguales.
const sectionTimes = computed(() => {
  const durs = sections.value.map(s => s.secs)
  if (durs.some(x => x != null)) {
    let t = 0
    return durs.map(d => { const start = t; t += (d || 0); return start })
  }
  const dur = song.value?.duration
  if (!dur || sections.value.length < 2) return durs
  const per = dur / sections.value.length
  return sections.value.map((_, i) => Math.round(i * per))
})

// ---------- Reloj del controlador (avance por tiempo) ----------
let anchor = { at: Date.now(), base: 0 }   // base = segundos transcurridos en la canción
let timer = null

function elapsed() {
  return live.session?.is_playing ? anchor.base + (Date.now() - anchor.at) / 1000 : anchor.base
}
let autoAdvancing = false
async function tick() {
  if (autoAdvancing || !live.isController || !live.session?.is_playing) return
  const e = elapsed()
  let target = -1
  sectionTimes.value.forEach((secs, i) => { if (secs != null && secs <= e) target = i })
  if (target > live.session.current_section_index) {
    autoAdvancing = true   // sin reintentos en cada tick mientras la anterior está en vuelo
    await send(() => live.setSection(target))
    autoAdvancing = false
  }
}

// Controles
function next() {
  if (secIndex.value < sections.value.length - 1) goSection(secIndex.value + 1)
  else if (songIndex.value < songs.value.length - 1) send(() => live.setSong(songIndex.value + 1))
}
function prev() {
  if (secIndex.value > 0) goSection(secIndex.value - 1)
  else if (songIndex.value > 0) send(() => live.setSong(songIndex.value - 1))
}
function goSection(i) {
  anchor = { at: Date.now(), base: sectionTimes.value[i] ?? anchor.base }
  send(() => live.setSection(i))
}
function togglePlay() {
  if (live.session.is_playing) anchor.base = elapsed()   // pausa: congelar
  else anchor.at = Date.now()                            // reanuda
  send(() => live.togglePlay())
}
async function end() {
  if (await send(() => live.end())) router.back()
}

// Al cambiar de canción, reiniciar el reloj.
watch(() => live.currentSongId, () => { anchor = { at: Date.now(), base: 0 } })

onMounted(() => {
  // Si el controlador entra con la sesión en marcha, anclar a la sección actual.
  if (live.isController && live.session?.is_playing) {
    anchor = { at: Date.now(), base: sectionTimes.value[secIndex.value] ?? 0 }
  }
  timer = setInterval(tick, 300)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.live {
  position: fixed; inset: 0; z-index: 400; background: var(--color-background);
  display: flex; flex-direction: column;
}
.live-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  background: var(--color-surface); border-bottom: 1px solid var(--color-border);
}
.live-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-danger); animation: pulse 1.4s infinite; flex-shrink: 0; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.live-bar__title { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.live-bar__song { font-weight: 700; color: var(--color-text-primary); font-size: .95rem; }
.live-bar__sec { font-size: .78rem; color: var(--color-primary); font-weight: 600; }
.live-exit { margin-left: auto; background: none; border: none; color: var(--color-text-secondary); cursor: pointer; font-weight: 600; }

.live-content { flex: 1; overflow-y: auto; padding: 24px 20px 40px; }
.live-section__label {
  margin-bottom: 12px; color: var(--color-section); text-align: center; text-transform: uppercase;
  font-family: var(--font-display); font-size: .8rem; font-weight: 600; letter-spacing: .08em;
}
.live-spacer { height: 12px; }
.live-chord { color: var(--color-chord); font-weight: 700; font-family: ui-monospace, 'Roboto Mono', monospace; white-space: pre; line-height: 1.5; }
.live-lyric { color: var(--color-text-primary); white-space: pre-wrap; line-height: 1.7; font-family: ui-monospace, 'Roboto Mono', monospace; }

/* Vista corista (estilo Spotify): grande y centrada */
.live-content--singer { padding: 32px 24px; display: flex; flex-direction: column; justify-content: center; }
.live-content--singer .live-section__label { font-size: .9rem; }
.live-content--singer .live-lyric { font-size: 1.7rem; line-height: 2.1; text-align: center; font-family: 'Nunito', sans-serif; font-weight: 600; }
/* Acordes inline en vivo: legibles para músico; para corista, letra grande/centrada */
.live-chordpro :deep(.cp-line) { font-size: 1rem; line-height: 1.6; }
.live-content--singer .live-chordpro :deep(.cp-line--plain) {
  font-size: 1.7rem; line-height: 2.1; text-align: center;
  font-family: 'Nunito', sans-serif; font-weight: 600;
}

.live-next { margin-top: 28px; color: var(--color-text-muted); font-size: .85rem; text-align: center; }

/* Sala de espera / pausa */
.live-standby {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 10px 16px; font-size: .85rem; font-weight: 600; text-align: center;
  color: var(--color-text-secondary); background: var(--color-surface-secondary); border-bottom: 1px solid var(--color-border);
}
.live-standby--host { color: var(--color-primary); }
.live-standby__count {
  flex-shrink: 0; font-size: .72rem; font-weight: 700; color: var(--color-primary);
  background: var(--color-primary-soft); padding: 2px 10px; border-radius: 999px;
}

/* Consola: tira de secciones para saltar manualmente */
.live-sections {
  display: flex; gap: 8px; overflow-x: auto; padding: 12px 16px 6px;
  background: var(--color-surface); border-top: 1px solid var(--color-border);
  scrollbar-width: none;
}
.live-sections::-webkit-scrollbar { display: none; }
.live-sec-chip {
  flex-shrink: 0; display: flex; align-items: center; gap: 7px;
  padding: 8px 14px; border-radius: 999px;
  border: 1px solid var(--color-border); background: var(--color-background);
  color: var(--color-text-secondary); font-family: var(--font); cursor: pointer;
  -webkit-tap-highlight-color: transparent; transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.live-sec-chip__n { font-size: .7rem; font-weight: 800; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.live-sec-chip__lbl { font-size: .82rem; font-weight: 600; white-space: nowrap; }
.live-sec-chip.active {
  background: var(--color-primary); border-color: var(--color-primary); color: var(--color-text-on-primary);
  box-shadow: 0 2px 10px rgba(var(--color-primary-rgb),.35);
}
.live-sec-chip.active .live-sec-chip__n { color: var(--color-text-on-primary); }
.live-sec-chip:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

.live-controls {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px;
  background: var(--color-surface); border-top: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: reduce) {
  .live-sec-chip { transition: none; }
}
.live-ctrl {
  flex: 1; padding: 14px; border-radius: 12px; border: 1px solid var(--color-border);
  background: var(--color-surface-secondary); color: var(--color-text-primary); font-size: 1.1rem; cursor: pointer; font-weight: 700;
}
.live-ctrl--play { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-text-on-accent); flex: 1.3; }
.live-ctrl--end { flex: 1.6; font-size: .9rem; background: var(--color-danger-soft); border-color: rgba(var(--color-danger-rgb),.2); color: var(--color-danger-text); }

.live-empty { color: var(--color-text-muted); text-align: center; margin-top: 40px; padding: 20px; }
</style>
