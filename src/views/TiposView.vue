<template>
  <section class="settings-section" aria-labelledby="song-types-title">
    <RouterLink class="settings-back" to="/banda" aria-label="Volver a administrar banda">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
      <span>Volver a administrar banda</span>
    </RouterLink>

    <div class="settings-heading">
      <h2 id="song-types-title">Tipos de canción</h2>
      <p>Define las categorías disponibles para organizar el cancionero de la banda.</p>
    </div>

    <form class="settings-add" @submit.prevent="save">
      <label class="form-label" for="new-song-type">Nuevo tipo</label>
      <div class="settings-add__row">
        <input
          id="new-song-type"
          v-model="newName"
          class="form-input"
          type="text"
          placeholder="Ej. Alabanza"
          maxlength="60"
        >
        <button class="btn btn-primary" :disabled="!newName.trim()">Agregar</button>
      </div>
    </form>

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
  </section>
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
  if (!newName.value.trim()) return
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

<style scoped>
.settings-section { max-width: 560px; margin-inline: auto; }
.settings-back { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; margin: -8px 0 10px; color: var(--color-link); font-size: .8rem; font-weight: 700; text-decoration: none; }
.settings-back:hover { color: var(--color-link-hover); }
.settings-back svg { width: 18px; height: 18px; }
.settings-heading { margin-bottom: 18px; }
.settings-heading h2 { margin: 0; color: var(--color-text-primary); font-size: 1.15rem; }
.settings-heading p { margin-top: 5px; color: var(--color-text-muted); font-size: .84rem; line-height: 1.5; }
.settings-add { margin-bottom: 18px; }
.settings-add__row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; margin-top: 7px; }
.settings-add__row .btn { min-height: 48px; }
@media (max-width: 359px) { .settings-add__row { grid-template-columns: 1fr; } }
</style>
