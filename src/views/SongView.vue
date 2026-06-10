<template>
  <div>
    <!-- Topbar (modo vista) -->
    <div v-if="!editing" class="detail-topbar">
      <button class="icon-circle-btn" aria-label="Volver" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>
      <div class="song-topbar-info">
        <div class="song-topbar-title">
          {{ song?.title }}
          <span v-if="song?.key" class="song-topbar-key">{{ song.key }}</span>
        </div>
      </div>
      <button v-if="roleStore.isLeader" class="icon-circle-btn" aria-label="Opciones" @click="openMenu">
        <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      <div v-else class="song-topbar-spacer"></div>
    </div>

    <!-- Header (modo edición) -->
    <div v-else class="song-view-header">
      <div style="flex:1">
        <input class="form-input" v-model="form.title" placeholder="Título" style="font-size:1.1rem;font-weight:600;margin-bottom:6px">
      </div>
      <span class="sf-cancel-link" @click="cancelEdit">Cancelar</span>
      <button class="sf-save-btn sf-save-btn-sm" @click="saveEdit">Guardar</button>
    </div>

    <ActionSheet ref="sheet" />

    <!-- Edit form -->
    <div v-if="editing">

      <!-- Letra y acordes -->
      <div class="sf-block">
        <div class="sf-block-label">Letra y acordes</div>
        <textarea class="sf-lyrics" v-model="form.lyrics"></textarea>
      </div>

      <!-- Presentación para coristas -->
      <div class="sf-block">
        <div class="sf-block-label">Presentación para coristas (Genially)</div>
        <textarea class="sf-lyrics" v-model="form.embedCantante" placeholder="Código <iframe> o enlace de Genially. Se mostrará a los coristas en lugar de la letra."></textarea>
      </div>

      <!-- Presentación para músicos -->
      <div class="sf-block">
        <div class="sf-block-label">Presentación para músicos (Genially)</div>
        <textarea class="sf-lyrics" v-model="form.embedMusico" placeholder="Código <iframe> o enlace de Genially. Se mostrará a los músicos en lugar de la letra y acordes."></textarea>
      </div>

      <!-- Tono + Autor -->
      <div class="sf-inline-row">
        <div class="sf-field">
          <label class="sf-label">Tono (Key)</label>
          <select class="form-select" v-model="form.key">
            <option value="">— Sin especificar —</option>
            <option v-for="k in keys" :key="k">{{ k }}</option>
          </select>
        </div>
        <div class="sf-field">
          <label class="sf-label">Autor / Artista</label>
          <input class="form-input" v-model="form.author" placeholder="Ej: Marcos Witt" list="sf-authors-edit">
          <datalist id="sf-authors-edit">
            <option v-for="a in authorSuggestions" :key="a" :value="a"></option>
          </datalist>
        </div>
      </div>

      <!-- Detalles adicionales -->
      <button class="sf-details-toggle" @click="showDetails = !showDetails">
        {{ showDetails ? '▲' : '▶' }} Detalles adicionales
      </button>
      <div v-if="showDetails" class="sf-details">
        <div class="sf-inline-row">
          <div class="sf-field">
            <label class="sf-label">Tempo (BPM)</label>
            <input class="form-input" v-model.number="form.bpm" type="number" placeholder="Ej: 75" min="40" max="200">
          </div>
          <div class="sf-field">
            <label class="sf-label">Tipos</label>
            <div class="type-pills type-pills--form">
              <button
                v-for="t in store.songTypes"
                :key="t.id"
                type="button"
                class="type-pill"
                :class="{ active: form.types.includes(t.id) }"
                @click="toggleFormType(t.id)"
              >{{ t.name }}</button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- View mode: presentación embebida (abre ya maximizada) -->
    <div v-else-if="embedSrc" class="embed-block embed-block--full">
      <iframe :src="embedSrc" frameborder="0" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" loading="lazy"></iframe>
    </div>

    <!-- View mode: letra y acordes -->
    <div v-else class="lyrics-block">
      <template v-if="renderedLines.length">
        <template v-for="(line, i) in renderedLines" :key="i">
          <div v-if="line.type === 'spacer'" style="height:10px;"></div>
          <div v-else :class="line.type">{{ line.text }}</div>
        </template>
      </template>
      <div v-else style="text-align:center;padding:40px;color:var(--text-muted)">
        Esta canción aún no tiene letra.
        <span v-if="roleStore.isLeader" style="display:block;margin-top:8px">
          <button class="btn btn-ghost btn-sm" @click="startEdit">Agregar letra</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import ActionSheet from '../components/ActionSheet.vue'

const route     = useRoute()
const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const { showToast } = useToast()
const { confirm }   = useConfirm()

const sheet       = ref(null)
const editing     = ref(false)
const form        = ref({})
const showDetails = ref(false)

const keys = ['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab']

const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/

const song = computed(() => store.songs.find(s => s.id === Number(route.params.id)))

const authorSuggestions = computed(() =>
  [...new Set(store.songs.map(s => s.author).filter(Boolean))]
)

// Extrae solo la URL del código embebido (evita inyectar HTML crudo / XSS).
// Acepta el <iframe> completo de Genially o un enlace pelado.
function extractSrc(raw) {
  const s = (raw || '').trim()
  if (!s) return ''
  const m = s.match(/src=["']([^"']+)["']/i)
  if (m) return m[1]
  if (/^https?:\/\//i.test(s)) return s
  return ''
}

// Elige la presentación según el rol. El líder ve la de músico, y si no hay,
// la de corista, para poder previsualizar.
const embedSrc = computed(() => {
  const s = song.value
  if (!s) return ''
  if (roleStore.isCantante) return extractSrc(s.embedCantante)
  if (roleStore.isMusico)   return extractSrc(s.embedMusico)
  return extractSrc(s.embedMusico) || extractSrc(s.embedCantante)
})

function openMenu() {
  sheet.value?.open({
    title: song.value?.title,
    actions: [
      { label: 'Editar canción', icon: 'edit', onSelect: startEdit },
      { label: 'Eliminar canción', icon: 'trash', danger: true, onSelect: deleteSong },
    ],
  })
}

async function deleteSong() {
  const ok = await confirm('¿Eliminar canción?', `"${song.value?.title}"`)
  if (!ok) return
  store.songs = store.songs.filter(s => s.id !== song.value.id)
  store.saveSongs()
  showToast('Canción eliminada')
  router.back()
}

function startEdit() {
  const s = song.value
  const types = Array.isArray(s.types) ? [...s.types] : (s.type ? [s.type] : [])
  form.value = { title: s.title, author: s.author || '', key: s.key || '', bpm: s.bpm || null, types, lyrics: s.lyrics || '', embedCantante: s.embedCantante || '', embedMusico: s.embedMusico || '' }
  editing.value = true
}

function toggleFormType(id) {
  const idx = form.value.types.indexOf(id)
  if (idx >= 0) form.value.types.splice(idx, 1)
  else form.value.types.push(id)
}

function cancelEdit() {
  editing.value = false
  showDetails.value = false
}

function saveEdit() {
  if (!form.value.title.trim()) { alert('El título es obligatorio.'); return }
  const idx = store.songs.findIndex(s => s.id === Number(route.params.id))
  if (idx === -1) return
  store.songs[idx] = { ...store.songs[idx], ...form.value, title: form.value.title.trim(), lyrics: form.value.lyrics.trim(), embedCantante: (form.value.embedCantante || '').trim(), embedMusico: (form.value.embedMusico || '').trim(), bpm: form.value.bpm || null, types: form.value.types.length ? form.value.types : [] }
  store.saveSongs()
  editing.value = false
  showDetails.value = false
  showToast('Canción actualizada ✓')
}

const renderedLines = computed(() => {
  if (!song.value?.lyrics) return []
  const hideChords = roleStore.isCantante
  return song.value.lyrics.split('\n').reduce((acc, line) => {
    if (!line.trim()) {
      acc.push({ type: 'spacer' })
      return acc
    }
    const isChord   = chordRegex.test(line.trim())
    const isSection = /^\[.+\]$/.test(line.trim())
    if (hideChords && isChord) return acc
    if (isSection) acc.push({ type: 'section-label', text: line.trim().replace(/[\[\]]/g, '') })
    else if (isChord) acc.push({ type: 'chord-line', text: line })
    else acc.push({ type: 'lyric-line', text: line })
    return acc
  }, [])
})
</script>
