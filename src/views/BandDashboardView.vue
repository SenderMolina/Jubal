<template>
  <main class="activity-dashboard">
    <header class="activity-dashboard__head">
      <div>
        <span class="activity-dashboard__eyebrow">Agenda</span>
        <h2>Próximas actividades</h2>
        <p>{{ activitySummary }}</p>
      </div>
    </header>

    <section v-if="upcomingActivities.length" class="activity-list" aria-label="Próximas actividades">
      <button
        v-for="activity in upcomingActivities"
        :key="activity.id"
        class="activity-row"
        type="button"
        @click="router.push(`/actividad/${activity.id}`)"
      >
        <span class="activity-row__date" :class="{ 'activity-row__date--today': isToday(activity.date) }">
          <strong>{{ dateDay(activity.date) }}</strong>
          <small>{{ dateMonth(activity.date) }}</small>
        </span>

        <span class="activity-row__body">
          <span class="activity-row__countdown">{{ countdown(activity.date) }}</span>
          <strong>{{ activity.title }}</strong>
          <small>{{ eventMeta(activity) }}</small>
        </span>

        <span class="activity-row__arrow" aria-hidden="true">›</span>
      </button>
    </section>

    <section v-else class="activity-empty">
      <span class="activity-empty__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      </span>
      <strong>No hay actividades próximas</strong>
      <p>Cuando agregues una actividad aparecerá aquí.</p>
    </section>

  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'

const router = useRouter()
const app = useAppStore()

function localDateKey(date = new Date()) {
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const today = localDateKey()
const upcomingActivities = computed(() => app.activities
  .filter(activity => activity.date && activity.date >= today)
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')))

const activitySummary = computed(() => {
  const total = upcomingActivities.value.length
  if (total === 0) return 'Tu agenda está libre por ahora'
  if (total === 1) return '1 actividad programada'
  return `${total} actividades programadas`
})

const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function dateParts(value) {
  const [, month, day] = value.split('-').map(Number)
  return { month, day }
}

function dateDay(value) {
  return dateParts(value).day
}

function dateMonth(value) {
  return months[dateParts(value).month - 1]
}

function isToday(value) {
  return value === today
}

function countdown(value) {
  const [year, month, day] = value.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const days = Math.round((target - base) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  return `En ${days} días`
}

function eventMeta(activity) {
  const songs = (activity.tiempos || []).reduce((sum, time) => sum + (time.songs?.length || 0), 0)
  return [activity.time || 'Sin hora', songs && `${songs} canción${songs === 1 ? '' : 'es'}`]
    .filter(Boolean)
    .join(' · ')
}
</script>

<style scoped>
.activity-dashboard {
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
  padding-bottom: 96px;
}

.activity-dashboard__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 2px 18px;
}

.activity-dashboard__eyebrow {
  color: var(--color-accent);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.activity-dashboard__head h2 {
  margin-top: 4px;
  color: var(--color-text-primary);
  font-size: 23px;
  line-height: 1.15;
  letter-spacing: -.02em;
}

.activity-dashboard__head p {
  margin-top: 5px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.activity-list {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-surface);
}

.activity-row {
  width: 100%;
  min-height: 92px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 14px;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.activity-row:last-child {
  border-bottom: 0;
}

.activity-row:active {
  background: var(--color-surface-secondary);
}

.activity-row__date {
  width: 58px;
  height: 64px;
  flex: 0 0 58px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: var(--color-accent-soft);
  color: var(--color-primary);
}

.activity-row__date--today {
  background: var(--color-secondary-soft);
  color: var(--color-secondary-hover);
}

.activity-row__date strong {
  font-size: 23px;
  line-height: 1;
}

.activity-row__date small {
  margin-top: 4px;
  font-size: 10px;
  font-weight: 900;
}

.activity-row__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-row__countdown {
  color: var(--color-accent);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .03em;
  text-transform: uppercase;
}

.activity-row__body strong {
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-row__body small {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.activity-row__arrow {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 24px;
}

.activity-empty {
  min-height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-surface);
  text-align: center;
}

.activity-empty__icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin-bottom: 15px;
  border-radius: 16px;
  background: var(--color-secondary-soft);
  color: var(--color-secondary);
}

.activity-empty__icon svg {
  width: 27px;
  height: 27px;
}

.activity-empty strong {
  color: var(--color-text-primary);
  font-size: 16px;
}

.activity-empty p {
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

@media (max-width: 350px) {
  .activity-dashboard__head h2 { font-size: 20px; }
  .activity-row { gap: 11px; padding-inline: 11px; }
}
</style>
