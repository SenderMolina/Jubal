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

    <!-- Sin sesión -->
    <div v-if="!live.session" class="live-empty">
      <p>No hay una sesión en vivo activa.</p>
    </div>

    <!-- Contenido de la sección actual -->
    <div v-else class="live-content" :class="{ 'live-content--singer': band.isCantante }">
      <div v-if="section" class="live-section">
        <div v-if="section.label" class="live-section__label">{{ section.label }}</div>
        <template v-for="(l, i) in section.lines" :key="i">
          <div v-if="!(l.type === 'chord' && band.isCantante)"
               :class="l.type === 'spacer' ? 'live-spacer' : (l.type === 'chord' ? 'live-chord' : 'live-lyric')">{{ l.text }}</div>
        </template>
      </div>
      <p v-else class="live-empty">Esperando contenido…</p>

      <!-- Siguiente sección (pista para todos) -->
      <div v-if="nextLabel" class="live-next">Sigue: {{ nextLabel }}</div>
    </div>

    <!-- Controles del encargado -->
    <div v-if="live.isController && live.session" class="live-controls">
      <button class="live-ctrl" @click="prev">◀</button>
      <button class="live-ctrl live-ctrl--play" @click="togglePlay">{{ live.session.is_playing ? '⏸' : '▶' }}</button>
      <button class="live-ctrl" @click="next">▶</button>
      <button class="live-ctrl live-ctrl--end" @click="end">■ Terminar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useLiveStore } from '../stores/live'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { parseSections } from '../utils/sections'

const router = useRouter()
const live  = useLiveStore()
const store = useAppStore()
const band  = useBandStore()

const song = computed(() => store.songs.find(s => s.id === live.currentSongId) || null)
const sections = computed(() => parseSections(song.value?.lyrics))
const secIndex = computed(() => live.session?.current_section_index ?? 0)
const section  = computed(() => sections.value[secIndex.value] || null)
const songs    = computed(() => live.session?.song_ids || [])
const songIndex = computed(() => live.session?.current_song_index ?? 0)
const nextLabel = computed(() => sections.value[secIndex.value + 1]?.label || null)

// ---------- Reloj del controlador (avance por tiempo) ----------
let anchor = { at: Date.now(), base: 0 }   // base = segundos transcurridos en la canción
let timer = null

function elapsed() {
  return live.session?.is_playing ? anchor.base + (Date.now() - anchor.at) / 1000 : anchor.base
}
function tick() {
  if (!live.isController || !live.session?.is_playing) return
  const e = elapsed()
  let target = -1
  sections.value.forEach((s, i) => { if (s.secs != null && s.secs <= e) target = i })
  if (target > live.session.current_section_index) live.setSection(target)
}

// Controles
function next() {
  if (secIndex.value < sections.value.length - 1) goSection(secIndex.value + 1)
  else if (songIndex.value < songs.value.length - 1) live.setSong(songIndex.value + 1)
}
function prev() {
  if (secIndex.value > 0) goSection(secIndex.value - 1)
  else if (songIndex.value > 0) live.setSong(songIndex.value - 1)
}
function goSection(i) {
  anchor = { at: Date.now(), base: sections.value[i]?.secs ?? anchor.base }
  live.setSection(i)
}
function togglePlay() {
  if (live.session.is_playing) anchor.base = elapsed()   // pausa: congelar
  else anchor.at = Date.now()                            // reanuda
  live.togglePlay()
}
async function end() { await live.end(); router.back() }

// Al cambiar de canción, reiniciar el reloj.
watch(() => live.currentSongId, () => { anchor = { at: Date.now(), base: 0 } })

onMounted(() => {
  // Si el controlador entra con la sesión en marcha, anclar a la sección actual.
  if (live.isController && live.session?.is_playing) {
    anchor = { at: Date.now(), base: sections.value[secIndex.value]?.secs ?? 0 }
  }
  timer = setInterval(tick, 300)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.live {
  position: fixed; inset: 0; z-index: 400; background: var(--bg);
  display: flex; flex-direction: column;
}
.live-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  background: var(--surface); border-bottom: 1px solid var(--border);
}
.live-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--red); animation: pulse 1.4s infinite; flex-shrink: 0; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.live-bar__title { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.live-bar__song { font-weight: 700; color: var(--text); font-size: .95rem; }
.live-bar__sec { font-size: .78rem; color: var(--accent); font-weight: 600; }
.live-exit { margin-left: auto; background: none; border: none; color: var(--text-mid); cursor: pointer; font-weight: 600; }

.live-content { flex: 1; overflow-y: auto; padding: 24px 20px 40px; }
.live-section__label {
  font-size: .8rem; text-transform: uppercase; letter-spacing: .06em;
  color: var(--accent); font-weight: 700; margin-bottom: 12px;
}
.live-spacer { height: 12px; }
.live-chord { color: var(--accent); font-weight: 700; font-family: ui-monospace, 'Roboto Mono', monospace; white-space: pre; line-height: 1.5; }
.live-lyric { color: var(--text); white-space: pre-wrap; line-height: 1.7; font-family: ui-monospace, 'Roboto Mono', monospace; }

/* Vista corista (estilo Spotify): grande y centrada */
.live-content--singer { padding: 32px 24px; display: flex; flex-direction: column; justify-content: center; }
.live-content--singer .live-section__label { text-align: center; font-size: 1rem; }
.live-content--singer .live-lyric { font-size: 1.7rem; line-height: 2.1; text-align: center; font-family: 'Nunito', sans-serif; font-weight: 600; }

.live-next { margin-top: 28px; color: var(--text-muted); font-size: .85rem; text-align: center; }

.live-controls {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px;
  background: var(--surface); border-top: 1px solid var(--border);
}
.live-ctrl {
  flex: 1; padding: 14px; border-radius: 12px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--text); font-size: 1.1rem; cursor: pointer; font-weight: 700;
}
.live-ctrl--play { background: var(--accent); border-color: var(--accent); color: #fff; flex: 1.3; }
.live-ctrl--end { flex: 1.6; font-size: .9rem; background: var(--red-soft); border-color: rgba(229,57,53,.2); color: var(--red); }

.live-empty { color: var(--text-muted); text-align: center; margin-top: 40px; padding: 20px; }
</style>
