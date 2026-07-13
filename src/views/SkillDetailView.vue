<template>
  <div v-if="skill" class="skill-detail">
    <!-- Practicar -->
    <button class="btn btn-primary skill-practice" @click="metronome.open(skill)">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>
      Practicar
    </button>

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
    </div>

    <!-- Partes -->
    <div class="skill-block">
      <h3 class="skill-block__title">Partes</h3>
      <div v-for="p in skill.parts" :key="p.id" class="skill-part">
        <div class="skill-part__head">
          <span class="skill-part__name">{{ p.name }}</span>
          <span class="skill-part__pct">{{ p.progress }}%</span>
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
        <span>{{ formatDate(ses.practiced_at) }}</span>
        <span v-if="ses.bpm">{{ ses.bpm }} bpm</span>
        <span>{{ formatDuration(ses.duration_seconds) }}</span>
      </div>
    </div>

    <button class="btn skill-delete" @click="removeSkill">Eliminar skill</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

async function removeSkill() {
  if (!await confirm('¿Eliminar skill?', 'Se borrará junto con sus partes y su historial quedará sin skill.')) return
  await store.deleteSkill(skill.value.id)
  showToast('Skill eliminada')
  router.push('/entrenar')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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

// Refrescar el historial al cerrar el metrónomo (pudo guardar una sesión)
watch(metronome.isOpen, async (open) => {
  if (!open && skill.value) sessions.value = await store.loadSessions(skill.value.id)
})
</script>

<style scoped>
.skill-detail { padding: 12px 16px 40px; display: flex; flex-direction: column; gap: 18px; }

.skill-practice { justify-content: center; padding: 13px; gap: 8px; font-size: 15px; }

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

.skill-bpm { display: flex; align-items: center; justify-content: center; gap: 16px; }
.skill-bpm__col { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.skill-bpm__value { font-size: 2rem; font-weight: 700; line-height: 1.1; }
.skill-bpm__sep { font-size: 1.6rem; color: var(--text-muted); }
.skill-bpm__label { font-size: 11px; color: var(--text-muted); }
.skill-bpm__input { width: 90px; text-align: center; font-size: 1.4rem; font-weight: 700; padding: 4px 8px; }

.skill-part { margin-bottom: 12px; }
.skill-part__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.skill-part__name { font-weight: 600; font-size: 14px; flex: 1; }
.skill-part__pct { font-size: 12px; color: var(--text-mid); }
.skill-part__delete {
  background: none; border: none; cursor: pointer; color: var(--text-muted);
  font-size: 13px; padding: 2px 6px;
}
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
.skill-session:last-child { border-bottom: none; }

.skill-delete { justify-content: center; color: var(--red); }
</style>
