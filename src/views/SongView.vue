<template>
  <div>
    <div class="song-view-header">
      <button class="back-btn" @click="router.back()">←</button>
      <div>
        <div class="song-view-title">{{ song?.title }}</div>
        <div class="song-view-meta">
          <span v-for="m in meta" :key="m">{{ m }}</span>
        </div>
      </div>
    </div>

    <div class="lyrics-block">
      <template v-for="(line, i) in renderedLines" :key="i">
        <div v-if="line.type === 'spacer'" style="height:10px;"></div>
        <div v-else :class="line.type">{{ line.text }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()

const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/

const song = computed(() => store.songs.find(s => s.id === Number(route.params.id)))

const meta = computed(() => {
  if (!song.value) return []
  return [
    song.value.author,
    song.value.key  ? '🎵 ' + song.value.key : '',
    song.value.bpm  ? '♩ ' + song.value.bpm + ' bpm' : '',
  ].filter(Boolean)
})

const renderedLines = computed(() => {
  if (!song.value?.lyrics) return []
  const hideChords = roleStore.isCantante
  return song.value.lyrics.split('\n').reduce((acc, line) => {
    if (!line.trim()) {
      acc.push({ type: 'spacer' })
      return acc
    }
    const isChord   = chordRegex.test(line.trim())
    const isSection = /^\[.+\]$/.test(line.trim())
    if (hideChords && isChord) return acc
    if (isSection) acc.push({ type: 'section-label', text: line.trim().replace(/[\[\]]/g, '') })
    else if (isChord) acc.push({ type: 'chord-line', text: line })
    else acc.push({ type: 'lyric-line', text: line })
    return acc
  }, [])
})
</script>
