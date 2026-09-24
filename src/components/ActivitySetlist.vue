<template>
  <!-- Numeración corrida en todo el setlist (coincide con "3 de 4" en la canción). -->
  <ol class="setlist" aria-label="Setlist">
    <li v-for="t in activity.tiempos" :key="t.id" class="setlist__tiempo">
      <span class="setlist__tiempo-name">{{ tiempoName(t) }}</span>
      <ol v-if="tiempoSongs(t).length" class="setlist__songs">
        <li v-for="song in tiempoSongs(t)" :key="song.id">
          <!-- act: al pasar de canción se recorre este mismo setlist -->
          <RouterLink class="setlist__song" :to="{ path: '/cancion/' + song.id, query: { act: activity.id } }">
            <span class="setlist__song-title">{{ song.title }}</span>
            <span v-if="song.key" class="setlist__song-key">{{ fmtKey(song.key) }}</span>
          </RouterLink>
        </li>
      </ol>
      <span v-else class="setlist__empty">Sin canciones aún</span>
    </li>
  </ol>
</template>

<script setup>
import { useAppStore } from '../stores/app'
import { fmtKey } from '../utils/keys'
import { songsInTiempo, tiempoName } from '../utils/setlist'

defineProps({ activity: { type: Object, required: true } })

const store = useAppStore()
const tiempoSongs = t => songsInTiempo(t, store.songs)
</script>

<style scoped>
.setlist { display: flex; flex-direction: column; gap: 14px; list-style: none; counter-reset: song; }
.setlist__tiempo-name { display: block; margin-bottom: 4px; color: var(--color-section); font-family: var(--font-display); font-size: .72rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.setlist__songs { list-style: none; }
.setlist__song { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 8px; border-radius: 12px; color: var(--color-text-primary); text-decoration: none; counter-increment: song; }
.setlist__song::before { content: counter(song); width: 18px; flex: 0 0 18px; color: var(--color-text-muted); font-size: .8rem; font-weight: 700; text-align: right; }
.setlist__song:hover { background: var(--color-surface-hover); }
.setlist__song:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; }
.setlist__song-title { flex: 1; min-width: 0; overflow: hidden; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.setlist__song-key { flex: 0 0 auto; min-width: 32px; padding: 3px 8px; border-radius: 8px; background: var(--color-accent-soft); color: var(--color-chord); font-family: var(--font-display); font-size: .8rem; font-weight: 700; text-align: center; }
.setlist__empty { color: var(--color-text-muted); font-size: .82rem; }
</style>
