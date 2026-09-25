<template>
  <div class="exercise-form-page">
    <PageBackHeader eyebrow="Ejercicios" title="Nuevo ejercicio" back-label="Volver a ejercicios" @back="leave" />

    <form class="exercise-form" @submit.prevent="create">
      <label class="form-label" for="exercise-name">Nombre</label>
      <input id="exercise-name" v-model="form.name" class="form-input" type="text" placeholder="Ej. Neoclásico en A menor" maxlength="80" required autofocus>

      <span class="form-label">Fuente</span>
      <CatalogPicker v-model="form.source_id" kind="source" />

      <span class="form-label">Técnicas</span>
      <CatalogPicker v-model="form.technique_ids" kind="technique" />

      <div class="exercise-form__status" role="group" aria-label="Estado inicial">
        <button v-for="option in START_OPTIONS" :key="option.value" type="button" :class="{ active: form.status === option.value }" :aria-pressed="form.status === option.value" @click="form.status = option.value">
          {{ option.label }}
        </button>
      </div>

      <details class="exercise-form__more">
        <summary>
          <span>Meta y notas <small>(opcional)</small></span>
          <small v-if="goalSummary" class="exercise-form__summary">{{ goalSummary }}</small>
        </summary>
        <div class="exercise-form__row">
          <label class="exercise-form__field">BPM actual
            <input v-model.number="form.current_bpm" class="form-input" type="number" min="20" max="400" placeholder="Ej. 100">
          </label>
          <label class="exercise-form__field">BPM meta
            <input v-model.number="form.target_bpm" class="form-input" type="number" min="20" max="400" placeholder="Ej. 180">
          </label>
          <label class="exercise-form__field exercise-form__field--wide">Fecha meta
            <input v-model="form.target_date" class="form-input" type="date" :min="todayKey">
          </label>
        </div>
        <textarea v-model="form.notes" class="form-input exercise-form__notes" placeholder="Notas: capítulo, enlace, digitación…" aria-label="Notas" maxlength="500" />
      </details>

      <button class="btn btn-primary exercise-form__save" :disabled="busy || !form.name.trim()">
        {{ busy ? 'Guardando…' : 'Guardar ejercicio' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import PageBackHeader from '../components/PageBackHeader.vue'
import CatalogPicker from '../components/CatalogPicker.vue'

// /entrenar/nuevo — ?fuente=<id> precarga la fuente al agregar desde un grupo.
const START_OPTIONS = [
  { value: 'wishlist', label: 'Deseo' },
  { value: 'learning', label: 'Aprendiendo' },
  { value: 'practicing', label: 'Practicando' },
]
const todayKey = new Date().toLocaleDateString('en-CA')

const route = useRoute()
const router = useRouter()
const store = usePracticeStore()
const { attempt } = useToast()

const busy = ref(false)
const form = ref({
  name: '', source_id: route.query.fuente || null, technique_ids: [], current_bpm: null, target_bpm: null,
  target_date: '', notes: '', status: 'wishlist',
})

// Resumen visible con "Meta y notas" plegado: 100 → 180 bpm · 15 nov
const goalSummary = computed(() => {
  const f = form.value
  const tempo = f.target_bpm ? `${f.current_bpm ? `${f.current_bpm} → ` : ''}${f.target_bpm} bpm` : ''
  const date = f.target_date && new Date(`${f.target_date}T12:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })
  return [tempo, date].filter(Boolean).join(' · ')
})

function leave() {
  if (window.history.state?.back) router.back()
  else router.replace('/entrenar')
}

async function create() {
  if (!form.value.name.trim() || busy.value) return
  busy.value = true
  const f = form.value
  const ok = await attempt(() => store.createSkill({
    name: f.name.trim(),
    source_id: f.source_id,
    technique_ids: f.technique_ids,
    current_bpm: f.current_bpm || null,
    target_bpm: f.target_bpm || null,
    target_date: f.target_date || null,
    status: f.status,
    notes: f.notes.trim() || null,
  }), { success: 'Ejercicio guardado', error: 'No se pudo guardar el ejercicio.' })
  busy.value = false
  if (ok) leave()
}

onMounted(() => { if (!store.ready) store.loadSkills() })
</script>

<style scoped>
.exercise-form { display: flex; flex-direction: column; gap: 10px; padding: 4px 0 24px; }
.exercise-form__status { display: grid; grid-template-columns: repeat(3, 1fr); padding: 3px; border-radius: 14px; background: var(--color-surface-secondary); }
.exercise-form__status button { min-height: 40px; border: 0; border-radius: 11px; background: transparent; color: var(--color-text-secondary); font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
.exercise-form__status button.active { background: var(--color-surface); color: var(--color-primary-hover); box-shadow: var(--shadow-small); }
.exercise-form__more { border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); }
.exercise-form__more summary { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 14px; list-style: none; font-size: 14px; font-weight: 800; cursor: pointer; }
.exercise-form__more summary::-webkit-details-marker { display: none; }
.exercise-form__more summary::after { content: '▸'; margin-left: auto; color: var(--color-text-muted); transition: transform .15s; }
.exercise-form__more[open] summary::after { transform: rotate(90deg); }
.exercise-form__more summary small { color: var(--color-text-muted); font-weight: 600; }
.exercise-form__summary { overflow: hidden; color: var(--color-primary-hover) !important; text-overflow: ellipsis; white-space: nowrap; }
.exercise-form__more[open] .exercise-form__summary { display: none; }
.exercise-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 14px; }
.exercise-form__field { min-width: 0; display: flex; flex-direction: column; gap: 4px; color: var(--color-text-muted); font-size: 12px; font-weight: 700; }
.exercise-form__field--wide { grid-column: 1 / -1; }
.exercise-form__notes { display: block; width: calc(100% - 28px); min-height: 72px; margin: 10px 14px 14px; resize: vertical; font: inherit; }
.exercise-form__save { justify-content: center; margin-top: 8px; padding: 14px; }
</style>
