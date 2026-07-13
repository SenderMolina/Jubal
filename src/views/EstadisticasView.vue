<template>
  <div class="stats">
    <div class="stats-card">
      <h3 class="stats-card__title">Tiempo de práctica</h3>
      <div class="stats-row">
        <span>Esta semana</span>
        <strong>{{ formatMinutes(weekSeconds) }}</strong>
      </div>
      <div class="stats-row">
        <span>Total</span>
        <strong>{{ formatMinutes(totalSeconds) }}</strong>
      </div>
      <div class="stats-row">
        <span>Sesiones</span>
        <strong>{{ sessions.length }}</strong>
      </div>
    </div>

    <div class="stats-card">
      <h3 class="stats-card__title">Skills</h3>
      <div class="stats-row">
        <span>Dominadas</span>
        <strong>{{ mastered }} / {{ store.skills.length }}</strong>
      </div>
      <div class="stats-row">
        <span>Practicando</span>
        <strong>{{ practicing }}</strong>
      </div>
    </div>

    <p v-if="!sessions.length" class="activity-empty">
      Aún no hay sesiones registradas. Practica con el metrónomo para empezar a ver tus avances.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePracticeStore } from '../stores/practice'

const store = usePracticeStore()
const sessions = ref([])

const totalSeconds = computed(() => sessions.value.reduce((a, s) => a + s.duration_seconds, 0))
const weekSeconds = computed(() => {
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000
  return sessions.value
    .filter(s => new Date(s.practiced_at).getTime() >= cutoff)
    .reduce((a, s) => a + s.duration_seconds, 0)
})
const mastered   = computed(() => store.skills.filter(s => s.status === 'mastered').length)
const practicing = computed(() => store.skills.filter(s => s.status === 'practicing').length)

function formatMinutes(secs) {
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}

onMounted(async () => {
  if (!store.ready) store.loadSkills()
  sessions.value = await store.loadAllSessions()
})
</script>

<style scoped>
.stats { padding: 12px 16px 40px; display: flex; flex-direction: column; gap: 14px; max-width: 480px; margin: 0 auto; }

.stats-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 16px;
}
.stats-card__title {
  font-size: .8rem; font-weight: 600; color: var(--text-mid);
  text-transform: uppercase; letter-spacing: .04em; margin: 0 0 8px;
}
.stats-row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 7px 0; font-size: 14px; color: var(--text-mid);
  border-bottom: 1px solid var(--border);
}
.stats-row:last-child { border-bottom: none; }
.stats-row strong { font-size: 16px; color: var(--text); font-variant-numeric: tabular-nums; }
</style>
