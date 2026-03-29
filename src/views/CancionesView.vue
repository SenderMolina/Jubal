<template>
  <div>

    <!-- ── Lista de canciones ── -->
    <template v-if="!showForm">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <h1 class="section-title" style="margin-bottom:0">Canciones</h1>
        <button v-if="roleStore.isLeader" class="btn btn-primary btn-sm" @click="openForm">+ Añadir canción</button>
      </div>
      <p class="section-subtitle">Librería de alabanzas disponibles.</p>

      <div class="search-bar">
        <input class="search-input" type="text" placeholder="Buscar por título, tono, autor…" v-model="query">
      </div>

      <div v-if="store.songTypes.length" class="type-pills">
        <button class="type-pill" :class="{ active: !activeType }" @click="activeType = ''">Todos</button>
        <button
          v-for="t in store.songTypes"
          :key="t.id"
          class="type-pill"
          :class="{ active: activeType === String(t.id) }"
          @click="activeType = String(t.id)"
        >{{ t.name }}</button>
      </div>

      <div v-if="filteredSongs.length === 0" style="text-align:center;padding:40px;color:var(--text-muted)">Sin resultados.</div>
      <div v-else class="songs-grid">
        <div v-for="s in filteredSongs" :key="s.id" class="song-row">
          <div class="song-row-info" style="cursor:pointer" @click="router.push('/cancion/' + s.id)">
            <div class="song-row-title">{{ s.title }}</div>
            <div class="song-row-sub">{{ songMeta(s) }}</div>
          </div>
          <div class="song-row-actions">
            <span v-if="typeLabel(s)" class="tag tag-type">{{ typeLabel(s) }}</span>
            <button v-if="roleStore.isLeader" class="btn btn-danger btn-sm" @click="deleteSong(s)">✕</button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Formulario nueva canción ── -->
    <template v-else>
      <h1 class="section-title">Nueva canción</h1>

      <!-- Nombre -->
      <div class="sf-block">
        <input
          class="sf-title-input"
          v-model="form.title"
          type="text"
          placeholder="Nombre de la canción…"
          autofocus
        >
      </div>

      <!-- Letra y acordes -->
      <div class="sf-block">
        <div class="sf-block-label">Letra y acordes</div>
        <textarea class="sf-lyrics" v-model="form.lyrics" :placeholder="lyricsPlaceholder"></textarea>
        <div class="form-hint">Acordes en su propia línea, letra debajo. Usa [Coro], [Verso], [Puente] para secciones.</div>
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
          <input class="form-input" v-model="form.author" type="text" placeholder="Ej: Marcos Witt" list="sf-authors">
          <datalist id="sf-authors">
            <option v-for="a in authorSuggestions" :key="a" :value="a"></option>
          </datalist>
        </div>
      </div>

      <!-- Detalles adicionales (colapsable) -->
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

      <!-- Acciones -->
      <div class="sf-actions">
        <span class="sf-cancel-link" @click="toggleForm">Cancelar</span>
        <button class="btn btn-ghost" @click="saveAndAnother">Guardar y agregar otra</button>
        <button class="sf-save-btn" @click="saveSong">Guardar canción</button>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()
const { confirm }   = useConfirm()

const query       = ref('')
const activeType  = ref('')
const showForm    = ref(false)
const showDetails = ref(false)
const keys = ['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab']

const lyricsPlaceholder = `[Intro]
G  Em  C  D

[Verso 1]
G              Em
Cuán grande es Él
C             D
Su amor sin fin

[Coro]
G    D    Em   C
Santo, Santo, Santo...`

const emptyForm = () => ({
  title:  '',
  author: localStorage.getItem('lastSongAuthor') || '',
  key:    localStorage.getItem('lastSongKey')    || '',
  bpm:    null,
  type:   '',
  lyrics: '',
})
const form = ref(emptyForm())

const authorSuggestions = computed(() =>
  [...new Set(store.songs.map(s => s.author).filter(Boolean))]
)

function openForm() {
  form.value = emptyForm()
  showDetails.value = false
  showForm.value = true
}

function toggleForm() {
  showForm.value = !showForm.value
  if (!showForm.value) {
    form.value = emptyForm()
    showDetails.value = false
  }
}

function _doSave() {
  if (!form.value.title.trim()) { alert('El título es obligatorio.'); return false }
  if (form.value.key)    localStorage.setItem('lastSongKey',    form.value.key)
  if (form.value.author) localStorage.setItem('lastSongAuthor', form.value.author.trim())
  store.songs.push({
    id:     Date.now(),
    title:  form.value.title.trim(),
    author: form.value.author.trim(),
    key:    form.value.key,
    bpm:    form.value.bpm || null,
    type:   form.value.type || null,
    lyrics: form.value.lyrics.trim() || '',
  })
  store.saveSongs()
  return true
}

function saveSong() {
  if (!_doSave()) return
  showToast('Canción guardada ✓')
  showForm.value = false
  showDetails.value = false
  form.value = emptyForm()
}

function saveAndAnother() {
  if (!_doSave()) return
  showToast('Canción guardada ✓')
  showDetails.value = false
  form.value = emptyForm()
}

const filteredSongs = computed(() => {
  const q = query.value.toLowerCase()
  let list = store.songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    (s.author||'').toLowerCase().includes(q) ||
    (s.key||'').toLowerCase().includes(q)
  )
  if (activeType.value) list = list.filter(s => String(s.type) === activeType.value)
  return list
})

function typeLabel(s) {
  return store.songTypes.find(t => String(t.id) === String(s.type))?.name || ''
}

function songMeta(s) {
  return [s.author, s.key ? '🎵 ' + s.key : '', s.bpm ? '♩ ' + s.bpm + ' bpm' : ''].filter(Boolean).join(' · ')
}

async function deleteSong(s) {
  const ok = await confirm('¿Eliminar canción?', `"${s.title}"`)
  if (!ok) return
  store.songs = store.songs.filter(x => x.id !== s.id)
  store.saveSongs()
  showToast('Canción eliminada')
}
</script>
