<template>
  <div class="home">
    <section class="home-welcome">
      <p class="home-welcome__eyebrow">Dashboard de práctica</p>
      <p>Tu plan personal y recomendaciones de entrenamiento.</p>
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

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useMetronome } from '../composables/useMetronome'

const router = useRouter()
const practice = usePracticeStore()
const metronome = useMetronome()

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
onMounted(async () => {
  if (!practice.ready) await practice.loadSkills()
  await practice.loadRoutine()
})
</script>

<style scoped>
.home { max-width: 620px; margin: 0 auto; padding: 10px 0 96px; display: flex; flex-direction: column; gap: 12px; }
.home-welcome { padding: 3px 2px 1px; }
.home-welcome__eyebrow, .home-section__eyebrow { display: block; color: var(--accent2); font-size: 9px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }
.home-welcome p:last-child { max-width: 100%; margin-top: 3px; color: var(--text-mid); font-size: 11px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.home-section { position: relative; overflow: hidden; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 14px; box-shadow: 0 4px 12px rgba(var(--ink-rgb), .075); }
.home-section::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: linear-gradient(var(--accent), rgba(var(--brand-rgb),.15)); }
.home-section__head { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; margin-bottom: 11px; }
.home-section__head h3, .home-tip h3 { font-size: 14px; margin-top: 2px; line-height: 1.2; }
.home-section__head a { color: var(--accent2); font-size: 10px; font-weight: 800; text-decoration: none; }
.home-empty { min-height: 52px; border: 1px solid var(--border); background: var(--surface2); padding: 10px 12px; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--text-mid); font-size: 11px; line-height: 1.35; }
.home-empty a { color: var(--accent); text-decoration: none; font-weight: 700; flex-shrink: 0; }
.home-practice-summary { display: flex; gap: 18px; padding: 9px 12px; margin-bottom: 5px; background: var(--accent-soft); color: var(--text-mid); border-radius: 11px; font-size: 11px; }.home-practice-summary strong { color: var(--accent2); }
.home-practice { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 0; border: 0; border-bottom: 1px solid var(--border); background: transparent; color: var(--text); text-align: left; cursor: pointer; }.home-practice:last-child { border-bottom: 0; padding-bottom: 0; }
.home-practice__play { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: white; display: grid; place-items: center; flex-shrink: 0; }.home-practice__play svg { width: 16px; height: 16px; }
.home-practice__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }.home-practice__body strong { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.home-practice__body small { color: var(--text-muted); font-size: 11px; margin-top: 2px; }.home-practice__action { color: var(--accent); font-size: 11px; font-weight: 700; }
.home-tip { display: flex; align-items: flex-start; gap: 13px; background: var(--surface); }
.home-tip__icon { width: 35px; height: 35px; flex-shrink: 0; border-radius: 11px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-size: 16px; }.home-tip p { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--text-mid); font-size: 10px; line-height: 1.45; margin: 5px 0 8px; }.home-tip button { border: 0; background: transparent; color: var(--accent2); font: inherit; font-size: 10px; font-weight: 800; cursor: pointer; padding: 0; }

/* Dashboard personal: jerarquía táctil y tipográfica del sistema Jubal */
.home-welcome__eyebrow,.home-section__eyebrow { color:var(--jubal-blue-light);font-size:12px; }.home-welcome p:last-child { margin-top:5px;font-size:14px;line-height:1.45;white-space:normal; }
.home-section { padding:18px;border-radius:24px;box-shadow:var(--shadow); }.home-section__head h3,.home-tip h3 { font-size:18px;line-height:1.25; }.home-section__head a { color:var(--jubal-blue-light);font-size:14px;font-weight:900; }
.home-empty { min-height:64px;padding:12px 14px;border-radius:16px;font-size:14px;line-height:1.4; }.home-practice-summary { padding:10px 12px;margin-bottom:7px;border-radius:14px;font-size:13px; }.home-practice-summary strong { color:var(--jubal-blue-light); }
.home-practice { min-height:64px;padding:11px 0; }.home-practice__play { width:44px;height:44px;box-shadow:0 4px 0 #126f85; }.home-practice__body strong { font-size:15px; }.home-practice__body small { font-size:13px; }.home-practice__action { color:var(--jubal-yellow);font-size:13px;font-weight:900; }
.home-tip__icon { width:44px;height:44px;border-radius:14px;background:linear-gradient(145deg,var(--jubal-yellow),var(--jubal-orange));color:var(--jubal-navy-dark);font-size:19px;box-shadow:0 4px 0 #a95600; }.home-tip p { display:block;color:var(--text-mid);font-size:14px;line-height:1.45; }.home-tip button { min-height:44px;color:var(--jubal-blue-light);font-size:14px;font-weight:900; }
</style>
