<template>
  <div>
    <div class="tipos-add" style="margin-top:12px;">
      <input
        class="form-input"
        v-model="newName"
        type="text"
        placeholder="Nuevo tipo…"
        @keydown.enter="save"
      >
      <button class="tipos-add__btn" @click="save" aria-label="Agregar tipo">+</button>
    </div>

    <div v-if="store.songTypes.length === 0" class="activity-empty">No hay tipos. Agrega el primero arriba.</div>
    <div v-else class="tipos-list">
      <div v-for="t in store.songTypes" :key="t.id" class="tipos-item">
        <div class="tipos-item__info">
          <span class="tipos-item__name">{{ t.name }}</span>
          <span class="tipos-item__count">{{ songCount(t.id) }}</span>
        </div>
        <button class="tipos-item__delete" @click="deleteType(t)" aria-label="Eliminar tipo">✕</button>
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
  return store.songs.filter(s => {
    if (Array.isArray(s.types)) return s.types.map(String).includes(String(typeId))
    return String(s.type) === String(typeId)
  }).length
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
