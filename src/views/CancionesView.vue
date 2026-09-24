<template>
  <div>

    <!-- ── Lista de canciones ── -->
    <div v-if="band.can.editLibrary" class="page-actions">
      <RouterLink class="btn-pill btn-pill--primary" to="/canciones/nueva">
        <span class="btn-pill__icon">+</span> Agregar canción
      </RouterLink>
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
      <span v-if="!store.songs.length && band.can.editLibrary" class="songs-empty__hint">Toca “Agregar canción” para empezar el repertorio.</span>
    </div>
    <div v-else class="song-list">
      <button
        v-for="s in sortedSongs"
        :key="s.id"
        class="song-item"
        @click="router.push('/cancion/' + s.id)"
        @contextmenu.prevent="band.can.editLibrary && openContextMenu($event, s)"
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

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import songMark from '../assets/song-mark.svg'

const router    = useRouter()
const store     = useAppStore()
const band = useBandStore()
const { attempt } = useToast()
const { confirm }   = useConfirm()

const query       = ref('')
const activeTypes = ref([])
const ctxMenu    = ref({ visible: false, x: 0, y: 0, song: null })
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
  await attempt(() => store.deleteSong(s.id), { success: 'Canción eliminada', error: 'No se pudo eliminar la canción.' })
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

</style>
