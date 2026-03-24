<template>
  <div>
    <h1 class="section-title">Canciones</h1>
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

const query      = ref('')
const activeType = ref('')

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
