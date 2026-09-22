<template>
  <div>

    <!-- ── Lista de canciones ── -->
    <template v-if="!showForm">
      <div v-if="roleStore.isLeader" class="page-actions">
        <button class="btn-pill btn-pill--primary" @click="openForm">
          <span class="btn-pill__icon">+</span> Agregar canción
        </button>
      </div>

      <div class="search-box" style="margin-top:12px">
        <span class="search-box__icon">
          <svg class="search-box__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          class="search-box__input"
          type="text"
          placeholder="Buscar por nombre, tono o tempo…"
          aria-label="Buscar canciones"
          v-model="query"
        >
      </div>

      <div v-if="store.songTypes.length" class="type-pills">
        <button
          v-for="t in store.songTypes"
          :key="t.id"
          class="type-pill"
          :class="{ active: activeTypes.includes(String(t.id)) }"
          :aria-pressed="activeTypes.includes(String(t.id))"
          @click="toggleType(String(t.id))"
        >{{ t.name }}</button>
        <button v-if="activeTypes.length" class="type-pill type-pill--clear" aria-label="Limpiar filtros" @click="activeTypes = []">✕</button>
      </div>

      <div class="list-toolbar">
        <span class="list-toolbar__count">
          {{ isFiltering ? 'Filtradas' : 'Todas' }} ({{ filteredSongs.length }})
        </span>
        <button class="list-toolbar__sort" @click="toggleSort">
          {{ sortMode === 'added' ? 'Añadido' : 'A–Z' }} <span>↓</span>
        </button>
      </div>

      <div v-if="sortedSongs.length === 0" class="songs-empty">
        <svg class="songs-empty__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <p>{{ store.songs.length ? 'Sin coincidencias' : 'Aún no hay canciones' }}</p>
        <span v-if="!store.songs.length && roleStore.isLeader" class="songs-empty__hint">Toca “Agregar canción” para empezar el repertorio.</span>
      </div>
      <div v-else class="song-list">
        <button
          v-for="s in sortedSongs"
          :key="s.id"
          class="song-item"
          @click="router.push('/cancion/' + s.id)"
          @contextmenu.prevent="roleStore.isLeader && openContextMenu($event, s)"
        >
          <span class="song-item__badge">
            <img class="song-item__mark" :src="songMark" alt="">
          </span>
          <span class="song-item__main">
            <span class="song-item__title">{{ s.title }}</span>
            <span v-if="s.author || typeLabels(s).length" class="song-item__sub">
              <template v-if="s.author">{{ s.author }}</template>
              <template v-for="(tl, ti) in typeLabels(s)" :key="tl"><span v-if="s.author || ti" class="song-item__dot">·</span>{{ tl }}</template>
            </span>
          </span>
          <svg class="song-item__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
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

    </template>

    <!-- ── Formulario nueva canción ── -->
    <template v-else>
      <PageBackHeader eyebrow="Canciones" title="Nueva canción" back-label="Volver a canciones" @back="toggleForm" />

      <!-- Título -->
      <div class="sf-block">
        <input
          class="sf-title-input"
          :class="{ 'sf-title-input--error': titleError }"
          v-model="form.title"
          type="text"
          placeholder="¿Cómo se llama la canción?"
          autofocus
          @input="titleError = false"
        >
        <div v-if="titleError" class="sf-error">Ponle un nombre para poder guardarla.</div>
      </div>

      <!-- Tono: teclado de acordes (mismo lenguaje que la lista) -->
      <div class="sf-block">
        <div class="sf-block-label">Tono</div>
        <div class="key-picker">
          <button type="button" class="key-chip key-chip--none" :class="{ active: !form.key }" @click="form.key = ''">—</button>
          <button
            v-for="k in keys"
            :key="k"
            type="button"
            class="key-chip"
            :class="{ active: form.key === k }"
            @click="form.key = k"
          >{{ fmtKey(k) }}</button>
        </div>
      </div>

      <!-- Autor -->
      <div class="sf-block">
        <div class="sf-field">
          <label class="sf-label" for="sf-author">Autor o artista</label>
          <UiCombobox v-model="form.author" :options="authorSuggestions" placeholder="Ej: Marcos Witt" aria-label="Autor o artista" />
        </div>
      </div>

      <!-- Duración + Tempo -->
      <div class="sf-inline-row">
        <div class="sf-field">
          <label class="sf-label" for="sf-dur">Duración</label>
          <div class="sf-bpm-wrap">
            <input id="sf-dur" class="form-input sf-bpm-input" v-model="form.durationText" type="text" inputmode="numeric" placeholder="4:30">
            <span class="sf-bpm-unit">m:ss</span>
          </div>
        </div>
        <div class="sf-field">
          <label class="sf-label" for="sf-bpm">Tempo</label>
          <div class="sf-bpm-wrap">
            <input id="sf-bpm" class="form-input sf-bpm-input" v-model.number="form.bpm" type="number" inputmode="numeric" placeholder="75" min="40" max="200">
            <span class="sf-bpm-unit">BPM</span>
          </div>
        </div>
      </div>

      <!-- Tipo -->
      <div v-if="store.songTypes.length" class="sf-block">
        <div class="sf-block-label">Tipo</div>
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

      <!-- Letra y acordes -->
      <div class="sf-block">
        <div class="sf-block-label">Letra y acordes</div>
        <textarea class="sf-lyrics" v-model="form.lyrics" :placeholder="lyricsPlaceholder"></textarea>
        <div class="form-hint">Escribe los acordes en su propia línea y la letra debajo. Marca las partes con [Intro], [Verso], [Coro] o [Puente]. Para que avancen solas en vivo, ponle a cada una cuánto dura: [Coro 0:30] = el coro dura 30 segundos.</div>
      </div>

      <!-- Acciones -->
      <div class="sf-actions">
        <button class="sf-save-btn" type="button" @click="saveSong">Guardar</button>
        <button class="sf-cancel-btn" type="button" @click="toggleForm">Cancelar</button>
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
import { parseDuration } from '../utils/duration'
import UiCombobox from '../components/UiCombobox.vue'
import PageBackHeader from '../components/PageBackHeader.vue'
import songMark from '../assets/song-mark.svg'

const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()
const { confirm }   = useConfirm()

const query       = ref('')
const activeTypes = ref([])
const showForm   = ref(false)
const titleError = ref(false)
const ctxMenu    = ref({ visible: false, x: 0, y: 0, song: null })
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
  durationText: '',
  types:  [],
  lyrics: '',
})
const form = ref(emptyForm())

const authorSuggestions = computed(() =>
  [...new Set(store.songs.map(s => s.author).filter(Boolean))]
)

function openForm() {
  form.value = emptyForm()
  titleError.value = false
  showForm.value = true
}

function toggleForm() {
  showForm.value = !showForm.value
  if (!showForm.value) {
    form.value = emptyForm()
    titleError.value = false
  }
}

function _doSave() {
  if (!form.value.title.trim()) { titleError.value = true; return false }
  if (form.value.key)    localStorage.setItem('lastSongKey',    form.value.key)
  if (form.value.author) localStorage.setItem('lastSongAuthor', form.value.author.trim())
  store.songs.push({
    id:     Date.now(),
    title:  form.value.title.trim(),
    author: form.value.author.trim(),
    key:    form.value.key,
    bpm:    form.value.bpm || null,
    duration: parseDuration(form.value.durationText),
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

const sortMode = ref('added')

function toggleSort() {
  sortMode.value = sortMode.value === 'added' ? 'alpha' : 'added'
}

const sortedSongs = computed(() => {
  if (sortMode.value === 'alpha') {
    return [...filteredSongs.value].sort((a, b) => a.title.localeCompare(b.title, 'es'))
  }
  return filteredSongs.value
})

const isFiltering = computed(() => query.value.trim() !== '' || activeTypes.value.length > 0)

// "A#/Bb" -> "A♯", "C" -> "C". El tono es el ancla visual de cada fila.
function fmtKey(k) {
  return (k.split('/')[0] || '').replace('#', '♯').replace('b', '♭')
}

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

<style scoped>
/* Icono de búsqueda como SVG (a juego con la nav), reemplaza el emoji */
.search-box__svg { width: 18px; height: 18px; display: block; }

/* ── LISTA DE CANCIONES: una superficie continua con divisores claros ── */
.song-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  margin-bottom: 24px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
}

.song-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  margin: 0;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  font-family: var(--font);
  padding: 10px;
  border-radius: 0;
  box-shadow: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background .18s ease;
}
.song-item:last-child { border-bottom: 0; }
.song-item:active { background: var(--color-primary-soft); }
.song-item:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }

/* El tono funciona como ancla visual compacta. */
.song-item__badge {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.song-item__mark { width: 34px; height: 34px; display: block; }

.song-item__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.song-item__title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-primary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.25;
}
.song-item__sub {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-actions {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
}
.sf-actions .sf-save-btn,
.sf-actions .sf-cancel-btn {
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
}
.sf-actions .sf-cancel-btn {
  border: 1px solid var(--color-danger);
  background: var(--color-danger);
  color: var(--color-text-on-primary);
  cursor: pointer;
}
.sf-actions .sf-cancel-btn:active { transform: scale(.98); }
.song-item__dot { margin: 0 5px; opacity: 0.6; }
.song-item__arrow { width: 15px; height: 15px; flex-shrink: 0; color: var(--color-text-muted); }

@media (hover: hover) {
  .song-item:hover { background: var(--color-surface-hover); box-shadow: none; transform: none; }
}

@media (max-width: 380px) {
  .song-item { gap: 8px; padding: 7px 9px; }
  .song-item__badge { width: 36px; height: 36px; }
  .song-item__arrow { display: none; }
}

/* Estado vacío con icono SVG en vez de emoji */
.songs-empty__svg { width: 40px; height: 40px; color: var(--color-text-muted); opacity: 0.7; margin: 0 auto 14px; display: block; }
.songs-empty__hint { display: block; font-size: 0.8rem; color: var(--color-text-muted); margin-top: 6px; }

/* ── FORMULARIO: encabezado amable ── */
.sf-title-input--error { border-bottom-color: var(--color-danger); }
.sf-error { color: var(--color-danger); font-size: 0.78rem; margin-top: 6px; }

/* ── FORMULARIO: teclado de tonos (la firma) ── */
.key-picker { display: flex; flex-wrap: wrap; gap: 7px; }
.key-chip {
  min-width: 42px;
  padding: 9px 8px;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.key-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.key-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
  box-shadow: var(--shadow-medium);
}
.key-chip:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.key-chip--none { color: var(--color-text-muted); font-weight: 600; }
.key-chip--none.active { background: var(--color-text-secondary); border-color: var(--color-text-secondary); color: var(--color-text-on-primary); }

/* ── FORMULARIO: tempo con unidad ── */
.sf-bpm-wrap { position: relative; }
.sf-bpm-input { padding-right: 48px; }
.sf-bpm-unit {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.03em;
  color: var(--color-text-muted); pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .key-chip { transition: none; }
}
</style>
