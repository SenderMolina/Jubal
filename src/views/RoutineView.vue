<template>
  <div v-if="routine" class="rutina">
    <!-- Días -->
    <div class="rutina-block">
      <h3 class="rutina-block__title">Días de ensayo</h3>
      <div class="rutina-days">
        <button
          v-for="(label, d) in DAYS"
          :key="d"
          class="rutina-days__chip"
          :class="{ active: routine.days.includes(d) }"
          @click="toggleDay(d)"
        >{{ label }}</button>
      </div>
    </div>

    <!-- Items -->
    <div class="rutina-block">
      <h3 class="rutina-block__title">Qué ensayar</h3>

      <div v-for="(it, i) in routine.items" :key="it.id" class="rutina-item">
        <div class="rutina-item__order">
          <button :disabled="i === 0" aria-label="Subir" @click="store.moveRoutineItem(it.id, -1)">▲</button>
          <button :disabled="i === routine.items.length - 1" aria-label="Bajar" @click="store.moveRoutineItem(it.id, 1)">▼</button>
        </div>
        <div class="rutina-item__body">
          <span class="rutina-item__name">{{ skillName(it.skill_id) }}</span>
          <div class="rutina-item__inputs">
            <label>
              <input type="number" min="1" max="240" :value="it.planned_minutes"
                     @change="store.updateRoutineItem(it.id, { planned_minutes: +$event.target.value || null })">
              min
            </label>
            <label>
              <input type="number" min="20" max="400" :value="it.target_bpm"
                     @change="store.updateRoutineItem(it.id, { target_bpm: +$event.target.value || null })">
              bpm
            </label>
          </div>
        </div>
        <button class="rutina-item__delete" aria-label="Quitar" @click="store.removeRoutineItem(it.id)">✕</button>
      </div>

      <p v-if="!routine.items.length" class="rutina-empty">
        Agrega skills a tu rutina para tener un plan de ensayo.
      </p>

      <!-- Agregar -->
      <div v-if="available.length" class="rutina-add">
        <select v-model="newSkillId" class="form-select">
          <option value="" disabled>Agregar skill…</option>
          <option v-for="s in available" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button class="rutina-add__btn" :disabled="!newSkillId" aria-label="Agregar" @click="add">+</button>
      </div>
      <p v-else-if="!store.skills.length" class="rutina-empty">
        Primero crea skills en <RouterLink to="/entrenar">Entrenar</RouterLink>.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePracticeStore } from '../stores/practice'

const DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

const store = usePracticeStore()
const routine = computed(() => store.routine)
const newSkillId = ref('')

const available = computed(() =>
  store.skills.filter(s => !routine.value?.items.some(it => it.skill_id === s.id)))

function skillName(id) {
  return store.skills.find(s => s.id === id)?.name || '(skill eliminada)'
}

function toggleDay(d) {
  const days = routine.value.days.includes(d)
    ? routine.value.days.filter(x => x !== d)
    : [...routine.value.days, d].sort()
  store.updateRoutineDays(days)
}

async function add() {
  const skill = store.skills.find(s => s.id === newSkillId.value)
  await store.addRoutineItem({
    skill_id: newSkillId.value,
    target_bpm: skill?.current_bpm || skill?.target_bpm || null,
  })
  newSkillId.value = ''
}

onMounted(() => {
  if (!store.ready) store.loadSkills()
  store.loadRoutine()
})
</script>

<style scoped>
.rutina { padding: 12px 16px 40px; display: flex; flex-direction: column; gap: 16px; max-width: 480px; margin: 0 auto; }

.rutina-block {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 16px;
}
.rutina-block__title {
  font-size: .8rem; font-weight: 600; color: var(--text-mid);
  text-transform: uppercase; letter-spacing: .04em; margin: 0 0 12px;
}

.rutina-days { display: flex; gap: 6px; }
.rutina-days__chip {
  flex: 1; aspect-ratio: 1; max-width: 46px; border-radius: 50%; cursor: pointer;
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text-mid); font-size: 13px; font-weight: 700;
}
.rutina-days__chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.rutina-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid var(--border);
}
.rutina-item:last-of-type { border-bottom: none; }
.rutina-item__order { display: flex; flex-direction: column; gap: 2px; }
.rutina-item__order button {
  background: none; border: none; cursor: pointer; color: var(--text-mid);
  font-size: 11px; padding: 2px 4px;
}
.rutina-item__order button:disabled { opacity: .3; cursor: default; }
.rutina-item__body { flex: 1; min-width: 0; }
.rutina-item__name {
  font-weight: 600; font-size: 14px; display: block;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rutina-item__inputs { display: flex; gap: 14px; margin-top: 4px; }
.rutina-item__inputs label {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--text-muted);
}
.rutina-item__inputs input {
  width: 58px; padding: 5px 6px; text-align: center; font-size: 13px;
  border: 1px solid var(--border); border-radius: 8px;
  background: var(--surface2); color: var(--text); outline: none;
}
.rutina-item__inputs input:focus { border-color: var(--accent); }
.rutina-item__delete {
  background: none; border: none; cursor: pointer;
  color: var(--text-muted); font-size: 13px; padding: 4px 6px;
}

.rutina-empty { font-size: 13px; color: var(--text-muted); margin: 4px 0; }
.rutina-empty a { color: var(--accent); }

.rutina-add { display: flex; gap: 8px; margin-top: 10px; }
.rutina-add .form-select { flex: 1; }
.rutina-add__btn {
  width: 42px; flex-shrink: 0; font-size: 1.2rem; cursor: pointer;
  background: var(--accent); color: #fff; border: none; border-radius: 10px;
}
.rutina-add__btn:disabled { opacity: .5; cursor: default; }
</style>
