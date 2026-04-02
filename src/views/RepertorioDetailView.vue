<template>
  <div>
    <!-- ── Header ── -->
    <div class="activity-detail-header">
      <button class="back-btn" @click="router.push('/repertorio')">←</button>
      <div class="activity-detail-info">
        <div v-if="!editingName" class="activity-detail-title" @click="roleStore.isLeader && startEditName()">
          {{ repertoire?.name }}
        </div>
        <input
          v-else
          ref="nameInput"
          class="repertorio-name-input"
          v-model="editName"
          @keydown.enter="confirmEditName"
          @keydown.escape="editingName = false"
          @blur="confirmEditName"
        >
        <div class="activity-detail-meta">{{ (repertoire?.songs || []).length }} canciones</div>
      </div>
    </div>

    <template v-if="repertoire">
      <!-- ── Canciones del repertorio ── -->
      <div class="editor-panel-header" style="margin-top:16px">
        Canciones en este repertorio
      </div>

      <div v-if="!(repertoire.songs || []).length" class="songs-empty" style="padding:24px">
        <span class="songs-empty__icon">🎵</span>
        <p>Agrega canciones desde la biblioteca</p>
      </div>

      <draggable
        v-else
        :model-value="songObjects"
        @update:model-value="onReorder"
        item-key="id"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        class="songs-grid"
      >
        <template #item="{ element: song, index }">
          <div class="song-card repertorio-song-card">
            <span v-if="roleStore.isLeader" class="drag-handle">⠿</span>
            <span class="repertorio-song-num">{{ index + 1 }}</span>
            <div class="song-card__body">
              <div class="song-card__title" style="font-size:16px">{{ song.title }}</div>
              <div class="song-card__meta" style="margin-top:4px">
                <span v-if="song.author" style="font-size:13px;color:var(--text-muted)">{{ song.author }}</span>
                <span v-if="song.key" class="song-card__tag song-card__tag--key">♪ {{ song.key }}</span>
              </div>
            </div>
            <button v-if="roleStore.isLeader" class="btn btn-danger btn-sm icon-btn" @click="removeSong(song.id)">✕</button>
          </div>
        </template>
      </draggable>

      <!-- ── Biblioteca para agregar ── -->
      <template v-if="roleStore.isLeader">
        <div class="editor-panel-header" style="margin-top:28px">
          Agregar canciones
        </div>

        <div class="search-box" style="margin-top:8px">
          <span class="search-box__icon">🔍</span>
          <input
            class="search-box__input"
            type="text"
            placeholder="Buscar canción…"
            v-model="libQuery"
          >
        </div>

        <div v-if="availableSongs.length === 0" style="text-align:center;padding:20px;color:var(--text-muted);font-size:0.9rem">
          {{ libQuery ? 'Sin resultados' : 'Todas las canciones ya están en el repertorio' }}
        </div>

        <div class="songs-grid">
          <div
            v-for="song in availableSongs"
            :key="song.id"
            class="song-card repertorio-add-card"
            @click="addSong(song.id)"
          >
            <div class="song-card__body">
              <div class="song-card__title" style="font-size:15px">{{ song.title }}</div>
              <div style="font-size:13px;color:var(--text-muted)">{{ [song.author, song.key].filter(Boolean).join(' · ') }}</div>
            </div>
            <span class="repertorio-add-icon">+</span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useToast } from '../composables/useToast'
import draggable from 'vuedraggable'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()

const libQuery    = ref('')
const editingName = ref(false)
const editName    = ref('')
const nameInput   = ref(null)

const repertoire = computed(() =>
  store.repertoires.find(r => r.id === Number(route.params.id))
)

const songObjects = computed(() =>
  (repertoire.value?.songs || []).map(id => store.songs.find(s => s.id === id)).filter(Boolean)
)

const availableSongs = computed(() => {
  const inSet = new Set(repertoire.value?.songs || [])
  const q = libQuery.value.toLowerCase()
  return store.songs.filter(s => {
    if (inSet.has(s.id)) return false
    if (!q) return true
    return s.title.toLowerCase().includes(q) ||
      (s.author || '').toLowerCase().includes(q) ||
      (s.key || '').toLowerCase().includes(q)
  })
})

function save() { store.saveRepertoires() }

function addSong(songId) {
  if (!repertoire.value.songs) repertoire.value.songs = []
  if (!repertoire.value.songs.includes(songId)) {
    repertoire.value.songs.push(songId)
    save()
    const title = store.songs.find(s => s.id === songId)?.title
    showToast(`"${title}" agregada`)
  }
}

function removeSong(songId) {
  repertoire.value.songs = repertoire.value.songs.filter(id => id !== songId)
  save()
}

function onReorder(newList) {
  repertoire.value.songs = newList.map(s => s.id)
  save()
}

function startEditName() {
  editName.value = repertoire.value.name
  editingName.value = true
  nextTick(() => nameInput.value?.focus())
}

function confirmEditName() {
  if (editName.value.trim() && editName.value.trim() !== repertoire.value.name) {
    repertoire.value.name = editName.value.trim()
    save()
    showToast('Nombre actualizado')
  }
  editingName.value = false
}
</script>
