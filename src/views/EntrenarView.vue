<template>
  <div class="exercises">
    <div class="page-actions">
      <RouterLink class="btn-pill btn-pill--primary" to="/entrenar/nuevo">
        <span class="btn-pill__icon">+</span> Agregar ejercicio
      </RouterLink>
      <RouterLink class="btn-pill" to="/entrenar/catalogo">Fuentes y técnicas</RouterLink>
    </div>

    <div class="search-box" style="margin-top:12px">
      <span class="search-box__icon">
        <svg class="search-box__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input v-model="query" class="search-box__input" type="search" placeholder="Buscar por nombre, fuente o técnica…" aria-label="Buscar ejercicios">
    </div>

    <div v-if="store.techniques.length" class="type-pills">
      <button
        v-for="item in store.techniques"
        :key="item.id"
        class="type-pill"
        :class="{ active: techniqueFilter === item.id }"
        :aria-pressed="techniqueFilter === item.id"
        @click="techniqueFilter = techniqueFilter === item.id ? '' : item.id"
      >{{ item.name }}</button>
    </div>

    <div class="list-toolbar">
      <span class="list-toolbar__count">{{ isFiltering ? 'Filtrados' : 'Todos' }} ({{ filtered.length }})</span>
      <button class="list-toolbar__sort" @click="groupBy = groupBy === 'source' ? 'status' : 'source'">
        Agrupar: {{ groupBy === 'source' ? 'Fuente' : 'Estado' }} <span>⇅</span>
      </button>
    </div>

    <div v-if="store.ready && !filtered.length" class="exercises-empty">
      <p>{{ store.skills.length ? 'Sin coincidencias' : 'Aún no hay ejercicios' }}</p>
      <span v-if="!store.skills.length">Toca “Agregar ejercicio” para empezar tu biblioteca.</span>
    </div>

    <details v-for="group in groups" :key="group.key || 'sin-fuente'" class="exercise-group" open>
      <summary>
        <span class="exercise-group__name">{{ group.label }}</span>
        <span class="exercise-group__count">{{ group.items.length }}</span>
        <RouterLink
          v-if="groupBy === 'source'"
          class="exercise-group__add"
          :to="{ path: '/entrenar/nuevo', query: group.key ? { fuente: group.key } : {} }"
          :aria-label="`Agregar ejercicio a ${group.label}`"
          @click.stop
        >＋</RouterLink>
      </summary>
      <div
        v-for="s in group.items"
        :key="s.id"
        class="exercise-row"
        role="button"
        tabindex="0"
        @click="router.push(`/skill/${s.id}`)"
        @keydown.enter="router.push(`/skill/${s.id}`)"
      >
        <span class="exercise-row__status" :class="`exercise-row__status--${s.status}`" :title="STATUS_LABELS[s.status]">{{ STATUS_ICONS[s.status] }}</span>
        <span class="exercise-row__main">
          <strong>{{ s.name }}</strong>
          <small>{{ rowMeta(s) }}</small>
        </span>
        <button v-if="s.status !== 'wishlist'" class="exercise-row__play" :aria-label="`Practicar ${s.name}`" @click.stop="practice(s)">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
    </details>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { clearLoadError, reportLoadError } from '../composables/useLoadErrors'
import { useMetronome } from '../composables/useMetronome'
import { STATUS_LABELS, TYPE_LABELS, groupBySource } from '../utils/skills'

// Biblioteca de ejercicios: como la lista de canciones, agrupada por fuente
// (o por estado) para ubicar rápido qué hay de cada manual/video.
const STATUS_ORDER = ['practicing', 'learning', 'wishlist', 'mastered']
const STATUS_ICONS = { wishlist: '☆', learning: '✎', practicing: '▶', mastered: '✓' }

const router = useRouter()
const store = usePracticeStore()
const metronome = useMetronome()

const sessions = ref([])
const query = ref('')
const techniqueFilter = ref('')
const groupBy = ref('source')

const isFiltering = computed(() => !!query.value.trim() || !!techniqueFilter.value)
const filtered = computed(() => {
  const q = query.value.trim().toLocaleLowerCase('es')
  return store.skills
    .filter(s => !techniqueFilter.value || s.technique_ids?.includes(techniqueFilter.value))
    .filter(s => !q || [s.name, store.sourceName(s), s.notes, ...store.techniqueNames(s)].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(q))
    // Orden natural: "Ejercicio 2" antes que "Ejercicio 10".
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
})

const groups = computed(() => groupBy.value === 'source'
  ? groupBySource(filtered.value, store.sources).map(g => ({ key: g.id, label: g.name, items: g.items }))
  : STATUS_ORDER
    .map(status => ({ key: status, label: STATUS_LABELS[status], items: filtered.value.filter(s => s.status === status) }))
    .filter(g => g.items.length))

const secondsBySkill = computed(() => sessions.value.reduce((totals, session) => {
  totals[session.skill_id] = (totals[session.skill_id] || 0) + Number(session.duration_seconds || 0)
  return totals
}, {}))

function rowMeta(s) {
  const tempo = s.target_bpm ? `${s.current_bpm || 0}/${s.target_bpm} bpm` : ''
  const seconds = secondsBySkill.value[s.id]
  return [
    store.techniqueNames(s).join(', ') || (s.type !== 'technique' ? TYPE_LABELS[s.type] : ''),
    groupBy.value === 'source' ? STATUS_LABELS[s.status] : store.sourceName(s),
    tempo,
    seconds && formatDuration(seconds),
  ].filter(Boolean).join(' · ')
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours ? `${hours} h ${minutes ? `${minutes} min` : ''}`.trim() : `${Math.max(1, minutes)} min`
}

function practice(s) {
  metronome.open(s)
  router.push('/metronomo')
}

async function loadSessions() {
  try {
    sessions.value = await store.loadAllSessions()
    clearLoadError('sesiones')
  } catch (reason) { reportLoadError('sesiones', reason, loadSessions) }
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  loadSessions()
})
</script>

<style scoped>
.exercises { padding-bottom: 24px; }
.exercises-empty { padding: 40px 16px; color: var(--color-text-muted); text-align: center; }
.exercises-empty p { margin: 0 0 4px; color: var(--color-text-secondary); font-weight: 800; }

.exercise-group { margin-top: 14px; }
.exercise-group summary { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 2px; list-style: none; cursor: pointer; }
.exercise-group summary::-webkit-details-marker { display: none; }
.exercise-group summary::before { content: '▸'; color: var(--color-text-muted); transition: transform .15s; }
.exercise-group[open] summary::before { transform: rotate(90deg); }
.exercise-group__name { min-width: 0; overflow: hidden; font-size: 15px; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.exercise-group__count { padding: 2px 8px; border-radius: 999px; background: var(--color-surface-secondary); color: var(--color-text-muted); font-size: 12px; font-weight: 800; }
.exercise-group__add { width: 36px; height: 36px; display: grid; place-items: center; margin-left: auto; border-radius: 12px; background: var(--color-primary-soft); color: var(--color-primary-hover); font-size: 16px; text-decoration: none; }

.exercise-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); cursor: pointer; }
.exercise-row:active { background: var(--color-primary-soft); }
.exercise-row:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.exercise-row__status { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border-radius: 12px; background: var(--color-primary-soft); color: var(--color-primary-hover); font-size: 15px; font-weight: 900; }
.exercise-row__status--wishlist { background: var(--color-surface-secondary); color: var(--color-text-muted); }
.exercise-row__status--practicing { background: var(--color-accent-soft); color: var(--color-accent); }
.exercise-row__status--mastered { background: var(--color-success-soft); color: var(--color-success); }
.exercise-row__main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.exercise-row__main strong { overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.exercise-row__main small { overflow: hidden; color: var(--color-text-muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.exercise-row__play { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border: 0; border-radius: 50%; background: var(--color-primary); color: var(--color-text-on-primary); cursor: pointer; }
.exercise-row__play svg { width: 18px; height: 18px; }
</style>
