<template>
  <div>
    <h1 class="section-title">Añadir alabanza</h1>
    <p class="section-subtitle">Agrega una nueva canción al repertorio.</p>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Título <span class="req">*</span></label>
        <input
          ref="titleInput"
          class="form-input"
          :class="{ 'form-input--error': errors.title }"
          v-model="form.title"
          type="text"
          placeholder="Ej: Santo, Santo, Santo"
          @input="errors.title = ''"
        >
        <p v-if="errors.title" class="form-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ errors.title }}
        </p>
      </div>
      <div class="form-group">
        <label class="form-label">Autor / Artista</label>
        <input class="form-input" v-model="form.author" type="text" placeholder="Ej: Marcos Witt">
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tono (Key)</label>
        <select class="form-select" v-model="form.key">
          <option value="">— Sin especificar —</option>
          <option v-for="k in keys" :key="k">{{ k }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Tempo (BPM)</label>
        <input class="form-input" v-model.number="form.bpm" type="number" placeholder="Ej: 75" min="40" max="200">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Duración (min:seg)</label>
      <input class="form-input" v-model="form.durationText" type="text" inputmode="numeric" placeholder="Ej: 4:30">
      <div class="form-hint">Se usa para el autoscroll de la letra en modo Play.</div>
    </div>

    <div class="form-group">
      <label class="form-label">Tipos</label>
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

    <div class="form-group">
      <label class="form-label">Letra y acordes</label>
      <textarea class="form-textarea" v-model="form.lyrics" :placeholder="lyricsPlaceholder"></textarea>
      <div class="form-hint">Acordes inline: <code>[C]Sublime [G]gra[Am]cia</code> — el acorde se coloca sobre la sílaba (también funciona el acorde en su propia línea). Usa [Coro], [Verso]… para secciones; con tiempo opcional [Intro 0:25] el autoscroll se pausa ahí. A las coristas no se les muestran los acordes.</div>
    </div>

    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
      <button class="btn btn-ghost" @click="router.push('/repertorio')">Cancelar</button>
      <button class="btn btn-primary" @click="save">Guardar alabanza</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useToast } from '../composables/useToast'
import { parseDuration } from '../utils/duration'

const router = useRouter()
const store  = useAppStore()
const { showToast } = useToast()

const keys = ['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab']

const titleInput = ref(null)
const errors = ref({ title: '' })
onMounted(() => titleInput.value?.focus())

const emptyForm = () => ({ title: '', author: '', key: '', bpm: null, durationText: '', types: [], lyrics: '' })

function toggleFormType(id) {
  const idx = form.value.types.indexOf(id)
  if (idx >= 0) form.value.types.splice(idx, 1)
  else form.value.types.push(id)
}
const form = ref(emptyForm())

const lyricsPlaceholder = `[Intro]
G  Em  C  D

[Verso 1]
[G]Cuán [Em]grande es Él
[C]Su amor [D]sin fin

[Coro]
[G]Santo, [D]Santo, [Em]Santo[C]...`

function save() {
  if (!form.value.title.trim()) {
    errors.value.title = 'Ponle un título para guardar.'
    titleInput.value?.focus()
    return
  }

  store.songs.push({
    id:     Date.now(),
    title:  form.value.title.trim(),
    author: form.value.author.trim(),
    key:    form.value.key,
    bpm:    form.value.bpm || null,
    duration: parseDuration(form.value.durationText),
    types:  form.value.types.length ? form.value.types : [],
    lyrics: form.value.lyrics.trim() || '',
  })
  store.saveSongs()
  showToast('Alabanza guardada ✓')
  form.value = emptyForm()
  router.push('/repertorio')
}
</script>
