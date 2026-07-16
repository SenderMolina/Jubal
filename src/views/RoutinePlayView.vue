<template>
  <div class="mission-play">
    <header class="mission-topbar">
      <button aria-label="Cerrar misión" @click="leaveMission">×</button>
      <div><span>Misión en curso</span><strong>{{ run?.routine_name || 'Cargando…' }}</strong></div>
      <b>{{ completedCount }}/{{ run?.items?.length || 0 }}</b>
    </header>

    <div v-if="loading" class="mission-state">Preparando sala de entrenamiento…</div>
    <div v-else-if="error" class="mission-state mission-state--error">
      <strong>No se pudo abrir la misión</strong>
      <p>{{ error }}</p>
      <small>Si aún no lo hiciste, ejecuta <b>supabase/phase6_guided_practice.sql</b> en Supabase.</small>
      <button @click="router.replace('/rutina')">Volver a rutinas</button>
    </div>

    <template v-else-if="run && !summary">
      <div class="mission-progress" role="progressbar" :aria-valuenow="missionPercent" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: `${missionPercent}%` }"></span>
      </div>

      <section class="mission-map" aria-label="Fases de la rutina">
        <span
          v-for="(item, itemIndex) in run.items"
          :key="item.id"
          :class="{ done: item.status === 'completed', skipped: item.status === 'skipped', active: itemIndex === currentIndex }"
        >{{ itemIndex + 1 }}</span>
      </section>

      <section v-if="currentItem" class="battle-card" :class="{ 'battle-card--rest': phase === 'rest' }">
        <div class="battle-card__ambient" aria-hidden="true"></div>
        <div class="battle-card__phase">
          <span>{{ phase === 'rest' ? 'Zona de recuperación' : currentItem.section_name }}</span>
          <b>FASE {{ currentIndex + 1 }}</b>
        </div>

        <div class="battle-skill">
          <span class="battle-skill__icon">{{ phase === 'rest' ? '☕' : skillIcon(currentSkill?.type) }}</span>
          <div>
            <small>{{ phase === 'rest' ? 'Descanso' : skillType(currentSkill?.type) }}</small>
            <h1>{{ phase === 'rest' ? 'Recupera energía' : currentItem.skill_name }}</h1>
            <p>{{ phase === 'rest' ? 'Respira, relaja las manos y prepárate.' : `${currentItem.target_bpm || bpm} BPM objetivo` }}</p>
          </div>
        </div>

        <div class="mission-clock" :class="{ running }">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="53" />
            <circle class="mission-clock__progress" cx="60" cy="60" r="53" :style="{ '--time-progress': timePercent }" />
          </svg>
          <div><strong>{{ timerLabel }}</strong><small>{{ running ? 'EN CURSO' : reviewReady ? 'LISTO' : 'PAUSADO' }}</small></div>
        </div>

        <div v-if="phase === 'exercise'" class="tempo-control">
          <button aria-label="Reducir BPM" @click="setBpm(bpm - 5)">−5</button>
          <div><strong>{{ bpm }}</strong><small>BPM</small></div>
          <button aria-label="Aumentar BPM" @click="setBpm(bpm + 5)">+5</button>
        </div>

        <div v-if="phase === 'exercise'" class="quality-control">
          <span>¿Cómo se siente?</span>
          <div>
            <button v-for="option in QUALITY" :key="option.value" :class="{ active: quality === option.value }" @click="quality = option.value">
              <b>{{ option.icon }}</b><small>{{ option.label }}</small>
            </button>
          </div>
        </div>

        <div class="mission-actions">
          <button v-if="phase === 'exercise' && !running" class="mission-skip" @click="skipExercise">Omitir</button>
          <button class="mission-main" :class="{ running }" @click="running ? pausePhase() : startPhase()">
            <span>{{ running ? 'Ⅱ' : '▶' }}</span>{{ running ? 'Pausar' : reviewReady ? 'Continuar' : 'Empezar' }}
          </button>
          <button v-if="phase === 'exercise' && !running" class="mission-finish" @click="finishExercise">Completar</button>
        </div>
      </section>

      <section class="mission-next">
        <span>Siguiente</span>
        <strong>{{ nextItem?.skill_name || 'Resumen de la misión' }}</strong>
        <small>{{ nextItem ? nextItem.section_name : 'Recompensas y progreso' }}</small>
      </section>
    </template>

    <section v-else-if="summary" class="mission-summary">
      <div class="mission-summary__badge">★</div>
      <span>Misión finalizada</span>
      <h1>{{ run.routine_name }}</h1>
      <p>{{ summary.completed === summary.total ? '¡Completaste todas las habilidades!' : 'Guardamos todo tu avance de esta sesión.' }}</p>
      <div class="mission-summary__xp">+{{ summary.xp }} <small>XP</small></div>
      <div class="mission-summary__stats">
        <span><b>{{ summary.completed }}/{{ summary.total }}</b> completadas</span>
        <span><b>{{ formatMinutes(summary.seconds) }}</b> practicados</span>
        <span><b>{{ summary.averageQuality }}/5</b> calidad</span>
      </div>
      <button @click="router.replace('/practica')">Volver a práctica</button>
      <button class="mission-summary__secondary" @click="router.replace('/estadisticas')">Ver mi progreso</button>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useMetronome } from '../composables/useMetronome'
import { useConfirm } from '../composables/useConfirm'
import { TYPE_LABELS } from '../utils/skills'

const QUALITY = [
  { value: 1, icon: '●', label: 'Difícil' },
  { value: 3, icon: '◆', label: 'Bien' },
  { value: 5, icon: '★', label: 'Fluyó' },
]
const route = useRoute()
const router = useRouter()
const store = usePracticeStore()
const metro = useMetronome()
const { confirm } = useConfirm()
const { bpm, currentBeat, setBpm } = metro

const run = ref(null)
const loading = ref(true)
const error = ref('')
const running = ref(false)
const phase = ref('exercise')
const remaining = ref(0)
const baseActual = ref(0)
const phaseStartedAt = ref(0)
const quality = ref(3)
const reviewReady = ref(false)
const summary = ref(null)
let timer = null
let allowLeave = false

const currentIndex = computed(() => Math.min(run.value?.current_item_index || 0, Math.max(0, (run.value?.items?.length || 1) - 1)))
const currentItem = computed(() => run.value?.items?.[currentIndex.value] || null)
const nextItem = computed(() => run.value?.items?.[currentIndex.value + 1] || null)
const currentSkill = computed(() => store.skills.find(item => item.id === currentItem.value?.skill_id))
const completedCount = computed(() => run.value?.items?.filter(item => item.status === 'completed').length || 0)
const missionPercent = computed(() => run.value?.items?.length ? Math.round((completedCount.value / run.value.items.length) * 100) : 0)
const phaseTotal = computed(() => phase.value === 'rest' ? currentItem.value?.break_seconds || 0 : currentItem.value?.planned_seconds || 1)
const timePercent = computed(() => Math.max(0, Math.min(100, Math.round((remaining.value / Math.max(1, phaseTotal.value)) * 100))))
const timerLabel = computed(() => {
  const value = Math.max(0, remaining.value)
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
})

function skillType(type) { return TYPE_LABELS[type] || 'Habilidad' }
function skillIcon(type) { return { lick: 'ϟ', solo: '★', technique: '◎', song: '♫' }[type] || '♪' }
function formatMinutes(seconds) { return `${Math.max(1, Math.round(seconds / 60))} min` }
function actualField() { return phase.value === 'rest' ? 'break_actual_seconds' : 'actual_seconds' }

function preparePhase() {
  clearInterval(timer)
  running.value = false
  reviewReady.value = false
  quality.value = currentItem.value?.quality || 3
  if (!currentItem.value) return
  if (currentItem.value.status === 'completed' && currentItem.value.break_seconds > currentItem.value.break_actual_seconds) phase.value = 'rest'
  else phase.value = 'exercise'
  baseActual.value = Number(currentItem.value[actualField()]) || 0
  remaining.value = Math.max(0, phaseTotal.value - baseActual.value)
  if (phase.value === 'exercise') {
    metro.open(currentSkill.value, currentItem.value.target_bpm)
    setBpm(currentItem.value.achieved_bpm || currentItem.value.target_bpm || currentSkill.value?.current_bpm || 100)
  }
}

async function startPhase() {
  if (reviewReady.value && phase.value === 'exercise') return finishExercise()
  if (!remaining.value) return phase.value === 'rest' ? completeRest() : finishExercise()
  phaseStartedAt.value = Date.now()
  running.value = true
  if (phase.value === 'exercise') {
    await store.updatePracticeRunItem(currentItem.value.id, { status: 'active' })
    currentItem.value.status = 'active'
    metro.start()
  }
  clearInterval(timer)
  timer = setInterval(tick, 250)
}

function tick() {
  const elapsed = Math.floor((Date.now() - phaseStartedAt.value) / 1000)
  remaining.value = Math.max(0, phaseTotal.value - baseActual.value - elapsed)
  if (!remaining.value) {
    if (phase.value === 'rest') completeRest()
    else {
      pausePhase()
      reviewReady.value = true
    }
  }
}

async function pausePhase() {
  if (!running.value) return
  clearInterval(timer)
  const elapsed = Math.max(0, Math.floor((Date.now() - phaseStartedAt.value) / 1000))
  const actual = Math.min(phaseTotal.value, baseActual.value + elapsed)
  baseActual.value = actual
  remaining.value = Math.max(0, phaseTotal.value - actual)
  running.value = false
  metro.stop()
  try {
    const saved = await store.updatePracticeRunItem(currentItem.value.id, { [actualField()]: actual })
    Object.assign(currentItem.value, saved)
  } catch (reason) { error.value = reason.message || 'No se pudo guardar el avance' }
}

async function finishExercise() {
  if (running.value) await pausePhase()
  const item = currentItem.value
  const actual = Math.max(1, baseActual.value)
  try {
    if (actual >= 10) {
      await store.logSession({
        skill_id: item.skill_id,
        bpm: bpm.value,
        duration_seconds: actual,
        routine_run_item_id: item.id,
        quality: quality.value,
      })
    }
    const saved = await store.updatePracticeRunItem(item.id, {
      status: 'completed', actual_seconds: actual, achieved_bpm: bpm.value,
      quality: quality.value, completed_at: new Date().toISOString(),
    })
    Object.assign(item, saved)
    reviewReady.value = false
    if (item.break_seconds > 0) {
      phase.value = 'rest'
      baseActual.value = item.break_actual_seconds || 0
      remaining.value = Math.max(0, item.break_seconds - baseActual.value)
    } else await advance()
  } catch (reason) {
    if (reason.code === '23505') {
      const saved = await store.updatePracticeRunItem(item.id, { status: 'completed', quality: quality.value })
      Object.assign(item, saved)
      return item.break_seconds ? preparePhase() : advance()
    }
    error.value = reason.message || 'No se pudo completar la habilidad'
  }
}

async function skipExercise() {
  const saved = await store.updatePracticeRunItem(currentItem.value.id, { status: 'skipped' })
  Object.assign(currentItem.value, saved)
  await advance()
}

async function completeRest() {
  if (running.value) await pausePhase()
  const saved = await store.updatePracticeRunItem(currentItem.value.id, { break_actual_seconds: currentItem.value.break_seconds })
  Object.assign(currentItem.value, saved)
  await advance()
}

async function advance() {
  metro.close()
  if (currentIndex.value >= run.value.items.length - 1) return finishRun()
  const nextIndex = currentIndex.value + 1
  const saved = await store.updatePracticeRun(run.value.id, { current_item_index: nextIndex })
  Object.assign(run.value, saved)
  preparePhase()
}

async function finishRun() {
  metro.close()
  const saved = await store.finishPracticeRun(run.value.id)
  Object.assign(run.value, saved)
  const completed = completedCount.value
  const qualities = run.value.items.filter(item => item.quality).map(item => item.quality)
  summary.value = {
    completed,
    total: run.value.items.length,
    seconds: run.value.items.reduce((sum, item) => sum + (item.actual_seconds || 0), 0),
    averageQuality: qualities.length ? (qualities.reduce((sum, value) => sum + value, 0) / qualities.length).toFixed(1) : '—',
    xp: saved.xp_earned || 0,
  }
  allowLeave = true
}

async function leaveMission() {
  if (running.value) await pausePhase()
  const leave = await confirm('¿Salir de la misión?', 'Tu avance quedará guardado y podrás continuar después.')
  if (leave) { allowLeave = true; router.replace('/rutina') }
}

async function initialize() {
  try {
    if (!store.ready) await store.loadSkills()
    run.value = await store.startRoutineRun(route.params.id)
    const firstPending = run.value.items.findIndex(item => !['completed', 'skipped'].includes(item.status) || (item.status === 'completed' && item.break_actual_seconds < item.break_seconds))
    if (firstPending < 0) return finishRun()
    if (firstPending !== run.value.current_item_index) {
      Object.assign(run.value, await store.updatePracticeRun(run.value.id, { current_item_index: firstPending }))
    }
    preparePhase()
  } catch (reason) { error.value = reason.message || 'No se pudo iniciar la rutina' }
  finally { loading.value = false }
}

function handleVisibility() { if (document.hidden && running.value) pausePhase() }
onMounted(() => { document.addEventListener('visibilitychange', handleVisibility); initialize() })
onBeforeUnmount(() => { clearInterval(timer); document.removeEventListener('visibilitychange', handleVisibility); metro.close() })
onBeforeRouteLeave(async () => {
  if (allowLeave || summary.value || !run.value || run.value.status !== 'active') return true
  if (running.value) await pausePhase()
  return confirm('¿Salir de la misión?', 'Tu avance quedará guardado y podrás continuar después.')
})
</script>

<style scoped>
.mission-play { min-height:100dvh; max-width:620px; margin:0 auto; padding:14px 14px 34px; color:var(--text); background:radial-gradient(circle at 90% 2%,rgba(var(--amber-rgb),.14),transparent 24%),var(--bg); }.mission-topbar { display:grid; grid-template-columns:36px 1fr 36px; align-items:center; gap:10px; }.mission-topbar button { width:36px;height:36px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);font-size:21px; }.mission-topbar div { min-width:0;display:flex;flex-direction:column;text-align:center; }.mission-topbar span { color:var(--accent2);font-size:7px;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }.mission-topbar strong { overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap; }.mission-topbar>b { color:var(--accent2);font-size:10px;text-align:center; }.mission-progress { height:7px;margin:15px 2px 9px;overflow:hidden;border-radius:99px;background:var(--surface2); }.mission-progress span { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),#ffb33f);transition:width .4s ease; }.mission-map { display:flex;justify-content:center;gap:6px;margin-bottom:14px; }.mission-map span { width:23px;height:23px;display:grid;place-items:center;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-muted);font-size:7px;font-weight:900; }.mission-map span.active { border-color:var(--accent);background:var(--accent);color:#fff;box-shadow:0 0 0 4px var(--accent-soft); }.mission-map span.done { border-color:var(--green);background:var(--green);color:#fff; }.mission-map span.skipped { opacity:.45;text-decoration:line-through; }.battle-card { position:relative;isolation:isolate;overflow:hidden;padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:linear-gradient(145deg,#082c38,#075f70 70%,#07899a);color:#fff;box-shadow:0 16px 30px rgba(4,54,65,.23); }.battle-card--rest { background:linear-gradient(145deg,#28334c,#5b477a 70%,#8e67a7); }.battle-card__ambient { position:absolute;z-index:-1;right:-50px;top:-80px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,rgba(255,188,75,.35),transparent 68%); }.battle-card__phase { display:flex;justify-content:space-between;align-items:center; }.battle-card__phase span,.battle-card__phase b { color:#91e7ed;font-size:7px;font-weight:900;letter-spacing:.1em;text-transform:uppercase; }.battle-card__phase b { color:#ffc56c; }.battle-skill { display:flex;align-items:center;gap:11px;margin-top:13px; }.battle-skill__icon { width:50px;height:50px;flex:0 0 50px;display:grid;place-items:center;border:2px solid rgba(255,255,255,.7);border-radius:16px;background:rgba(255,255,255,.1);font-size:22px;box-shadow:0 5px 13px rgba(0,0,0,.18); }.battle-skill div { min-width:0; }.battle-skill small { color:#9be8ed;font-size:7px;font-weight:800;text-transform:uppercase; }.battle-skill h1 { overflow:hidden;margin-top:2px;font-size:16px;text-overflow:ellipsis;white-space:nowrap; }.battle-skill p { margin-top:2px;color:rgba(255,255,255,.65);font-size:8px; }.mission-clock { position:relative;width:158px;height:158px;display:grid;place-items:center;margin:16px auto 9px; }.mission-clock svg { position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg); }.mission-clock circle { fill:rgba(0,0,0,.12);stroke:rgba(255,255,255,.13);stroke-width:7; }.mission-clock .mission-clock__progress { fill:transparent;stroke:#ffc15e;stroke-linecap:round;stroke-dasharray:333;stroke-dashoffset:calc(333 - (333 * var(--time-progress))/100);transition:stroke-dashoffset .3s linear;filter:drop-shadow(0 0 5px rgba(255,193,94,.48)); }.mission-clock>div { display:flex;flex-direction:column;align-items:center; }.mission-clock strong { font-size:29px;font-variant-numeric:tabular-nums;letter-spacing:-.04em; }.mission-clock small { color:#a4e9ee;font-size:7px;font-weight:900;letter-spacing:.13em; }.tempo-control { display:flex;align-items:center;justify-content:center;gap:22px;margin-bottom:12px; }.tempo-control button { width:45px;height:34px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:10px;font-weight:800; }.tempo-control div { min-width:55px;display:flex;flex-direction:column;align-items:center; }.tempo-control strong { font-size:20px; }.tempo-control small { color:rgba(255,255,255,.6);font-size:6px; }.quality-control { padding-top:10px;border-top:1px solid rgba(255,255,255,.12); }.quality-control>span { display:block;color:rgba(255,255,255,.65);font-size:7px;text-align:center;text-transform:uppercase; }.quality-control>div { display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px; }.quality-control button { display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 3px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(0,0,0,.1);color:rgba(255,255,255,.6); }.quality-control button.active { border-color:#ffc15e;background:rgba(255,193,94,.15);color:#fff; }.quality-control b { font-size:9px; }.quality-control small { font-size:7px; }.mission-actions { display:grid;grid-template-columns:1fr 1.6fr 1fr;align-items:center;gap:7px;margin-top:13px; }.mission-actions button { min-height:43px;border:0;border-radius:13px;font:inherit;font-size:8px;font-weight:900; }.mission-skip,.mission-finish { background:rgba(255,255,255,.1);color:rgba(255,255,255,.75); }.mission-main { display:flex;align-items:center;justify-content:center;gap:6px;background:#ff9b25;color:#fff;box-shadow:0 6px 13px rgba(255,138,20,.25); }.mission-main.running { background:#ef5c5c; }.mission-main span { font-size:12px; }.mission-next { display:grid;grid-template-columns:1fr auto;gap:2px;margin-top:11px;padding:11px 13px;border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow); }.mission-next span { grid-column:1/-1;color:var(--accent2);font-size:7px;font-weight:900;text-transform:uppercase; }.mission-next strong { overflow:hidden;font-size:10px;text-overflow:ellipsis;white-space:nowrap; }.mission-next small { color:var(--text-muted);font-size:7px; }.mission-state { padding:70px 20px;color:var(--text-muted);font-size:11px;text-align:center; }.mission-state--error { display:flex;flex-direction:column;gap:8px;align-items:center; }.mission-state--error strong { color:var(--text);font-size:15px; }.mission-state--error small { max-width:370px;line-height:1.5; }.mission-state--error button,.mission-summary>button { margin-top:9px;padding:11px 18px;border:0;border-radius:12px;background:var(--accent);color:#fff;font:inherit;font-size:10px;font-weight:900; }.mission-summary { display:flex;flex-direction:column;align-items:center;padding:55px 8px 20px;text-align:center; }.mission-summary__badge { width:82px;height:82px;display:grid;place-items:center;margin-bottom:15px;border:4px solid #ffc15e;border-radius:27px;background:linear-gradient(145deg,#0a5969,#073540);color:#ffc15e;font-size:38px;box-shadow:0 0 0 8px var(--action-soft),0 12px 25px rgba(0,0,0,.15);transform:rotate(4deg); }.mission-summary>span { color:var(--accent2);font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }.mission-summary h1 { margin-top:5px;font-size:23px; }.mission-summary p { margin-top:6px;color:var(--text-mid);font-size:10px; }.mission-summary__xp { margin:18px 0;color:#f39120;font-size:32px;font-weight:900; }.mission-summary__xp small { font-size:10px; }.mission-summary__stats { width:100%;display:grid;grid-template-columns:repeat(3,1fr);overflow:hidden;border:1px solid var(--border);border-radius:16px;background:var(--surface); }.mission-summary__stats span { display:flex;flex-direction:column;padding:12px 4px;border-right:1px solid var(--border);color:var(--text-muted);font-size:7px; }.mission-summary__stats span:last-child { border:0; }.mission-summary__stats b { color:var(--text);font-size:12px; }.mission-summary>button { width:100%;max-width:340px; }.mission-summary .mission-summary__secondary { margin-top:7px;border:1px solid var(--border);background:var(--surface);color:var(--accent2); }
@media (max-width:350px) { .mission-play{padding-inline:10px}.battle-card{padding:13px}.mission-clock{width:140px;height:140px}.mission-clock strong{font-size:26px}.mission-actions{grid-template-columns:.8fr 1.5fr .9fr}.quality-control button{gap:3px} }
@media (prefers-reduced-motion:reduce) { .mission-progress span,.mission-clock .mission-clock__progress{transition:none} }
</style>
