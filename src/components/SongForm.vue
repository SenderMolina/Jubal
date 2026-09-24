<template>
  <form class="song-form" novalidate :aria-busy="busy" @submit.prevent="submit">
    <!-- Título: siempre visible, fuera de las pestañas -->
    <input
      ref="titleInput"
      class="song-form__title"
      :class="{ 'song-form__title--error': titleError }"
      v-model="form.title"
      type="text"
      maxlength="120"
      placeholder="Nombre de la canción"
      aria-label="Nombre de la canción"
      :aria-invalid="titleError"
      :aria-describedby="titleError ? `${uid}-title-error` : undefined"
      enterkeyhint="next"
      @input="titleError = false"
    >
    <p v-if="titleError" :id="`${uid}-title-error`" class="song-form__error" role="alert">Ponle un nombre para poder guardarla.</p>

    <div class="song-form__tabs" role="tablist" aria-label="Secciones de la canción">
      <button
        v-for="t in TABS"
        :id="`${uid}-tab-${t.id}`"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        :aria-controls="`${uid}-panel-${t.id}`"
        :class="{ active: tab === t.id }"
        @click="tab = t.id"
      >
        {{ t.label }}
        <small v-if="t.id === 'details' && detailsSummary">{{ detailsSummary }}</small>
      </button>
    </div>

    <!-- Letra: la parte principal, ocupa el alto disponible -->
    <section
      v-show="tab === 'lyrics'"
      :id="`${uid}-panel-lyrics`"
      class="song-form__panel"
      role="tabpanel"
      :aria-labelledby="`${uid}-tab-lyrics`"
    >
      <textarea
        v-model="form.lyrics"
        class="song-form__lyrics"
        :placeholder="LYRICS_PLACEHOLDER"
        aria-label="Letra y acordes"
        spellcheck="false"
        autocapitalize="sentences"
      ></textarea>
      <details class="song-form__help">
        <summary>¿Cómo escribir acordes?</summary>
        <ul>
          <li>Acordes en su propia línea, encima de la letra, o dentro de ella: <code>[G]Santo, [D]Santo</code>.</li>
          <li>Marca las partes con <code>[Intro]</code>, <code>[Verso]</code>, <code>[Coro]</code> o <code>[Puente]</code>.</li>
          <li>Para que avancen solas en Play y en vivo, indica cuánto dura cada parte: <code>[Coro 0:30]</code>.</li>
          <li>A las coristas no se les muestran los acordes.</li>
        </ul>
      </details>
    </section>

    <!-- Detalles -->
    <section
      v-show="tab === 'details'"
      :id="`${uid}-panel-details`"
      class="song-form__panel song-form__details"
      role="tabpanel"
      :aria-labelledby="`${uid}-tab-details`"
    >
      <div class="song-form__field">
        <span :id="`${uid}-key-label`" class="song-form__label">Tono</span>
        <div ref="keyRow" class="song-form__keys" role="group" :aria-labelledby="`${uid}-key-label`">
          <button type="button" class="key-chip key-chip--none" :class="{ active: !form.key }" :aria-pressed="!form.key" aria-label="Sin tono" @click="form.key = ''">—</button>
          <button
            v-for="k in KEYS"
            :key="k"
            type="button"
            class="key-chip"
            :class="{ active: form.key === k }"
            :aria-pressed="form.key === k"
            :aria-label="`Tono ${k}`"
            @click="form.key = k"
          >{{ fmtKey(k) }}</button>
        </div>
      </div>

      <div class="song-form__field">
        <span class="song-form__label">Autor o artista</span>
        <UiCombobox v-model="form.author" :options="authorSuggestions" placeholder="Ej: Marcos Witt" aria-label="Autor o artista" />
      </div>

      <div class="song-form__row">
        <div class="song-form__field">
          <label class="song-form__label" :for="`${uid}-dur`">Duración</label>
          <div class="song-form__unit">
            <input :id="`${uid}-dur`" v-model="form.durationText" class="form-input" type="text" inputmode="numeric" placeholder="4:30">
            <span aria-hidden="true">m:ss</span>
          </div>
        </div>
        <div class="song-form__field">
          <label class="song-form__label" :for="`${uid}-bpm`">Tempo</label>
          <div class="song-form__unit">
            <input :id="`${uid}-bpm`" v-model.number="form.bpm" class="form-input" type="number" inputmode="numeric" placeholder="75" min="20" max="300">
            <span aria-hidden="true">BPM</span>
          </div>
        </div>
      </div>

      <div v-if="store.songTypes.length" class="song-form__field">
        <span class="song-form__label">Tipo</span>
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
    </section>

    <!-- Guardar: fijo abajo, siempre a mano. Salir = flecha de volver. -->
    <div class="song-form__bar">
      <button class="sf-save-btn song-form__save" type="submit" :disabled="busy">{{ busy ? 'Guardando…' : submitLabel }}</button>
    </div>
  </form>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
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
const emit = defineEmits(['submit'])

const TABS = [
  { id: 'lyrics', label: 'Letra' },
  { id: 'details', label: 'Detalles' },
]

const LYRICS_PLACEHOLDER = `[Intro 0:15]
G  Em  C  D

[Verso 1]
G              Em
Cuán grande es Él
C             D
Su amor sin fin

[Coro 0:30]
[G]Santo, [D]Santo, [Em]Santo[C]...`

const store = useAppStore()
const uid = useId()
const titleInput = ref(null)
const keyRow = ref(null)
const titleError = ref(false)
const tab = ref('lyrics')

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

// Resumen en la pestaña: se ve lo cargado sin tener que abrirla.
const detailsSummary = computed(() =>
  [form.value.key && fmtKey(form.value.key), form.value.bpm && `${form.value.bpm} BPM`].filter(Boolean).join(' · ')
)

function toggleType(id) {
  const types = form.value.types
  form.value.types = types.includes(id) ? types.filter(t => t !== id) : [...types, id]
}

// Al abrir Detalles, llevar el tono elegido a la vista dentro de la fila deslizable.
watch(tab, async (value) => {
  if (value !== 'details') return
  await nextTick()
  keyRow.value?.querySelector('.key-chip.active')?.scrollIntoView({ block: 'nearest', inline: 'center' })
})

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

// Canción nueva: empezar por el nombre. Al editar, no abrir el teclado de golpe.
onMounted(() => { if (!props.song) titleInput.value?.focus() })
</script>

<style scoped>
.song-form { display: flex; flex-direction: column; }

/* Título: una sola línea inferior como indicador (sin el recuadro de foco). */
.song-form__title {
  width: 100%;
  padding: 6px 2px 8px;
  border: 0;
  border-bottom: 2px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  outline: none;
  transition: border-color .15s ease;
}
.song-form__title::placeholder { color: var(--color-text-muted); font-weight: 600; }
.song-form__title:focus,
.song-form__title:focus-visible { outline: none; border-bottom-color: var(--color-primary); }
.song-form__title--error,
.song-form__title--error:focus { border-bottom-color: var(--color-danger); }
.song-form__error { margin-top: 6px; color: var(--color-danger); font-size: .8rem; }

/* Pestañas segmentadas (mismo lenguaje que el selector de canciones). */
.song-form__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 16px 0 12px;
  padding: 4px;
  border-radius: 12px;
  background: var(--color-surface-secondary);
}
.song-form__tabs button {
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: .9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s, color .15s;
}
.song-form__tabs button.active { background: var(--color-surface); color: var(--color-primary); box-shadow: var(--shadow-small); }
.song-form__tabs small { color: var(--color-text-muted); font-size: .72rem; font-weight: 600; }

/* Letra: campo alto, monoespaciado como en la vista de la canción. */
.song-form__lyrics {
  width: 100%;
  height: max(300px, calc(100dvh - 400px));
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: ui-monospace, 'Roboto Mono', Menlo, Consolas, monospace;
  font-size: 15px;
  line-height: 1.7;
  resize: vertical;
}
.song-form__lyrics:focus { border-color: var(--color-primary); outline: none; box-shadow: 0 0 0 3px var(--color-focus-ring); }

.song-form__help { margin-top: 10px; color: var(--color-text-secondary); font-size: .8rem; line-height: 1.55; }
.song-form__help summary { width: fit-content; padding: 6px 0; color: var(--color-link); font-weight: 700; cursor: pointer; }
.song-form__help ul { display: grid; gap: 4px; margin: 4px 0 0; padding-left: 18px; }
.song-form__help code { padding: 1px 5px; border-radius: 5px; background: var(--color-surface-secondary); font-size: .95em; }

/* Detalles */
.song-form__details { display: flex; flex-direction: column; gap: 20px; padding-top: 4px; }
.song-form__field { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.song-form__label { color: var(--color-text-secondary); font-size: .85rem; font-weight: 700; }
.song-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.song-form__unit { position: relative; }
.song-form__unit input { width: 100%; padding-right: 50px; }
.song-form__unit span {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  color: var(--color-text-muted); font-size: .72rem; font-weight: 600; pointer-events: none;
}

/* Tonos: una sola fila que se desliza. */
.song-form__keys {
  display: flex;
  gap: 7px;
  margin-inline: -2px;
  padding: 2px 2px 6px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  /* Bordes difuminados: indican que la fila se desliza. */
  -webkit-mask-image: linear-gradient(to right, transparent, #000 14px, #000 calc(100% - 14px), transparent);
  mask-image: linear-gradient(to right, transparent, #000 14px, #000 calc(100% - 14px), transparent);
}
.song-form__keys::-webkit-scrollbar { display: none; }
.key-chip {
  flex: 0 0 auto;
  min-width: 44px;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-family: var(--font-display);
  font-size: .95rem;
  font-weight: 700;
  cursor: pointer;
  scroll-snap-align: center;
  -webkit-tap-highlight-color: transparent;
  transition: border-color .15s ease, color .15s ease, background .15s ease;
}
.key-chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.key-chip.active { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-text-on-primary); }
.key-chip--none { color: var(--color-text-muted); font-weight: 600; }
.key-chip--none.active { background: var(--color-text-secondary); border-color: var(--color-text-secondary); }

/* Barra de guardar fija abajo. */
.song-form__bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  margin-top: 16px;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, transparent, var(--color-background) 30%);
}
.song-form__save { width: 100%; min-height: 50px; border-radius: 14px; font-size: 1rem; }

@media (prefers-reduced-motion: reduce) {
  .key-chip, .song-form__tabs button, .song-form__title { transition: none; }
}
</style>
