<template>
  <div class="band-dashboard">
    <section class="band-hero">
      <div>
        <span class="band-hero__eyebrow">Tu banda</span>
        <h2>{{ band.currentBand?.name }}</h2>
      </div>
      <span class="band-hero__role">{{ roleLabel }}</span>
    </section>

    <section class="band-stats" aria-label="Resumen de la banda">
      <button @click="router.push('/actividades')">
        <strong>{{ upcomingActivities.length }}</strong>
        <span>Próximas</span>
      </button>
      <button @click="router.push('/repertorio')">
        <strong>{{ app.repertoires.length }}</strong>
        <span>Repertorios</span>
      </button>
      <button @click="router.push('/canciones')">
        <strong>{{ app.songs.length }}</strong>
        <span>Canciones</span>
      </button>
    </section>

    <section class="band-section">
      <div class="band-section__head">
        <div>
          <span>Agenda</span>
          <h3>Próxima actividad</h3>
        </div>
        <RouterLink to="/actividades">Ver todas</RouterLink>
      </div>

      <button v-if="nextActivity" class="band-event" @click="router.push(`/actividad/${nextActivity.id}`)">
        <span class="band-event__date">
          <strong>{{ dateDay(nextActivity.date) }}</strong>
          <small>{{ dateMonth(nextActivity.date) }}</small>
        </span>
        <span class="band-event__body">
          <span>{{ countdown(nextActivity.date) }}</span>
          <strong>{{ nextActivity.title }}</strong>
          <small>{{ eventMeta(nextActivity) }}</small>
        </span>
        <span class="band-event__arrow">›</span>
      </button>

      <div v-else class="band-empty">
        <span>No hay actividades próximas.</span>
        <RouterLink v-if="roleStore.isLeader" to="/actividades?nueva=1">Crear actividad</RouterLink>
      </div>
    </section>

    <section v-if="upcomingActivities.length > 1" class="band-section band-section--compact">
      <div class="band-section__head">
        <div>
          <span>Después</span>
          <h3>Más actividades</h3>
        </div>
      </div>
      <button
        v-for="activity in upcomingActivities.slice(1, 4)"
        :key="activity.id"
        class="band-upcoming"
        @click="router.push(`/actividad/${activity.id}`)"
      >
        <span>{{ shortDate(activity.date) }}</span>
        <strong>{{ activity.title }}</strong>
        <small>{{ activity.time || 'Sin hora' }}</small>
      </button>
    </section>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBandStore } from '../stores/band'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'

const router = useRouter()
const band = useBandStore()
const app = useAppStore()
const roleStore = useRoleStore()

const roleLabel = computed(() => ({ leader: 'Líder', musician: 'Músico', singer: 'Corista' }[band.myRole] || 'Miembro'))

function localDateKey(date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const today = localDateKey()
const upcomingActivities = computed(() => app.activities
  .filter(activity => activity.date && activity.date >= today)
  .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')))
const nextActivity = computed(() => upcomingActivities.value[0])

const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
function dateParts(value) { const [, month, day] = value.split('-').map(Number); return { month, day } }
function dateDay(value) { return dateParts(value).day }
function dateMonth(value) { return months[dateParts(value).month - 1] }
function shortDate(value) { const date = dateParts(value); return `${date.day} ${months[date.month - 1]}` }
function countdown(value) {
  const [year, month, day] = value.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const base = new Date(); base.setHours(0, 0, 0, 0)
  const days = Math.round((target - base) / 86400000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  return `En ${days} días`
}
function eventMeta(activity) {
  const songs = (activity.tiempos || []).reduce((sum, time) => sum + (time.songs?.length || 0), 0)
  return [activity.time, songs && `${songs} canción${songs === 1 ? '' : 'es'}`].filter(Boolean).join(' · ') || 'Sin hora definida'
}
</script>

<style scoped>
.band-dashboard { max-width: 620px; margin: 0 auto; padding: 10px 0 96px; display: flex; flex-direction: column; gap: 12px; }
.band-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 18px; border-radius: 21px; color: #fff; background: linear-gradient(135deg, #0e2936, #11566c 58%, #087b8c); box-shadow: 0 11px 25px rgba(17,59,73,.24); }
.band-hero__eyebrow { color: #ffc66d; font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }.band-hero h2 { margin-top: 5px; font-size: 20px; }.band-hero p { max-width: 340px; margin-top: 4px; color: rgba(255,255,255,.72); font-size: 9px; line-height: 1.45; }.band-hero__role { flex: 0 0 auto; padding: 6px 9px; border-radius: 99px; background: rgba(255,255,255,.12); font-size: 8px; font-weight: 800; }
.band-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; }.band-stats button { padding: 12px 5px; border: 1px solid var(--border); border-radius: 15px; background: var(--surface); color: var(--text); box-shadow: var(--shadow); font: inherit; cursor: pointer; }.band-stats strong,.band-stats span { display: block; }.band-stats strong { color: var(--accent2); font-size: 18px; }.band-stats span { margin-top: 2px; color: var(--text-muted); font-size: 8px; font-weight: 700; }
.band-section { position: relative; overflow: hidden; padding: 14px; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); box-shadow: var(--shadow); }.band-section::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: linear-gradient(var(--accent),rgba(var(--brand-rgb),.15)); }.band-section__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 11px; }.band-section__head span { color: var(--accent2); font-size: 8px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }.band-section__head h3 { margin-top: 2px; font-size: 14px; }.band-section__head a,.band-empty a { color: var(--accent2); font-size: 10px; font-weight: 800; text-decoration: none; }
.band-event { width: 100%; display: flex; align-items: center; gap: 13px; padding: 0; border: 0; background: transparent; color: var(--text); text-align: left; cursor: pointer; }.band-event__date { width: 58px; height: 66px; flex: 0 0 58px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 15px; background: var(--action-soft); color: var(--action2); }.band-event__date strong { font-size: 24px; line-height: 1; }.band-event__date small { margin-top: 4px; font-size: 10px; font-weight: 800; }.band-event__body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }.band-event__body > span { color: var(--action2); font-size: 10px; font-weight: 800; text-transform: uppercase; }.band-event__body strong,.band-upcoming strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.band-event__body small { color: var(--text-muted); font-size: 11px; }.band-event__arrow { color: var(--text-muted); font-size: 25px; }
.band-empty { min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface2); color: var(--text-mid); font-size: 11px; }.band-section--compact { padding-bottom: 8px; }.band-upcoming { width: 100%; display: grid; grid-template-columns: 58px 1fr auto; align-items: center; gap: 8px; padding: 10px 0; border: 0; border-top: 1px solid var(--border); background: transparent; color: var(--text); text-align: left; cursor: pointer; }.band-upcoming span { color: var(--accent); font-size: 10px; font-weight: 800; }.band-upcoming strong { font-size: 12px; }.band-upcoming small { color: var(--text-muted); font-size: 10px; }
@media (max-width:350px) { .band-hero { padding: 15px; } }


.band-dashboard { padding: 0; gap: 18px; }
.band-hero { padding: 24px; border: 1px solid #355663; border-radius: 24px; background: linear-gradient(130deg,#193442,#245261); box-shadow: none; }
.band-hero > div { min-width: 0; }.band-hero h2 { font-size: 28px; line-height: 1.15; letter-spacing: -.03em; overflow-wrap: anywhere; }
.band-hero__eyebrow { color: var(--jubal-blue-light); font-size: 11px; }.band-hero__role { font-size: 11px; }
.band-stats { gap: 10px; }.band-stats button { min-height: 86px; border-radius: 16px; box-shadow: none; }.band-stats strong { color: var(--jubal-blue-light); font-size: 25px; }.band-stats span { font-size: 12px; }
.band-section { padding: 18px; border-radius: 20px; box-shadow: none; }.band-section::before { display: none; }
.band-section__head { align-items: center; }.band-section__head span { color: var(--text-muted); font-size: 11px; }.band-section__head h3 { font-size: 18px; }.band-section__head a, .band-empty a { display: inline-flex; align-items: center; min-height: 44px; color: var(--jubal-blue-light); font-size: 12px; }
.band-event { min-height: 80px; }.band-event__date { color: var(--jubal-yellow); }.band-event__body > span { color: var(--jubal-yellow); font-size: 11px; }.band-event__body strong { font-size: 16px; }.band-event__body small { font-size: 13px; }.band-empty { flex-wrap: wrap; font-size: 14px; }
.band-upcoming { min-height: 60px; grid-template-columns: 55px minmax(0,1fr) auto; }.band-upcoming strong { font-size: 14px; }.band-upcoming span, .band-upcoming small { font-size: 11px; }
</style>
