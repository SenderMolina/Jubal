<template>
  <div>
    <h1 class="section-title">Añadir alabanza</h1>
    <p class="section-subtitle">Agrega una nueva canción al repertorio.</p>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Título *</label>
        <input class="form-input" v-model="form.title" type="text" placeholder="Ej: Santo, Santo, Santo">
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
      <div class="form-hint">Pon los acordes en una línea y la letra en la siguiente. Usa [Coro], [Verso], [Puente] para secciones.</div>
    </div>

    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
      <button class="btn btn-ghost" @click="router.push('/repertorio')">Cancelar</button>
      <button class="btn btn-primary" @click="save">Guardar alabanza</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useToast } from '../composables/useToast'

const router = useRouter()
const store  = useAppStore()
const { showToast } = useToast()

const keys = ['A','A#/Bb','B','C','C#/Db','D','D#/Eb','E','F','F#/Gb','G','G#/Ab']

const emptyForm = () => ({ title: '', author: '', key: '', bpm: null, types: [], lyrics: '' })

function toggleFormType(id) {
  const idx = form.value.types.indexOf(id)
  if (idx >= 0) form.value.types.splice(idx, 1)
  else form.value.types.push(id)
}
const form = ref(emptyForm())

const lyricsPlaceholder = `[Intro]
G  Em  C  D

[Verso 1]
G              Em
Cuán grande es Él
C             D
Su amor sin fin

[Coro]
G    D    Em   C
Santo, Santo, Santo...`

function save() {
  if (!form.value.title.trim()) { alert('El título es obligatorio.'); return }

  store.songs.push({
    id:     Date.now(),
    title:  form.value.title.trim(),
    author: form.value.author.trim(),
    key:    form.value.key,
    bpm:    form.value.bpm || null,
    types:  form.value.types.length ? form.value.types : [],
    lyrics: form.value.lyrics.trim() || '',
  })
  store.saveSongs()
  showToast('Alabanza guardada ✓')
  form.value = emptyForm()
  router.push('/repertorio')
}
</script>
