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
        <select v-model="form.type" class="form-select">
          <option v-for="(label, t) in TYPE_LABELS" :key="t" :value="t">{{ label }}</option>
        </select>
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

    <section v-for="group in groups" :key="group.status" class="skill-group">
      <h2 class="skill-group__title">{{ group.label }} <span>{{ group.items.length }}</span></h2>
      <button
        v-for="s in group.items"
        :key="s.id"
        class="skill-card"
        @click="$router.push(`/skill/${s.id}`)"
      >
        <div class="skill-card__top">
          <span class="skill-card__name">{{ s.name }}</span>
          <span class="skill-card__type">{{ TYPE_LABELS[s.type] }}</span>
        </div>
        <div class="skill-card__bottom">
          <div class="skill-progress"><div class="skill-progress__bar" :style="{ width: progress(s) + '%' }"/></div>
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

const router = useRouter()
const store = usePracticeStore()
const metronome = useMetronome()
const { showToast } = useToast()

const creating  = ref(false)
const busy      = ref(false)
const nameInput = ref(null)
const form      = ref({ name: '', type: 'lick', target_bpm: null })

const STATUS_LABELS = { practicing: 'Practicando', learning: 'Por aprender', mastered: 'Dominadas' }

const groups = computed(() =>
  Object.entries(STATUS_LABELS)
    .map(([status, label]) => ({ status, label, items: store.skills.filter(s => s.status === status) }))
    .filter(g => g.items.length))

const progress = skillProgress

// Items de la rutina que tocan hoy, con su skill resuelta
const todayItems = computed(() => {
  const r = store.routine
  if (!r?.days.includes(new Date().getDay())) return []
  return r.items
    .map(it => ({ ...it, skill: store.skills.find(s => s.id === it.skill_id) }))
    .filter(it => it.skill)
})

function metaLabel(s) {
  if (s.parts.length) return `${s.parts.filter(p => p.progress >= 100).length}/${s.parts.length} partes`
  if (s.target_bpm) return `${s.current_bpm || 0} / ${s.target_bpm} bpm`
  return ''
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
.entrenar { padding: 12px 16px 90px; }

.skill-create {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px; margin-bottom: 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.skill-create__row { display: flex; gap: 8px; }
.skill-create__row .form-select { flex: 1; }
.skill-create__bpm { width: 110px; }
.skill-create__actions { display: flex; gap: 8px; }
.skill-create__actions .btn { flex: 1; justify-content: center; }

.rutina-hoy {
  background: var(--surface); border: 1px solid var(--accent);
  border-radius: var(--radius); padding: 12px 14px; margin-bottom: 18px;
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
  font-size: .85rem; font-weight: 600; color: var(--text-mid);
  margin: 0 0 8px 2px; text-transform: uppercase; letter-spacing: .04em;
}
.skill-group__title span { color: var(--text-muted); font-weight: 500; }

.skill-card {
  display: flex; flex-direction: column; gap: 10px; width: 100%;
  padding: 14px 16px; margin-bottom: 10px; cursor: pointer; text-align: left;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); color: var(--text); box-shadow: var(--shadow);
  transition: all .15s;
}
.skill-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.skill-card__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.skill-card__name { font-weight: 600; font-size: 15px; }
.skill-card__type {
  font-size: 11px; padding: 3px 10px; border-radius: 999px; flex-shrink: 0;
  background: var(--surface2); color: var(--text-mid); font-weight: 600;
}
.skill-card__bottom { display: flex; align-items: center; gap: 10px; }
.skill-card__meta { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }

.skill-progress { flex: 1; height: 5px; border-radius: 999px; background: var(--surface2); overflow: hidden; }
.skill-progress__bar { height: 100%; border-radius: 999px; background: var(--accent); transition: width .2s; }
</style>
