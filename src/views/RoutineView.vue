<template>
  <div class="routine-builder">
    <header class="routine-intro">
      <h2>Rutinas</h2>
      <button class="routine-new" aria-label="Nueva rutina" @click="startCreateRoutine">＋</button>
    </header>

    <form v-if="creatingRoutine" class="routine-create" @submit.prevent="createNewRoutine">
      <input ref="routineNameInput" v-model="newRoutineName" class="form-input" maxlength="60" placeholder="Nombre de la rutina" aria-label="Nombre de la nueva rutina">
      <button class="btn btn-primary btn-sm" :disabled="busy || !newRoutineName.trim()">Crear</button>
      <button type="button" class="btn btn-ghost btn-sm" @click="creatingRoutine = false">Cancelar</button>
    </form>

    <nav v-if="routines.length" class="routine-tabs" aria-label="Tus rutinas">
      <button
        v-for="item in routines"
        :key="item.id"
        :class="{ active: routine?.id === item.id }"
        @click="store.selectRoutine(item.id)"
      >
        <b aria-hidden="true">{{ routine?.id === item.id ? '◆' : '◇' }}</b>
        <span>{{ item.name }}</span>
        <small>{{ routineMinutes(item) }} min · {{ item.items?.length || 0 }} habilidades</small>
      </button>
    </nav>

    <template v-if="routine">
      <section class="routine-overview">
        <div class="routine-overview__top">
          <span class="routine-overview__icon">♬</span>
          <div>
            <input id="routine-name" :value="routine.name" maxlength="60" aria-label="Nombre de la rutina" @change="renameRoutine($event.target.value)">
          </div>
          <button v-if="routines.length > 1" class="routine-delete" aria-label="Eliminar rutina" @click="removeCurrentRoutine">×</button>
        </div>
        <div class="routine-stats">
          <span><b>{{ totalMinutes }}</b> min totales</span>
          <span><b>{{ routine.items.length }}</b> ejercicios</span>
          <span><b>{{ routine.sections.length }}</b> secciones</span>
        </div>
        <button v-if="routine.items.length" class="routine-play" @click="router.push(`/rutina/jugar/${routine.id}`)"><span>▶</span><b>Iniciar · {{ totalMinutes }} min</b></button>
      </section>

      <section class="routine-days-card">
        <div class="routine-block-title">
          <h3>Días de práctica</h3>
          <small>{{ routine.days.length ? `${routine.days.length} por semana` : 'Sin asignar' }}</small>
        </div>
        <div class="routine-days">
          <button
            v-for="(day, index) in DAYS"
            :key="day.short"
            :class="{ active: routine.days.includes(index) }"
            :aria-label="day.label"
            :aria-pressed="routine.days.includes(index)"
            @click="toggleDay(index)"
          ><span>{{ day.short }}</span><small>{{ day.label.slice(0, 3) }}</small></button>
        </div>
      </section>

      <div class="routine-sections">
        <section v-for="(section, sectionIndex) in routine.sections" :key="section.id" class="routine-section">
          <header class="routine-section__head">
            <span class="routine-section__number">{{ String(sectionIndex + 1).padStart(2, '0') }}</span>
            <div class="routine-section__name">
              <input :value="section.name" maxlength="60" aria-label="Nombre de la sección" @change="renameSection(section, $event.target.value)">
            </div>
            <small class="routine-section__minutes">{{ sectionMinutes(section) }} min</small>
            <button
              v-if="routine.sections.length > 1"
              aria-label="Eliminar sección"
              @click="removeSection(section)"
            >×</button>
          </header>

          <div v-if="section.items.length" class="routine-exercises">
            <article v-for="(item, itemIndex) in section.items" :key="item.id" class="routine-exercise">
              <div class="routine-exercise__main">
                <div class="routine-exercise__order">
                  <button :disabled="itemIndex === 0" aria-label="Mover arriba" @click="store.moveRoutineItem(item.id, -1, section.id)">↑</button>
                  <button :disabled="itemIndex === section.items.length - 1" aria-label="Mover abajo" @click="store.moveRoutineItem(item.id, 1, section.id)">↓</button>
                </div>
                <span class="routine-exercise__icon">{{ skillIcon(skill(item.skill_id)?.type) }}</span>
                <div class="routine-exercise__identity">
                  <strong>{{ skill(item.skill_id)?.name || 'Ejercicio eliminado' }}</strong>
                  <small>{{ [skillType(skill(item.skill_id)?.type), part(item)?.name].filter(Boolean).join(' · ') }}</small>
                </div>
                <button class="routine-exercise__remove" aria-label="Quitar ejercicio" @click="store.removeRoutineItem(item.id)">×</button>
              </div>

              <label v-if="skill(item.skill_id)?.parts.length" class="routine-part-select">
                <span>Parte o sección</span>
                <UiSelect
                  :model-value="item.part_id || ''"
                  :options="partOptions(skill(item.skill_id))"
                  placeholder="Skill completa"
                  aria-label="Parte de la habilidad"
                  @update:model-value="store.updateRoutineItem(item.id, { part_id: $event || null })"
                />
              </label>

              <div class="routine-exercise__settings">
                <label>
                  <span>Tiempo</span>
                  <span class="routine-number"><input type="number" min="1" max="240" :value="item.planned_minutes || 10" @change="updateNumber(item, 'planned_minutes', $event, 10)"><small>min</small></span>
                </label>
                <label>
                  <span>Meta</span>
                  <span class="routine-number"><input type="number" min="20" max="400" :value="item.target_bpm || ''" placeholder="—" @change="updateNumber(item, 'target_bpm', $event, null)"><small>BPM</small></span>
                </label>
                <label class="routine-break-select">
                  <span>Descanso</span>
                  <UiSelect
                    :model-value="item.break_after_minutes || 0"
                    :options="BREAK_OPTIONS"
                    aria-label="Descanso después del ejercicio"
                    @update:model-value="store.updateRoutineItem(item.id, { break_after_minutes: Number($event) })"
                  />
                </label>
              </div>

              <div v-if="item.break_after_minutes" class="routine-break">
                <span>☕</span><b>Descanso</b><small>{{ item.break_after_minutes }} min antes del siguiente ejercicio</small>
              </div>
            </article>
          </div>
          <div v-else class="routine-section__empty"><strong>Sección vacía</strong></div>

          <button v-if="store.skills.length" class="routine-add-exercise" @click="openSkillPicker(section)">
            <span>＋</span><b>Agregar ejercicio</b><i>›</i>
          </button>
          <RouterLink v-else-if="!store.skills.length" class="routine-create-skill" to="/entrenar/nuevo">＋ Crear un ejercicio</RouterLink>
        </section>
      </div>

      <form v-if="creatingSection" class="routine-section-create" @submit.prevent="createSection">
        <input v-model="newSectionName" class="form-input" maxlength="60" placeholder="Ej: Técnica, Repertorio…">
        <button class="btn btn-primary btn-sm" :disabled="busy || !newSectionName.trim()">Agregar</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="creatingSection = false">Cancelar</button>
      </form>
      <button v-else class="routine-add-section" @click="creatingSection = true"><span>＋</span> Agregar sección</button>
    </template>

    <div v-else-if="store.routineError" class="routine-error">
      <span>!</span>
      <div>
        <strong>Actualización requerida</strong>
        <p>{{ store.routineError }}</p>
        <small>Ejecuta <b>supabase/phase5_routine_builder.sql</b> en el SQL Editor de Supabase y recarga esta pantalla.</small>
      </div>
    </div>
    <p v-else class="routine-loading">Cargando constructor de rutinas…</p>

    <Teleport to="body">
      <Transition name="skill-sheet">
        <div v-if="skillPickerSection" class="skill-picker" role="dialog" aria-modal="true" aria-labelledby="skill-picker-title" @click.self="closeSkillPicker">
          <section class="skill-picker__sheet">
            <div class="skill-picker__handle"></div>
            <header>
              <h2 id="skill-picker-title">Agregar ejercicio</h2>
              <button aria-label="Cerrar" @click="closeSkillPicker">×</button>
            </header>
            <input v-model="pickerQuery" class="form-input skill-picker__search" type="search" placeholder="Buscar ejercicio, fuente o técnica…" aria-label="Buscar ejercicio">
            <template v-for="group in pickerGroups" :key="group.id || 'sin-fuente'">
            <h3 class="skill-picker__group">{{ group.name }} <span>{{ group.items.length }}</span></h3>
            <div class="skill-picker__grid">
              <button v-for="item in group.items" :key="item.id" class="skill-card" :class="`skill-card--${item.type || 'other'}`" :disabled="busy" @click="addExercise(skillPickerSection, item.id)">
                <span class="skill-card__icon">{{ skillIcon(item.type) }}</span>
                <span class="skill-card__body">
                  <small>{{ store.techniqueNames(item).join(', ') || skillType(item.type) }}</small>
                  <strong>{{ item.name }}</strong>
                  <span class="skill-card__track"><i :style="{ width: `${skillMastery(item)}%` }"></i></span>
                  <em>{{ skillMastery(item) }}% dominio <template v-if="item.current_bpm">· {{ item.current_bpm }} BPM</template></em>
                </span>
                <span class="skill-card__add">＋</span>
              </button>
            </div>
            </template>
            <p v-if="!pickerGroups.length" class="skill-picker__empty">Sin coincidencias.</p>
            <RouterLink class="skill-picker__create" to="/entrenar/nuevo" @click="closeSkillPicker">＋ Crear un ejercicio nuevo</RouterLink>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { TYPE_LABELS, groupBySource, skillProgress } from '../utils/skills'
import UiSelect from '../components/UiSelect.vue'

const DAYS = [
  { short: 'D', label: 'Domingo' }, { short: 'L', label: 'Lunes' },
  { short: 'M', label: 'Martes' }, { short: 'X', label: 'Miércoles' },
  { short: 'J', label: 'Jueves' }, { short: 'V', label: 'Viernes' },
  { short: 'S', label: 'Sábado' },
]
const BREAK_OPTIONS = [
  { value: 0, label: 'Sin pausa' }, { value: 1, label: '1 min' },
  { value: 2, label: '2 min' }, { value: 3, label: '3 min' },
  { value: 5, label: '5 min' }, { value: 10, label: '10 min' },
]
const store = usePracticeStore()
const router = useRouter()
const { attempt } = useToast()
const { confirm } = useConfirm()
const routines = computed(() => store.routines || [])
const routine = computed(() => store.routine?.sections ? store.routine : null)
const creatingRoutine = ref(false)
const creatingSection = ref(false)
const newRoutineName = ref('')
const newSectionName = ref('')
const skillPickerSection = ref(null)
const routineNameInput = ref(null)
const busy = ref(false)

// Selector agrupado por fuente; los concluidos quedan fuera para no estorbar.
const pickerQuery = ref('')
const pickerGroups = computed(() => {
  const q = pickerQuery.value.trim().toLocaleLowerCase('es')
  return groupBySource(store.skills
    .filter(item => item.status !== 'mastered')
    .filter(item => !q || [item.name, store.sourceName(item), ...store.techniqueNames(item)].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })), store.sources)
})
const totalMinutes = computed(() => routineMinutes(routine.value))

function skill(id) { return store.skills.find(item => item.id === id) }
function part(item) { return skill(item.skill_id)?.parts.find(value => value.id === item.part_id) }
function partOptions(item) {
  return [{ value: '', label: 'Skill completa' }, ...(item?.parts || []).map(value => ({ value: value.id, label: value.name }))]
}
function skillType(type) { return TYPE_LABELS[type] || 'Ejercicio' }
function skillIcon(type) { return { lick: 'ϟ', solo: '★', technique: '◎', song: '♫' }[type] || '♪' }
function skillMastery(item) { return skillProgress(item) }
function sectionMinutes(section) {
  return section.items.reduce((total, item) => total + (Number(item.planned_minutes) || 0) + (Number(item.break_after_minutes) || 0), 0)
}
function routineMinutes(value) { return value?.sections?.reduce((total, section) => total + sectionMinutes(section), 0) || 0 }

async function run(action, success) {
  busy.value = true
  try {
    return await attempt(action, { success, error: 'No se pudo guardar el cambio.' })
  } finally { busy.value = false }
}
async function createNewRoutine() {
  const name = newRoutineName.value.trim()
  if (!name) return
  await run(() => store.createRoutine(name), 'Rutina creada')
  newRoutineName.value = ''
  creatingRoutine.value = false
}
async function startCreateRoutine() {
  creatingRoutine.value = true
  await nextTick()
  routineNameInput.value?.focus()
}
async function renameRoutine(name) {
  const cleanName = name.trim()
  if (!cleanName || cleanName === routine.value.name) return
  await run(() => store.updateRoutine(routine.value.id, { name: cleanName }))
}
async function removeCurrentRoutine() {
  const ok = await confirm('Eliminar rutina', `¿Eliminar “${routine.value.name}” y todo su contenido?`)
  if (ok) await run(() => store.deleteRoutine(routine.value.id), 'Rutina eliminada')
}
function toggleDay(day) {
  const days = routine.value.days.includes(day)
    ? routine.value.days.filter(value => value !== day)
    : [...routine.value.days, day].sort()
  run(() => store.updateRoutineDays(days))
}
async function createSection() {
  const name = newSectionName.value.trim()
  if (!name) return
  await run(() => store.addRoutineSection(name), 'Sección agregada')
  newSectionName.value = ''
  creatingSection.value = false
}
function renameSection(section, name) {
  const cleanName = name.trim()
  if (cleanName && cleanName !== section.name) run(() => store.updateRoutineSection(section.id, { name: cleanName }))
}
async function removeSection(section) {
  const detail = section.items.length ? `También se quitarán ${section.items.length} ejercicio(s).` : ''
  const ok = await confirm('Eliminar sección', `¿Eliminar “${section.name}”? ${detail}`)
  if (ok) await run(() => store.removeRoutineSection(section.id), 'Sección eliminada')
}
function openSkillPicker(section) { skillPickerSection.value = section }
function closeSkillPicker() { skillPickerSection.value = null; pickerQuery.value = '' }
async function addExercise(section, skillId) {
  if (!skillId) return
  const selected = skill(skillId)
  await run(() => store.addRoutineItem({
    section_id: section.id,
    skill_id: skillId,
    part_id: selected?.parts.length === 1 ? selected.parts[0].id : null,
    planned_minutes: 10,
    target_bpm: selected?.current_bpm || selected?.target_bpm || null,
  }), 'Ejercicio agregado')
  closeSkillPicker()
}
function updateNumber(item, field, event, fallback) {
  const raw = event.target.value
  const value = raw === '' ? fallback : Number(raw)
  run(() => store.updateRoutineItem(item.id, { [field]: value }))
}

onMounted(async () => {
  if (!store.ready) await store.loadSkills()
  if (store.loadRoutines) await store.loadRoutines()
  else await store.loadRoutine?.()
})
</script>

<style scoped>
.routine-builder { max-width: 620px; margin: 0 auto; padding: 8px 0 100px; display: flex; flex-direction: column; gap: 12px; }
.routine-intro { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 2px; }.routine-block-title span,.routine-section__head > div > span { color: var(--color-primary-hover); font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }.routine-intro h2 { margin-top: 2px; font-size: 18px; }.routine-intro p { margin-top: 3px; color: var(--color-text-secondary); font-size: 10px; }.routine-new { width: 38px; height: 38px; flex: 0 0 38px; border: 0; border-radius: 13px; background: var(--color-primary); color: var(--color-text-on-primary); font: inherit; font-size: 22px; cursor: pointer; box-shadow: var(--shadow-small); }
.routine-create,.routine-section-create { display: grid; grid-template-columns: 1fr auto auto; gap: 7px; padding: 10px; border: 1px solid var(--color-border); border-radius: 15px; background: var(--color-surface); box-shadow: var(--shadow-small); }.routine-tabs { display: flex; gap: 7px; overflow-x: auto; padding: 2px 1px 5px; scrollbar-width: none; }.routine-tabs::-webkit-scrollbar { display: none; }.routine-tabs button { min-width: 145px; max-width: 175px; display: grid; grid-template-columns: 22px 1fr; gap: 1px 4px; padding: 9px 10px; border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface); color: var(--color-text-secondary); text-align: left; cursor: pointer; box-shadow: var(--shadow-small); }.routine-tabs button.active { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary-hover); box-shadow: 0 5px 13px rgba(var(--color-primary-rgb),.14); }.routine-tabs b { grid-row: 1/3; align-self: center; color: var(--color-primary); font-size: 18px; text-align: center; }.routine-tabs span { overflow: hidden; font-size: 10px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }.routine-tabs small { overflow: hidden; color: var(--color-text-muted); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.routine-overview { overflow: hidden; border: 1px solid rgba(var(--color-primary-rgb),.28); border-radius: 18px; background: var(--color-surface); box-shadow: var(--shadow-small); }.routine-overview__top { display: flex; align-items: center; gap: 10px; padding: 13px; }.routine-overview__icon { width: 39px; height: 39px; flex: 0 0 39px; display: grid; place-items: center; border-radius: 13px; background: var(--color-primary); color: var(--color-text-on-primary); font-size: 18px; }.routine-overview__top > div { min-width: 0; flex: 1; }.routine-overview label { display: block; color: var(--color-text-muted); font-size: 7px; font-weight: 800; text-transform: uppercase; }.routine-overview input,.routine-section__head input { width: 100%; margin-top: 2px; border: 0; border-bottom: 1px solid transparent; background: transparent; color: var(--color-text-primary); font: inherit; font-size: 13px; font-weight: 800; outline: 0; }.routine-overview input:focus,.routine-section__head input:focus { border-bottom-color: var(--color-focus); }.routine-delete,.routine-section__head > button { width: 27px; height: 27px; border: 1px solid rgba(var(--color-danger-rgb),.18); border-radius: 50%; background: var(--color-danger-soft); color: var(--color-danger); font: inherit; cursor: pointer; }.routine-stats { display: grid; grid-template-columns: repeat(3,1fr); border-top: 1px solid rgba(var(--color-primary-rgb),.16); }.routine-stats span { padding: 9px 4px; color: var(--color-text-secondary); font-size: 7px; text-align: center; border-right: 1px solid rgba(var(--color-primary-rgb),.14); }.routine-stats span:last-child { border-right: 0; }.routine-stats b { color: var(--color-text-primary); font-size: 10px; }
.routine-play { width:calc(100% - 22px);display:grid;grid-template-columns:34px 1fr;align-items:center;gap:0 8px;margin:0 11px 11px;padding:8px 11px;border:0;border-radius:13px;background:var(--color-primary);color:var(--color-text-on-primary);font:inherit;text-align:left;box-shadow:var(--shadow-small);cursor:pointer; }.routine-play>span { grid-row:1/3;width:31px;height:31px;display:grid;place-items:center;border-radius:50%;background:var(--color-primary-hover);font-size:11px; }.routine-play b { align-self:end;font-size:10px; }.routine-play small { align-self:start;color:var(--color-text-on-primary);font-size:7px; }
.routine-days-card,.routine-section { border: 1px solid var(--color-border); border-radius: 18px; background: var(--color-surface); box-shadow: var(--shadow-small); }.routine-days-card { padding: 13px; }.routine-block-title { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 11px; }.routine-block-title h3 { margin-top: 2px; font-size: 13px; }.routine-block-title small { color: var(--color-text-muted); font-size: 8px; }.routine-days { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; }.routine-days button { aspect-ratio: .82; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; border: 1px solid var(--color-border); border-radius: 11px; background: var(--color-surface-secondary); color: var(--color-text-secondary); cursor: pointer; }.routine-days button span { font-size: 10px; font-weight: 900; }.routine-days button small { font-size: 6px; }.routine-days button.active { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-text-on-primary); box-shadow: none; }
.routine-sections { display: flex; flex-direction: column; gap: 11px; }.routine-section { overflow: hidden; }.routine-section__head { display: flex; align-items: center; gap: 9px; padding: 11px 12px; border-bottom: 1px solid var(--color-border); background: var(--color-surface-secondary); }.routine-section__number { width: 31px; height: 31px; flex: 0 0 31px; display: grid; place-items: center; border-radius: 10px; background: var(--color-primary-soft); color: var(--color-primary-hover); font-size: 10px; font-weight: 900; }.routine-section__head > div { min-width: 0; flex: 1; }.routine-section__head input { font-size: 12px; }
.routine-exercises { padding: 0 11px; }.routine-exercise { padding: 11px 0; border-bottom: 1px solid var(--color-border); }.routine-exercise__main { display: flex; align-items: center; gap: 8px; }.routine-exercise__order { display: flex; flex-direction: column; }.routine-exercise__order button { width: 20px; height: 17px; border: 0; background: transparent; color: var(--color-text-muted); font-size: 9px; cursor: pointer; }.routine-exercise__order button:disabled { opacity: .2; }.routine-exercise__icon { width: 31px; height: 31px; flex: 0 0 31px; display: grid; place-items: center; border-radius: 10px; background: var(--color-accent-soft); color: var(--color-accent-text); font-size: 13px; }.routine-exercise__identity { min-width: 0; flex: 1; display: flex; flex-direction: column; }.routine-exercise__identity strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.routine-exercise__identity small { color: var(--color-text-muted); font-size: 7px; }.routine-exercise__remove { width: 25px; height: 25px; border: 0; border-radius: 8px; background: var(--color-danger-soft); color: var(--color-danger); cursor: pointer; }
.routine-exercise__settings { display: grid; grid-template-columns: .8fr .9fr 1.3fr; gap: 6px; margin: 9px 0 0 28px; }.routine-exercise__settings > label { min-width: 0; display: flex; flex-direction: column; gap: 3px; color: var(--color-text-muted); font-size: 7px; font-weight: 800; text-transform: uppercase; }.routine-number { height: 32px; display: flex; align-items: center; overflow: hidden; border: 1px solid var(--color-border); border-radius: 9px; background: var(--color-surface-secondary); }.routine-number input { width: 100%; min-width: 0; padding: 6px 2px 6px 7px; border: 0; outline: 0; background: transparent; color: var(--color-text-primary); font: inherit; font-size: 10px; font-weight: 800; }.routine-number small { padding-right: 5px; color: var(--color-text-muted); font-size: 6px; }.routine-break-select :deep(.ui-select__trigger) { min-height: 32px; padding: 5px 7px; background: var(--color-surface-secondary); font-size: 9px; }.routine-break-select :deep(.ui-select__chevron) { width: 11px; }
.routine-part-select { display: flex; flex-direction: column; gap: 3px; margin: 8px 0 0 28px; color: var(--color-text-muted); font-size: 7px; font-weight: 800; text-transform: uppercase; }.routine-part-select :deep(.ui-select__trigger) { min-height: 32px; padding: 5px 8px; background: var(--color-surface-secondary); font-size: 9px; }
.routine-break { display: flex; align-items: center; gap: 5px; margin: 8px 0 0 28px; padding: 6px 8px; border-radius: 9px; background: var(--color-accent-soft); color: var(--color-accent-text); }.routine-break span { font-size: 11px; }.routine-break b { font-size: 8px; }.routine-break small { overflow: hidden; color: var(--color-text-secondary); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.routine-section__empty { display: flex; flex-direction: column; align-items: center; padding: 15px 12px 3px; color: var(--color-text-muted); text-align: center; }.routine-section__empty > span { width: 30px; height: 30px; display: grid; place-items: center; margin-bottom: 5px; border-radius: 10px; background: var(--color-surface-secondary); color: var(--color-primary); font-size: 17px; }.routine-section__empty strong { color: var(--color-text-secondary); font-size: 9px; }.routine-section__empty small { margin-top: 2px; font-size: 7px; }.routine-add-exercise { width: calc(100% - 22px); min-height: 48px; display: grid; grid-template-columns: 32px 1fr auto; grid-template-rows: auto auto; align-items: center; gap: 0 8px; margin: 10px 11px 11px; padding: 7px 10px; border: 1px dashed rgba(var(--color-primary-rgb),.55); border-radius: 13px; background: var(--color-primary-soft); color: var(--color-primary-hover); font: inherit; text-align: left; cursor: pointer; }.routine-add-exercise > span { grid-row: 1/3; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 10px; background: var(--color-primary); color: var(--color-text-on-primary); font-size: 17px; }.routine-add-exercise b { align-self: end; font-size: 10px; }.routine-add-exercise small { align-self: start; color: var(--color-text-muted); font-size: 7px; }.routine-add-exercise i { grid-column: 3; grid-row: 1/3; font-size: 19px; font-style: normal; }.routine-create-skill { display: block; padding: 12px; color: var(--color-link); font-size: 9px; font-weight: 800; text-align: center; text-decoration: none; }
.routine-add-section { min-height: 48px; border: 1px dashed var(--color-primary); border-radius: 16px; background: var(--color-primary-soft); color: var(--color-primary-hover); font: inherit; font-size: 10px; font-weight: 900; cursor: pointer; }.routine-add-section span { font-size: 16px; vertical-align: -1px; }.routine-loading { padding: 30px; color: var(--color-text-muted); font-size: 10px; text-align: center; }
.routine-error { display: flex; align-items: flex-start; gap: 10px; padding: 13px; border: 1px solid rgba(var(--color-danger-rgb),.25); border-radius: 15px; background: var(--color-danger-soft); color: var(--color-text-primary); }.routine-error > span { width: 28px; height: 28px; flex: 0 0 28px; display: grid; place-items: center; border-radius: 50%; background: var(--color-danger); color: var(--color-text-on-primary); font-weight: 900; }.routine-error strong { font-size: 11px; }.routine-error p { margin-top: 3px; color: var(--color-text-secondary); font-size: 9px; }.routine-error small { display: block; margin-top: 7px; color: var(--color-text-muted); font-size: 8px; line-height: 1.45; }.routine-error b { color: var(--color-text-primary); }
.skill-picker { position: fixed; z-index: 1200; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding-top: 50px; background: var(--color-overlay); backdrop-filter: blur(4px); }.skill-picker__sheet { width: min(620px,100%); max-height: calc(100dvh - 50px); overflow-y: auto; padding: 7px 14px calc(18px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; background: var(--color-background); box-shadow: var(--shadow-modal); }.skill-picker__handle { width: 42px; height: 4px; margin: 0 auto 10px; border-radius: 9px; background: var(--color-border); }.skill-picker header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 0 2px 13px; }.skill-picker header span { color: var(--color-primary-hover); font-size: 8px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }.skill-picker header h2 { margin-top: 3px; font-size: 18px; }.skill-picker header p { margin-top: 3px; color: var(--color-text-muted); font-size: 9px; }.skill-picker header button { width: 31px; height: 31px; flex: 0 0 31px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); color: var(--color-text-secondary); font-size: 19px; cursor: pointer; }.skill-picker__search { margin-bottom: 4px; }.skill-picker__group { display: flex; align-items: center; gap: 6px; margin: 14px 2px 8px; font-size: 13px; font-weight: 900; }.skill-picker__group span { padding: 1px 7px; border-radius: 999px; background: var(--color-surface-secondary); color: var(--color-text-muted); font-size: 11px; }.skill-picker__empty { padding: 20px; color: var(--color-text-muted); text-align: center; }.skill-picker__grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; }.skill-card { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--color-border); border-radius: 15px; background: var(--color-surface); color: var(--color-text-primary); font: inherit; text-align: left; box-shadow: var(--shadow-small); cursor: pointer; }.skill-card__icon { width: 39px; height: 39px; flex: 0 0 39px; display: grid; place-items: center; border-radius: 12px; background: var(--color-primary-soft); color: var(--color-primary-hover); font-size: 17px; }.skill-card--solo .skill-card__icon { background: var(--color-objective-practicing-soft); color: var(--color-objective-practicing); }.skill-card--technique .skill-card__icon { background: var(--color-role-singer-soft); color: var(--color-role-singer); }.skill-card--song .skill-card__icon { background: var(--color-info-soft); color: var(--color-info-text); }.skill-card__body { min-width: 0; flex: 1; display: flex; flex-direction: column; }.skill-card__body > small { color: var(--color-primary-hover); font-size: 6px; font-weight: 900; text-transform: uppercase; }.skill-card__body strong { overflow: hidden; margin: 2px 0 6px; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.skill-card__track { height: 4px; overflow: hidden; border-radius: 5px; background: var(--color-surface-secondary); }.skill-card__track i { display: block; height: 100%; border-radius: inherit; background: var(--color-primary); }.skill-card__body em { margin-top: 4px; color: var(--color-text-muted); font-size: 6px; font-style: normal; }.skill-card__add { color: var(--color-primary); font-size: 17px; }.skill-picker__create { display: block; margin-top: 10px; padding: 12px; border: 1px dashed var(--color-link); border-radius: 13px; color: var(--color-link); font-size: 9px; font-weight: 900; text-align: center; text-decoration: none; }.skill-sheet-enter-active,.skill-sheet-leave-active { transition: opacity .2s ease; }.skill-sheet-enter-active .skill-picker__sheet,.skill-sheet-leave-active .skill-picker__sheet { transition: transform .25s ease; }.skill-sheet-enter-from,.skill-sheet-leave-to { opacity: 0; }.skill-sheet-enter-from .skill-picker__sheet,.skill-sheet-leave-to .skill-picker__sheet { transform: translateY(35px); }
@media (max-width:480px) { .skill-picker__grid { grid-template-columns: 1fr; } }
@media (max-width:350px) { .routine-builder { gap: 10px; }.routine-intro p { display:none; }.routine-days { gap: 3px; }.routine-days button small { display:none; }.routine-exercise__settings { margin-left: 0; }.routine-create,.routine-section-create { grid-template-columns: 1fr 1fr; }.routine-create input,.routine-section-create input { grid-column: 1/-1; } }
@media (prefers-reduced-motion:reduce) { .skill-sheet-enter-active,.skill-sheet-leave-active,.skill-sheet-enter-active .skill-picker__sheet,.skill-sheet-leave-active .skill-picker__sheet { transition:none; } }

/* Escala accesible: conserva la densidad del constructor sin texto microscópico. */
.routine-block-title span,.routine-section__head > div > span { color:var(--color-primary);font-size:11px; }.routine-intro h2 { font-size:24px; }.routine-intro p { font-size:14px;line-height:1.4; }.routine-new { width:48px;height:48px;flex-basis:48px;border-radius:16px;box-shadow:var(--shadow-small); }.routine-tabs button { min-width:175px;min-height:66px;padding:11px 12px;border-radius:17px;box-shadow:none; }.routine-tabs span { font-size:13px; }.routine-tabs small { font-size:11px; }
.routine-overview,.routine-days-card,.routine-section { border-radius:22px; }.routine-overview__top { padding:16px; }.routine-overview__icon { width:46px;height:46px;flex-basis:46px;border-radius:15px;box-shadow:none; }.routine-overview label { font-size:11px; }.routine-overview input,.routine-section__head input { font-size:15px; }.routine-delete,.routine-section__head > button { width:40px;height:40px; }.routine-stats span { padding:11px 4px;font-size:11px; }.routine-stats b { font-size:14px; }.routine-play { min-height:60px;border-radius:17px;box-shadow:var(--shadow-small); }.routine-play>span { width:40px;height:40px;font-size:14px; }.routine-play b { font-size:14px; }.routine-play small { font-size:11px; }
.routine-days-card { padding:16px; }.routine-block-title h3 { font-size:17px; }.routine-block-title small { font-size:11px; }.routine-days { grid-template-columns:repeat(4,1fr);gap:8px; }.routine-days button { min-height:52px;aspect-ratio:auto;border-radius:14px; }.routine-days button span { font-size:13px; }.routine-days button small { font-size:10px; }
.routine-section__head { padding:14px; }.routine-section__number { width:40px;height:40px;flex-basis:40px;border-radius:13px;font-size:13px; }.routine-exercises { padding-inline:14px; }.routine-exercise { padding:14px 0; }.routine-exercise__order button { width:28px;height:24px;font-size:12px; }.routine-exercise__icon { width:40px;height:40px;flex-basis:40px;border-radius:13px;font-size:17px; }.routine-exercise__identity strong { font-size:14px; }.routine-exercise__identity small { font-size:11px; }.routine-exercise__remove { width:40px;height:40px;border-radius:12px; }
.routine-exercise__settings>label,.routine-part-select { font-size:10px; }.routine-number { height:42px;border-radius:12px; }.routine-number input { font-size:13px; }.routine-number small { font-size:9px; }.routine-break-select :deep(.ui-select__trigger),.routine-part-select :deep(.ui-select__trigger) { min-height:42px;font-size:12px; }.routine-break b { font-size:11px; }.routine-break small { font-size:10px; }.routine-section__empty strong { font-size:13px; }.routine-section__empty small { font-size:11px; }.routine-add-exercise { min-height:62px; }.routine-add-exercise b { font-size:13px; }.routine-add-exercise small { font-size:11px; }.routine-create-skill,.routine-add-section,.routine-loading { font-size:13px; }
.skill-picker header span { color:var(--color-primary);font-size:11px; }.skill-picker header h2 { font-size:21px; }.skill-picker header p { font-size:13px; }.skill-picker header button { width:44px;height:44px;flex-basis:44px; }.skill-picker__grid .skill-card { min-height:68px;padding:12px;border-radius:18px; }.skill-picker .skill-card__icon { width:44px;height:44px;flex-basis:44px; }.skill-picker .skill-card__body>small,.skill-picker .skill-card__body em { font-size:10px; }.skill-picker .skill-card__body strong { font-size:14px; }.skill-picker__create { min-height:48px;font-size:13px; }
@media (max-width:350px) { .routine-days button small { display:block; } }

/* Constructor compacto: una sola jerarquía y sólo metadatos accionables. */
.routine-builder { gap: 10px; }
.routine-intro { min-height: 48px; padding: 0 2px; }
.routine-intro h2 { margin: 0; font-size: 22px; }
.routine-tabs { padding-top: 0; }
.routine-overview__top { padding-block: 13px; }
.routine-overview input { margin: 0; }
.routine-play {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 11px;
}
.routine-play > span { grid-row: auto; }
.routine-play b { align-self: auto; }
.routine-block-title { align-items: center; }
.routine-block-title h3 { margin: 0; }
.routine-section__name { min-width: 0; flex: 1; }
.routine-section__minutes { flex-shrink: 0; color: var(--color-text-muted); font-size: 11px; font-weight: 800; }
.routine-section__empty { min-height: 44px; padding: 12px 14px 0; align-items: flex-start; text-align: left; }
.routine-add-exercise {
  min-height: 52px;
  grid-template-columns: 32px 1fr auto;
  grid-template-rows: 1fr;
  gap: 8px;
  padding-block: 8px;
}
.routine-add-exercise > span,
.routine-add-exercise i { grid-row: auto; }
.routine-add-exercise b { align-self: center; }
.skill-picker header { align-items: center; }
.skill-picker header h2 { margin: 0; }
/* Controles del constructor adaptados al uso con una mano. */
.routine-builder { padding-bottom: 0; gap: 16px; }
.routine-intro { background: transparent; border: 0; }
.routine-new { min-width: 44px; min-height: 44px; background: var(--color-primary); color: var(--color-text-on-primary); box-shadow: none; }
.routine-tabs button, .routine-overview__icon, .routine-overview, .routine-days-card, .routine-section { box-shadow: none; }
.routine-tabs button { flex-shrink: 0; }
.routine-play { background: var(--color-primary); color: var(--color-text-on-primary); box-shadow: none; }
.routine-play > span { background: var(--color-primary-hover); color: inherit; }
.routine-delete, .routine-section__head > button, .routine-exercise__remove { color: var(--color-danger-text); }
.skill-card__track i { background: var(--color-secondary); }
.routine-delete, .routine-section__head > button, .routine-exercise__remove { min-width: 44px; min-height: 44px; }
.routine-exercise__order button { width: 44px; height: 44px; }
.routine-exercise__main { flex-wrap: wrap; }
.routine-exercise__identity { flex: 1; min-width: 70px; }
.routine-exercise__settings { margin-left: 0; grid-template-columns: 1fr 1fr; gap: 12px; }
.routine-exercise__settings > label:last-child { grid-column: 1/-1; }
.routine-number { height: 48px; }
.routine-break-select :deep(.ui-select__trigger), .routine-part-select :deep(.ui-select__trigger) { min-height: 48px; font-size: 14px; }
.routine-create, .routine-section-create { grid-template-columns: 1fr 1fr; gap: 10px; }
.routine-create input, .routine-section-create input { grid-column: 1/-1; min-width: 0; }
.routine-section__head { flex-wrap: wrap; }
</style>
