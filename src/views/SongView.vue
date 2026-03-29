<template>
  <div>
    <div class="song-view-header">
      <button class="back-btn" @click="router.back()">←</button>
      <div style="flex:1">
        <template v-if="!editing">
          <div class="song-view-title">{{ song?.title }}</div>
          <div class="song-view-meta">
            <span v-for="m in meta" :key="m">{{ m }}</span>
          </div>
        </template>
        <template v-else>
          <input class="form-input" v-model="form.title" placeholder="Título" style="font-size:1.1rem;font-weight:600;margin-bottom:6px">
        </template>
      </div>
      <button v-if="roleStore.isLeader && !editing" class="btn btn-ghost btn-sm" @click="startEdit">Editar</button>
      <template v-if="editing">
        <span class="sf-cancel-link" @click="cancelEdit">Cancelar</span>
        <button class="sf-save-btn sf-save-btn-sm" @click="saveEdit">Guardar</button>
      </template>
    </div>

    <!-- Edit form -->
    <div v-if="editing">

      <!-- Letra y acordes -->
      <div class="sf-block">
        <div class="sf-block-label">Letra y acordes</div>
        <textarea class="sf-lyrics" v-model="form.lyrics"></textarea>
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
            <label class="sf-label">Tipo</label>
            <select class="form-select" v-model="form.type">
              <option value="">— Sin tipo —</option>
              <option v-for="t in store.songTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
        </div>
      </div>

    </div>

    <!-- View mode -->
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useToast } from '../composables/useToast'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()

const editing     = ref(false)
const form        = ref({})
const showDetails = ref(false)

const keys = ['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab']

const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/

const song = computed(() => store.songs.find(s => s.id === Number(route.params.id)))

const authorSuggestions = computed(() =>
  [...new Set(store.songs.map(s => s.author).filter(Boolean))]
)

const meta = computed(() => {
  if (!song.value) return []
  return [
    song.value.author,
    song.value.key  ? '🎵 ' + song.value.key : '',
    song.value.bpm  ? '♩ ' + song.value.bpm + ' bpm' : '',
  ].filter(Boolean)
})

function startEdit() {
  const s = song.value
  form.value = { title: s.title, author: s.author || '', key: s.key || '', bpm: s.bpm || null, type: s.type || '', lyrics: s.lyrics || '' }
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  showDetails.value = false
}

function saveEdit() {
  if (!form.value.title.trim()) { alert('El título es obligatorio.'); return }
  const idx = store.songs.findIndex(s => s.id === Number(route.params.id))
  if (idx === -1) return
  store.songs[idx] = { ...store.songs[idx], ...form.value, title: form.value.title.trim(), lyrics: form.value.lyrics.trim(), bpm: form.value.bpm || null, type: form.value.type || null }
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
