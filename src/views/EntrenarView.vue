<template>
  <div class="entrenar">
    <section class="practice-overview">
      <div>
        <span class="practice-overview__eyebrow">Tu camino musical</span>
        <h1>Tracker de práctica</h1>
        <p>Guarda canciones, solos, riffs y licks desde que te inspiran hasta que los dominas.</p>
      </div>
      <div class="practice-overview__stats">
        <span><strong>{{ activeCount }}</strong> en práctica</span>
        <span><strong>{{ wishlistCount }}</strong> por aprender</span>
        <span><strong>{{ weekLabel }}</strong> esta semana</span>
      </div>
    </section>

    <!-- Form de creación -->
    <div v-if="creating" class="skill-create">
      <div class="skill-create__heading">
        <div>
          <span>Nuevo objetivo</span>
          <strong>{{ form.status === 'learning' ? 'Guardar en mi lista de deseos' : 'Empezar a practicar' }}</strong>
        </div>
        <button aria-label="Cerrar" @click="creating = false">✕</button>
      </div>
      <label class="form-label" for="skill-name">¿Qué quieres aprender?</label>
      <input
        id="skill-name"
        ref="nameInput"
        v-model="form.name"
        class="form-input"
        type="text"
        :placeholder="namePlaceholder"
        maxlength="80"
        @keydown.enter="create"
      >
      <div class="skill-create__row">
        <UiSelect v-model="form.type" :options="typeOptions" aria-label="Tipo de skill" />
        <input
          v-model.number="form.target_bpm"
          class="form-input skill-create__bpm"
          type="number"
          min="20"
          max="400"
          placeholder="Meta BPM"
        >
      </div>
      <input
        v-model="form.firstPart"
        class="form-input"
        type="text"
        placeholder="Parte específica (opcional): riff de intro, compases 8–12…"
        maxlength="60"
      >
      <textarea
        v-model="form.notes"
        class="form-input skill-create__notes"
        placeholder="Artista, enlace, afinación o cualquier nota útil…"
        maxlength="500"
      />
      <div class="skill-create__destination" role="group" aria-label="Estado inicial">
        <button :class="{ active: form.status === 'learning' }" @click="form.status = 'learning'">
          <span>☆</span><strong>Lista de deseos</strong><small>Para aprender después</small>
        </button>
        <button :class="{ active: form.status === 'practicing' }" @click="form.status = 'practicing'">
          <span>▶</span><strong>En práctica</strong><small>Empezar ahora</small>
        </button>
      </div>
      <div class="skill-create__actions">
        <button class="btn btn-primary" :disabled="busy || !form.name.trim()" @click="create">
          {{ busy ? 'Guardando…' : 'Guardar objetivo' }}
        </button>
        <button class="btn" @click="creating = false">Cancelar</button>
      </div>
    </div>

    <!-- Rutina de hoy -->
    <section v-if="todayItems.length" class="rutina-hoy">
      <div class="rutina-hoy__head">
        <h2 class="skill-group__title">Rutina de hoy</h2>
        <RouterLink class="rutina-hoy__edit" to="/rutina">Editar</RouterLink>
      </div>
      <div v-for="it in todayItems" :key="it.id" class="rutina-hoy__item">
        <div class="rutina-hoy__info">
          <span class="rutina-hoy__name">{{ it.skill.name }}</span>
          <span class="rutina-hoy__meta">
            {{ [it.planned_minutes && `${it.planned_minutes} min`, it.target_bpm && `${it.target_bpm} bpm`].filter(Boolean).join(' · ') }}
          </span>
        </div>
        <button class="rutina-hoy__play" aria-label="Practicar" @click="practice(it)">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
    </section>
    <RouterLink v-else class="rutina-hoy__link" to="/rutina">Mi rutina ›</RouterLink>

    <div v-if="store.skills.length" class="skill-tools">
      <label class="skill-search">
        <span aria-hidden="true">⌕</span>
        <input v-model="query" type="search" placeholder="Buscar canción, lick, solo…" aria-label="Buscar objetivos">
      </label>
      <div class="skill-filters" role="group" aria-label="Filtrar por tipo">
        <button
          v-for="option in filterOptions"
          :key="option.value"
          :class="{ active: typeFilter === option.value }"
          @click="typeFilter = option.value"
        >{{ option.label }}</button>
      </div>
    </div>

    <div v-if="store.ready && !store.skills.length" class="activity-empty">
      <strong>Tu tracker está listo.</strong>
      Agrega esa canción, riff o solo que llevas tiempo queriendo aprender.
    </div>
    <div v-else-if="store.ready && store.skills.length && !filteredSkills.length" class="activity-empty">
      No hay objetivos que coincidan con la búsqueda.
    </div>

    <section v-for="group in groups" :key="group.status" class="skill-group" :class="`skill-group--${group.status}`">
      <h2 class="skill-group__title">{{ group.label }} <span>{{ group.items.length }}</span></h2>
      <article
        v-for="s in group.items"
        :key="s.id"
        class="skill-card"
        :class="`skill-card--${s.status}`"
        role="button"
        tabindex="0"
        @click="$router.push(`/skill/${s.id}`)"
        @keydown.enter="$router.push(`/skill/${s.id}`)"
      >
        <div class="skill-card__top">
          <span class="skill-card__name"><i>{{ skillIcon(s.type) }}</i>{{ s.name }}</span>
          <span class="skill-card__type">{{ TYPE_LABELS[s.type] }}</span>
        </div>
        <div class="skill-card__bottom">
          <div class="skill-progress"><div class="skill-progress__bar" :style="{ width: progress(s) + '%' }"/></div>
          <span class="skill-card__percent">{{ progress(s) }}%</span>
          <span class="skill-card__meta">{{ metaLabel(s) }}</span>
          <button
            v-if="s.status !== 'learning'"
            class="skill-card__practice"
            aria-label="Practicar ahora"
            @click.stop="practiceSkill(s)"
          >▶</button>
        </div>
      </article>
    </section>

    <button v-if="!creating" class="fab-add-song" aria-label="Nuevo objetivo de práctica" @click="startCreate">+</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useMetronome } from '../composables/useMetronome'
import { TYPE_LABELS, skillProgress } from '../utils/skills'
import UiSelect from '../components/UiSelect.vue'

const router = useRouter()
const store = usePracticeStore()
const metronome = useMetronome()
const { showToast } = useToast()

const creating  = ref(false)
const busy      = ref(false)
const nameInput = ref(null)
const sessions  = ref([])
const query      = ref('')
const typeFilter = ref('all')
const form      = ref(emptyForm())

const STATUS_LABELS = { practicing: 'En práctica', learning: 'Lista de deseos', mastered: 'Dominadas' }
const typeOptions = Object.entries(TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
  icon: skillIcon(value),
}))
const filterOptions = [
  { value: 'all', label: 'Todo' },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

const namePlaceholder = computed(() => ({
  song: 'Ej. Little Wing',
  solo: 'Ej. Solo de Hotel California',
  lick: 'Ej. Riff principal de Back in Black',
  technique: 'Ej. Alternate picking',
}[form.value.type]))

const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase('es'))
const filteredSkills = computed(() => store.skills.filter(skill => {
  const matchesType = typeFilter.value === 'all' || skill.type === typeFilter.value
  const haystack = [skill.name, skill.notes, skill.song?.author, ...skill.parts.map(part => part.name)]
    .filter(Boolean).join(' ').toLocaleLowerCase('es')
  return matchesType && (!normalizedQuery.value || haystack.includes(normalizedQuery.value))
}))

const groups = computed(() =>
  Object.entries(STATUS_LABELS)
    .map(([status, label]) => ({ status, label, items: filteredSkills.value.filter(s => s.status === status) }))
    .filter(g => g.items.length))

const progress = skillProgress
const activeCount = computed(() => store.skills.filter(s => s.status === 'practicing').length)
const wishlistCount = computed(() => store.skills.filter(s => s.status === 'learning').length)
const weeklySeconds = computed(() => {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000
  return sessions.value
    .filter(session => new Date(session.practiced_at).getTime() >= since)
    .reduce((total, session) => total + Number(session.duration_seconds || 0), 0)
})
const weekLabel = computed(() => formatCompactDuration(weeklySeconds.value))

// Items de la rutina que tocan hoy, con su skill resuelta
const todayItems = computed(() => {
  const day = new Date().getDay()
  return (store.routines || [])
    .filter(routine => routine.days?.includes(day))
    .flatMap(routine => routine.sections.flatMap(section => section.items.map(item => ({
      ...item,
      sectionName: section.name,
      skill: store.skills.find(skill => skill.id === item.skill_id),
    }))))
    .filter(it => it.skill)
})

function metaLabel(s) {
  const partProgress = s.parts.length
    ? `${s.parts.filter(p => p.progress >= 100).length}/${s.parts.length} partes`
    : (s.target_bpm ? `${s.current_bpm || 0} / ${s.target_bpm} bpm` : '')
  const last = sessions.value.find(session => session.skill_id === s.id)
  const recent = last ? relativeDate(last.practiced_at) : ''
  const reference = !s.song?.author && s.notes ? s.notes.split('\n')[0].slice(0, 32) : ''
  return [s.song?.author || reference, s.song?.key && `tono ${s.song.key}`, partProgress, recent].filter(Boolean).join(' · ')
}

function skillIcon(type) {
  return { lick: 'ϟ', solo: '★', technique: '◎', song: '♫' }[type] || '♪'
}

function practice(it) {
  const part = it.skill.parts.find(p => p.id === it.part_id) || null
  metronome.open(it.skill, it.target_bpm, part)
  router.push('/metronomo')
}

function practiceSkill(selectedSkill) {
  metronome.open(selectedSkill)
  router.push('/metronomo')
}

function emptyForm() {
  return { name: '', type: 'song', target_bpm: null, firstPart: '', notes: '', status: 'learning' }
}

async function startCreate() {
  form.value = emptyForm()
  creating.value = true
  await nextTick()
  nameInput.value?.focus()
}

async function create() {
  if (!form.value.name.trim() || busy.value) return
  busy.value = true
  try {
    await store.createSkill({
      name: form.value.name.trim(),
      type: form.value.type,
      target_bpm: form.value.target_bpm || null,
      status: form.value.status,
      notes: form.value.notes.trim() || null,
      parts: form.value.firstPart.trim() ? [form.value.firstPart.trim()] : [],
    })
    creating.value = false
    showToast(form.value.status === 'learning' ? 'Agregado a tu lista de deseos ☆' : 'Objetivo listo para practicar ✓')
  } catch (e) {
    showToast(e.message || 'No se pudo crear la skill')
  } finally {
    busy.value = false
  }
}

function formatCompactDuration(seconds) {
  if (!seconds) return '0 min'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours ? `${hours} h ${minutes ? `${minutes} min` : ''}`.trim() : `${Math.max(1, minutes)} min`
}

function relativeDate(value) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  sessions.value = await store.loadAllSessions()
  store.loadRoutine()
})
</script>

<style scoped>
.entrenar { max-width: 620px; margin: 0 auto; padding: 10px 0 96px; }

.practice-overview {
  padding: 18px; margin-bottom: 16px; border-radius: 22px; color: #fff;
  background: linear-gradient(145deg, #093949, #08788a);
  box-shadow: 0 14px 30px rgba(6, 73, 85, .2);
}
.practice-overview__eyebrow { color: #9be7eb; font-size: 9px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.practice-overview h1 { margin: 4px 0 5px; font-size: 22px; }
.practice-overview p { max-width: 470px; margin: 0; color: rgba(255,255,255,.7); font-size: 12px; line-height: 1.45; }
.practice-overview__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 16px; }
.practice-overview__stats span { padding: 8px 6px; border-radius: 12px; background: rgba(255,255,255,.09); color: rgba(255,255,255,.68); font-size: 9px; text-align: center; }
.practice-overview__stats strong { display: block; color: #fff; font-size: 15px; font-variant-numeric: tabular-nums; }

.skill-create {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px; margin-bottom: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.skill-create__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.skill-create__heading > div { display: flex; flex-direction: column; gap: 2px; }
.skill-create__heading span { color: var(--text-muted); font-size: 9px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.skill-create__heading strong { font-size: 15px; }
.skill-create__heading > button { padding: 4px; border: 0; background: none; color: var(--text-muted); cursor: pointer; }
.form-label { color: var(--text-mid); font-size: 11px; font-weight: 700; }
.skill-create__row { display: flex; gap: 8px; }
.skill-create__row .ui-select { flex: 1; }
.skill-create__bpm { width: 110px; }
.skill-create__actions { display: flex; gap: 8px; }
.skill-create__actions .btn { flex: 1; justify-content: center; }
.skill-create__notes { min-height: 70px; resize: vertical; font: inherit; }
.skill-create__destination { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.skill-create__destination button { display: grid; grid-template-columns: auto 1fr; column-gap: 7px; padding: 10px; text-align: left; cursor: pointer; color: var(--text-mid); background: var(--surface2); border: 1px solid var(--border); border-radius: 12px; }
.skill-create__destination button > span { grid-row: 1 / 3; align-self: center; color: var(--accent2); font-size: 18px; }
.skill-create__destination button strong { font-size: 11px; }
.skill-create__destination button small { color: var(--text-muted); font-size: 9px; }
.skill-create__destination button.active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent2); }

.rutina-hoy {
  background: linear-gradient(120deg, var(--surface), var(--accent-soft)); border: 1px solid rgba(var(--brand-rgb), .4);
  border-radius: 18px; padding: 12px 14px; margin-bottom: 16px; box-shadow: var(--shadow);
}
.rutina-hoy__head { display: flex; justify-content: space-between; align-items: baseline; }
.rutina-hoy__edit { font-size: 12px; color: var(--accent); text-decoration: none; font-weight: 600; }
.rutina-hoy__item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--border);
}
.rutina-hoy__item:last-child { border-bottom: none; }
.rutina-hoy__info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rutina-hoy__name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rutina-hoy__meta { font-size: 12px; color: var(--text-muted); }
.rutina-hoy__play {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; cursor: pointer;
  background: var(--accent); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
}
.rutina-hoy__play svg { width: 18px; height: 18px; }

.rutina-hoy__link {
  display: block; margin-bottom: 16px; font-size: 13px; font-weight: 600;
  color: var(--text-mid); text-decoration: none;
}

.skill-tools { margin-bottom: 16px; }
.skill-search { display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--border); border-radius: 13px; background: var(--surface); }
.skill-search > span { color: var(--text-muted); font-size: 20px; transform: rotate(-15deg); }
.skill-search input { width: 100%; padding: 11px 0; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; font-size: 13px; }
.skill-filters { display: flex; gap: 6px; padding-top: 8px; overflow-x: auto; scrollbar-width: none; }
.skill-filters::-webkit-scrollbar { display: none; }
.skill-filters button { padding: 6px 10px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); color: var(--text-mid); font: inherit; font-size: 10px; white-space: nowrap; cursor: pointer; }
.skill-filters button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.activity-empty { display: flex; flex-direction: column; gap: 4px; padding: 28px 20px; text-align: center; color: var(--text-muted); }
.activity-empty strong { color: var(--text); }

.skill-group { margin-bottom: 18px; }
.skill-group__title {
  display: flex; align-items: center; gap: 6px; font-size: .68rem; font-weight: 800; color: var(--text-mid);
  margin: 0 0 7px 2px; text-transform: uppercase; letter-spacing: .08em;
}
.skill-group__title::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--border); }
.skill-group--practicing .skill-group__title::before { background: var(--action); box-shadow: 0 0 0 4px var(--action-soft); }
.skill-group--mastered .skill-group__title::before { background: var(--green); box-shadow: 0 0 0 4px var(--green-soft); }
.skill-group--learning .skill-group__title::before { background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.skill-group__title span { color: var(--text-muted); font-weight: 500; }

.skill-card {
  display: flex; flex-direction: column; gap: 10px; width: 100%;
  position: relative; overflow: hidden; padding: 12px 13px; margin-bottom: 8px; cursor: pointer; text-align: left;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 16px; color: var(--text); box-shadow: var(--shadow);
  transition: all .15s;
}
.skill-card::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--accent); }
.skill-card--practicing::before { background: var(--action); }.skill-card--mastered::before { background: var(--green); }
.skill-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.skill-card__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.skill-card__name { min-width: 0; display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.skill-card__name i { width: 27px; height: 27px; flex: 0 0 27px; display: grid; place-items: center; border-radius: 9px; background: var(--accent-soft); color: var(--accent2); font-size: 13px; font-style: normal; }
.skill-card__type {
  font-size: 9px; padding: 3px 8px; border-radius: 999px; flex-shrink: 0;
  background: var(--surface2); color: var(--text-mid); font-weight: 600;
}
.skill-card__bottom { display: flex; align-items: center; gap: 10px; }
.skill-card__meta { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
.skill-card__percent { color: var(--accent2); font-size: 9px; font-weight: 900; font-variant-numeric: tabular-nums; }
.skill-card__practice { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; background: var(--accent); color: #fff; font-size: 9px; cursor: pointer; }

.skill-progress { flex: 1; height: 6px; border-radius: 999px; background: var(--surface2); overflow: hidden; }
.skill-progress__bar { height: 100%; border-radius: 999px; background: var(--accent); transition: width .2s; }

@media (max-width: 420px) {
  .practice-overview__stats span { font-size: 8px; }
  .skill-card__meta { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

.practice-overview { padding:20px;border:1px solid rgba(142,202,230,.26);border-radius:28px;background:radial-gradient(circle at 12% 4%,rgba(255,255,255,.14),transparent 30%),linear-gradient(145deg,#0c5264,#219ebc);box-shadow:0 8px 0 #0a596c,0 14px 25px rgba(0,0,0,.24); }.practice-overview__eyebrow { color:#ffd15c;font-size:12px; }.practice-overview h1 { font-size:26px; }.practice-overview p { font-size:14px; }.practice-overview__stats span { font-size:11px; }.practice-overview__stats strong { font-size:18px; }
.skill-create { padding:18px;border-radius:24px;box-shadow:var(--shadow); }.skill-create__heading span,.form-label { font-size:12px; }.skill-create__heading strong { font-size:17px; }.skill-create__destination button { min-height:64px; }.skill-create__destination button strong { font-size:13px; }.skill-create__destination button small { font-size:11px; }
.skill-group__title { margin-bottom:10px;font-size:12px; }.skill-card { min-height:86px;padding:15px 16px;margin-bottom:11px;border-radius:20px;box-shadow:0 5px 0 #0b2028,0 9px 16px rgba(0,0,0,.16); }.skill-card:active { transform:translateY(3px);box-shadow:0 2px 0 #0b2028; }.skill-card__name { font-size:15px;font-weight:900; }.skill-card__name i { width:38px;height:38px;flex-basis:38px;border-radius:12px;font-size:17px;box-shadow:inset 0 2px 0 rgba(255,255,255,.09),0 3px 0 rgba(0,0,0,.13); }.skill-card__type { padding:5px 9px;font-size:11px;font-weight:800; }.skill-card__meta { font-size:12px; }.skill-card__percent { font-size:11px; }.skill-card__practice { width:42px;height:42px;flex-basis:42px;font-size:12px;box-shadow:0 4px 0 #126f85; }.skill-progress { height:12px; }
@media (max-width:420px) { .practice-overview__stats span { font-size:10px; }.skill-card__meta { max-width:108px; } }
</style>
