<template>
  <div v-if="skill" class="skill-detail">
    <section class="skill-identity">
      <span class="skill-identity__icon">{{ skillIcon(skill.type) }}</span>
      <div>
        <span>{{ TYPE_LABELS[skill.type] }}</span>
        <h1>{{ skill.name }}</h1>
      </div>
      <strong>{{ progress }}%</strong>
    </section>

    <!-- Practicar -->
    <button class="btn btn-primary skill-practice" @click="practice">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
      Practicar
    </button>

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
      <div class="skill-block__heading">
        <h3 class="skill-block__title">Sesiones de práctica</h3>
        <button @click="manualOpen = !manualOpen">{{ manualOpen ? 'Cancelar' : '+ Registrar' }}</button>
      </div>
      <div v-if="sessions.length" class="skill-session-summary">
        <span><strong>{{ sessions.length }}</strong> sesiones</span>
        <span><strong>{{ totalPracticeLabel }}</strong> acumulado</span>
        <span><strong>{{ lastPracticeLabel }}</strong> última práctica</span>
      </div>
      <form v-if="manualOpen" class="manual-session" @submit.prevent="saveManualSession">
        <label>Minutos<input v-model.number="manual.duration" class="form-input" type="number" min="1" max="600" required></label>
        <label>BPM<input v-model.number="manual.bpm" class="form-input" type="number" min="20" max="300" placeholder="Opcional"></label>
        <label>Calidad
          <select v-model.number="manual.quality" class="form-input">
            <option :value="1">Difícil</option><option :value="3">Bien</option><option :value="5">Fluyó</option>
          </select>
        </label>
        <label v-if="skill.parts.length" class="manual-session__part">Parte
          <select v-model="manual.part_id" class="form-input">
            <option value="">Objetivo completo</option>
            <option v-for="item in skill.parts" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </label>
        <button class="btn btn-primary manual-session__save" :disabled="manualBusy">
          {{ manualBusy ? 'Guardando…' : 'Guardar práctica' }}
        </button>
      </form>
      <p v-if="!sessions.length" class="skill-sessions-empty">
        Aún no hay sesiones. Usa el metrónomo o registra una práctica manual.
      </p>
      <div v-for="ses in sessions" :key="ses.id" class="skill-session">
        <span><strong v-if="sessionPart(ses)">{{ sessionPart(ses) }}</strong>{{ formatDate(ses.practiced_at) }}</span>
        <span>{{ [ses.bpm && `${ses.bpm} bpm`, ses.quality && `${ses.quality}/5`, formatDuration(ses.duration_seconds)].filter(Boolean).join(' · ') }}</span>
      </div>
    </div>

    <button class="btn skill-delete" @click="removeSkill">Eliminar objetivo</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { useMetronome } from '../composables/useMetronome'
import { STATUS_LABELS, TYPE_LABELS, skillProgress } from '../utils/skills'

const metronome = useMetronome()

const route  = useRoute()
const router = useRouter()
const store  = usePracticeStore()
const { showToast } = useToast()
const { confirm } = useConfirm()

const skill    = computed(() => store.skills.find(s => s.id === route.params.id))
const sessions = ref([])
const newPart  = ref('')
const notes = ref('')
const manualOpen = ref(false)
const manualBusy = ref(false)
const manual = ref({ duration: 10, bpm: null, quality: 3, part_id: '' })
const progress = computed(() => skillProgress(skill.value))
const totalPracticeSeconds = computed(() => sessions.value.reduce((total, item) => total + Number(item.duration_seconds || 0), 0))
const totalPracticeLabel = computed(() => formatTotalDuration(totalPracticeSeconds.value))
const lastPracticeLabel = computed(() => sessions.value.length ? relativeDate(sessions.value[0].practiced_at) : '—')

watch(skill, value => { notes.value = value?.notes || '' }, { immediate: true })

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

function setStatus(st) {
  store.updateSkill(skill.value.id, { status: st })
}

async function saveNotes() {
  try {
    await store.updateSkill(skill.value.id, { notes: notes.value.trim() || null })
    showToast('Notas guardadas ✓')
  } catch (reason) { showToast(reason.message || 'No se pudieron guardar las notas') }
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
  if (!await confirm('¿Eliminar objetivo?', 'Se borrará junto con sus partes y su historial quedará sin objetivo.')) return
  await store.deleteSkill(skill.value.id)
  showToast('Objetivo eliminado')
  router.push('/entrenar')
}

async function saveManualSession() {
  if (!manual.value.duration || manualBusy.value) return
  manualBusy.value = true
  try {
    await store.logSession({
      skill_id: skill.value.id,
      part_id: manual.value.part_id || null,
      bpm: manual.value.bpm || null,
      duration_seconds: Math.round(Number(manual.value.duration) * 60),
      quality: manual.value.quality,
    })
    sessions.value = await store.loadSessions(skill.value.id)
    manualOpen.value = false
    showToast('Práctica registrada ✓')
  } catch (reason) { showToast(reason.message || 'No se pudo registrar la práctica') }
  finally { manualBusy.value = false }
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

function formatTotalDuration(secs) {
  const hours = Math.floor(secs / 3600)
  const minutes = Math.round((secs % 3600) / 60)
  return hours ? `${hours} h ${minutes ? `${minutes} min` : ''}`.trim() : `${minutes} min`
}

function relativeDate(value) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}

function skillIcon(type) {
  return { lick: 'ϟ', solo: '★', technique: '◎', song: '♫' }[type] || '♪'
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  if (!skill.value) { router.replace('/entrenar'); return }
  sessions.value = await store.loadSessions(skill.value.id)
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

.skill-trend { margin-top: 14px; }
.skill-trend svg { display: block; width: 100%; height: 72px; overflow: visible; }
.skill-trend__line { fill: none; stroke: var(--color-secondary); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.skill-trend__target { stroke: var(--color-text-muted); stroke-width: 1; stroke-dasharray: 4 4; vector-effect: non-scaling-stroke; }
.skill-trend__dot { fill: var(--color-secondary); stroke: var(--color-surface); stroke-width: 2; vector-effect: non-scaling-stroke; }
.skill-trend__labels { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.skill-trend__goal { color: var(--color-text-secondary); font-weight: 600; }

.skill-part { margin-bottom: 12px; }
.skill-part__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.skill-part__name { font-weight: 600; font-size: 14px; flex: 1; }
.skill-part__pct { font-size: 12px; color: var(--color-text-secondary); }
.skill-part__now { font-size: 12px; font-weight: 700; color: var(--color-primary-hover); font-variant-numeric: tabular-nums; }
.skill-part__now i { font-style: normal; font-weight: 500; font-size: 9px; color: var(--color-text-muted); margin-left: 2px; }
.skill-part__goal {
  width: 58px; padding: 4px 6px; text-align: center; font-size: 12px;
  background: var(--color-surface-secondary); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-primary);
  -moz-appearance: textfield; appearance: textfield;
}
.skill-part__goal::-webkit-outer-spin-button, .skill-part__goal::-webkit-inner-spin-button { -webkit-appearance: none; }
.skill-part__delete {
  background: none; border: none; cursor: pointer; color: var(--color-text-muted);
  font-size: 13px; padding: 2px 6px;
}
.skill-part__practice { width: 28px; height: 28px; display: grid; place-items: center; border: 0; border-radius: 50%; background: var(--color-primary-soft); color: var(--color-primary-hover); cursor: pointer; font-size: 10px; }
.skill-part__slider { width: 100%; accent-color: var(--color-secondary); }

.skill-part-add { display: flex; gap: 8px; margin-top: 4px; }
.skill-part-add .form-input { flex: 1; }
.skill-part-add__btn {
  width: 42px; flex-shrink: 0; font-size: 1.2rem; cursor: pointer;
  background: var(--color-primary); color: var(--color-text-on-primary); border: none; border-radius: 10px;
}
.skill-part-add__btn:disabled { opacity: .5; cursor: default; }

.skill-sessions-empty { font-size: 13px; color: var(--color-text-muted); }
.skill-session-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px; }
.skill-session-summary span { padding: 8px 5px; border-radius: 10px; background: var(--color-surface-secondary); color: var(--color-text-muted); font-size: 8px; text-align: center; }
.skill-session-summary strong { display: block; margin-bottom: 2px; color: var(--color-text-primary); font-size: 12px; }
.manual-session { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 11px; margin-bottom: 12px; border-radius: 12px; background: var(--color-surface-secondary); }
.manual-session label { display: flex; flex-direction: column; gap: 4px; color: var(--color-text-muted); font-size: 9px; font-weight: 700; }
.manual-session .form-input { min-width: 0; padding: 8px; font-size: 12px; }
.manual-session__part, .manual-session__save { grid-column: 1 / -1; }
.manual-session__save { justify-content: center; }
.skill-session {
  display: flex; justify-content: space-between; gap: 8px;
  padding: 8px 0; font-size: 13px; color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}
.skill-session > span:first-child { display: flex; flex-direction: column; }.skill-session strong { color: var(--color-primary-hover); font-size: 10px; }
.skill-session:last-child { border-bottom: none; }

.skill-delete { justify-content: center; color: var(--color-danger); }

.skill-identity__icon { width:52px;height:52px;border-radius:16px;font-size:23px;box-shadow:none; }.skill-identity > div > span { color:var(--color-primary);font-size:12px; }.skill-identity h1 { font-size:24px; }.skill-identity > strong { color:var(--color-warning-text);font-size:18px; }
.skill-status__chip { min-height:46px;font-size:14px;font-weight:800; }.skill-status__chip.active { box-shadow:none; }.skill-block { padding:18px;border-radius:24px;box-shadow:none; }.skill-block__title { font-size:13px;font-weight:900; }.skill-block__heading button { min-height:40px;padding:7px 10px;font-size:12px; }
.skill-part__name { font-size:15px; }.skill-part__practice,.skill-part__delete { width:40px;height:40px;font-size:13px; }.skill-part__slider { min-height:28px; }.skill-session-summary span { padding:10px 6px;border-radius:13px;font-size:11px; }.skill-session-summary strong { font-size:14px; }.manual-session label { font-size:12px; }.manual-session .form-input { font-size:14px; }.skill-session { min-height:52px;align-items:center;font-size:14px; }.skill-session strong { font-size:12px; }
</style>
