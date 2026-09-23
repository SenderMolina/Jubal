<template>
  <form class="song-form" novalidate @submit.prevent="submit">
    <!-- Título -->
    <div class="sf-block">
      <input
        ref="titleInput"
        class="sf-title-input"
        :class="{ 'sf-title-input--error': titleError }"
        v-model="form.title"
        type="text"
        placeholder="¿Cómo se llama la canción?"
        aria-label="Título de la canción"
        :aria-invalid="titleError"
        @input="titleError = false"
      >
      <div v-if="titleError" class="sf-error" role="alert">Ponle un nombre para poder guardarla.</div>
    </div>

    <!-- Tono: teclado de acordes (mismo lenguaje que la lista) -->
    <div class="sf-block">
      <div class="sf-block-label" id="sf-key-label">Tono</div>
      <div class="key-picker" role="group" aria-labelledby="sf-key-label">
        <button type="button" class="key-chip key-chip--none" :class="{ active: !form.key }" :aria-pressed="!form.key" aria-label="Sin tono" @click="form.key = ''">—</button>
        <button
          v-for="k in KEYS"
          :key="k"
          type="button"
          class="key-chip"
          :class="{ active: form.key === k }"
          :aria-pressed="form.key === k"
          @click="form.key = k"
        >{{ fmtKey(k) }}</button>
      </div>
    </div>

    <!-- Autor -->
    <div class="sf-block">
      <div class="sf-field">
        <label class="sf-label">Autor o artista</label>
        <UiCombobox v-model="form.author" :options="authorSuggestions" placeholder="Ej: Marcos Witt" aria-label="Autor o artista" />
      </div>
    </div>

    <!-- Duración + Tempo -->
    <div class="sf-inline-row">
      <div class="sf-field">
        <label class="sf-label" :for="`${uid}-dur`">Duración</label>
        <div class="sf-bpm-wrap">
          <input :id="`${uid}-dur`" class="form-input sf-bpm-input" v-model="form.durationText" type="text" inputmode="numeric" placeholder="4:30">
          <span class="sf-bpm-unit">m:ss</span>
        </div>
      </div>
      <div class="sf-field">
        <label class="sf-label" :for="`${uid}-bpm`">Tempo</label>
        <div class="sf-bpm-wrap">
          <input :id="`${uid}-bpm`" class="form-input sf-bpm-input" v-model.number="form.bpm" type="number" inputmode="numeric" placeholder="75" min="20" max="300">
          <span class="sf-bpm-unit">BPM</span>
        </div>
      </div>
    </div>

    <!-- Tipo -->
    <div v-if="store.songTypes.length" class="sf-block">
      <div class="sf-block-label">Tipo</div>
      <div class="type-pills type-pills--form">
        <button
          v-for="t in store.songTypes"
          :key="t.id"
          type="button"
          class="type-pill"
          :class="{ active: form.types.includes(t.id) }"
          :aria-pressed="form.types.includes(t.id)"
          @click="toggleType(t.id)"
        >{{ t.name }}</button>
      </div>
    </div>

    <!-- Letra y acordes -->
    <div class="sf-block">
      <label class="sf-block-label" :for="`${uid}-lyrics`">Letra y acordes</label>
      <textarea :id="`${uid}-lyrics`" class="sf-lyrics" v-model="form.lyrics" :placeholder="LYRICS_PLACEHOLDER"></textarea>
      <div class="form-hint">
        Escribe los acordes sobre la letra o dentro de ella, como <code>[G]Santo, [D]Santo</code>.
        Marca las partes con [Intro], [Verso], [Coro] o [Puente]; para que avancen solas en
        Play y en vivo, indica cuánto dura cada una: <code>[Coro 0:30]</code>.
        A las coristas no se les muestran los acordes.
      </div>
    </div>

    <!-- Acciones -->
    <div class="sf-actions">
      <button class="sf-save-btn" type="submit" :disabled="busy">{{ busy ? 'Guardando…' : submitLabel }}</button>
      <button class="sf-cancel-btn" type="button" @click="$emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<script setup>
import { computed, onMounted, ref, useId } from 'vue'
import { useAppStore } from '../stores/app'
import { formatDuration, parseDuration } from '../utils/duration'
import { KEYS, fmtKey } from '../utils/keys'
import UiCombobox from './UiCombobox.vue'

// Formulario único de canción (crear y editar). Emite `submit` con los campos
// listos para store.createSong / store.updateSong; guardar es cosa del padre.
const props = defineProps({
  song: { type: Object, default: null },        // null = canción nueva
  submitLabel: { type: String, default: 'Guardar' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'cancel'])

const store = useAppStore()
const uid = useId()
const titleInput = ref(null)
const titleError = ref(false)

const LYRICS_PLACEHOLDER = `[Intro 0:15]
G  Em  C  D

[Verso 1]
G              Em
Cuán grande es Él
C             D
Su amor sin fin

[Coro 0:30]
[G]Santo, [D]Santo, [Em]Santo[C]...`

// Recordar tono y autor de la última canción creada: suelen repetirse.
function remembered(key) {
  try { return localStorage.getItem(key) || '' } catch { return '' }
}
function remember(key, value) {
  try { if (value) localStorage.setItem(key, value) } catch { /* sin almacenamiento */ }
}

function initialForm(song) {
  if (!song) {
    return { title: '', author: remembered('lastSongAuthor'), key: remembered('lastSongKey'), bpm: null, durationText: '', types: [], lyrics: '' }
  }
  return {
    title: song.title || '',
    author: song.author || '',
    key: song.key || '',
    bpm: song.bpm || null,
    durationText: formatDuration(song.duration),
    types: Array.isArray(song.types) ? [...song.types] : [],
    lyrics: song.lyrics || '',
  }
}

const form = ref(initialForm(props.song))

const authorSuggestions = computed(() =>
  [...new Set(store.songs.map(s => s.author).filter(Boolean))]
)

function toggleType(id) {
  const types = form.value.types
  form.value.types = types.includes(id) ? types.filter(t => t !== id) : [...types, id]
}

function submit() {
  const title = form.value.title.trim()
  if (!title) {
    titleError.value = true
    titleInput.value?.focus()
    return
  }
  if (!props.song) {
    remember('lastSongKey', form.value.key)
    remember('lastSongAuthor', form.value.author.trim())
  }
  emit('submit', {
    title,
    author: form.value.author.trim(),
    key: form.value.key,
    bpm: Number(form.value.bpm) || null,
    duration: parseDuration(form.value.durationText),
    types: form.value.types,
    lyrics: form.value.lyrics.trim(),
  })
}

onMounted(() => titleInput.value?.focus())
</script>

<style scoped>
.sf-actions {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
  align-items: stretch;
  gap: 10px;
}
.sf-actions .sf-save-btn,
.sf-actions .sf-cancel-btn {
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
}
.sf-actions .sf-cancel-btn {
  border: 1px solid var(--color-danger);
  background: var(--color-danger);
  color: var(--color-text-on-primary);
  cursor: pointer;
}
.sf-actions .sf-cancel-btn:active { transform: scale(.98); }

.sf-title-input--error { border-bottom-color: var(--color-danger); }
.sf-error { color: var(--color-danger); font-size: 0.78rem; margin-top: 6px; }
label.sf-block-label { display: block; }

/* Teclado de tonos (la firma) */
.key-picker { display: flex; flex-wrap: wrap; gap: 7px; }
.key-chip {
  min-width: 42px;
  padding: 9px 8px;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}
.key-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.key-chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
  box-shadow: var(--shadow-medium);
}
.key-chip:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.key-chip--none { color: var(--color-text-muted); font-weight: 600; }
.key-chip--none.active { background: var(--color-text-secondary); border-color: var(--color-text-secondary); color: var(--color-text-on-primary); }

/* Tempo y duración con unidad */
.sf-bpm-wrap { position: relative; }
.sf-bpm-input { padding-right: 48px; }
.sf-bpm-unit {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.03em;
  color: var(--color-text-muted); pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .key-chip { transition: none; }
}
</style>
