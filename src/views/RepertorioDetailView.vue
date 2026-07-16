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
            <div class="song-card__body" style="cursor:pointer" @click="router.push('/cancion/' + song.id + '?rep=' + repertoire.id)">
              <div class="song-card__title" style="font-size:16px">{{ song.title }}</div>
              <div class="song-card__meta" style="margin-top:4px">
                <span v-if="song.author" style="font-size:13px;color:var(--text-muted)">{{ song.author }}</span>
                <span v-if="song.key" class="song-card__tag song-card__tag--key">♪ {{ song.key }}</span>
              </div>
              <div v-if="songReadiness(song.id).length" class="readiness-summary" :title="readinessTitle(song.id)">
                <span class="readiness-avatars">
                  <i v-for="entry in songReadiness(song.id).slice(0, 4)" :key="entry.id" :class="`status-${entry.status}`">
                    {{ (entry.profile?.display_name || '?').charAt(0).toUpperCase() }}
                  </i>
                </span>
                <span>{{ readinessLabel(song.id) }}</span>
              </div>
              <div v-if="songAssignments(song.id).length" class="assignment-list" @click.stop>
                <span v-for="assignment in songAssignments(song.id)" :key="assignment.id">
                  <b>{{ assignment.profile?.display_name || 'Músico' }}</b> · {{ assignment.responsibility }}
                  <button v-if="roleStore.isLeader" aria-label="Quitar asignación" @click="removeAssignment(assignment)">×</button>
                </span>
              </div>
              <button v-if="roleStore.isLeader" class="assignment-toggle" @click.stop="toggleAssignment(song.id)">
                + Asignar músico o responsabilidad
              </button>
            </div>
            <button v-if="roleStore.isLeader" class="btn btn-danger btn-sm icon-btn" @click="removeSong(song.id)">✕</button>
            <div v-if="assignmentSongId === song.id" class="assignment-form" @click.stop>
              <UiSelect v-model="assignmentForm.user_id" :options="memberOptions" placeholder="Músico" aria-label="Músico asignado" />
              <input v-model="assignmentForm.responsibility" class="form-input" maxlength="60" placeholder="Ej: Guitarra, voz principal, solo…">
              <button class="btn btn-primary btn-sm" :disabled="!assignmentForm.user_id || !assignmentForm.responsibility.trim()" @click="saveAssignment(song.id)">Guardar</button>
              <button class="btn btn-sm" @click="assignmentSongId = null">Cancelar</button>
            </div>
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
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useToast } from '../composables/useToast'
import draggable from 'vuedraggable'
import UiSelect from '../components/UiSelect.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()

const libQuery    = ref('')
const editingName = ref(false)
const editName    = ref('')
const nameInput   = ref(null)
const members = ref([])
const assignmentSongId = ref(null)
const assignmentForm = ref({ user_id: '', responsibility: '' })
const memberOptions = computed(() => members.value.map(member => ({
  value: member.user_id,
  label: member.profile?.display_name || member.profile?.email || 'Músico',
})))

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

async function save() {
  try { await store.saveRepertoires(); return true }
  catch (reason) { showToast(reason.message || 'No se pudo guardar el repertorio'); return false }
}

function songReadiness(songId) {
  return store.readiness.filter(entry => Number(entry.song_id) === Number(songId))
}

function readinessLabel(songId) {
  const entries = songReadiness(songId)
  const mastered = entries.filter(entry => entry.status === 'mastered').length
  const average = Math.round(entries.reduce((total, entry) => total + Number(entry.progress || 0), 0) / entries.length)
  return `${mastered}/${entries.length} listos · ${average}% promedio`
}

function readinessTitle(songId) {
  const labels = { learning: 'por aprender', practicing: 'practicando', mastered: 'dominada' }
  return songReadiness(songId).map(entry =>
    `${entry.profile?.display_name || 'Músico'}: ${labels[entry.status] || entry.status} (${entry.progress}%)`).join('\n')
}

function songAssignments(songId) {
  return store.assignments.filter(item => Number(item.song_id) === Number(songId))
}

function toggleAssignment(songId) {
  assignmentSongId.value = assignmentSongId.value === songId ? null : songId
  assignmentForm.value = { user_id: '', responsibility: '' }
}

async function saveAssignment(songId) {
  try {
    await store.addSongAssignment({ song_id: songId, ...assignmentForm.value, responsibility: assignmentForm.value.responsibility.trim() })
    assignmentSongId.value = null
    showToast('Responsabilidad asignada')
  } catch (reason) { showToast(reason.message || 'No se pudo crear la asignación') }
}

async function removeAssignment(assignment) {
  try { await store.removeSongAssignment(assignment.id); showToast('Asignación eliminada') }
  catch (reason) { showToast(reason.message || 'No se pudo eliminar') }
}

async function addSong(songId) {
  if (!repertoire.value.songs) repertoire.value.songs = []
  if (!repertoire.value.songs.includes(songId)) {
    repertoire.value.songs.push(songId)
    if (!await save()) { repertoire.value.songs = repertoire.value.songs.filter(id => id !== songId); return }
    const title = store.songs.find(s => s.id === songId)?.title
    showToast(`"${title}" agregada`)
  }
}

async function removeSong(songId) {
  const previous = [...repertoire.value.songs]
  repertoire.value.songs = repertoire.value.songs.filter(id => id !== songId)
  if (!await save()) repertoire.value.songs = previous
}

async function onReorder(newList) {
  const previous = [...repertoire.value.songs]
  repertoire.value.songs = newList.map(s => s.id)
  if (!await save()) repertoire.value.songs = previous
}

function startEditName() {
  editName.value = repertoire.value.name
  editingName.value = true
  nextTick(() => nameInput.value?.focus())
}

async function confirmEditName() {
  if (editName.value.trim() && editName.value.trim() !== repertoire.value.name) {
    const previous = repertoire.value.name
    repertoire.value.name = editName.value.trim()
    if (await save()) showToast('Nombre actualizado')
    else repertoire.value.name = previous
  }
  editingName.value = false
}

onMounted(async () => { if (roleStore.isLeader) members.value = await roleStore.loadMembers() })
</script>

<style scoped>
.repertorio-song-card { flex-wrap: wrap; }
.readiness-summary { display: flex; align-items: center; gap: 7px; margin-top: 7px; color: var(--text-mid); font-size: 10px; font-weight: 700; }
.readiness-avatars { display: flex; padding-left: 4px; }.readiness-avatars i { width: 20px; height: 20px; display: grid; place-items: center; margin-left: -4px; border: 2px solid var(--surface); border-radius: 50%; background: var(--surface2); color: var(--text-mid); font-size: 7px; font-style: normal; }.readiness-avatars i.status-practicing { background: var(--action-soft); color: var(--action2); }.readiness-avatars i.status-mastered { background: var(--green-soft); color: var(--green); }
.assignment-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }.assignment-list > span { display: inline-flex; align-items: center; gap: 3px; padding: 3px 6px; border-radius: 999px; background: var(--surface2); color: var(--text-mid); font-size: 8px; }.assignment-list button { border: 0; background: transparent; color: var(--red); cursor: pointer; font-size: 12px; line-height: 1; }.assignment-toggle { margin-top: 6px; padding: 0; border: 0; background: transparent; color: var(--accent2); font: inherit; font-size: 9px; font-weight: 700; cursor: pointer; }.assignment-form { flex: 0 0 100%; display: grid; grid-template-columns: minmax(120px,.8fr) minmax(150px,1fr) auto auto; gap: 7px; padding: 10px; border-top: 1px solid var(--border); }.assignment-form .form-input { min-width: 0; }.assignment-form :deep(.ui-select) { min-width: 0; }
@media (max-width:600px) { .assignment-form { grid-template-columns: 1fr 1fr; }.assignment-form .ui-select,.assignment-form .form-input { grid-column: 1 / -1; } }
</style>
