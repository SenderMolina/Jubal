<template>
  <div v-if="skill" class="skill-detail">
    <!-- Practicar -->
    <button class="btn btn-primary skill-practice" @click="practice">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
      Practicar
    </button>

    <div v-if="skill.song" class="skill-song">
      <span class="skill-song__icon">♫</span>
      <span><strong>{{ skill.song.title }}</strong><small>{{ [skill.song.author, skill.song.key && `Tono ${skill.song.key}`].filter(Boolean).join(' · ') }}</small></span>
    </div>

    <label v-if="skill.song?.band_id" class="skill-share">
      <input type="checkbox" :checked="skill.share_with_band" @change="setSharing($event.target.checked)">
      <span><strong>Compartir preparación con la banda</strong><small>El equipo verá estado, porcentaje, BPM y última práctica; no verá tus sesiones privadas.</small></span>
    </label>

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
      </div>
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

    <!-- Partes -->
    <div class="skill-block">
      <div class="skill-block__heading">
        <h3 class="skill-block__title">Partes</h3>
        <button v-if="skill.song?.lyrics" @click="syncSongParts">Actualizar desde canción</button>
      </div>
      <div v-for="p in skill.parts" :key="p.id" class="skill-part">
        <div class="skill-part__head">
          <span class="skill-part__name">{{ p.name }}</span>
          <span v-if="p.current_bpm" class="skill-part__now">{{ p.current_bpm }}<i>bpm</i></span>
          <input
            class="skill-part__goal"
            type="number" min="20" max="400"
            :value="p.target_bpm"
            placeholder="meta"
            aria-label="Meta BPM de la parte"
            @change="store.updatePart(skill.id, p.id, { target_bpm: +$event.target.value || null })"
          >
          <span class="skill-part__pct">{{ p.progress }}%</span>
          <button class="skill-part__practice" aria-label="Practicar esta parte" @click="practicePart(p)">▶</button>
          <button class="skill-part__delete" aria-label="Eliminar parte" @click="removePart(p)">✕</button>
        </div>
        <input
          class="skill-part__slider"
          type="range" min="0" max="100" step="5"
          :value="p.progress"
          @change="store.updatePart(skill.id, p.id, { progress: +$event.target.value })"
        >
      </div>
      <div class="skill-part-add">
        <input
          v-model="newPart"
          class="form-input"
          type="text"
          placeholder="Nueva parte (intro, solo, puente…)"
          maxlength="60"
          @keydown.enter="addPart"
        >
        <button class="skill-part-add__btn" :disabled="!newPart.trim()" aria-label="Agregar parte" @click="addPart">+</button>
      </div>
    </div>

    <!-- Historial -->
    <div class="skill-block">
      <h3 class="skill-block__title">Sesiones de práctica</h3>
      <p v-if="!sessions.length" class="skill-sessions-empty">
        Aún no hay sesiones. Se registrarán al practicar con el metrónomo.
      </p>
      <div v-for="ses in sessions" :key="ses.id" class="skill-session">
        <span><strong v-if="sessionPart(ses)">{{ sessionPart(ses) }}</strong>{{ formatDate(ses.practiced_at) }}</span>
        <span>{{ [ses.bpm && `${ses.bpm} bpm`, ses.quality && `${ses.quality}/5`, formatDuration(ses.duration_seconds)].filter(Boolean).join(' · ') }}</span>
      </div>
    </div>

    <button class="btn skill-delete" @click="removeSkill">Eliminar skill</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { useMetronome } from '../composables/useMetronome'
import { STATUS_LABELS } from '../utils/skills'

const metronome = useMetronome()

const route  = useRoute()
const router = useRouter()
const store  = usePracticeStore()
const { showToast } = useToast()
const { confirm } = useConfirm()

const skill    = computed(() => store.skills.find(s => s.id === route.params.id))
const sessions = ref([])
const newPart  = ref('')

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

function practicePart(part) {
  metronome.open(skill.value, null, part)
  router.push('/metronomo')
}

async function setSharing(value) {
  try {
    await store.updateSkill(skill.value.id, { share_with_band: value })
    showToast(value ? 'Preparación visible para tu banda' : 'Preparación privada')
  } catch (reason) { showToast(reason.message || 'No se pudo cambiar la visibilidad') }
}

function setStatus(st) {
  store.updateSkill(skill.value.id, { status: st })
}

function setTargetBpm(v) {
  store.updateSkill(skill.value.id, { target_bpm: v ? +v : null })
}

async function addPart() {
  if (!newPart.value.trim()) return
  await store.addPart(skill.value.id, newPart.value.trim())
  newPart.value = ''
}

async function removePart(p) {
  if (!await confirm('¿Eliminar parte?', p.name)) return
  await store.deletePart(skill.value.id, p.id)
}

async function syncSongParts() {
  try {
    const changed = await store.syncSongParts(skill.value.id)
    showToast(changed.length ? 'Secciones actualizadas' : 'Las secciones ya estaban al día')
  } catch (reason) { showToast(reason.message || 'No se pudieron actualizar las secciones') }
}

async function removeSkill() {
  if (!await confirm('¿Eliminar skill?', 'Se borrará junto con sus partes y su historial quedará sin skill.')) return
  await store.deleteSkill(skill.value.id)
  showToast('Skill eliminada')
  router.push('/entrenar')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function sessionPart(session) {
  return skill.value?.parts.find(part => part.id === session.part_id)?.name || ''
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60), s = secs % 60
  return m ? `${m} min ${s ? s + ' s' : ''}`.trim() : `${s} s`
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  if (!skill.value) { router.replace('/entrenar'); return }
  sessions.value = await store.loadSessions(skill.value.id)
})
</script>

<style scoped>
.skill-detail { padding: 12px 16px 40px; display: flex; flex-direction: column; gap: 18px; }

.skill-practice { justify-content: center; padding: 13px; gap: 8px; font-size: 15px; }
.skill-song { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); color: var(--text); text-decoration: none; }.skill-song__icon { width: 35px; height: 35px; display: grid; place-items: center; border-radius: 11px; background: var(--accent-soft); color: var(--accent2); font-size: 18px; }.skill-song > span:nth-child(2) { min-width: 0; flex: 1; display: flex; flex-direction: column; }.skill-song small { margin-top: 2px; color: var(--text-muted); font-size: 11px; }.skill-song > b { color: var(--text-muted); font-size: 20px; }
.skill-share { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: 14px; background: var(--accent-soft); cursor: pointer; }.skill-share input { margin-top: 3px; accent-color: var(--accent); }.skill-share span { display: flex; flex-direction: column; gap: 3px; }.skill-share strong { font-size: 13px; }.skill-share small { color: var(--text-mid); font-size: 10px; line-height: 1.4; }

.skill-status { display: flex; gap: 8px; }
.skill-status__chip {
  flex: 1; padding: 9px 8px; font-size: 13px; font-weight: 600; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 999px; color: var(--text-mid); transition: all .15s;
}
.skill-status__chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.skill-block {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 16px;
}
.skill-block__title {
  font-size: .8rem; font-weight: 600; color: var(--text-mid);
  text-transform: uppercase; letter-spacing: .04em; margin: 0 0 12px;
}
.skill-block__heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }.skill-block__heading .skill-block__title { margin: 0; }.skill-block__heading button { padding: 4px 7px; border: 0; border-radius: 8px; background: var(--accent-soft); color: var(--accent2); font: inherit; font-size: 9px; font-weight: 700; cursor: pointer; }

.skill-bpm { display: flex; align-items: center; justify-content: center; gap: 16px; }
.skill-bpm__col { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.skill-bpm__value { font-size: 2rem; font-weight: 700; line-height: 1.1; }
.skill-bpm__sep { font-size: 1.6rem; color: var(--text-muted); }
.skill-bpm__label { font-size: 11px; color: var(--text-muted); }
.skill-bpm__input { width: 90px; text-align: center; font-size: 1.4rem; font-weight: 700; padding: 4px 8px; }

.skill-trend { margin-top: 14px; }
.skill-trend svg { display: block; width: 100%; height: 72px; overflow: visible; }
.skill-trend__line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.skill-trend__target { stroke: var(--text-muted); stroke-width: 1; stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; }
.skill-trend__dot { fill: var(--accent); stroke: var(--surface); stroke-width: 2; vector-effect: non-scaling-stroke; }
.skill-trend__labels { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.skill-trend__goal { color: var(--text-mid); font-weight: 600; }

.skill-part { margin-bottom: 12px; }
.skill-part__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.skill-part__name { font-weight: 600; font-size: 14px; flex: 1; }
.skill-part__pct { font-size: 12px; color: var(--text-mid); }
.skill-part__now { font-size: 12px; font-weight: 700; color: var(--accent2); font-variant-numeric: tabular-nums; }
.skill-part__now i { font-style: normal; font-weight: 500; font-size: 9px; color: var(--text-muted); margin-left: 2px; }
.skill-part__goal {
  width: 58px; padding: 4px 6px; text-align: center; font-size: 12px;
  background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text);
  -moz-appearance: textfield; appearance: textfield;
}
.skill-part__goal::-webkit-outer-spin-button, .skill-part__goal::-webkit-inner-spin-button { -webkit-appearance: none; }
.skill-part__delete {
  background: none; border: none; cursor: pointer; color: var(--text-muted);
  font-size: 13px; padding: 2px 6px;
}
.skill-part__practice { width: 28px; height: 28px; display: grid; place-items: center; border: 0; border-radius: 50%; background: var(--accent-soft); color: var(--accent2); cursor: pointer; font-size: 10px; }
.skill-part__slider { width: 100%; accent-color: var(--accent); }

.skill-part-add { display: flex; gap: 8px; margin-top: 4px; }
.skill-part-add .form-input { flex: 1; }
.skill-part-add__btn {
  width: 42px; flex-shrink: 0; font-size: 1.2rem; cursor: pointer;
  background: var(--accent); color: #fff; border: none; border-radius: 10px;
}
.skill-part-add__btn:disabled { opacity: .5; cursor: default; }

.skill-sessions-empty { font-size: 13px; color: var(--text-muted); }
.skill-session {
  display: flex; justify-content: space-between; gap: 8px;
  padding: 8px 0; font-size: 13px; color: var(--text-mid);
  border-bottom: 1px solid var(--border);
}
.skill-session > span:first-child { display: flex; flex-direction: column; }.skill-session strong { color: var(--accent2); font-size: 10px; }
.skill-session:last-child { border-bottom: none; }

.skill-delete { justify-content: center; color: var(--red); }
</style>
