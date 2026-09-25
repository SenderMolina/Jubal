<template>
  <div class="metro-view">
    <div class="metro-topbar">
      <button class="metro-back" aria-label="Volver" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m14 6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <div class="metro-heading">
        <h1>{{ skill?.name || 'Metrónomo' }}</h1>
        <p>{{ [part?.name, targetLabel].filter(Boolean).join(', ') || 'Práctica libre' }}</p>
      </div>
    </div>

    <section class="device" :class="{ running: isRunning }" aria-label="Metrónomo">
      <!-- Pantalla: solo lectura, salvo el tempo que se puede escribir -->
      <div class="lcd">
        <label class="lcd__tempo">
          <input
            class="lcd__bpm"
            type="number"
            inputmode="numeric"
            min="20"
            max="300"
            :value="bpm"
            :style="{ width: `${String(bpm).length + 0.2}ch` }"
            aria-label="Pulsos por minuto"
            @change="setBpm(+$event.target.value); $event.target.value = bpm"
          >
          <span>bpm</span>
        </label>
        <dl class="lcd__readouts">
          <div><dt>compás</dt><dd>{{ beatsPerBar }}/4</dd></div>
          <div><dt>pulso</dt><dd class="note">{{ currentSubdivision.icon }}</dd></div>
          <div><dt>tiempo</dt><dd :class="{ live: isRunning }">{{ timerLabel }}</dd></div>
        </dl>
        <div class="lcd__beats" aria-hidden="true">
          <span v-for="i in beatsPerBar" :key="i" :class="{ on: currentBeat === i - 1, down: i === 1 && accentEnabled }" />
          <small v-if="trainerEnabled">sube {{ trainerStep }} bpm cada {{ trainerBars }} compases</small>
        </div>
      </div>

      <div class="device__dial">
        <TempoDial :model-value="bpm" @update:model-value="setBpm">
          <div class="dial-controls">
            <button class="dial-step" aria-label="Bajar 1 BPM" @click="setBpm(bpm - 1)">−</button>
            <button class="dial-play" :class="{ beat: beatFlash, accent: accentFlash }" :aria-label="isRunning ? 'Pausar' : 'Iniciar'" @click="toggle">
              <svg v-if="!isRunning" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            </button>
            <button class="dial-step" aria-label="Subir 1 BPM" @click="setBpm(bpm + 1)">+</button>
          </div>
        </TempoDial>
      </div>

      <!-- Teclas: compás y pulso rotan entre opciones con cada toque -->
      <div class="keys">
        <button class="key" :aria-label="`Compás ${beatsPerBar} por 4. Toca para cambiar`" @click="cycleBeats"><b>{{ beatsPerBar }}/4</b><small>compás</small></button>
        <button class="key" :aria-label="`${currentSubdivision.label}. Toca para cambiar`" @click="cycleSubdivision"><b class="note">{{ currentSubdivision.icon }}</b><small>{{ currentSubdivision.short }}</small></button>
        <button class="key" @click="tap"><b>Tap</b><small>marcar</small></button>
        <button class="key" :class="{ active: settingsOpen }" :aria-expanded="settingsOpen" aria-controls="metro-settings" @click="settingsOpen = !settingsOpen">
          <b><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg></b>
          <small>ajustes</small>
        </button>
      </div>

      <div v-if="settingsOpen" id="metro-settings" class="settings">
        <div class="settings__row">
          <span>Acento en el 1</span>
          <button class="switch" :class="{ on: accentEnabled }" role="switch" :aria-checked="accentEnabled" aria-label="Acento en el primer tiempo" @click="accentEnabled = !accentEnabled"><i /></button>
        </div>
        <label class="settings__row">
          <span>Volumen</span>
          <input class="settings__volume" type="range" min="0" max="1" step="0.05" :value="volume" @input="setVolume($event.target.value)">
        </label>
        <div class="settings__row">
          <span>Subir tempo solo</span>
          <button class="switch" :class="{ on: trainerEnabled }" role="switch" :aria-checked="trainerEnabled" aria-label="Subir tempo automáticamente" @click="trainerEnabled = !trainerEnabled"><i /></button>
        </div>
        <div v-if="trainerEnabled" class="settings__row settings__trainer">
          <label>+ <input v-model.number="trainerStep" type="number" inputmode="numeric" min="1" max="20" aria-label="BPM que sube"> bpm</label>
          <label>cada <input v-model.number="trainerBars" type="number" inputmode="numeric" min="1" max="32" aria-label="Compases entre cada subida"> compases</label>
        </div>
      </div>

      <div v-if="skill" class="session">
        <button v-if="!rating" class="session__save" :disabled="!elapsedSeconds" @click="startRating">
          Guardar práctica <span>{{ timerLabel }}</span>
        </button>
        <div v-else class="session__rate" role="group" aria-label="¿Cómo se sintió?">
          <span>¿Cómo se sintió?</span>
          <button v-for="option in QUALITY" :key="option.value" :disabled="saving" @click="saveSession(option.value)">{{ option.label }}</button>
          <button class="session__cancel" aria-label="Cancelar" :disabled="saving" @click="rating = false">×</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useMetronome } from '../composables/useMetronome'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import TempoDial from '../components/TempoDial.vue'

const router = useRouter()
const {
  isRunning, bpm, beatsPerBar, subdivision, volume, accentEnabled,
  currentBeat, elapsedSeconds, skill, part,
  close, stop, toggle, setBpm, setSubdivision, setVolume, tap,
} = useMetronome()
const store = usePracticeStore()
const { showToast, showError } = useToast()
const { confirm } = useConfirm()

const QUALITY = [
  { value: 1, label: 'Difícil' },
  { value: 3, label: 'Bien' },
  { value: 5, label: 'Fluyó' },
]
const SUBDIVISIONS = [
  { value: 1, icon: '♩', short: 'negras', label: 'Una negra por pulso' },
  { value: 2, icon: '♫', short: 'corcheas', label: 'Dos corcheas por pulso' },
  { value: 4, icon: '♬', short: 'semis', label: 'Cuatro semicorcheas por pulso' },
]
const BEATS = [2, 3, 4, 6]
const currentSubdivision = computed(() => SUBDIVISIONS.find(option => option.value === subdivision.value) || SUBDIVISIONS[0])
const settingsOpen = ref(false)
const rating = ref(false)
const saving = ref(false)

function cycleBeats() {
  beatsPerBar.value = BEATS[(BEATS.indexOf(beatsPerBar.value) + 1) % BEATS.length]
}

function cycleSubdivision() {
  const index = SUBDIVISIONS.findIndex(option => option.value === subdivision.value)
  setSubdivision(SUBDIVISIONS[(index + 1) % SUBDIVISIONS.length].value)
}

// Guardar pide primero cómo se sintió; elegir la calificación guarda.
function startRating() {
  stop()
  rating.value = true
}
const trainerEnabled = ref(false)
const trainerStep = ref(2)
const trainerBars = ref(4)
let completedBars = 0
let receivedFirstBar = false

const targetLabel = computed(() => {
  const target = part.value?.target_bpm || skill.value?.target_bpm
  return target ? `meta ${target} bpm` : ''
})

// El dial late con el audio real: currentBeat lo actualiza el scheduler del
// metrónomo, así que el destello queda sincronizado con el click.
const beatFlash = ref(false)
const accentFlash = ref(false)
let flashTimer = null
watch(currentBeat, beat => {
  clearTimeout(flashTimer)
  if (beat < 0) { beatFlash.value = accentFlash.value = false; return }
  beatFlash.value = true
  accentFlash.value = beat === 0
  flashTimer = setTimeout(() => { beatFlash.value = accentFlash.value = false }, 110)
  if (!trainerEnabled.value || !isRunning.value || beat !== 0) return
  if (!receivedFirstBar) { receivedFirstBar = true; return }
  completedBars++
  if (completedBars >= Math.max(1, Number(trainerBars.value) || 1)) {
    setBpm(bpm.value + Math.max(1, Number(trainerStep.value) || 1))
    completedBars = 0
  }
})

watch(isRunning, running => {
  if (!running) { completedBars = 0; receivedFirstBar = false }
})

watch(trainerEnabled, () => { completedBars = 0; receivedFirstBar = false })

const timerLabel = computed(() => {
  const t = elapsedSeconds.value
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
})

async function saveSession(quality) {
  saving.value = true
  try {
    await store.logSession({
      skill_id: skill.value.id,
      part_id: part.value?.id || null,
      bpm: bpm.value,
      duration_seconds: elapsedSeconds.value,
      quality,
    })
    showToast('Práctica guardada')
    close()
    goBack()
  } catch (e) {
    showError(e, 'No se pudo guardar la práctica')
  } finally {
    saving.value = false
  }
}

function goBack() {
  if (router.options.history.state.back) router.back()
  else router.replace('/practica')
}

function handleKeyboard(event) {
  if (event.defaultPrevented) return
  const target = event.target
  if (event.code === 'Space' && target instanceof Element && target.closest('button')) return
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
  if (event.code === 'Space') { event.preventDefault(); toggle() }
  else if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); setBpm(bpm.value + 1) }
  else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); setBpm(bpm.value - 1) }
  else if (event.key.toLowerCase() === 't') tap()
}

onMounted(() => window.addEventListener('keydown', handleKeyboard))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboard)
  clearTimeout(flashTimer)
})

// No tirar a la basura una práctica cronometrada sin avisar
onBeforeRouteLeave(async () => {
  if (skill.value && elapsedSeconds.value >= 10) {
    stop()
    if (!await confirm('¿Salir sin guardar?', 'Se descartará el tiempo practicado.')) return false
  }
  close()
})
</script>

<style scoped>
/* Metrónomo como aparato: una carcasa con pantalla, perilla y teclas.
   Colores de la marca en versión "hardware": carcasa marino, vidrio con
   dígitos turquesa iluminado y naranja para el pulso 1 y el play. */
.metro-view {
  --body: #083b59;
  --body-edge: #052b42;
  --key: #0e4d72;
  --key-text: #d7ecf2;
  --glass: #021c2a;
  --lit: #7fe6f5;
  --ghost: rgba(127, 230, 245, .16);
  --downbeat: #f39015;
  width: 100%; max-width: 520px; height: 100dvh; margin: 0 auto;
  padding: max(8px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  display: grid; grid-template-rows: 48px minmax(0, 1fr); gap: 6px;
}
.metro-topbar { display: flex; align-items: center; gap: 6px; min-width: 0; }
.metro-back { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border: 0; border-radius: 50%; background: transparent; color: var(--color-primary); cursor: pointer; }
.metro-back svg { width: 24px; height: 24px; }
.metro-heading { min-width: 0; }
.metro-heading h1 { overflow: hidden; font-size: 18px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.metro-heading p { overflow: hidden; color: var(--color-text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }

/* ── Carcasa ── */
.device {
  min-height: 0; display: flex; flex-direction: column; gap: 12px;
  padding: 14px 14px 16px; border-radius: 30px;
  background: linear-gradient(180deg, #0b4467, var(--body) 40%, var(--body-edge));
  box-shadow: 0 18px 40px rgba(5, 43, 66, .35), inset 0 1px 0 rgba(255, 255, 255, .12);
  color: var(--key-text);
}

/* ── Pantalla ── */
.lcd {
  flex-shrink: 0; display: grid; grid-template-columns: auto 1fr; align-items: end; gap: 6px 12px;
  padding: 12px 16px 12px; border-radius: 16px;
  background: radial-gradient(120% 140% at 20% 0%, #06304a, var(--glass) 60%);
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, .55), 0 1px 0 rgba(255, 255, 255, .1);
}
.lcd__tempo { display: flex; align-items: baseline; gap: 4px; }
.lcd__bpm {
  padding: 0; border: 0; background: transparent; color: var(--lit); text-align: right;
  font-family: var(--font-display); font-size: 58px; font-weight: 600; line-height: .95; font-variant-numeric: tabular-nums;
  text-shadow: 0 0 14px rgba(127, 230, 245, .45); appearance: textfield; -moz-appearance: textfield;
}
/* Le gana a la regla global de 16px en campos (evita zoom en iOS; aquí es mayor). */
.device .lcd input.lcd__bpm[type='number'] { font-size: 58px; }
.lcd__bpm::-webkit-outer-spin-button, .lcd__bpm::-webkit-inner-spin-button { -webkit-appearance: none; }
.lcd__bpm:focus-visible { outline: 2px solid var(--lit); outline-offset: 3px; border-radius: 6px; }
.lcd__tempo span { color: rgba(127, 230, 245, .7); font-size: 13px; font-weight: 700; }
.lcd__readouts { display: flex; justify-content: flex-end; gap: 14px; margin: 0 0 4px; }
.lcd__readouts div { display: flex; flex-direction: column; align-items: flex-end; }
.lcd__readouts dt { color: rgba(127, 230, 245, .55); font-size: 11px; font-weight: 700; }
.lcd__readouts dd { margin: 0; color: var(--lit); font-family: var(--font-display); font-size: 19px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
.lcd__readouts dd:not(.live) { opacity: .92; }
.note { font-family: system-ui, sans-serif !important; font-size: 28px !important; line-height: 1; }
.lcd__beats { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; min-height: 14px; }
.lcd__beats span { width: 22px; height: 7px; border-radius: 4px; background: var(--ghost); transition: background .05s, box-shadow .05s; }
.lcd__beats span.on { background: var(--lit); box-shadow: 0 0 10px rgba(127, 230, 245, .8); }
.lcd__beats span.down.on { background: var(--downbeat); box-shadow: 0 0 12px rgba(243, 144, 21, .85); }
.lcd__beats small { margin-left: auto; overflow: hidden; color: rgba(127, 230, 245, .7); font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }

/* ── Perilla: ocupa el espacio que dejen pantalla, teclas y ajustes ── */
.device__dial { flex: 1; min-height: 120px; container-type: size; display: grid; place-items: center; }
.device__dial :deep(.tempo-dial) { width: min(100cqw - 8px, 100cqh - 8px, 320px); }
.dial-controls { display: flex; align-items: center; gap: 5cqw; }
.dial-step {
  width: 13cqw; height: 13cqw; min-width: 36px; min-height: 36px; display: grid; place-items: center;
  border: 0; border-radius: 50%; background: transparent; color: var(--body); font-size: max(20px, 7cqw); font-weight: 700; cursor: pointer;
}
.dial-step:active { background: rgba(8, 59, 89, .1); }
.dial-play {
  width: 32cqw; height: 32cqw; min-width: 64px; min-height: 64px; display: grid; place-items: center;
  border: 0; border-radius: 50%; background: radial-gradient(circle at 50% 30%, #ffab45, var(--downbeat) 70%);
  color: var(--body); box-shadow: 0 6px 14px rgba(217, 120, 8, .45), inset 0 2px 0 rgba(255, 255, 255, .35);
  cursor: pointer; transition: transform .08s, box-shadow .08s;
}
.dial-play svg { width: 40%; height: 40%; }
.dial-play.beat { transform: scale(1.04); }
.dial-play.accent { box-shadow: 0 0 0 6px rgba(243, 144, 21, .3), 0 6px 14px rgba(217, 120, 8, .45); }

/* ── Teclas ── */
.keys { flex-shrink: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.key {
  min-height: 58px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  border: 0; border-radius: 16px; background: linear-gradient(180deg, #125a84, var(--key));
  box-shadow: 0 3px 0 var(--body-edge), inset 0 1px 0 rgba(255, 255, 255, .14);
  color: var(--key-text); font: inherit; cursor: pointer; transition: transform .06s, box-shadow .06s;
}
.key:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--body-edge), inset 0 1px 0 rgba(255, 255, 255, .1); }
.key b { display: grid; place-items: center; height: 24px; font-family: var(--font-display); font-size: 19px; font-weight: 600; }
.key b svg { width: 20px; height: 20px; }
.key small { color: rgba(215, 236, 242, .65); font-size: 11px; font-weight: 700; }
.key.active { background: linear-gradient(180deg, #1c7aa8, #125a84); color: #fff; }

/* ── Ajustes (plegables dentro de la carcasa) ── */
.settings { flex-shrink: 0; display: flex; flex-direction: column; padding: 2px 14px; border-radius: 16px; background: rgba(2, 28, 42, .45); }
.settings__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 46px; font-size: 14px; font-weight: 700; }
.settings__row + .settings__row { border-top: 1px solid rgba(215, 236, 242, .1); }
.settings__volume { width: 55%; accent-color: var(--lit); }
.settings__trainer { justify-content: flex-start; gap: 16px; color: rgba(215, 236, 242, .8); font-weight: 600; }
.settings__trainer label { display: flex; align-items: center; gap: 6px; }
.settings__trainer input {
  width: 44px; height: 36px; padding: 0; border: 1px solid rgba(127, 230, 245, .3); border-radius: 10px;
  background: var(--glass); color: var(--lit); font: inherit; font-weight: 800; text-align: center; appearance: textfield; -moz-appearance: textfield;
}
.settings__trainer input::-webkit-outer-spin-button, .settings__trainer input::-webkit-inner-spin-button { -webkit-appearance: none; }
.switch { width: 46px; height: 28px; flex-shrink: 0; padding: 3px; border: 0; border-radius: 999px; background: rgba(215, 236, 242, .2); cursor: pointer; }
.switch i { display: block; width: 22px; height: 22px; border-radius: 50%; background: var(--key-text); transition: transform .15s; }
.switch.on { background: var(--lit); }
.switch.on i { transform: translateX(18px); background: var(--body); }

/* ── Guardar práctica ── */
.session { flex-shrink: 0; }
.session__save {
  width: 100%; min-height: 50px; display: flex; align-items: center; justify-content: center; gap: 10px;
  border: 1px solid rgba(127, 230, 245, .35); border-radius: 16px; background: transparent;
  color: var(--lit); font: inherit; font-size: 15px; font-weight: 800; cursor: pointer;
}
.session__save span { font-family: var(--font-display); font-weight: 600; font-variant-numeric: tabular-nums; opacity: .75; }
.session__save:disabled { opacity: .4; cursor: default; }
.session__rate { display: grid; grid-template-columns: repeat(3, 1fr) 44px; gap: 8px; align-items: center; }
.session__rate > span { grid-column: 1 / -1; font-size: 13px; font-weight: 700; color: rgba(215, 236, 242, .8); }
.session__rate button { min-height: 48px; border: 0; border-radius: 14px; background: var(--lit); color: var(--body); font: inherit; font-size: 15px; font-weight: 800; cursor: pointer; }
.session__rate .session__cancel { background: rgba(215, 236, 242, .15); color: var(--key-text); font-size: 20px; }
.session__rate button:disabled { opacity: .5; }

.device button:focus-visible, .device input:focus-visible { outline: 2px solid var(--lit); outline-offset: 2px; }
.metro-back:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }

@media (max-width: 360px) {
  .metro-view { padding-inline: 8px; }
  .device { padding: 12px 10px 12px; gap: 10px; border-radius: 24px; }
  .lcd { padding: 10px 12px; }
  .device .lcd input.lcd__bpm[type='number'] { font-size: 48px; }
  .lcd__readouts { gap: 10px; }
  .lcd__readouts dd { font-size: 16px; }
  .keys { gap: 7px; }
}
@media (max-height: 680px) {
  .device { gap: 8px; padding-block: 10px 14px; }
  .device .lcd input.lcd__bpm[type='number'] { font-size: 46px; }
  .key { min-height: 50px; }
  .session__save { min-height: 44px; }
}
/* Horizontal en teléfono: perilla a toda altura a la izquierda; pantalla,
   teclas, ajustes y guardar apilados a la derecha. */
@media (min-width: 600px) and (max-height: 600px) {
  .metro-view { max-width: 960px; }
  .device { display: grid; grid-template-columns: minmax(0, .9fr) minmax(300px, 1fr); grid-template-rows: auto auto auto auto minmax(0, 1fr); gap: 10px 18px; }
  .device__dial { grid-column: 1; grid-row: 1 / -1; min-height: 0; }
  .lcd, .keys, .settings, .session { grid-column: 2; }
}
@media (prefers-reduced-motion: reduce) {
  .dial-play, .lcd__beats span, .switch i, .key { transition: none; }
  .dial-play.beat, .key:active { transform: none; }
}
</style>
