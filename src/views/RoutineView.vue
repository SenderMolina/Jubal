<template>
  <div class="routine-builder">
    <header class="routine-intro">
      <div>
        <span class="routine-eyebrow">Centro de entrenamiento</span>
        <h2>Mis rutinas</h2>
        <p>Diseña cada sesión y asígnala a tus días de práctica.</p>
      </div>
      <button class="routine-new" aria-label="Nueva rutina" @click="startCreateRoutine">＋</button>
    </header>

    <section class="player-hero" aria-label="Tu personaje y progreso">
      <div class="player-hero__glow" aria-hidden="true"></div>
      <div class="player-avatar">
        <img v-if="playerAvatar" :src="playerAvatar" alt="" @error="$event.target.style.display = 'none'">
        <span>{{ playerInitial }}</span>
        <b>{{ playerLevel.level }}</b>
      </div>
      <div class="player-identity">
        <span class="player-kicker">Tu personaje · {{ rankTitle }}</span>
        <h3>{{ playerName }}</h3>
        <div class="player-xp"><span :style="{ width: `${playerLevel.percent}%` }"></span></div>
        <small>{{ playerLevel.earned }} / {{ playerLevel.needed }} XP para el siguiente nivel</small>
      </div>
      <div class="player-power">
        <strong>{{ averageMastery }}%</strong>
        <span>poder</span>
      </div>
      <div class="player-hero__stats">
        <span><b>{{ store.skills.length }}</b> habilidades</span>
        <span><b>{{ masteredSkills }}</b> dominadas</span>
        <span><b>{{ totalXp }}</b> XP total</span>
      </div>
    </section>

    <form v-if="creatingRoutine" class="routine-create" @submit.prevent="createNewRoutine">
      <input ref="routineNameInput" v-model="newRoutineName" class="form-input" maxlength="60" placeholder="Nombre de la rutina">
      <button class="btn btn-primary btn-sm" :disabled="busy || !newRoutineName.trim()">Crear</button>
      <button type="button" class="btn btn-ghost btn-sm" @click="creatingRoutine = false">Cancelar</button>
    </form>

    <div v-if="routines.length" class="mission-heading"><span>Mapa de misiones</span><small>Elige tu entrenamiento</small></div>
    <nav v-if="routines.length" class="routine-tabs" aria-label="Tus misiones de entrenamiento">
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
            <label for="routine-name">Misión seleccionada</label>
            <input id="routine-name" :value="routine.name" maxlength="60" @change="renameRoutine($event.target.value)">
          </div>
          <button v-if="routines.length > 1" class="routine-delete" aria-label="Eliminar rutina" @click="removeCurrentRoutine">×</button>
        </div>
        <div class="routine-stats">
          <span><b>{{ totalMinutes }}</b> min totales</span>
          <span><b>{{ routine.items.length }}</b> ejercicios</span>
          <span><b>{{ routine.sections.length }}</b> secciones</span>
        </div>
        <button v-if="routine.items.length" class="routine-play" @click="router.push(`/rutina/jugar/${routine.id}`)"><span>▶</span><b>Jugar misión</b><small>{{ totalMinutes }} min · {{ routine.items.length }} habilidades</small></button>
      </section>

      <section class="routine-days-card">
        <div class="routine-block-title">
          <div><span>Calendario</span><h3>Días de práctica</h3></div>
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
            <div>
              <span>Fase {{ sectionIndex + 1 }} · {{ sectionMinutes(section) }} min</span>
              <input :value="section.name" maxlength="60" aria-label="Nombre de la sección" @change="renameSection(section, $event.target.value)">
            </div>
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
                  <small>{{ skillType(skill(item.skill_id)?.type) }}</small>
                </div>
                <button class="routine-exercise__remove" aria-label="Quitar ejercicio" @click="store.removeRoutineItem(item.id)">×</button>
              </div>

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
          <div v-else class="routine-section__empty"><span>◇</span><strong>Fase sin habilidades</strong><small>Elige una habilidad para comenzar esta misión.</small></div>

          <button v-if="availableSkills.length" class="routine-add-exercise" @click="openSkillPicker(section)">
            <span>＋</span><b>Elegir habilidad</b><small>Explora tus ejercicios disponibles</small><i>›</i>
          </button>
          <RouterLink v-else-if="!store.skills.length" class="routine-create-skill" to="/entrenar">＋ Crear ejercicios en Entrenar</RouterLink>
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
              <div><span>Inventario de habilidades</span><h2 id="skill-picker-title">¿Qué quieres practicar?</h2><p>Elige una habilidad para la fase “{{ skillPickerSection.name }}”.</p></div>
              <button aria-label="Cerrar" @click="closeSkillPicker">×</button>
            </header>
            <div class="skill-picker__grid">
              <button v-for="item in availableSkills" :key="item.id" class="skill-card" :class="`skill-card--${item.type || 'other'}`" :disabled="busy" @click="addExercise(skillPickerSection, item.id)">
                <span class="skill-card__icon">{{ skillIcon(item.type) }}</span>
                <span class="skill-card__body">
                  <small>{{ skillType(item.type) }}</small>
                  <strong>{{ item.name }}</strong>
                  <span class="skill-card__track"><i :style="{ width: `${skillMastery(item)}%` }"></i></span>
                  <em>{{ skillMastery(item) }}% dominio <template v-if="item.current_bpm">· {{ item.current_bpm }} BPM</template></em>
                </span>
                <span class="skill-card__add">＋</span>
              </button>
            </div>
            <RouterLink class="skill-picker__create" to="/entrenar" @click="closeSkillPicker">＋ Crear una habilidad nueva</RouterLink>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { TYPE_LABELS, skillProgress } from '../utils/skills'
import { levelFromXp, xpForProgress } from '../utils/gamification'
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
const auth = useAuthStore()
const { showToast } = useToast()
const { confirm } = useConfirm()
const routines = computed(() => store.routines || [])
const routine = computed(() => store.routine?.sections ? store.routine : null)
const creatingRoutine = ref(false)
const creatingSection = ref(false)
const newRoutineName = ref('')
const newSectionName = ref('')
const skillPickerSection = ref(null)
const sessions = ref([])
const routineNameInput = ref(null)
const busy = ref(false)

const availableSkills = computed(() => {
  const used = new Set(routine.value?.items.map(item => item.skill_id) || [])
  return store.skills.filter(item => !used.has(item.id))
})
const totalMinutes = computed(() => routineMinutes(routine.value))
const playerName = computed(() => auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0] || 'Guitarrista')
const playerInitial = computed(() => playerName.value.trim().charAt(0).toUpperCase() || 'G')
const playerAvatar = computed(() => auth.user?.user_metadata?.avatar_url || auth.user?.user_metadata?.picture || '')
const masteredSkills = computed(() => store.skills.filter(item => skillProgress(item) >= 100).length)
const totalXp = computed(() => xpForProgress(sessions.value, masteredSkills.value, store.routineRuns || []))
const playerLevel = computed(() => levelFromXp(totalXp.value))
const averageMastery = computed(() => store.skills.length
  ? Math.round(store.skills.reduce((sum, item) => sum + skillProgress(item), 0) / store.skills.length)
  : 0)
const rankTitle = computed(() => {
  const ranks = ['Explorador de acordes', 'Aprendiz del riff', 'Cazador de ritmo', 'Héroe del groove', 'Virtuoso del escenario']
  return ranks[Math.min(ranks.length - 1, Math.floor((playerLevel.value.level - 1) / 2))]
})

function skill(id) { return store.skills.find(item => item.id === id) }
function skillType(type) { return TYPE_LABELS[type] || 'Ejercicio' }
function skillIcon(type) { return { lick: 'ϟ', solo: '★', technique: '◎', song: '♫' }[type] || '♪' }
function skillMastery(item) { return skillProgress(item) }
function sectionMinutes(section) {
  return section.items.reduce((total, item) => total + (Number(item.planned_minutes) || 0) + (Number(item.break_after_minutes) || 0), 0)
}
function routineMinutes(value) { return value?.sections?.reduce((total, section) => total + sectionMinutes(section), 0) || 0 }

async function run(action, successMessage) {
  busy.value = true
  try {
    await action()
    if (successMessage) showToast(successMessage)
  } catch (error) {
    showToast(error.message || 'No se pudo guardar el cambio')
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
function closeSkillPicker() { skillPickerSection.value = null }
async function addExercise(section, skillId) {
  if (!skillId) return
  const selected = skill(skillId)
  await run(() => store.addRoutineItem({
    section_id: section.id,
    skill_id: skillId,
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
  sessions.value = await store.loadAllSessions?.() || []
  await store.loadRoutineRuns?.()
})
</script>

<style scoped>
.routine-builder { max-width: 620px; margin: 0 auto; padding: 8px 0 100px; display: flex; flex-direction: column; gap: 12px; }
.routine-intro { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 2px; }.routine-eyebrow,.routine-block-title span,.routine-section__head > div > span { color: var(--accent2); font-size: 8px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }.routine-intro h2 { margin-top: 2px; font-size: 18px; }.routine-intro p { margin-top: 3px; color: var(--text-mid); font-size: 10px; }.routine-new { width: 38px; height: 38px; flex: 0 0 38px; border: 0; border-radius: 13px; background: var(--accent); color: #fff; font: inherit; font-size: 22px; cursor: pointer; box-shadow: 0 5px 12px rgba(var(--brand-rgb),.22); }
.player-hero { position: relative; isolation: isolate; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 11px; overflow: hidden; padding: 15px 13px 0; border: 1px solid rgba(255,255,255,.13); border-radius: 20px; background: linear-gradient(135deg,#063f4c 0%,#007d8f 68%,#00a5b8 100%); color: #fff; box-shadow: 0 10px 24px rgba(0,71,84,.2); }.player-hero__glow { position: absolute; z-index: -1; width: 150px; height: 150px; right: -45px; top: -80px; border-radius: 50%; background: radial-gradient(circle,rgba(255,193,94,.42),transparent 68%); }.player-avatar { position: relative; width: 64px; height: 64px; display: grid; place-items: center; border: 3px solid rgba(255,255,255,.9); border-radius: 50%; background: linear-gradient(145deg,#00a8ba,#064a58); font-size: 23px; font-weight: 900; box-shadow: 0 0 0 4px rgba(255,184,76,.32),0 6px 15px rgba(0,0,0,.2); }.player-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }.player-avatar b { position: absolute; right: -5px; bottom: -3px; min-width: 23px; height: 23px; display: grid; place-items: center; padding: 0 4px; border: 2px solid #fff; border-radius: 50%; background: #ff971e; color: #fff; font-size: 9px; }.player-identity { min-width: 0; }.player-kicker { display: block; overflow: hidden; color: #8feaf1; font-size: 7px; font-weight: 900; letter-spacing: .07em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }.player-identity h3 { overflow: hidden; margin: 3px 0 7px; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }.player-xp { height: 5px; overflow: hidden; border-radius: 9px; background: rgba(0,0,0,.25); }.player-xp span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#ff941f,#ffd165); box-shadow: 0 0 8px rgba(255,184,71,.65); transition: width .45s ease; }.player-identity small { display: block; margin-top: 4px; color: rgba(255,255,255,.7); font-size: 7px; }.player-power { width: 47px; height: 47px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.22); border-radius: 14px; background: rgba(0,0,0,.14); }.player-power strong { font-size: 13px; }.player-power span { color: #a8edf2; font-size: 6px; font-weight: 800; text-transform: uppercase; }.player-hero__stats { grid-column: 1/-1; display: grid; grid-template-columns: repeat(3,1fr); margin: 3px -13px 0; border-top: 1px solid rgba(255,255,255,.13); background: rgba(0,0,0,.1); }.player-hero__stats span { padding: 9px 4px; border-right: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.72); font-size: 7px; text-align: center; }.player-hero__stats span:last-child { border-right: 0; }.player-hero__stats b { color: #fff; font-size: 10px; }
.routine-create,.routine-section-create { display: grid; grid-template-columns: 1fr auto auto; gap: 7px; padding: 10px; border: 1px solid var(--border); border-radius: 15px; background: var(--surface); box-shadow: var(--shadow); }
.mission-heading { display: flex; align-items: center; justify-content: space-between; margin: 2px 2px -5px; }.mission-heading span { color: var(--accent2); font-size: 8px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }.mission-heading small { color: var(--text-muted); font-size: 7px; }.routine-tabs { display: flex; gap: 7px; overflow-x: auto; padding: 2px 1px 5px; scrollbar-width: none; }.routine-tabs::-webkit-scrollbar { display: none; }.routine-tabs button { min-width: 145px; max-width: 175px; display: grid; grid-template-columns: 22px 1fr; gap: 1px 4px; padding: 9px 10px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); color: var(--text-mid); text-align: left; cursor: pointer; box-shadow: var(--shadow); }.routine-tabs button.active { border-color: var(--accent); background: linear-gradient(135deg,var(--accent-soft),var(--surface)); color: var(--accent2); box-shadow: 0 5px 13px rgba(var(--brand-rgb),.14); }.routine-tabs b { grid-row: 1/3; align-self: center; color: var(--accent); font-size: 18px; text-align: center; }.routine-tabs span { overflow: hidden; font-size: 10px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }.routine-tabs small { overflow: hidden; color: var(--text-muted); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.routine-overview { overflow: hidden; border: 1px solid rgba(var(--brand-rgb),.28); border-radius: 18px; background: linear-gradient(130deg,var(--surface),var(--accent-soft)); box-shadow: var(--shadow); }.routine-overview__top { display: flex; align-items: center; gap: 10px; padding: 13px; }.routine-overview__icon { width: 39px; height: 39px; flex: 0 0 39px; display: grid; place-items: center; border-radius: 13px; background: var(--accent); color: #fff; font-size: 18px; }.routine-overview__top > div { min-width: 0; flex: 1; }.routine-overview label { display: block; color: var(--text-muted); font-size: 7px; font-weight: 800; text-transform: uppercase; }.routine-overview input,.routine-section__head input { width: 100%; margin-top: 2px; border: 0; border-bottom: 1px solid transparent; background: transparent; color: var(--text); font: inherit; font-size: 13px; font-weight: 800; outline: 0; }.routine-overview input:focus,.routine-section__head input:focus { border-bottom-color: var(--accent); }.routine-delete,.routine-section__head > button { width: 27px; height: 27px; border: 1px solid rgba(229,72,77,.18); border-radius: 50%; background: var(--red-soft); color: var(--red); font: inherit; cursor: pointer; }.routine-stats { display: grid; grid-template-columns: repeat(3,1fr); border-top: 1px solid rgba(var(--brand-rgb),.16); }.routine-stats span { padding: 9px 4px; color: var(--text-mid); font-size: 7px; text-align: center; border-right: 1px solid rgba(var(--brand-rgb),.14); }.routine-stats span:last-child { border-right: 0; }.routine-stats b { color: var(--text); font-size: 10px; }
.routine-play { width:calc(100% - 22px);display:grid;grid-template-columns:34px 1fr;align-items:center;gap:0 8px;margin:0 11px 11px;padding:8px 11px;border:0;border-radius:13px;background:linear-gradient(110deg,#075363,var(--accent));color:#fff;font:inherit;text-align:left;box-shadow:0 6px 14px rgba(var(--brand-rgb),.22);cursor:pointer; }.routine-play>span { grid-row:1/3;width:31px;height:31px;display:grid;place-items:center;border-radius:50%;background:#ff9b25;font-size:11px; }.routine-play b { align-self:end;font-size:10px; }.routine-play small { align-self:start;color:rgba(255,255,255,.68);font-size:7px; }
.routine-days-card,.routine-section { border: 1px solid var(--border); border-radius: 18px; background: var(--surface); box-shadow: var(--shadow); }.routine-days-card { padding: 13px; }.routine-block-title { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 11px; }.routine-block-title h3 { margin-top: 2px; font-size: 13px; }.routine-block-title small { color: var(--text-muted); font-size: 8px; }.routine-days { display: grid; grid-template-columns: repeat(7,1fr); gap: 5px; }.routine-days button { aspect-ratio: .82; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; border: 1px solid var(--border); border-radius: 11px; background: var(--surface2); color: var(--text-mid); cursor: pointer; }.routine-days button span { font-size: 10px; font-weight: 900; }.routine-days button small { font-size: 6px; }.routine-days button.active { border-color: var(--accent); background: var(--accent); color: #fff; box-shadow: 0 4px 9px rgba(var(--brand-rgb),.2); }
.routine-sections { display: flex; flex-direction: column; gap: 11px; }.routine-section { overflow: hidden; }.routine-section__head { display: flex; align-items: center; gap: 9px; padding: 11px 12px; border-bottom: 1px solid var(--border); background: var(--surface2); }.routine-section__number { width: 31px; height: 31px; flex: 0 0 31px; display: grid; place-items: center; border-radius: 10px; background: var(--accent-soft); color: var(--accent2); font-size: 10px; font-weight: 900; }.routine-section__head > div { min-width: 0; flex: 1; }.routine-section__head input { font-size: 12px; }
.routine-exercises { padding: 0 11px; }.routine-exercise { padding: 11px 0; border-bottom: 1px solid var(--border); }.routine-exercise__main { display: flex; align-items: center; gap: 8px; }.routine-exercise__order { display: flex; flex-direction: column; }.routine-exercise__order button { width: 20px; height: 17px; border: 0; background: transparent; color: var(--text-muted); font-size: 9px; cursor: pointer; }.routine-exercise__order button:disabled { opacity: .2; }.routine-exercise__icon { width: 31px; height: 31px; flex: 0 0 31px; display: grid; place-items: center; border-radius: 10px; background: var(--action-soft); color: var(--action2); font-size: 13px; }.routine-exercise__identity { min-width: 0; flex: 1; display: flex; flex-direction: column; }.routine-exercise__identity strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.routine-exercise__identity small { color: var(--text-muted); font-size: 7px; }.routine-exercise__remove { width: 25px; height: 25px; border: 0; border-radius: 8px; background: var(--red-soft); color: var(--red); cursor: pointer; }
.routine-exercise__settings { display: grid; grid-template-columns: .8fr .9fr 1.3fr; gap: 6px; margin: 9px 0 0 28px; }.routine-exercise__settings > label { min-width: 0; display: flex; flex-direction: column; gap: 3px; color: var(--text-muted); font-size: 7px; font-weight: 800; text-transform: uppercase; }.routine-number { height: 32px; display: flex; align-items: center; overflow: hidden; border: 1px solid var(--border); border-radius: 9px; background: var(--surface2); }.routine-number input { width: 100%; min-width: 0; padding: 6px 2px 6px 7px; border: 0; outline: 0; background: transparent; color: var(--text); font: inherit; font-size: 10px; font-weight: 800; }.routine-number small { padding-right: 5px; color: var(--text-muted); font-size: 6px; }.routine-break-select :deep(.ui-select__trigger) { min-height: 32px; padding: 5px 7px; background: var(--surface2); font-size: 9px; }.routine-break-select :deep(.ui-select__chevron) { width: 11px; }
.routine-break { display: flex; align-items: center; gap: 5px; margin: 8px 0 0 28px; padding: 6px 8px; border-radius: 9px; background: var(--action-soft); color: var(--action2); }.routine-break span { font-size: 11px; }.routine-break b { font-size: 8px; }.routine-break small { overflow: hidden; color: var(--text-mid); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.routine-section__empty { display: flex; flex-direction: column; align-items: center; padding: 15px 12px 3px; color: var(--text-muted); text-align: center; }.routine-section__empty > span { width: 30px; height: 30px; display: grid; place-items: center; margin-bottom: 5px; border-radius: 10px; background: var(--surface2); color: var(--accent); font-size: 17px; }.routine-section__empty strong { color: var(--text-mid); font-size: 9px; }.routine-section__empty small { margin-top: 2px; font-size: 7px; }.routine-add-exercise { width: calc(100% - 22px); min-height: 48px; display: grid; grid-template-columns: 32px 1fr auto; grid-template-rows: auto auto; align-items: center; gap: 0 8px; margin: 10px 11px 11px; padding: 7px 10px; border: 1px dashed rgba(var(--brand-rgb),.55); border-radius: 13px; background: var(--accent-soft); color: var(--accent2); font: inherit; text-align: left; cursor: pointer; }.routine-add-exercise > span { grid-row: 1/3; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 10px; background: var(--accent); color: #fff; font-size: 17px; }.routine-add-exercise b { align-self: end; font-size: 10px; }.routine-add-exercise small { align-self: start; color: var(--text-muted); font-size: 7px; }.routine-add-exercise i { grid-column: 3; grid-row: 1/3; font-size: 19px; font-style: normal; }.routine-create-skill { display: block; padding: 12px; color: var(--accent2); font-size: 9px; font-weight: 800; text-align: center; text-decoration: none; }
.routine-add-section { min-height: 48px; border: 1px dashed var(--accent); border-radius: 16px; background: var(--accent-soft); color: var(--accent2); font: inherit; font-size: 10px; font-weight: 900; cursor: pointer; }.routine-add-section span { font-size: 16px; vertical-align: -1px; }.routine-loading { padding: 30px; color: var(--text-muted); font-size: 10px; text-align: center; }
.routine-error { display: flex; align-items: flex-start; gap: 10px; padding: 13px; border: 1px solid rgba(229,72,77,.25); border-radius: 15px; background: var(--red-soft); color: var(--text); }.routine-error > span { width: 28px; height: 28px; flex: 0 0 28px; display: grid; place-items: center; border-radius: 50%; background: var(--red); color: #fff; font-weight: 900; }.routine-error strong { font-size: 11px; }.routine-error p { margin-top: 3px; color: var(--text-mid); font-size: 9px; }.routine-error small { display: block; margin-top: 7px; color: var(--text-muted); font-size: 8px; line-height: 1.45; }.routine-error b { color: var(--text); }
.skill-picker { position: fixed; z-index: 1200; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding-top: 50px; background: rgba(3,20,26,.65); backdrop-filter: blur(4px); }.skill-picker__sheet { width: min(620px,100%); max-height: calc(100dvh - 50px); overflow-y: auto; padding: 7px 14px calc(18px + env(safe-area-inset-bottom)); border-radius: 24px 24px 0 0; background: var(--bg); box-shadow: 0 -14px 40px rgba(0,0,0,.28); }.skill-picker__handle { width: 42px; height: 4px; margin: 0 auto 10px; border-radius: 9px; background: var(--border); }.skill-picker header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 0 2px 13px; }.skill-picker header span { color: var(--accent2); font-size: 8px; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; }.skill-picker header h2 { margin-top: 3px; font-size: 18px; }.skill-picker header p { margin-top: 3px; color: var(--text-muted); font-size: 9px; }.skill-picker header button { width: 31px; height: 31px; flex: 0 0 31px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text-mid); font-size: 19px; cursor: pointer; }.skill-picker__grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; }.skill-card { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--border); border-radius: 15px; background: var(--surface); color: var(--text); font: inherit; text-align: left; box-shadow: var(--shadow); cursor: pointer; }.skill-card__icon { width: 39px; height: 39px; flex: 0 0 39px; display: grid; place-items: center; border-radius: 12px; background: var(--accent-soft); color: var(--accent2); font-size: 17px; }.skill-card--solo .skill-card__icon { background: #fff0dc; color: #e87313; }.skill-card--technique .skill-card__icon { background: #eee8ff; color: #7552c7; }.skill-card--song .skill-card__icon { background: #e6f4ff; color: #2379a7; }.skill-card__body { min-width: 0; flex: 1; display: flex; flex-direction: column; }.skill-card__body > small { color: var(--accent2); font-size: 6px; font-weight: 900; text-transform: uppercase; }.skill-card__body strong { overflow: hidden; margin: 2px 0 6px; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.skill-card__track { height: 4px; overflow: hidden; border-radius: 5px; background: var(--surface2); }.skill-card__track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,var(--accent),#ffad38); }.skill-card__body em { margin-top: 4px; color: var(--text-muted); font-size: 6px; font-style: normal; }.skill-card__add { color: var(--accent); font-size: 17px; }.skill-picker__create { display: block; margin-top: 10px; padding: 12px; border: 1px dashed var(--accent); border-radius: 13px; color: var(--accent2); font-size: 9px; font-weight: 900; text-align: center; text-decoration: none; }.skill-sheet-enter-active,.skill-sheet-leave-active { transition: opacity .2s ease; }.skill-sheet-enter-active .skill-picker__sheet,.skill-sheet-leave-active .skill-picker__sheet { transition: transform .25s ease; }.skill-sheet-enter-from,.skill-sheet-leave-to { opacity: 0; }.skill-sheet-enter-from .skill-picker__sheet,.skill-sheet-leave-to .skill-picker__sheet { transform: translateY(35px); }
@media (max-width:480px) { .skill-picker__grid { grid-template-columns: 1fr; } }
@media (max-width:350px) { .routine-builder { gap: 10px; }.routine-intro p { display:none; }.player-hero { grid-template-columns:auto 1fr; }.player-power { display:none; }.player-avatar { width:56px;height:56px; }.routine-days { gap: 3px; }.routine-days button small { display:none; }.routine-exercise__settings { margin-left: 0; }.routine-create,.routine-section-create { grid-template-columns: 1fr 1fr; }.routine-create input,.routine-section-create input { grid-column: 1/-1; } }
@media (prefers-reduced-motion:reduce) { .player-xp span,.skill-sheet-enter-active,.skill-sheet-leave-active,.skill-sheet-enter-active .skill-picker__sheet,.skill-sheet-leave-active .skill-picker__sheet { transition:none; } }
</style>
