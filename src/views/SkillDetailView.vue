<template>
  <div v-if="skill" class="skill-detail">
    <section class="skill-identity">
      <span class="skill-identity__icon">{{ skillIcon(skill.type) }}</span>
      <div>
        <span>{{ [store.techniqueNames(skill).join(' · ') || TYPE_LABELS[skill.type], store.sourceName(skill)].filter(Boolean).join(' — ') }}</span>
        <h1>{{ skill.name }}</h1>
      </div>
      <strong>{{ progress }}%</strong>
    </section>

    <!-- Practicar -->
    <button class="btn btn-primary skill-practice" @click="practice">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
      {{ todayTempo ? `Practicar a ${todayTempo} bpm` : 'Practicar' }}
    </button>

    <div v-if="reachedGoal" class="skill-goal-reached">
      <span>🎯 Llegaste a la meta de {{ skill.target_bpm }} bpm.</span>
      <button class="btn btn-sm" @click="setStatus('mastered')">Dar por concluida</button>
    </div>
    <p v-else-if="skill.status === 'mastered' && skill.completed_at" class="skill-completed">
      Concluida el {{ formatDay(skill.completed_at) }}
    </p>

    <div v-if="skill.song" class="skill-song">
      <span class="skill-song__icon">♫</span>
      <span><strong>{{ skill.song.title }}</strong><small>{{ [skill.song.author, skill.song.key && `Tono ${skill.song.key}`].filter(Boolean).join(' · ') }}</small></span>
    </div>

    <!-- Estado -->
    <div class="skill-status">
      <button
        v-for="(label, st) in STATUS_LABELS"
        :key="st"
        class="skill-status__chip"
        :class="{ active: skill.status === st }"
        @click="setStatus(st)"
      >{{ label }}</button>
    </div>

    <div class="skill-block">
      <h3 class="skill-block__title">Fuente</h3>
      <CatalogPicker :model-value="skill.source_id" kind="source" @update:model-value="save({ source_id: $event }, 'la fuente')" />
      <h3 class="skill-block__title skill-block__title--next">Técnicas</h3>
      <CatalogPicker :model-value="skill.technique_ids || []" kind="technique" @update:model-value="save({ technique_ids: $event }, 'las técnicas')" />
    </div>

    <div class="skill-block">
      <h3 class="skill-block__title">Notas y referencias</h3>
      <textarea
        v-model="notes"
        class="form-input skill-notes"
        placeholder="Artista, enlace, afinación, compases difíciles, recordatorios…"
        maxlength="1000"
        @change="saveNotes"
      />
      <small class="skill-notes__hint">Se guarda al salir del campo.</small>
    </div>

    <!-- Tempo -->
    <div class="skill-block">
      <h3 class="skill-block__title">Tempo</h3>
      <div class="skill-bpm">
        <div class="skill-bpm__col">
          <span class="skill-bpm__value">{{ skill.current_bpm || '—' }}</span>
          <span class="skill-bpm__label">actual</span>
        </div>
        <span class="skill-bpm__sep">/</span>
        <div class="skill-bpm__col">
          <input
            class="form-input skill-bpm__input"
            type="number" min="20" max="400"
            :value="skill.target_bpm"
            placeholder="—"
            @change="setTargetBpm($event.target.value)"
          >
          <span class="skill-bpm__label">meta bpm</span>
        </div>
        <div class="skill-bpm__col">
          <input
            class="form-input skill-bpm__date"
            type="date"
            :value="skill.target_date"
            aria-label="Fecha meta"
            @change="setTargetDate($event.target.value)"
          >
          <span class="skill-bpm__label">fecha meta</span>
        </div>
      </div>
      <p v-if="planLabel" class="skill-plan">{{ planLabel }}</p>
      <div v-if="bpmTrend" class="skill-trend">
        <svg :viewBox="`0 0 ${bpmTrend.w} ${bpmTrend.h}`" preserveAspectRatio="none" role="img" aria-label="Evolución de BPM por sesión">
          <line
            v-if="bpmTrend.targetY !== null"
            class="skill-trend__target"
            x1="0" :y1="bpmTrend.targetY" :x2="bpmTrend.w" :y2="bpmTrend.targetY"
          />
          <polyline class="skill-trend__line" :points="bpmTrend.line" />
          <circle
            v-for="(p, i) in bpmTrend.points"
            :key="i"
            class="skill-trend__dot"
            :cx="p.x" :cy="p.y" r="3.5"
          ><title>{{ p.bpm }} bpm · {{ formatDate(p.date) }}</title></circle>
        </svg>
        <div class="skill-trend__labels">
          <span>{{ bpmTrend.first }} bpm</span>
          <span v-if="bpmTrend.target" class="skill-trend__goal">meta {{ bpmTrend.target }}</span>
          <span>{{ bpmTrend.last }} bpm</span>
        </div>
      </div>
    </div>

    <button class="btn skill-delete" @click="removeSkill">Eliminar ejercicio</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { clearLoadError, reportLoadError } from '../composables/useLoadErrors'
import { useConfirm } from '../composables/useConfirm'
import { useMetronome } from '../composables/useMetronome'
import { STATUS_LABELS, TYPE_LABELS, skillProgress, todayBpm } from '../utils/skills'
import CatalogPicker from '../components/CatalogPicker.vue'

const metronome = useMetronome()

const route  = useRoute()
const router = useRouter()
const store  = usePracticeStore()
const { showToast, showError, attempt } = useToast()
const { confirm } = useConfirm()

const skill    = computed(() => store.skills.find(s => s.id === route.params.id))
const sessions = ref([])
const notes = ref('')
const progress = computed(() => skillProgress(skill.value))

watch(skill, value => {
  notes.value = value?.notes || ''
}, { immediate: true })

const todayTempo = computed(() => todayBpm(skill.value))
const reachedGoal = computed(() => skill.value?.status === 'practicing'
  && skill.value.target_bpm && Number(skill.value.current_bpm) >= Number(skill.value.target_bpm))
const planLabel = computed(() => {
  const s = skill.value
  if (!s?.target_date || !s.target_bpm || s.status === 'mastered') return ''
  const days = Math.ceil((new Date(`${s.target_date}T23:59:59`) - Date.now()) / 86400000)
  if (days < 0) return `La fecha meta pasó hace ${-days} día${days === -1 ? '' : 's'}. Ajústala o sigue a tu ritmo.`
  if (!s.current_bpm) return `Quedan ${days} días. Pon tu BPM actual o practica con el metrónomo para calcular el tempo de cada día.`
  if (s.current_bpm >= s.target_bpm) return 'Ya estás en el tempo meta.'
  return `Quedan ${days} día${days === 1 ? '' : 's'} y ${s.target_bpm - s.current_bpm} bpm: hoy toca ${todayTempo.value} bpm.`
})
// Curva de tempo: BPM de cada sesión en orden cronológico + línea de meta.
const bpmTrend = computed(() => {
  const points = sessions.value.filter(s => Number(s.bpm)).slice().reverse()
  if (points.length < 2) return null
  const w = 280, h = 72, pad = 9
  const values = points.map(s => Number(s.bpm))
  const target = Number(skill.value?.target_bpm) || null
  const min = Math.min(...values, target ?? Infinity)
  const max = Math.max(...values, target ?? -Infinity)
  const span = Math.max(1, max - min)
  const x = i => pad + (i * (w - pad * 2)) / (points.length - 1)
  const y = v => h - pad - ((v - min) * (h - pad * 2)) / span
  return {
    w, h, target,
    first: values[0],
    last: values.at(-1),
    targetY: target ? y(target) : null,
    line: values.map((v, i) => `${x(i)},${y(v)}`).join(' '),
    points: points.map((s, i) => ({ x: x(i), y: y(Number(s.bpm)), bpm: s.bpm, date: s.practiced_at })),
  }
})

function practice() {
  metronome.open(skill.value)
  router.push('/metronomo')
}

function setStatus(st) {
  attempt(() => store.updateSkill(skill.value.id, { status: st }), { error: 'No se pudo cambiar el estado.' })
}

async function saveNotes() {
  try {
    await store.updateSkill(skill.value.id, { notes: notes.value.trim() || null })
    showToast('Notas guardadas')
  } catch (reason) { showError(reason, 'No se pudieron guardar las notas') }
}

function setTargetDate(v) {
  attempt(() => store.updateSkill(skill.value.id, { target_date: v || null }), { error: 'No se pudo guardar la fecha meta.' })
}

function save(patch, label) {
  attempt(() => store.updateSkill(skill.value.id, patch), { error: `No se pudo guardar ${label}.` })
}

function formatDay(d) {
  return new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

function setTargetBpm(v) {
  attempt(() => store.updateSkill(skill.value.id, { target_bpm: v ? +v : null }), { error: 'No se pudo guardar la meta de BPM.' })
}

async function removeSkill() {
  if (!await confirm('¿Eliminar ejercicio?', 'Su historial de sesiones quedará sin ejercicio asociado.')) return
  const ok = await attempt(() => store.deleteSkill(skill.value.id), { success: 'Ejercicio eliminado', error: 'No se pudo eliminar el ejercicio.' })
  if (ok) router.push('/entrenar')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function skillIcon(type) {
  return { lick: 'ϟ', solo: '★', technique: '◎', song: '♫' }[type] || '♪'
}

async function loadSessions() {
  try {
    sessions.value = await store.loadSessions(skill.value.id)
    clearLoadError('sesiones')
  } catch (reason) { reportLoadError('sesiones', reason, loadSessions) }
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  if (!skill.value) { router.replace('/entrenar'); return }
  await loadSessions()
})
</script>

<style scoped>
.skill-detail { padding: 12px 16px 40px; display: flex; flex-direction: column; gap: 18px; }

.skill-identity { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 11px; }
.skill-identity__icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 14px; background: var(--color-primary-soft); color: var(--color-primary-hover); font-size: 20px; }
.skill-identity > div { min-width: 0; }
.skill-identity > div > span { color: var(--color-text-muted); font-size: 9px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.skill-identity h1 { margin: 2px 0 0; overflow: hidden; text-overflow: ellipsis; font-size: 20px; }
.skill-identity > strong { color: var(--color-primary-hover); font-size: 16px; font-variant-numeric: tabular-nums; }

.skill-practice { justify-content: center; padding: 13px; gap: 8px; font-size: 15px; }
.skill-song { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); color: var(--color-text-primary); text-decoration: none; }.skill-song__icon { width: 35px; height: 35px; display: grid; place-items: center; border-radius: 11px; background: var(--color-primary-soft); color: var(--color-primary-hover); font-size: 18px; }.skill-song > span:nth-child(2) { min-width: 0; flex: 1; display: flex; flex-direction: column; }.skill-song small { margin-top: 2px; color: var(--color-text-muted); font-size: 11px; }.skill-song > b { color: var(--color-text-muted); font-size: 20px; }

.skill-status { display: flex; gap: 8px; }
.skill-status__chip {
  flex: 1; padding: 9px 8px; font-size: 13px; font-weight: 600; cursor: pointer;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 999px; color: var(--color-text-secondary); transition: all .15s;
}
.skill-status__chip.active { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-text-on-primary); }
.skill-notes { width: 100%; min-height: 84px; resize: vertical; font: inherit; box-sizing: border-box; }
.skill-notes__hint { display: block; margin-top: 5px; color: var(--color-text-muted); font-size: 9px; }

.skill-block {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 14px 16px;
}
.skill-block__title {
  font-size: .8rem; font-weight: 600; color: var(--color-text-secondary);
  text-transform: uppercase; letter-spacing: .04em; margin: 0 0 12px;
}
.skill-block__heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }.skill-block__heading .skill-block__title { margin: 0; }.skill-block__heading button { padding: 4px 7px; border: 0; border-radius: 8px; background: var(--color-primary-soft); color: var(--color-primary-hover); font: inherit; font-size: 9px; font-weight: 700; cursor: pointer; }

.skill-bpm { display: flex; align-items: center; justify-content: center; gap: 16px; }
.skill-bpm__col { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.skill-bpm__value { font-size: 2rem; font-weight: 700; line-height: 1.1; }
.skill-bpm__sep { font-size: 1.6rem; color: var(--color-text-muted); }
.skill-bpm__label { font-size: 11px; color: var(--color-text-muted); }
.skill-bpm__input { width: 90px; text-align: center; font-size: 1.4rem; font-weight: 700; padding: 4px 8px; }
.skill-bpm { flex-wrap: wrap; }
.skill-bpm__date { width: 150px; padding: 8px; text-align: center; }
.skill-plan { margin: 12px 0 0; color: var(--color-text-secondary); font-size: 13px; text-align: center; }
.skill-goal-reached { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px; border-radius: 14px; background: var(--color-success-soft); color: var(--color-text-primary); font-size: 14px; }
.skill-completed { margin: 0; color: var(--color-success); font-size: 13px; font-weight: 700; text-align: center; }
.skill-block > .form-input + .tag-input { margin-top: 10px; }
@media (max-width: 480px) { .skill-status { flex-wrap: wrap; } .skill-status__chip { flex-basis: 40%; } }

.skill-trend { margin-top: 14px; }
.skill-trend svg { display: block; width: 100%; height: 72px; overflow: visible; }
.skill-trend__line { fill: none; stroke: var(--color-secondary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.skill-trend__target { stroke: var(--color-text-muted); stroke-width: 1; stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; }
.skill-trend__dot { fill: var(--color-secondary); stroke: var(--color-surface); stroke-width: 2; vector-effect: non-scaling-stroke; }
.skill-trend__labels { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.skill-trend__goal { color: var(--color-text-secondary); font-weight: 600; }


.skill-block__title--next { margin-top: 16px; }
.skill-delete { justify-content: center; color: var(--color-danger); }

.skill-identity__icon { width:52px;height:52px;border-radius:16px;font-size:23px;box-shadow:none; }.skill-identity > div > span { color:var(--color-primary);font-size:12px; }.skill-identity h1 { font-size:24px; }.skill-identity > strong { color:var(--color-warning-text);font-size:18px; }
.skill-status__chip { min-height:46px;font-size:14px;font-weight:800; }.skill-status__chip.active { box-shadow:none; }.skill-block { padding:18px;border-radius:24px;box-shadow:none; }.skill-block__title { font-size:13px;font-weight:900; }.skill-block__heading button { min-height:40px;padding:7px 10px;font-size:12px; }
</style>
