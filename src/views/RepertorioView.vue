<template>
  <div>
    <h1 class="section-title">Repertorio</h1>
    <p class="section-subtitle">Todas las alabanzas disponibles.</p>

    <div class="search-bar">
      <input class="search-input" type="text" placeholder="Buscar por título, tono, autor…" v-model="query">
    </div>

    <!-- Filtros por tipo -->
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
          <span v-if="inCurrentSetlist(s.id)" class="in-setlist-badge">En setlist</span>
          <button v-else-if="roleStore.isLeader" class="btn btn-ghost btn-sm" @click="addToSetlist(s.id)">+ Setlist</button>
          <button v-if="roleStore.isLeader" class="btn btn-danger btn-sm" @click="deleteSong(s)">✕</button>
        </div>
      </div>
    </div>
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
const { confirm } = useConfirm()

const query      = ref('')
const activeType = ref('')

// Reuse the selected date from session storage if available
function getSelectedDate() { return sessionStorage.getItem('selectedServiceDate') || '' }

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
  const t = store.songTypes.find(t => String(t.id) === String(s.type))
  return t?.name || ''
}

function songMeta(s) {
  return [s.author, s.key ? '🎵 ' + s.key : '', s.bpm ? '♩ ' + s.bpm + ' bpm' : ''].filter(Boolean).join(' · ')
}

function inCurrentSetlist(id) {
  const date = getSelectedDate()
  return date ? (store.services[date] || []).includes(id) : false
}

function addToSetlist(id) {
  const date = getSelectedDate()
  if (!date) { alert('Primero selecciona una fecha de servicio en la pestaña Servicios.'); return }
  if (!store.services[date]) store.services[date] = []
  if (!store.services[date].includes(id)) {
    store.services[date].push(id)
    store.saveServices()
    showToast('Añadida al servicio ✓')
  }
}

async function deleteSong(s) {
  const ok = await confirm('¿Eliminar alabanza?', `"${s.title}"`)
  if (!ok) return
  store.songs = store.songs.filter(x => x.id !== s.id)
  for (const date in store.services) {
    store.services[date] = store.services[date].filter(x => x !== s.id)
    if (store.services[date].length === 0) delete store.services[date]
  }
  store.saveSongs()
  store.saveServices()
  showToast('Alabanza eliminada')
}
</script>
