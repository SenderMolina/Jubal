<template>
  <div class="entrenar">
    <!-- Form de creación -->
    <div v-if="creating" class="skill-create">
      <input
        ref="nameInput"
        v-model="form.name"
        class="form-input"
        type="text"
        placeholder="Nombre de la skill…"
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
      <div class="skill-create__actions">
        <button class="btn btn-primary" :disabled="busy || !form.name.trim()" @click="create">
          {{ busy ? 'Creando…' : 'Crear' }}
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

    <div v-if="store.ready && !store.skills.length" class="activity-empty">
      Aún no tienes skills. Crea la primera con el botón +.
    </div>

    <section v-for="group in groups" :key="group.status" class="skill-group" :class="`skill-group--${group.status}`">
      <h2 class="skill-group__title">{{ group.label }} <span>{{ group.items.length }}</span></h2>
      <button
        v-for="s in group.items"
        :key="s.id"
        class="skill-card"
        :class="`skill-card--${s.status}`"
        @click="$router.push(`/skill/${s.id}`)"
      >
        <div class="skill-card__top">
          <span class="skill-card__name"><i>{{ skillIcon(s.type) }}</i>{{ s.name }}</span>
          <span class="skill-card__type">{{ TYPE_LABELS[s.type] }}</span>
        </div>
        <div class="skill-card__bottom">
          <div class="skill-progress"><div class="skill-progress__bar" :style="{ width: progress(s) + '%' }"/></div>
          <span class="skill-card__percent">{{ progress(s) }}%</span>
          <span class="skill-card__meta">{{ metaLabel(s) }}</span>
        </div>
      </button>
    </section>

    <button v-if="!creating" class="fab-add-song" aria-label="Nueva skill" @click="startCreate">+</button>
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
const form      = ref({ name: '', type: 'lick', target_bpm: null })

const STATUS_LABELS = { practicing: 'Practicando', learning: 'Por aprender', mastered: 'Dominadas' }
const typeOptions = Object.entries(TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
  icon: skillIcon(value),
}))

const groups = computed(() =>
  Object.entries(STATUS_LABELS)
    .map(([status, label]) => ({ status, label, items: store.skills.filter(s => s.status === status) }))
    .filter(g => g.items.length))

const progress = skillProgress

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
  if (s.parts.length) return `${s.parts.filter(p => p.progress >= 100).length}/${s.parts.length} partes`
  if (s.target_bpm) return `${s.current_bpm || 0} / ${s.target_bpm} bpm`
  return ''
}

function skillIcon(type) {
  return { lick: 'ϟ', solo: '★', technique: '◎', song: '♫' }[type] || '♪'
}

function practice(it) {
  metronome.open(it.skill, it.target_bpm)
  router.push('/metronomo')
}

async function startCreate() {
  form.value = { name: '', type: 'lick', target_bpm: null }
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
    })
    creating.value = false
    showToast('Skill creada ✓')
  } catch (e) {
    showToast(e.message || 'No se pudo crear la skill')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  if (!store.ready) store.loadSkills()
  store.loadRoutine()
})
</script>

<style scoped>
.entrenar { max-width: 620px; margin: 0 auto; padding: 10px 0 96px; }

.skill-create {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px; margin-bottom: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.skill-create__row { display: flex; gap: 8px; }
.skill-create__row .ui-select { flex: 1; }
.skill-create__bpm { width: 110px; }
.skill-create__actions { display: flex; gap: 8px; }
.skill-create__actions .btn { flex: 1; justify-content: center; }

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

.skill-progress { flex: 1; height: 6px; border-radius: 999px; background: var(--surface2); overflow: hidden; }
.skill-progress__bar { height: 100%; border-radius: 999px; background: var(--accent); transition: width .2s; }
</style>
