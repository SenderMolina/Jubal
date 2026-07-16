<template>
  <div class="home">
    <section class="home-welcome">
      <p class="home-welcome__eyebrow">Dashboard de práctica</p>
      <p>Tu progreso, misión diaria y plan personal de entrenamiento.</p>
    </section>

    <section class="player-card" aria-label="Tu progreso como guitarrista">
      <div class="player-card__glow" aria-hidden="true"></div>
      <div class="player-card__top">
        <div class="level-orb">
          <svg viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="19" />
            <circle class="level-orb__progress" cx="22" cy="22" r="19" :style="{ '--level-progress': `${playerLevel.percent}` }" />
          </svg>
          <span><small>NIVEL</small><strong>{{ playerLevel.level }}</strong></span>
        </div>
        <div class="player-card__identity">
          <span class="player-card__rank">{{ rankTitle }}</span>
          <h3>Tu aventura musical</h3>
          <p>{{ playerLevel.remaining }} XP para subir de nivel</p>
        </div>
        <button class="player-card__stats" aria-label="Ver progreso completo" @click="router.push('/estadisticas')">›</button>
      </div>
      <div class="xp-track" role="progressbar" :aria-valuenow="playerLevel.percent" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: `${playerLevel.percent}%` }"></span>
      </div>
      <div class="player-card__footer">
        <span><b>⚡ {{ totalXp }}</b> XP total</span>
        <span><b>🔥 {{ streak }}</b> día{{ streak === 1 ? '' : 's' }} de racha</span>
      </div>
    </section>

    <section class="daily-quest" :class="{ 'daily-quest--done': dailyQuest.done }">
      <span class="daily-quest__icon" aria-hidden="true">{{ dailyQuest.done ? '✓' : '♬' }}</span>
      <div class="daily-quest__body">
        <span class="daily-quest__eyebrow">{{ dailyQuest.done ? 'Misión completada' : 'Misión diaria' }}</span>
        <strong>{{ dailyQuest.done ? '¡Gran trabajo por hoy!' : dailyQuest.title }}</strong>
        <div class="daily-quest__track"><span :style="{ width: `${dailyQuest.percent}%` }"></span></div>
        <small>{{ dailyQuest.detail }}</small>
      </div>
      <button v-if="!dailyQuest.done" @click="startDailyQuest">{{ dailyQuest.available ? 'Jugar' : 'Crear' }}</button>
    </section>

    <section class="home-section">
      <div class="home-section__head">
        <div>
          <span class="home-section__eyebrow">Práctica personal</span>
          <h3>Plan de hoy</h3>
        </div>
        <RouterLink to="/rutina">Editar</RouterLink>
      </div>

      <template v-if="todayItems.length">
        <div class="home-practice-summary">
          <span><strong>{{ todayItems.length }}</strong> ejercicio{{ todayItems.length === 1 ? '' : 's' }}</span>
          <span><strong>{{ plannedMinutes }}</strong> min planeados</span>
        </div>
        <button v-for="it in todayItems.slice(0, 3)" :key="it.id" class="home-practice" @click="startPractice(it)">
          <span class="home-practice__play">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </span>
          <span class="home-practice__body">
            <strong>{{ it.skill.name }}</strong>
            <small>{{ practiceMeta(it) }}</small>
          </span>
          <span class="home-practice__action">Practicar</span>
        </button>
      </template>

      <div v-else class="home-empty">
        <span>{{ routineEmptyMessage }}</span>
        <RouterLink to="/rutina">Configurar rutina</RouterLink>
      </div>
    </section>

    <section class="home-section home-tip">
      <span class="home-tip__icon">✦</span>
      <div>
        <span class="home-section__eyebrow">Recomendación</span>
        <h3>{{ recommendation.title }}</h3>
        <p>{{ recommendation.body }}</p>
        <button @click="recommendation.action()">{{ recommendation.label }}</button>
      </div>
    </section>

    <section class="home-section home-actions">
      <div class="home-section__head home-section__head--actions">
        <div>
          <span class="home-section__eyebrow">Atajos</span>
          <h3>Acciones rápidas</h3>
        </div>
      </div>
      <div class="home-actions__grid">
        <button @click="router.push('/metronomo')"><span>♩</span>Metrónomo</button>
        <button @click="router.push('/entrenar')"><span>◎</span>Entrenar</button>
        <button @click="router.push('/repertorio')"><span>♫</span>Repertorio</button>
        <button @click="router.push('/rutina')"><span>✓</span>Mi rutina</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useMetronome } from '../composables/useMetronome'
import { dateKey, levelFromXp, practiceStreak, xpForProgress } from '../utils/gamification'

const router = useRouter()
const practice = usePracticeStore()
const metronome = useMetronome()
const sessions = ref([])
const runs = ref([])
const xpEvents = ref(null)

const todayItems = computed(() => {
  const day = new Date().getDay()
  return (practice.routines || [])
    .filter(routine => routine.days?.includes(day))
    .flatMap(routine => routine.sections.flatMap(section => section.items.map(item => ({
      ...item,
      routineName: routine.name,
      sectionName: section.name,
      skill: practice.skills.find(skill => skill.id === item.skill_id),
    }))))
    .filter(item => item.skill)
})
const plannedMinutes = computed(() => todayItems.value.reduce((total, item) => total + (item.planned_minutes || 0) + (item.break_after_minutes || 0), 0))
const todayRoutine = computed(() => (practice.routines || []).find(item => item.days?.includes(new Date().getDay()) && item.items?.length))
const todayRoutineMinutes = computed(() => todayRoutine.value?.items.reduce((total, item) => total
  + (Number(item.planned_minutes) || 0) + (Number(item.break_after_minutes) || 0), 0) || 0)
const masteredSkills = computed(() => practice.skills.filter(skill => skill.status === 'mastered').length)
const totalXp = computed(() => xpForProgress(sessions.value, masteredSkills.value, runs.value, xpEvents.value))
const playerLevel = computed(() => levelFromXp(totalXp.value))
const streak = computed(() => practiceStreak(sessions.value))
const rankTitle = computed(() => {
  const ranks = ['Explorador de acordes', 'Riff aprendiz', 'Cazador de ritmo', 'Héroe del groove', 'Virtuoso del escenario']
  return ranks[Math.min(ranks.length - 1, Math.floor((playerLevel.value.level - 1) / 2))]
})
const dailyQuest = computed(() => {
  const target = todayRoutine.value
  if (!target) return {
    available: false, done: false, title: 'Crea una rutina para hoy',
    detail: 'Configura una misión y asígnala a este día.', reward: 0, percent: 0,
  }
  const completed = runs.value.find(run => run.routine_id === target.id
    && run.status === 'completed' && run.completion_percent === 100
    && dateKey(run.completed_at) === dateKey())
  const active = runs.value.find(run => run.routine_id === target.id && run.status === 'active')
  const percent = completed ? 100 : active
    ? Math.min(95, Math.round(((active.current_item_index || 0) / Math.max(1, target.items.length)) * 100))
    : 0
  const practiceMinutes = target.items.reduce((total, item) => total + (Number(item.planned_minutes) || 0), 0)
  const estimatedReward = practiceMinutes * 3 + target.items.length * 8 + 30
  return {
    available: true,
    done: Boolean(completed),
    title: `Completa “${target.name}”`,
    detail: completed
      ? `${Math.round((completed.actual_seconds || 0) / 60)} min completados · +${completed.xp_earned || 0} XP`
      : `${target.items.length} habilidades · ${todayRoutineMinutes.value} min · hasta +${estimatedReward} XP`,
    reward: completed?.xp_earned || estimatedReward,
    percent,
  }
})
const routineEmptyMessage = computed(() => {
  if (!(practice.routines || []).some(item => item.items.length)) return 'Todavía no tienes una rutina planeada.'
  return 'No tienes una rutina asignada para hoy.'
})

const recommendation = computed(() => {
  if (todayItems.value.length) {
    const item = [...todayItems.value].sort((a, b) => {
      const gapA = Math.max(0, (a.target_bpm || a.skill.target_bpm || 0) - (a.skill.current_bpm || 0))
      const gapB = Math.max(0, (b.target_bpm || b.skill.target_bpm || 0) - (b.skill.current_bpm || 0))
      return gapB - gapA
    })[0]
    const target = item.target_bpm || item.skill.target_bpm
    const gap = target ? Math.max(0, target - (item.skill.current_bpm || 0)) : 0
    return {
      title: `Empieza por ${item.skill.name}`,
      body: gap
        ? `Es el mayor reto de tu plan de hoy: te faltan ${gap} BPM para la meta.`
        : 'Está en tu plan de hoy; una sesión corta ayuda a mantener la constancia.',
      label: 'Comenzar ahora',
      action: () => startPractice(item),
    }
  }
  if (!(practice.routines || []).some(item => item.items.length)) return {
    title: 'Convierte tus metas en un plan',
    body: 'Agrega skills y días de ensayo para recibir una recomendación concreta cada día.',
    label: 'Crear mi rutina', action: () => router.push('/rutina'),
  }
  return {
    title: 'Haz una práctica libre',
    body: 'Aunque hoy no esté en tu rutina, diez minutos con metrónomo mantienen el hábito.',
    label: 'Abrir metrónomo', action: () => router.push('/metronomo'),
  }
})

function practiceMeta(item) {
  return [item.sectionName, item.planned_minutes && `${item.planned_minutes} min`, (item.target_bpm || item.skill.target_bpm) && `${item.target_bpm || item.skill.target_bpm} BPM`].filter(Boolean).join(' · ') || 'Práctica libre'
}
function startPractice(item) {
  const part = item.skill.parts?.find(p => p.id === item.part_id) || null
  metronome.open(item.skill, item.target_bpm, part)
  router.push('/metronomo')
}
function startDailyQuest() {
  if (todayRoutine.value) return router.push(`/rutina/jugar/${todayRoutine.value.id}`)
  router.push('/rutina')
}

onMounted(async () => {
  if (!practice.ready) await practice.loadSkills()
  await practice.loadRoutine()
  ;[sessions.value, runs.value, xpEvents.value] = await Promise.all([
    practice.loadAllSessions(), practice.loadRoutineRuns(), practice.loadXpEvents(),
  ])
})
</script>

<style scoped>
.home { max-width: 620px; margin: 0 auto; padding: 10px 0 96px; display: flex; flex-direction: column; gap: 12px; }
.home-welcome { padding: 3px 2px 1px; }
.home-welcome__eyebrow, .home-section__eyebrow { display: block; color: var(--accent2); font-size: 9px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
.home-welcome p:last-child { max-width: 100%; margin-top: 3px; color: var(--text-mid); font-size: 11px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.player-card { position: relative; isolation: isolate; overflow: hidden; padding: 15px; border: 1px solid rgba(255,255,255,.08); border-radius: 20px; color: #fff; background: linear-gradient(135deg, #0e2936 0%, #11566c 55%, #087b8c 100%); box-shadow: 0 11px 25px rgba(17, 59, 73, .24); }
.player-card__glow { position: absolute; z-index: -1; width: 160px; height: 160px; right: -55px; top: -85px; border-radius: 50%; background: rgba(255, 190, 77, .24); filter: blur(2px); animation: hero-glow 4s ease-in-out infinite; }
.player-card__top { display: flex; align-items: center; gap: 13px; }
.level-orb { position: relative; width: 60px; height: 60px; flex: 0 0 60px; display: grid; place-items: center; }
.level-orb svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.level-orb circle { fill: rgba(255,255,255,.08); stroke: rgba(255,255,255,.17); stroke-width: 3; }
.level-orb .level-orb__progress { fill: transparent; stroke: #ffb84d; stroke-linecap: round; stroke-dasharray: 119.4; stroke-dashoffset: calc(119.4 - (119.4 * var(--level-progress)) / 100); transition: stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1); filter: drop-shadow(0 0 4px rgba(255,184,77,.5)); }
.level-orb span { display: flex; flex-direction: column; align-items: center; line-height: 1; }.level-orb small { font-size: 6px; letter-spacing: .1em; opacity: .7; }.level-orb strong { margin-top: 3px; font-size: 20px; }
.player-card__identity { min-width: 0; flex: 1; }.player-card__rank { display: block; color: #ffc66d; font-size: 8px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.player-card__identity h3 { margin-top: 3px; font-size: 13px; }.player-card__identity p { margin-top: 2px; font-size: 8px; color: rgba(255,255,255,.7); }
.player-card__stats { width: 30px; height: 38px; padding: 0; border: 0; border-radius: 10px; background: rgba(255,255,255,.1); color: #fff; font: inherit; font-size: 25px; cursor: pointer; }
.xp-track { height: 6px; margin-top: 12px; overflow: hidden; border-radius: 999px; background: rgba(0,0,0,.28); }.xp-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #fb8500, #ffd166); box-shadow: 0 0 8px rgba(255,190,70,.45); transition: width .8s cubic-bezier(.2,.8,.2,1); }
.player-card__footer { display: flex; justify-content: space-between; gap: 10px; margin-top: 9px; color: rgba(255,255,255,.68); font-size: 9px; }.player-card__footer b { color: #fff; }
.daily-quest { display: flex; align-items: center; gap: 10px; min-height: 78px; padding: 12px; border: 1px solid rgba(var(--amber-rgb),.48); border-radius: 17px; background: linear-gradient(120deg, var(--surface) 35%, var(--action-soft)); box-shadow: 0 5px 14px rgba(var(--amber-rgb),.1); }
.daily-quest--done { border-color: rgba(var(--success-rgb),.3); background: linear-gradient(120deg, var(--surface), var(--green-soft)); }
.daily-quest__icon { width: 38px; height: 38px; flex: 0 0 38px; display: grid; place-items: center; border-radius: 12px; background: var(--action); color: #fff; font-size: 17px; box-shadow: 0 5px 12px rgba(var(--amber-rgb),.25); animation: quest-bob 2.4s ease-in-out infinite; }.daily-quest--done .daily-quest__icon { background: var(--green); animation: none; }
.daily-quest__body { min-width: 0; flex: 1; display: flex; flex-direction: column; }.daily-quest__eyebrow { color: var(--action2); font-size: 8px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }.daily-quest--done .daily-quest__eyebrow { color: var(--green); }.daily-quest__body strong { margin-top: 2px; font-size: 12px; }.daily-quest__body small { margin-top: 3px; color: var(--text-muted); font-size: 8px; }
.daily-quest__track { height: 4px; margin-top: 7px; overflow: hidden; border-radius: 99px; background: rgba(var(--amber-rgb),.14); }.daily-quest__track span { display: block; height: 100%; border-radius: inherit; background: var(--action); transition: width .8s ease; }.daily-quest--done .daily-quest__track span { background: var(--green); }
.daily-quest > button { flex: 0 0 auto; border: 0; border-radius: 11px; padding: 9px 10px; background: var(--action); color: #fff; font: inherit; font-size: 10px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(var(--amber-rgb),.2); }
@keyframes hero-glow { 50% { transform: translate(-10px, 8px) scale(1.12); opacity: .75; } }
@keyframes quest-bob { 50% { transform: translateY(-3px) rotate(-3deg); } }
.home-section { position: relative; overflow: hidden; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 14px; box-shadow: 0 4px 12px rgba(var(--ink-rgb), .075); }
.home-section::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: linear-gradient(var(--accent), rgba(var(--brand-rgb),.15)); }
.home-section__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 11px; }
.home-section__head--actions { margin-bottom: 12px; }
.home-section__head h3, .home-tip h3, .home-actions h3 { font-size: 14px; margin-top: 2px; line-height: 1.2; }
.home-section__head a { color: var(--accent2); font-size: 10px; font-weight: 800; text-decoration: none; }
.home-empty { min-height: 52px; border: 1px solid var(--border); background: var(--surface2); padding: 10px 12px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--text-mid); font-size: 11px; line-height: 1.35; }
.home-empty a { color: var(--accent); text-decoration: none; font-weight: 700; flex-shrink: 0; }
.home-practice-summary { display: flex; gap: 18px; padding: 9px 12px; margin-bottom: 5px; background: var(--accent-soft); color: var(--text-mid); border-radius: 11px; font-size: 11px; }.home-practice-summary strong { color: var(--accent2); }
.home-practice { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 0; border: 0; border-bottom: 1px solid var(--border); background: transparent; color: var(--text); text-align: left; cursor: pointer; }.home-practice:last-child { border-bottom: 0; padding-bottom: 0; }
.home-practice__play { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: white; display: grid; place-items: center; flex-shrink: 0; }.home-practice__play svg { width: 16px; height: 16px; }
.home-practice__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }.home-practice__body strong { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.home-practice__body small { color: var(--text-muted); font-size: 11px; margin-top: 2px; }.home-practice__action { color: var(--accent); font-size: 11px; font-weight: 700; }
.home-tip { display: flex; align-items: flex-start; gap: 13px; background: var(--surface); }
.home-tip__icon { width: 35px; height: 35px; flex-shrink: 0; border-radius: 11px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: 16px; }.home-tip p { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--text-mid); font-size: 10px; line-height: 1.45; margin: 5px 0 8px; }.home-tip button { border: 0; background: transparent; color: var(--accent2); font: inherit; font-size: 10px; font-weight: 800; cursor: pointer; padding: 0; }
.home-actions { padding: 14px; }.home-actions h3 { margin: 2px 0 0; }.home-actions__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }.home-actions button { min-height: 58px; border: 1px solid var(--border); background: var(--surface2); color: var(--text-mid); border-radius: 12px; padding: 8px 5px; font: inherit; font-size: 9px; font-weight: 700; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; }.home-actions button span { color: var(--accent); font-size: 17px; line-height: 1; }

@media (max-width: 350px) {
  .player-card { padding: 15px; }.level-orb { width: 58px; height: 58px; flex-basis: 58px; }.player-card__identity h3 { font-size: 13px; }
  .daily-quest { gap: 9px; padding: 12px; }.daily-quest__icon { width: 36px; height: 36px; flex-basis: 36px; }.daily-quest > button { padding: 8px; }
  .home-actions__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .home-actions button { min-height: 60px; flex-direction: row; }
}
@media (prefers-reduced-motion: reduce) {
  .player-card__glow, .daily-quest__icon { animation: none; }
  .level-orb .level-orb__progress, .xp-track span, .daily-quest__track span { transition: none; }
}
</style>
