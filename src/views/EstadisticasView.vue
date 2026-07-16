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

    <section v-if="records" class="progress-card">
      <div class="progress-card__head">
        <div><span>Récords</span><h3>Tus mejores marcas</h3></div>
      </div>
      <div class="stat-powers stat-powers--records">
        <article><span class="stat-powers__icon">🎯</span><strong>{{ records.bestBpm || '—' }}</strong><small>mejor BPM (calidad ≥4)</small></article>
        <article><span class="stat-powers__icon">⏳</span><strong>{{ formatMinutes(records.longestSession) }}</strong><small>sesión más larga</small></article>
        <article><span class="stat-powers__icon">🔥</span><strong>{{ records.bestStreak }}</strong><small>racha récord</small></article>
      </div>
    </section>

    <section v-if="sessions.length" class="progress-card">
      <div class="progress-card__head">
        <div><span>Constancia</span><h3>Últimas 12 semanas</h3></div>
        <strong>{{ formatMinutes(quarterSeconds) }}</strong>
      </div>
      <div class="heatmap" role="img" aria-label="Minutos practicados por día en las últimas 12 semanas">
        <i v-for="day in heatmapDays" :key="day.key" :class="`heatmap--l${day.level}`" :title="day.title"></i>
      </div>
      <div class="heatmap-legend">
        <small>menos</small>
        <i v-for="level in [0, 1, 2, 3, 4]" :key="level" :class="`heatmap--l${level}`"></i>
        <small>más</small>
      </div>
    </section>

    <section class="progress-card">
      <div class="progress-card__head">
        <div><span>Distribución</span><h3>En qué has trabajado</h3></div>
        <strong>{{ formatMinutes(totalSeconds) }}</strong>
      </div>
      <div v-if="topSkillStats.length" class="practice-ranking">
        <RouterLink v-for="item in topSkillStats" :key="item.skill.id" :to="`/skill/${item.skill.id}`">
          <span class="practice-ranking__body">
            <strong>{{ item.skill.name }}</strong>
            <small>{{ [item.skill.song?.author, item.skill.song?.key && `tono ${item.skill.song.key}`, lastPracticedLabel(item.last)].filter(Boolean).join(' · ') }}</small>
          </span>
          <span class="practice-ranking__tempo">
            <b>{{ formatMinutes(item.seconds) }}</b>
            <small v-if="item.latestBpm">{{ item.latestBpm }} bpm <i v-if="item.bpmDelta" :class="{ down: item.bpmDelta < 0 }">{{ item.bpmDelta > 0 ? '+' : '' }}{{ item.bpmDelta }}</i></small>
          </span>
        </RouterLink>
      </div>
      <p v-else class="progress-empty">Guarda sesiones para ver el tiempo y la evolución por canción.</p>
    </section>

    <section class="progress-card">
      <div class="progress-card__head">
        <div><span>Recomendación</span><h3>Secciones que necesitan atención</h3></div>
      </div>
      <div v-if="attentionParts.length || reviewSkills.length" class="attention-list">
        <RouterLink v-for="item in attentionParts" :key="item.part.id" :to="`/skill/${item.skill.id}`">
          <span><strong>{{ item.part.name }}</strong><small>{{ item.skill.name }} · {{ lastPracticedLabel(item.last) }}</small></span>
          <b>{{ item.part.progress }}%</b>
        </RouterLink>
        <RouterLink v-for="item in reviewSkills" :key="item.skill.id" :to="`/skill/${item.skill.id}`">
          <span><strong>{{ item.skill.name }}</strong><small>dominada · {{ lastPracticedLabel(item.last) }}</small></span>
          <b class="attention-review">repaso</b>
        </RouterLink>
      </div>
      <p v-else class="progress-empty">Agrega partes a tus canciones o solos para recibir recomendaciones específicas.</p>
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
import { ref, computed, onMounted, watch } from 'vue'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { ACTIVE_DAY_SECONDS, dailySecondsMap, dateKey, lastSevenDays, levelFromXp, maxStreak, practiceStreak, xpForProgress } from '../utils/gamification'
import { skillProgress } from '../utils/skills'

const store = usePracticeStore()
const { showToast } = useToast()
const sessions = ref([])
const runs = ref([])
const xpEvents = ref(null)

const totalSeconds = computed(() => sessions.value.reduce((a, s) => a + (Number(s.duration_seconds) || 0), 0))
const weekDays = computed(() => lastSevenDays(sessions.value))
const weekSeconds = computed(() => weekDays.value.reduce((total, day) => total + day.seconds, 0))
const activeDays = computed(() => weekDays.value.filter(day => day.seconds >= ACTIVE_DAY_SECONDS).length)
const mastered = computed(() => store.skills.filter(s => s.status === 'mastered').length)
const practicing = computed(() => store.skills.filter(s => s.status === 'practicing').length)
const learning = computed(() => store.skills.filter(s => s.status === 'learning').length)
const totalXp = computed(() => xpForProgress(sessions.value, mastered.value, runs.value, xpEvents.value))
const playerLevel = computed(() => levelFromXp(totalXp.value))
const streak = computed(() => practiceStreak(sessions.value))
const skillCompletion = computed(() => store.skills.length
  ? Math.round(store.skills.reduce((total, skill) => total + skillProgress(skill), 0) / store.skills.length)
  : 0)
const topSkillStats = computed(() => store.skills.map(skill => {
  const own = sessions.value.filter(session => session.skill_id === skill.id)
  const tempos = own.map(session => Number(session.bpm)).filter(Boolean)
  return {
    skill,
    seconds: own.reduce((total, session) => total + Number(session.duration_seconds || 0), 0),
    last: own[0]?.practiced_at || null,
    latestBpm: tempos[0] || null,
    bpmDelta: tempos.length > 1 ? tempos[0] - tempos[tempos.length - 1] : 0,
  }
}).filter(item => item.seconds).sort((a, b) => b.seconds - a.seconds).slice(0, 5))
const attentionParts = computed(() => store.skills.flatMap(skill => skill.parts
  .filter(part => Number(part.progress) < 100)
  .map(part => {
    const own = sessions.value.filter(session => session.part_id === part.id)
    return { skill, part, last: own[0]?.practiced_at || null, sessions: own.length }
  }))
  .sort((a, b) => a.sessions - b.sessions || Number(a.part.progress) - Number(b.part.progress))
  .slice(0, 5))
const records = computed(() => {
  if (!sessions.value.length) return null
  const solid = sessions.value.filter(s => Number(s.bpm) && (s.quality || 3) >= 4)
  return {
    bestBpm: solid.length ? Math.max(...solid.map(s => Number(s.bpm))) : null,
    longestSession: Math.max(...sessions.value.map(s => Number(s.duration_seconds) || 0)),
    bestStreak: maxStreak(sessions.value),
  }
})

// Heatmap tipo calendario: 12 semanas alineadas a domingo, terminando hoy.
const heatmapDays = computed(() => {
  const byDay = dailySecondsMap(sessions.value)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const cursor = new Date(today)
  cursor.setDate(cursor.getDate() - cursor.getDay() - 7 * 11)
  const days = []
  while (cursor <= today) {
    const seconds = byDay[dateKey(cursor)] || 0
    const minutes = Math.round(seconds / 60)
    days.push({
      key: dateKey(cursor),
      seconds,
      level: !seconds ? 0 : minutes >= 40 ? 4 : minutes >= 20 ? 3 : minutes >= 10 ? 2 : 1,
      title: `${cursor.toLocaleDateString('es', { day: 'numeric', month: 'short' })} · ${minutes} min`,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})
const quarterSeconds = computed(() => heatmapDays.value.reduce((total, day) => total + day.seconds, 0))

// Skills dominadas que llevan demasiado sin tocarse: repaso espaciado mínimo.
const REVIEW_AFTER_DAYS = 14
const reviewSkills = computed(() => store.skills
  .filter(skill => skill.status === 'mastered')
  .map(skill => ({ skill, last: sessions.value.find(session => session.skill_id === skill.id)?.practiced_at || null }))
  .filter(item => !item.last || (Date.now() - new Date(item.last).getTime()) / 86400000 > REVIEW_AFTER_DAYS)
  .slice(0, 3))

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

// Aviso de logros nuevos: compara contra lo ya visto en este dispositivo.
// La primera visita solo registra (no spamea los logros históricos).
watch(achievements, list => {
  const stored = localStorage.getItem('jubal:achievements')
  const seen = new Set(JSON.parse(stored || '[]'))
  const fresh = list.filter(item => item.unlocked && !seen.has(item.name)).map(item => item.name)
  if (!fresh.length) return
  if (stored !== null) showToast(`🏆 Logro desbloqueado: ${fresh[0]}`)
  localStorage.setItem('jubal:achievements', JSON.stringify([...seen, ...fresh]))
})

function formatMinutes(secs) {
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60)
  return h ? `${h} h ${m} min` : `${m} min`
}
function barHeight(seconds) {
  const max = Math.max(...weekDays.value.map(day => day.seconds), 1)
  return seconds ? Math.max(12, Math.round((seconds / max) * 100)) : 3
}
function lastPracticedLabel(value) {
  if (!value) return 'sin practicar'
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  ;[sessions.value, runs.value, xpEvents.value] = await Promise.all([
    store.loadAllSessions(), store.loadRoutineRuns(), store.loadXpEvents(),
  ])
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
.stat-powers--records article { box-shadow: none; background: var(--surface2); border: 0; }
.heatmap { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1fr); gap: 3px; }
.heatmap i, .heatmap-legend i { display: block; aspect-ratio: 1; border-radius: 3px; background: var(--surface2); }
.heatmap--l1 { background: color-mix(in srgb, var(--accent) 30%, var(--surface2)) !important; }
.heatmap--l2 { background: color-mix(in srgb, var(--accent) 55%, var(--surface2)) !important; }
.heatmap--l3 { background: color-mix(in srgb, var(--accent) 78%, var(--surface2)) !important; }
.heatmap--l4 { background: var(--accent) !important; }
.heatmap-legend { display: flex; align-items: center; justify-content: flex-end; gap: 3px; margin-top: 8px; }
.heatmap-legend i { width: 10px; }
.heatmap-legend small { color: var(--text-muted); font-size: 8px; margin: 0 3px; }
.attention-review { color: var(--accent2) !important; font-size: 9px !important; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.progress-empty,.progress-hint { color: var(--text-muted); font-size: 11px; line-height: 1.5; }.progress-hint { padding: 4px 8px; text-align: center; }
.practice-ranking,.attention-list { display: flex; flex-direction: column; gap: 7px; }.practice-ranking a,.attention-list a { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 13px; background: var(--surface2); color: var(--text); text-decoration: none; }.practice-ranking__body,.attention-list a > span { min-width: 0; flex: 1; display: flex; flex-direction: column; }.practice-ranking strong,.attention-list strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.practice-ranking small,.attention-list small { margin-top: 2px; color: var(--text-muted); font-size: 8px; }.practice-ranking__tempo { display: flex; flex-direction: column; align-items: flex-end; color: var(--accent2); }.practice-ranking__tempo b { font-size: 10px; }.practice-ranking__tempo i { color: var(--green); font-style: normal; font-weight: 800; }.practice-ranking__tempo i.down { color: var(--red); }.attention-list a > b { min-width: 42px; color: var(--action2); font-size: 13px; text-align: right; }
@media (max-width:350px) { .progress-page { padding-inline: 12px; }.progress-card { padding: 14px; }.week-chart { gap: 3px; }.weekly-goal { grid-template-columns: 1fr auto; }.weekly-goal > div { display:none; }.skills-summary { gap: 14px; } }
@media (prefers-reduced-motion: reduce) { .progress-hero__track span,.week-chart__column > span { transition: none; } }
</style>
