<template>
  <div class="live">
    <div class="live-bar">
      <span class="live-dot"></span>
      <span class="live-label">{{ live.isController ? 'Controlando' : (live.following ? 'Sincronizado' : 'Scroll libre') }}</span>
      <button class="live-exit" @click="$router.back()">Salir</button>
    </div>

    <!-- Controlador: elegir canción -->
    <div v-if="live.isController" class="live-control">
      <label class="form-label">Canción en vivo</label>
      <select :value="live.state.songId || ''" @change="live.setSong(Number($event.target.value))">
        <option v-for="s in store.songs" :key="s.id" :value="s.id">{{ s.title }}</option>
      </select>
    </div>

    <!-- Seguidor suelto: botón para re-sincronizar -->
    <button v-else-if="!live.following" class="btn btn-primary live-resync" @click="live.reattach()">
      Volver a sincronizar
    </button>

    <!-- Contenido de la canción -->
    <div
      ref="scroller"
      class="live-content"
      :class="{ 'live-content--singer': band.isCantante }"
      @scroll="onScroll"
    >
      <h2 v-if="currentSong" class="live-song-title">{{ currentSong.title }}</h2>
      <template v-if="currentSong">
        <div
          v-for="(line, i) in lines"
          :key="i"
          :class="line.type === 'spacer' ? 'live-spacer' : (line.type === 'chord' && !band.isCantante ? 'live-chord' : 'live-lyric')"
        >{{ line.type === 'spacer' ? '' : line.text }}</div>
      </template>
      <p v-else class="live-empty">{{ live.isController ? 'Elige una canción para empezar.' : 'Esperando al encargado…' }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLiveStore } from '../stores/live'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'

const live  = useLiveStore()
const store = useAppStore()
const band  = useBandStore()

const scroller = ref(null)
const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/

const currentSong = computed(() => store.songs.find(s => s.id === live.state.songId) || null)

const lines = computed(() => {
  const txt = currentSong.value?.lyrics || ''
  return txt.split('\n').map(raw => {
    if (!raw.trim()) return { type: 'spacer' }
    return { type: chordRegex.test(raw.trim()) ? 'chord' : 'lyric', text: raw }
  })
})

// El controlador transmite su scroll (proporción), con throttle.
let lastSent = 0
function onScroll() {
  if (!live.isController || !scroller.value) return
  const now = Date.now()
  if (now - lastSent < 80) return
  lastSent = now
  const el = scroller.value
  const max = el.scrollHeight - el.clientHeight
  live.setRatio(max > 0 ? el.scrollTop / max : 0)
}

// El seguidor aplica el scroll recibido.
watch(() => live.state.ratio, (r) => {
  if (live.isController || !live.following || !scroller.value) return
  const el = scroller.value
  const max = el.scrollHeight - el.clientHeight
  el.scrollTop = r * max
})
// Al cambiar de canción, arriba del todo.
watch(() => live.state.songId, () => { if (scroller.value) scroller.value.scrollTop = 0 })

// El controlador arranca con la primera canción disponible.
watch(() => store.songs.length, (n) => {
  if (live.isController && !live.state.songId && n) live.setSong(store.songs[0].id)
}, { immediate: true })

onMounted(() => live.connect())
onBeforeUnmount(() => live.disconnect())
</script>

<style scoped>
.live {
  position: fixed; inset: 0; z-index: 400; background: var(--bg);
  display: flex; flex-direction: column;
}
.live-bar {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  background: var(--surface); border-bottom: 1px solid var(--border);
}
.live-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--red); animation: pulse 1.4s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.live-label { font-weight: 600; font-size: .9rem; color: var(--text); }
.live-exit { margin-left: auto; background: none; border: none; color: var(--text-mid); cursor: pointer; font-weight: 600; }

.live-control { padding: 12px 16px; border-bottom: 1px solid var(--border); }
.live-control select {
  width: 100%; padding: 10px 12px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-size: 15px;
}
.live-resync { margin: 12px 16px; justify-content: center; }

.live-content { flex: 1; overflow-y: auto; padding: 16px 20px 60px; }
.live-content--singer { padding: 24px; }
.live-song-title { font-weight: 700; font-size: 1.4rem; margin-bottom: 14px; color: var(--text); }
.live-spacer { height: 12px; }
.live-chord { color: var(--accent); font-weight: 700; font-family: ui-monospace, 'Roboto Mono', monospace; white-space: pre; line-height: 1.5; }
.live-lyric { color: var(--text); white-space: pre-wrap; line-height: 1.7; font-family: ui-monospace, 'Roboto Mono', monospace; }
.live-content--singer .live-lyric { font-size: 1.5rem; line-height: 2; font-family: 'Nunito', sans-serif; text-align: center; }
.live-empty { color: var(--text-muted); text-align: center; margin-top: 40px; }
</style>
