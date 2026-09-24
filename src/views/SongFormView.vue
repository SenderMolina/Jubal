<template>
  <div class="song-form-page">
    <PageBackHeader
      eyebrow="Canciones"
      :title="editing ? 'Editar canción' : 'Nueva canción'"
      :back-label="editing ? 'Volver a la canción' : 'Volver a canciones'"
      @back="leave"
    />

    <SongForm
      v-if="!editing || song"
      :key="song?.id ?? 'nueva'"
      :song="song"
      :submit-label="editing ? 'Guardar cambios' : 'Guardar canción'"
      :busy="saving"
      @submit="save"
    />
    <p v-else-if="loaded" class="song-form-page__state" role="alert">No encontramos esta canción.</p>
    <p v-else class="song-form-page__state" role="status">Cargando canción…</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useToast } from '../composables/useToast'
import SongForm from '../components/SongForm.vue'
import PageBackHeader from '../components/PageBackHeader.vue'

// /canciones/nueva y /canciones/:id/editar (el query rep/act se conserva para
// volver a la canción dentro de su repertorio o setlist).
const route = useRoute()
const router = useRouter()
const store = useAppStore()
const { attempt } = useToast()

const editing = computed(() => route.params.id != null)
const song = computed(() => editing.value
  ? store.songs.find(s => s.id === Number(route.params.id)) || null
  : null)
const saving = ref(false)
const loaded = ref(false)

const returnPath = computed(() => editing.value
  ? { path: `/cancion/${route.params.id}`, query: route.query }
  : '/canciones')

// Volver por el historial si venimos de la app; si se abrió directo, a su lugar.
function leave() {
  if (window.history.state?.back) router.back()
  else router.replace(returnPath.value)
}

async function save(fields) {
  saving.value = true
  const ok = editing.value
    ? await attempt(() => store.updateSong(song.value.id, fields), { success: 'Canción actualizada', error: 'No se pudo actualizar la canción.' })
    : await attempt(() => store.createSong(fields), { success: 'Canción guardada', error: 'No se pudo guardar la canción.' })
  saving.value = false
  if (ok) leave()
}

onMounted(async () => {
  if (editing.value && !song.value) await store.loadSongs()
  loaded.value = true
})
</script>

<style scoped>
.song-form-page__state { padding: 40px 16px; color: var(--color-text-muted); text-align: center; }
</style>
