<template>
  <div class="progress-page">
    <header class="progress-hero">
      <span class="progress-hero__eyebrow">Perfil de jugador</span>
      <div class="progress-hero__main">
        <div class="progress-hero__level"><small>NIVEL</small>{{ playerLevel.level }}</div>
        <div>
          <h2>{{ rankTitle }}</h2>
          <p>{{ playerLevel.remaining }} XP para el siguiente nivel</p>
        </div>
      </div>
      <div class="progress-hero__track" role="progressbar" :aria-valuenow="playerLevel.percent" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: `${playerLevel.percent}%` }"></span>
      </div>
      <div class="progress-hero__xp"><span>{{ playerLevel.earned }} XP</span><span>{{ playerLevel.needed }} XP</span></div>
    </header>

    <section class="stat-powers" aria-label="Resumen de progreso">
      <article><span class="stat-powers__icon">🔥</span><strong>{{ streak }}</strong><small>racha actual</small></article>
      <article><span class="stat-powers__icon">⚡</span><strong>{{ totalXp }}</strong><small>XP total</small></article>
      <article><span class="stat-powers__icon">🏆</span><strong>{{ mastered }}</strong><small>dominadas</small></article>
    </section>

    <section class="progress-card weekly-card">
      <div class="progress-card__head">
        <div><span>Actividad</span><h3>Tu semana de práctica</h3></div>
        <strong>{{ formatMinutes(weekSeconds) }}</strong>
      </div>
      <div class="week-chart" :class="{ 'week-chart--empty': !weekSeconds }">
        <div v-for="day in weekDays" :key="day.key" class="week-chart__day" :class="{ today: day.isToday }">
          <div class="week-chart__column"><span :style="{ height: `${barHeight(day.seconds)}%` }"><i v-if="day.seconds">{{ Math.round(day.seconds / 60) }}</i></span></div>
          <small>{{ day.label }}</small>
        </div>
      </div>
      <div class="weekly-goal">
        <span><b>{{ activeDays }}/5</b> días activos</span>
        <div><i v-for="index in 5" :key="index" :class="{ filled: index <= activeDays }"></i></div>
        <strong>{{ activeDays >= 5 ? '¡Meta lograda!' : `${5 - activeDays} para la meta` }}</strong>
      </div>
    </section>

    <section class="progress-card">
      <div class="progress-card__head">
        <div><span>Colección</span><h3>Logros</h3></div>
        <strong>{{ unlockedAchievements }}/{{ achievements.length }}</strong>
      </div>
      <div class="achievement-list">
        <article v-for="achievement in achievements" :key="achievement.name" :class="{ unlocked: achievement.unlocked }">
          <span>{{ achievement.icon }}</span>
          <div><strong>{{ achievement.name }}</strong><small>{{ achievement.description }}</small></div>
          <b>{{ achievement.unlocked ? '✓' : '🔒' }}</b>
        </article>
      </div>
    </section>

    <section class="progress-card">
      <div class="progress-card__head">
        <div><span>Arsenal musical</span><h3>Progreso de skills</h3></div>
        <RouterLink to="/entrenar">Ver todas</RouterLink>
      </div>
      <div v-if="store.skills.length" class="skills-summary">
        <div class="skills-ring" :style="{ '--skill-progress': skillCompletion }"><strong>{{ skillCompletion }}%</strong><small>dominio</small></div>
        <div class="skills-summary__legend">
          <span><i class="mastered"></i>Dominadas <b>{{ mastered }}</b></span>
          <span><i class="practicing"></i>Practicando <b>{{ practicing }}</b></span>
          <span><i></i>Por aprender <b>{{ learning }}</b></span>
        </div>
      </div>
      <p v-else class="progress-empty">Crea tu primera skill para comenzar la aventura.</p>
    </section>

    <p v-if="!sessions.length" class="progress-hint">Tu primera sesión con el metrónomo desbloqueará XP, rachas y estadísticas semanales.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePracticeStore } from '../stores/practice'
import { lastSevenDays, levelFromXp, practiceStreak, xpForProgress } from '../utils/gamification'
import { skillProgress } from '../utils/skills'

const store = usePracticeStore()
const sessions = ref([])
const runs = ref([])

const totalSeconds = computed(() => sessions.value.reduce((a, s) => a + (Number(s.duration_seconds) || 0), 0))
const weekDays = computed(() => lastSevenDays(sessions.value))
const weekSeconds = computed(() => weekDays.value.reduce((total, day) => total + day.seconds, 0))
const activeDays = computed(() => weekDays.value.filter(day => day.seconds > 0).length)
const mastered = computed(() => store.skills.filter(s => s.status === 'mastered').length)
const practicing = computed(() => store.skills.filter(s => s.status === 'practicing').length)
const learning = computed(() => store.skills.filter(s => s.status === 'learning').length)
const totalXp = computed(() => xpForProgress(sessions.value, mastered.value, runs.value))
const playerLevel = computed(() => levelFromXp(totalXp.value))
const streak = computed(() => practiceStreak(sessions.value))
const skillCompletion = computed(() => store.skills.length
  ? Math.round(store.skills.reduce((total, skill) => total + skillProgress(skill), 0) / store.skills.length)
  : 0)
const rankTitle = computed(() => {
  const ranks = ['Explorador de acordes', 'Riff aprendiz', 'Cazador de ritmo', 'Héroe del groove', 'Virtuoso del escenario']
  return ranks[Math.min(ranks.length - 1, Math.floor((playerLevel.value.level - 1) / 2))]
})
const achievements = computed(() => [
  { icon: '🎸', name: 'Primer riff', description: 'Completa tu primera sesión', unlocked: sessions.value.length >= 1 },
  { icon: '🔥', name: 'En llamas', description: 'Alcanza una racha de 3 días', unlocked: streak.value >= 3 },
  { icon: '⏱', name: 'Hora de poder', description: 'Acumula 60 minutos', unlocked: totalSeconds.value >= 3600 },
  { icon: '⭐', name: 'Skill dominada', description: 'Completa una meta musical', unlocked: mastered.value >= 1 },
])
const unlockedAchievements = computed(() => achievements.value.filter(item => item.unlocked).length)

function formatMinutes(secs) {
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
function barHeight(seconds) {
  const max = Math.max(...weekDays.value.map(day => day.seconds), 1)
  return seconds ? Math.max(12, Math.round((seconds / max) * 100)) : 3
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  ;[sessions.value, runs.value] = await Promise.all([store.loadAllSessions(), store.loadRoutineRuns()])
})
</script>

<style scoped>
.progress-page { max-width: 560px; margin: 0 auto; padding: 10px 0 96px; display: flex; flex-direction: column; gap: 12px; }
.progress-hero { position: relative; overflow: hidden; padding: 21px 19px 18px; border-radius: 24px; color: #fff; background: radial-gradient(circle at 90% 0, rgba(255,191,77,.28), transparent 35%), linear-gradient(145deg, #102936, #12657b); box-shadow: 0 14px 30px rgba(17,67,82,.2); }
.progress-hero::after { content: '♫'; position: absolute; right: 19px; top: 10px; color: rgba(255,255,255,.07); font-size: 88px; transform: rotate(10deg); }
.progress-hero__eyebrow, .progress-card__head span { font-size: 9px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; color: #ffc163; }
.progress-hero__main { position: relative; z-index: 1; display: flex; align-items: center; gap: 13px; margin-top: 10px; }.progress-hero__level { width: 58px; height: 58px; flex: 0 0 58px; border: 2px solid #ffb33f; border-radius: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-size: 25px; font-weight: 900; box-shadow: inset 0 0 18px rgba(255,179,63,.12), 0 0 15px rgba(255,179,63,.12); }.progress-hero__level small { font-size: 7px; letter-spacing: .08em; color: #ffc163; }.progress-hero h2 { font-size: 18px; }.progress-hero p { margin-top: 3px; color: rgba(255,255,255,.64); font-size: 10px; }
.progress-hero__track { position: relative; z-index: 1; height: 8px; margin-top: 17px; border-radius: 99px; background: rgba(0,0,0,.3); overflow: hidden; }.progress-hero__track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#fb8500,#ffd166); box-shadow: 0 0 8px rgba(255,190,70,.5); transition: width .8s ease; }.progress-hero__xp { position: relative; z-index: 1; display: flex; justify-content: space-between; margin-top: 6px; color: rgba(255,255,255,.55); font-size: 8px; font-weight: 700; }
.stat-powers { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }.stat-powers article { min-width: 0; padding: 13px 6px; border: 1px solid var(--border); border-radius: 17px; background: var(--surface); text-align: center; box-shadow: var(--shadow); }.stat-powers__icon { display: block; font-size: 17px; }.stat-powers strong { display: block; margin-top: 3px; font-size: 17px; font-variant-numeric: tabular-nums; }.stat-powers small { display: block; margin-top: 1px; color: var(--text-muted); font-size: 8px; }
.progress-card { padding: 16px; border: 1px solid var(--border); border-radius: 20px; background: var(--surface); box-shadow: var(--shadow); }.progress-card__head { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 15px; }.progress-card__head span { color: var(--accent); }.progress-card__head h3 { margin-top: 3px; font-size: 14px; }.progress-card__head > strong { color: var(--accent2); font-size: 13px; }.progress-card__head a { color: var(--accent); font-size: 10px; font-weight: 800; text-decoration: none; }
.week-chart { height: 126px; display: grid; grid-template-columns: repeat(7,1fr); gap: 7px; padding-top: 8px; border-bottom: 1px solid var(--border); }.week-chart__day { min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }.week-chart__column { width: 100%; height: 91px; display: flex; align-items: flex-end; justify-content: center; }.week-chart__column > span { position: relative; display: block; width: min(22px, 72%); min-height: 3px; border-radius: 7px 7px 2px 2px; background: linear-gradient(180deg, #48bfd4, var(--accent)); transition: height .65s cubic-bezier(.2,.8,.2,1); }.week-chart__column i { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); color: var(--text-muted); font-size: 7px; font-style: normal; }.week-chart__day small { padding-bottom: 5px; color: var(--text-muted); font-size: 8px; font-weight: 700; text-transform: uppercase; }.week-chart__day.today small { color: var(--accent); }.week-chart__day.today .week-chart__column > span { background: linear-gradient(180deg,#ffc15e,var(--action)); }
.weekly-goal { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; margin-top: 12px; font-size: 9px; color: var(--text-mid); }.weekly-goal b { color: var(--text); }.weekly-goal > div { display: flex; gap: 3px; }.weekly-goal i { height: 5px; flex: 1; border-radius: 99px; background: var(--surface2); }.weekly-goal i.filled { background: var(--accent); }.weekly-goal strong { color: var(--accent2); font-size: 8px; }
.achievement-list { display: flex; flex-direction: column; gap: 8px; }.achievement-list article { display: flex; align-items: center; gap: 11px; padding: 10px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface2); opacity: .55; }.achievement-list article.unlocked { border-color: rgba(var(--amber-rgb),.24); background: var(--action-soft); opacity: 1; }.achievement-list article > span { width: 35px; height: 35px; flex: 0 0 35px; display: grid; place-items: center; border-radius: 11px; background: var(--surface); font-size: 17px; filter: grayscale(1); }.achievement-list article.unlocked > span { filter: none; box-shadow: 0 3px 9px rgba(var(--amber-rgb),.12); }.achievement-list article div { min-width: 0; flex: 1; display: flex; flex-direction: column; }.achievement-list article strong { font-size: 11px; }.achievement-list article small { margin-top: 2px; color: var(--text-muted); font-size: 8px; }.achievement-list article > b { color: var(--green); font-size: 11px; }
.skills-summary { display: flex; align-items: center; gap: 22px; padding: 3px 3px 5px; }.skills-ring { --degree: calc(var(--skill-progress) * 3.6deg); width: 90px; height: 90px; flex: 0 0 90px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; background: conic-gradient(var(--accent) var(--degree), var(--surface2) 0); }.skills-ring::after { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: var(--surface); }.skills-ring strong,.skills-ring small { position: relative; z-index: 1; }.skills-ring strong { font-size: 18px; }.skills-ring small { color: var(--text-muted); font-size: 8px; }.skills-summary__legend { flex: 1; display: flex; flex-direction: column; gap: 10px; }.skills-summary__legend span { display: flex; align-items: center; gap: 7px; color: var(--text-mid); font-size: 9px; }.skills-summary__legend i { width: 8px; height: 8px; border-radius: 3px; background: var(--border); }.skills-summary__legend i.mastered { background: var(--accent); }.skills-summary__legend i.practicing { background: var(--action); }.skills-summary__legend b { margin-left: auto; color: var(--text); }
.progress-empty,.progress-hint { color: var(--text-muted); font-size: 11px; line-height: 1.5; }.progress-hint { padding: 4px 8px; text-align: center; }
@media (max-width:350px) { .progress-page { padding-inline: 12px; }.progress-card { padding: 14px; }.week-chart { gap: 3px; }.weekly-goal { grid-template-columns: 1fr auto; }.weekly-goal > div { display:none; }.skills-summary { gap: 14px; } }
@media (prefers-reduced-motion: reduce) { .progress-hero__track span,.week-chart__column > span { transition: none; } }
</style>
