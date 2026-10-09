<template>
  <aside class="song-audio" :class="{ 'song-audio--expanded': expanded }" aria-label="Audio para practicar">
    <audio ref="audio" :src="url || undefined" preload="metadata" @loadedmetadata="updateDuration" @durationchange="updateDuration" @timeupdate="updateTime" @play="playing = true" @pause="playing = false" @ended="playing = false" @error="mediaError" />
    <template v-if="expanded">
      <div class="song-audio__heading">
        <span>{{ title }}</span>
        <button type="button" aria-label="Minimizar reproductor" @click="expanded = false">⌄</button>
      </div>
      <p v-if="error" class="song-audio__error" role="alert">{{ error }}</p>
      <div class="song-audio__timeline">
        <span>{{ timeLabel(currentTime) }}</span>
        <input type="range" min="0" :max="duration || 0" step="0.1" :value="currentTime" :disabled="!duration || !!error" aria-label="Posición del audio" :aria-valuetext="`${timeLabel(currentTime)} de ${timeLabel(duration)}`" @input="seek(Number($event.target.value))">
        <span>{{ timeLabel(duration) }}</span>
      </div>
    </template>
    <div class="song-audio__controls">
      <button v-if="expanded" type="button" class="song-audio__skip" aria-label="Regresar 10 segundos" :disabled="!duration || !!error" @click="seek(currentTime - 10)">↶ <small>10</small></button>
      <button type="button" class="song-audio__play" :disabled="loading" :aria-label="playing ? 'Pausar audio' : error ? 'Reintentar audio' : 'Reproducir audio'" @click="togglePlay">
        <svg v-if="playing" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7 4 21 12 7 20"/></svg>
        <span>{{ loading ? 'Cargando…' : error ? 'Reintentar' : playing ? 'Pausar' : 'Escuchar' }}</span>
      </button>
      <button v-if="expanded" type="button" class="song-audio__skip" aria-label="Adelantar 10 segundos" :disabled="!duration || !!error" @click="seek(currentTime + 10)"><small>10</small> ↷</button>
      <button v-if="!expanded && playing" type="button" aria-label="Mostrar controles de audio" @click="expanded = true">⌃</button>
    </div>
  </aside>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { supabase } from '../supabase'
import { AUDIO_BUCKET } from '../utils/songAudio'

// El padre usa una key por canción/archivo: navegar desmonta y detiene el audio.
const props = defineProps({ path: { type: String, required: true }, title: { type: String, default: '' } })
const audio = ref(null)
const url = ref('')
const loading = ref(false)
const playing = ref(false)
const expanded = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const error = ref('')
let disposed = false

function timeLabel(value) {
  const seconds = Math.max(0, Math.floor(value || 0))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
function updateDuration() { duration.value = Number.isFinite(audio.value?.duration) ? audio.value.duration : 0 }
function updateTime() { currentTime.value = audio.value?.currentTime || 0 }
function seek(value) {
  if (!audio.value || !duration.value) return
  audio.value.currentTime = Math.max(0, Math.min(duration.value, value))
  updateTime()
}
function mediaError() {
  if (disposed || !url.value) return
  error.value = 'No se pudo reproducir el audio. Intenta de nuevo.'
  playing.value = false
}
async function togglePlay() {
  expanded.value = true
  if (playing.value) { audio.value?.pause(); return }
  if (loading.value) return
  loading.value = true
  try {
    if (!url.value || error.value) {
      error.value = ''
      const { data, error: reason } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(props.path, 6 * 60 * 60)
      if (disposed) return
      if (reason) throw reason
      url.value = data.signedUrl
      await nextTick()
      audio.value.load()
    }
    if (disposed) return
    if (audio.value.ended) seek(0)
    await audio.value.play()
  } catch (reason) {
    // Algunos navegadores requieren otra pulsación si hubo que recuperar la URL.
    if (!disposed && reason.name !== 'NotAllowedError') error.value = 'No se pudo reproducir el audio. Intenta de nuevo.'
  } finally { if (!disposed) loading.value = false }
}
// Preparar la URL antes del gesto permite reproducir también en navegadores móviles.
onMounted(async () => {
  loading.value = true
  try {
    const { data, error: reason } = await supabase.storage.from(AUDIO_BUCKET).createSignedUrl(props.path, 6 * 60 * 60)
    if (disposed) return
    if (reason) throw reason
    url.value = data.signedUrl
  } catch {
    if (!disposed) error.value = 'No se pudo cargar el audio. Intenta de nuevo.'
  } finally { if (!disposed) loading.value = false }
})
onBeforeUnmount(() => {
  disposed = true
  if (audio.value) {
    audio.value.pause()
    audio.value.removeAttribute('src')
    audio.value.load()
  }
})
</script>

<style scoped>
.song-audio { position: fixed; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 30; transform: translateX(-50%); max-width: calc(100% - 28px); padding: 7px; border: 1px solid var(--color-border); border-radius: 999px; background: color-mix(in srgb, var(--color-navigation) 94%, transparent); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: var(--shadow-medium); }
.song-audio--expanded { width: 360px; border-radius: 22px; padding: 10px 14px; }
.song-audio audio { display: none; }
.song-audio__heading { display: flex; align-items: center; gap: 8px; font-size: .85rem; font-weight: 700; color: var(--color-text-primary); }
.song-audio__heading span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.song-audio button { min-width: 44px; min-height: 44px; border: 0; border-radius: 999px; background: transparent; color: var(--color-text-primary); font: inherit; cursor: pointer; }
.song-audio button:focus-visible, .song-audio input:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.song-audio button:disabled { opacity: .45; cursor: default; }
.song-audio__timeline, .song-audio__controls { display: flex; align-items: center; justify-content: center; gap: 12px; }
.song-audio__timeline { margin-bottom: 8px; font-size: .75rem; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.song-audio__timeline input { flex: 1; min-width: 0; min-height: 28px; accent-color: var(--color-primary); cursor: pointer; }
.song-audio .song-audio__play { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 20px; background: var(--color-accent); color: var(--color-text-on-accent); font-size: .9rem; font-weight: 700; }
.song-audio__play svg { width: 18px; height: 18px; }
.song-audio .song-audio__skip { font-size: 1.5rem; }
.song-audio__skip small { font-size: .75rem; font-weight: 700; }
.song-audio__error { margin-bottom: 8px; font-size: .8rem; color: var(--color-danger); }
</style>
