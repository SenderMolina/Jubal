<template>
  <section class="settings-section" aria-labelledby="song-types-title">
    <PageBackHeader
      eyebrow="Configuraciones"
      title="Tipos de canción"
      title-id="song-types-title"
      to="/banda"
      back-label="Volver a administrar banda"
    />

    <div class="settings-heading">
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
import PageBackHeader from '../components/PageBackHeader.vue'

const store = useAppStore()
const { attempt } = useToast()
const newName = ref('')

function songCount(typeId) {
  return store.songs.filter(s => {
    if (Array.isArray(s.types)) return s.types.map(String).includes(String(typeId))
    return String(s.type) === String(typeId)
  }).length
}

async function save() {
  const name = newName.value.trim()
  if (!name) return
  const ok = await attempt(() => store.createSongType(name), { success: 'Tipo guardado', error: 'No se pudo guardar el tipo.' })
  if (ok) newName.value = ''
}

function deleteType(t) {
  attempt(() => store.deleteSongType(t.id), { success: 'Tipo eliminado', error: 'No se pudo eliminar el tipo.' })
}
</script>

<style scoped>
.settings-section { max-width: 560px; margin-inline: auto; }
.settings-heading { margin-bottom: 18px; }
.settings-heading p { margin: -10px 0 0 58px; color: var(--color-text-muted); font-size: .84rem; line-height: 1.5; }
.settings-add { margin-bottom: 18px; }
.settings-add__row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; margin-top: 7px; }
.settings-add__row .btn { min-height: 48px; }
@media (max-width: 359px) { .settings-add__row { grid-template-columns: 1fr; } }
</style>
