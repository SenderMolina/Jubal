<template>
  <div class="home">
    <section class="home-hero">
      <span class="home-hero__date">{{ todayLabel }}</span>
      <h2>Un buen día<br>para hacer música.</h2>
      <RouterLink class="home-hero__action" to="/entrenar"><span>Ir a mis objetivos</span><span aria-hidden="true">↗</span></RouterLink>
      <div class="home-hero__art" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    </section>

    <div class="home-tools">
      <RouterLink to="/metronomo"><JubalNavIcon name="metronome" /><span><strong>Metrónomo</strong><small>Practica a tu ritmo</small></span></RouterLink>
      <RouterLink to="/estadisticas"><JubalNavIcon name="stats" /><span><strong>Mi progreso</strong><small>Cada sesión cuenta</small></span></RouterLink>
    </div>
    <section class="home-section">
      <div class="home-section__head">
        <h2>Práctica de hoy</h2>
        <RouterLink to="/rutina">Ver rutina <span aria-hidden="true">→</span></RouterLink>
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

    <section v-if="todayItems.length || practice.routines.some(item => item.items.length)" class="home-section home-tip">
      <span class="home-tip__icon">✦</span>
      <div>
        <h3>{{ recommendation.title }}</h3>
        <button @click="recommendation.action()">{{ recommendation.label }}</button>
      </div>
    </section>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import JubalNavIcon from '../components/JubalNavIcon.vue'
import { usePracticeStore } from '../stores/practice'
import { useMetronome } from '../composables/useMetronome'

const todayLabel = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
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
  if (!(practice.routines || []).some(item => item.items.length)) return 'Sin rutinas configuradas'
  return 'Sin rutina para hoy'
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
      label: gap ? `Practicar · faltan ${gap} BPM` : 'Comenzar',
      action: () => startPractice(item),
    }
  }
  if (!(practice.routines || []).some(item => item.items.length)) return {
    title: 'Crea tu primera rutina',
    label: 'Configurar', action: () => router.push('/rutina'),
  }
  return {
    title: 'Práctica libre',
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
.home { max-width: 620px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.home-hero { position: relative; overflow: hidden; padding: 24px; border: 1px solid #355663; border-radius: 24px; background: radial-gradient(ellipse at 100% 100%, #285d68, transparent 65%), #193442; }
.home-hero__date { position: relative; z-index: 1; color: #add6e3; font-size: 12px; text-transform: capitalize; }
.home-hero h2 { position: relative; z-index: 1; margin-top: 14px; font-size: clamp(26px, 7vw, 34px); line-height: 1.15; letter-spacing: -.035em; font-weight: 800; }
.home-hero__action { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 46px; margin-top: 24px; padding: 10px 16px; border-radius: 12px; background: var(--jubal-yellow); color: var(--jubal-navy-dark); text-decoration: none; font-size: 14px; font-weight: 800; }
.home-hero__art { position: absolute; right: -8px; bottom: 24px; display: flex; align-items: center; gap: 7px; height: 135px; opacity: .18; transform: rotate(-16deg); }
.home-hero__art span { width: 13px; height: 50%; border-radius: 20px; background: #8ecae6; }.home-hero__art span:nth-child(2n) { height: 80%; }.home-hero__art span:nth-child(3n) { height: 100%; }.home-hero__art span:last-child { height: 35%; }
.home-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.home-tools a { display: flex; align-items: center; gap: 12px; min-height: 82px; padding: 14px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); color: var(--text); text-decoration: none; }
.home-tools svg { color: var(--jubal-blue-light); }.home-tools a > span { display: flex; flex-direction: column; gap: 4px; }.home-tools strong { font-size: 14px; }.home-tools small { color: var(--text-muted); font-size: 11px; }
.home-section { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 18px; }
.home-section__head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
.home-section__head h2 { font-size: 17px; letter-spacing: -.02em; }.home-section__head a { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; color: var(--jubal-blue-light); font-size: 12px; text-decoration: none; }
.home-empty { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 16px; border-radius: 14px; background: var(--surface2); color: var(--text-muted); font-size: 14px; }
.home-empty a { display: inline-flex; align-items: center; min-height: 44px; color: var(--jubal-blue-light); text-decoration: none; font-weight: 800; }
.home-practice-summary { display: flex; flex-wrap: wrap; gap: 8px 18px; padding: 12px; margin-bottom: 8px; background: var(--surface2); color: var(--text-muted); border-radius: 12px; font-size: 12px; }.home-practice-summary strong { color: var(--jubal-blue-light); }
.home-practice { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 72px; padding: 12px 0; border: 0; border-bottom: 1px solid var(--border); background: transparent; color: var(--text); text-align: left; cursor: pointer; }.home-practice:last-child { border-bottom: 0; }
.home-practice__play { width: 40px; height: 40px; border-radius: 50%; background: var(--accent-soft); color: var(--jubal-blue-light); display: grid; place-items: center; flex-shrink: 0; }.home-practice__play svg { width: 18px; height: 18px; }
.home-practice__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }.home-practice__body strong { font-size: 14px; overflow-wrap: anywhere; }.home-practice__body small { color: var(--text-muted); font-size: 12px; }.home-practice__action { color: var(--jubal-blue-light); font-size: 11px; }
.home-tip { display: flex; align-items: flex-start; gap: 12px; background: transparent; border-style: dashed; }
.home-tip__icon { color: var(--jubal-yellow); font-size: 24px; }.home-tip > div { min-width: 0; }.home-tip h3 { font-size: 14px; line-height: 1.4; overflow-wrap: anywhere; }.home-tip button { min-height: 44px; border: 0; background: transparent; color: var(--jubal-blue-light); text-align: left; font-size: 13px; cursor: pointer; }
@media (max-width: 360px) { .home-hero { padding: 20px; }.home-tools a { align-items: flex-start; flex-direction: column; gap: 9px; }.home-practice__action { display: none; } }
</style>
