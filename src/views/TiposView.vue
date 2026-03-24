<template>
  <div>
    <h1 class="section-title">Tipos de alabanzas</h1>
    <p class="section-subtitle">Categorías para organizar el repertorio.</p>

    <div style="display:flex; gap:10px; max-width:400px; margin-bottom:24px;">
      <input
        class="form-input"
        v-model="newName"
        type="text"
        placeholder="Ej: Adoración, Alabanza, Reflexión…"
        @keydown.enter="save"
      >
      <button class="btn btn-primary" @click="save">Agregar</button>
    </div>

    <div v-if="store.songTypes.length === 0" class="activity-empty">No hay tipos. Agrega el primero arriba.</div>
    <div v-else class="songs-grid">
      <div v-for="t in store.songTypes" :key="t.id" class="song-row">
        <div class="song-row-info">
          <div class="song-row-title">{{ t.name }}</div>
          <div class="song-row-sub">{{ songCount(t.id) }} alabanza{{ songCount(t.id) !== 1 ? 's' : '' }}</div>
        </div>
        <div class="song-row-actions">
          <button class="btn btn-danger btn-sm" @click="deleteType(t)">✕ Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import { useToast } from '../composables/useToast'

const store = useAppStore()
const { showToast } = useToast()
const newName = ref('')

function songCount(typeId) {
  return store.songs.filter(s => String(s.type) === String(typeId)).length
}

function save() {
  if (!newName.value.trim()) { alert('El nombre es obligatorio.'); return }
  store.songTypes.push({ id: Date.now(), name: newName.value.trim() })
  store.saveSongTypes()
  newName.value = ''
  showToast('Tipo guardado ✓')
}

function deleteType(t) {
  store.songTypes = store.songTypes.filter(x => x.id !== t.id)
  store.saveSongTypes()
  showToast('Tipo eliminado')
}
</script>
