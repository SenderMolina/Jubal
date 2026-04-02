<template>
  <div>

    <!-- ── Lista de canciones ── -->
    <template v-if="!showForm">
      <div class="search-box" style="margin-top:12px">
        <span class="search-box__icon">🔍</span>
        <input
          class="search-box__input"
          type="text"
          placeholder="Buscar canción, tono o BPM…"
          v-model="query"
        >
      </div>

      <div v-if="store.songTypes.length" class="type-pills">
        <button
          v-for="t in store.songTypes"
          :key="t.id"
          class="type-pill"
          :class="{ active: activeTypes.includes(String(t.id)) }"
          @click="toggleType(String(t.id))"
        >{{ t.name }}</button>
        <button v-if="activeTypes.length" class="type-pill type-pill--clear" @click="activeTypes = []">✕</button>
      </div>

      <div v-if="filteredSongs.length === 0" class="songs-empty">
        <span class="songs-empty__icon">🎵</span>
        <p>Sin resultados</p>
      </div>
      <div v-else class="songs-grid">
        <div
          v-for="s in filteredSongs"
          :key="s.id"
          class="song-card"
          @click="router.push('/cancion/' + s.id)"
          @contextmenu.prevent="roleStore.isLeader && openContextMenu($event, s)"
        >
          <div class="song-card__body">
            <div class="song-card__title">{{ s.title }}</div>
            <div v-if="s.author" class="song-card__author">{{ s.author }}</div>
            <div class="song-card__meta">
              <span v-if="s.key" class="song-card__tag song-card__tag--key">♪ {{ s.key }}</span>
              <span v-if="s.bpm" class="song-card__tag song-card__tag--bpm">♩ {{ s.bpm }} bpm</span>
              <span v-for="tl in typeLabels(s)" :key="tl" class="song-card__tag song-card__tag--type">{{ tl }}</span>
            </div>
          </div>
          <span class="song-card__chevron">›</span>
        </div>
      </div>

      <!-- Context menu for delete -->
      <Teleport to="body">
        <div v-if="ctxMenu.visible" class="ctx-overlay" @click="closeContextMenu">
          <div class="ctx-menu" :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }">
            <button class="ctx-menu__item ctx-menu__item--danger" @click="deleteSongFromCtx">
              🗑 Eliminar canción
            </button>
          </div>
        </div>
      </Teleport>

      <!-- FAB -->
      <button v-if="roleStore.isLeader" class="fab-add-song" @click="openForm" aria-label="Añadir canción">
        <span>+</span>
      </button>
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
const activeTypes = ref([])
const showForm    = ref(false)
const showDetails = ref(false)
const ctxMenu     = ref({ visible: false, x: 0, y: 0, song: null })
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
  types:  [],
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
    types:  form.value.types.length ? form.value.types : [],
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

function toggleType(id) {
  const idx = activeTypes.value.indexOf(id)
  if (idx >= 0) activeTypes.value.splice(idx, 1)
  else activeTypes.value.push(id)
}

function toggleFormType(id) {
  const idx = form.value.types.indexOf(id)
  if (idx >= 0) form.value.types.splice(idx, 1)
  else form.value.types.push(id)
}

function getSongTypes(s) {
  if (Array.isArray(s.types) && s.types.length) return s.types.map(String)
  if (s.type) return [String(s.type)]
  return []
}

const filteredSongs = computed(() => {
  const q = query.value.toLowerCase()
  let list = store.songs.filter(s =>
    s.title.toLowerCase().includes(q) ||
    (s.author||'').toLowerCase().includes(q) ||
    (s.key||'').toLowerCase().includes(q) ||
    (s.bpm ? String(s.bpm).includes(q) : false)
  )
  if (activeTypes.value.length) {
    list = list.filter(s => {
      const sTypes = getSongTypes(s)
      return activeTypes.value.some(at => sTypes.includes(at))
    })
  }
  return list
})

function typeLabels(s) {
  const sTypes = getSongTypes(s)
  return sTypes.map(tid => store.songTypes.find(t => String(t.id) === tid)?.name).filter(Boolean)
}

function openContextMenu(e, song) {
  const x = Math.min(e.clientX, window.innerWidth - 200)
  const y = Math.min(e.clientY, window.innerHeight - 60)
  ctxMenu.value = { visible: true, x, y, song }
}

function closeContextMenu() {
  ctxMenu.value = { visible: false, x: 0, y: 0, song: null }
}

async function deleteSongFromCtx() {
  const s = ctxMenu.value.song
  closeContextMenu()
  if (!s) return
  const ok = await confirm('¿Eliminar canción?', `"${s.title}"`)
  if (!ok) return
  store.songs = store.songs.filter(x => x.id !== s.id)
  store.saveSongs()
  showToast('Canción eliminada')
}
</script>
