<template>
  <div class="metro-view">
    <!-- Escenario: la práctica ocurre aquí -->
    <section class="stage" :class="{ running: isRunning }">
      <div class="stage__ambient" aria-hidden="true"></div>

      <!-- div, no <header>: main.css tiene un header{} global legacy con fondo claro -->
      <div class="stage__head">
        <template v-if="skill">
          <span class="stage__label">{{ part ? 'Sección en práctica' : 'Objetivo en práctica' }}</span>
          <h1 class="stage__title">{{ skill.name }}</h1>
          <p v-if="part || targetLabel" class="stage__meta">
            {{ [part?.name, targetLabel].filter(Boolean).join(' · ') }}
          </p>
        </template>
        <template v-else>
          <span class="stage__label">Metrónomo</span>
          <h1 class="stage__title">Práctica libre</h1>
        </template>
      </div>

      <!-- Tempo -->
      <div class="stage__bpm">
        <button class="bpm-btn" aria-label="Bajar 5 BPM" @click="setBpm(bpm - 5)">−5</button>
        <button class="bpm-btn bpm-btn--fine" aria-label="Bajar 1 BPM" @click="setBpm(bpm - 1)">−</button>
        <div class="bpm-value">
          <input type="number" :value="bpm" aria-label="Pulsos por minuto" @change="setBpm(+$event.target.value)">
          <span>BPM</span>
        </div>
        <button class="bpm-btn bpm-btn--fine" aria-label="Subir 1 BPM" @click="setBpm(bpm + 1)">+</button>
        <button class="bpm-btn" aria-label="Subir 5 BPM" @click="setBpm(bpm + 5)">+5</button>
      </div>
      <input
        class="stage__tempo-range"
        type="range" min="20" max="300" step="1" :value="bpm"
        aria-label="Ajustar tempo"
        @input="setBpm(+$event.target.value)"
      >
      <div class="stage__presets" aria-label="Tempos rápidos">
        <button v-for="tempo in [60, 80, 100, 120, 160]" :key="tempo" @click="setBpm(tempo)">{{ tempo }}</button>
      </div>

      <!-- Pulso visual del compás -->
      <div class="stage__beats" aria-hidden="true">
        <span
          v-for="i in beatsPerBar"
          :key="i"
          :class="{ active: currentBeat === i - 1, accent: i === 1 }"
        />
      </div>

      <!-- Controles: el dial late con el beat -->
      <div class="stage__controls">
        <button class="stage__tap" @click="tap">TAP</button>
        <button
          class="stage__play"
          :class="{ beat: beatFlash, accent: accentFlash }"
          :aria-label="isRunning ? 'Pausar' : 'Iniciar'"
          @click="toggle"
        >
          <svg v-if="!isRunning" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
        </button>
        <span class="stage__timer" :class="{ running: isRunning }">{{ timerLabel }}</span>
      </div>
    </section>

    <!-- Compás -->
    <div class="metro-row">
      <span class="metro-row__label">Compás</span>
      <div class="metro-bar">
        <button
          v-for="n in [2, 3, 4, 6]"
          :key="n"
          :class="{ active: beatsPerBar === n }"
          @click="beatsPerBar = n"
        >{{ n }}<small>/4</small></button>
      </div>
    </div>

    <div class="metro-row metro-row--stack">
      <div class="metro-setting">
        <span class="metro-row__label">Subdivisión</span>
        <div class="metro-subdivision">
          <button
            v-for="option in SUBDIVISIONS"
            :key="option.value"
            :class="{ active: subdivision === option.value }"
            :aria-label="option.label"
            @click="setSubdivision(option.value)"
          ><b>{{ option.icon }}</b><small>{{ option.short }}</small></button>
        </div>
      </div>
      <div class="metro-setting metro-setting--sound">
        <button class="metro-toggle" :class="{ active: accentEnabled }" @click="accentEnabled = !accentEnabled">
          <span aria-hidden="true">{{ accentEnabled ? '●' : '○' }}</span> Acento
        </button>
        <label class="metro-volume">
          <span aria-hidden="true">{{ volume ? '◖))' : '◖' }}</span>
          <input type="range" min="0" max="1" step="0.05" :value="volume" aria-label="Volumen" @input="setVolume($event.target.value)">
        </label>
      </div>
    </div>

    <div class="metro-row metro-row--trainer">
      <div>
        <span class="metro-row__label">Entrenador de tempo</span>
        <small>{{ trainerEnabled ? `Sube ${trainerStep} BPM cada ${trainerBars} compases` : 'Incrementa el tempo automáticamente' }}</small>
      </div>
      <button class="switch" :class="{ active: trainerEnabled }" :aria-pressed="trainerEnabled" @click="trainerEnabled = !trainerEnabled"><span /></button>
      <div v-if="trainerEnabled" class="trainer-options">
        <label>+ <input v-model.number="trainerStep" type="number" min="1" max="20"> BPM</label>
        <label>cada <input v-model.number="trainerBars" type="number" min="1" max="32"> compases</label>
      </div>
    </div>

    <!-- Cierre de sesión -->
    <div v-if="skill" class="metro-row">
      <span class="metro-row__label">¿Cómo se sintió?</span>
      <div class="metro-quality">
        <button
          v-for="option in QUALITY"
          :key="option.value"
          :class="{ active: quality === option.value }"
          @click="quality = option.value"
        ><b>{{ option.icon }}</b><small>{{ option.label }}</small></button>
      </div>
    </div>
    <button
      v-if="skill"
      class="btn btn-primary metro-save"
      :disabled="!elapsedSeconds"
      @click="saveSession"
    >{{ elapsedSeconds ? `Guardar sesión · ${timerLabel}` : 'Guardar sesión' }}</button>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useMetronome } from '../composables/useMetronome'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const router = useRouter()
const {
  isRunning, bpm, beatsPerBar, subdivision, volume, accentEnabled,
  currentBeat, elapsedSeconds, skill, part,
  close, stop, toggle, setBpm, setSubdivision, setVolume, tap,
} = useMetronome()
const store = usePracticeStore()
const { showToast } = useToast()
const { confirm } = useConfirm()

const QUALITY = [
  { value: 1, icon: '●', label: 'Difícil' },
  { value: 3, icon: '◆', label: 'Bien' },
  { value: 5, icon: '★', label: 'Fluyó' },
]
const quality = ref(3)
const SUBDIVISIONS = [
  { value: 1, icon: '♩', short: 'Negras', label: 'Una negra por pulso' },
  { value: 2, icon: '♪', short: 'Corcheas', label: 'Dos corcheas por pulso' },
  { value: 4, icon: '♬', short: 'Semis', label: 'Cuatro semicorcheas por pulso' },
]
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

async function saveSession() {
  const s = skill.value
  stop()
  const wasMastered = s.status === 'mastered'  // logSession lo puede mutar
  try {
    await store.logSession({
      skill_id: s.id,
      part_id: part.value?.id || null,
      bpm: bpm.value,
      duration_seconds: elapsedSeconds.value,
      quality: quality.value,
    })
    const mastered = s.status === 'mastered' && !wasMastered
    showToast(mastered ? '🎉 ¡Objetivo dominado!' : 'Sesión guardada ✓')
    close()
    router.back()
  } catch (e) {
    showToast(e.message || 'No se pudo guardar la sesión')
  }
}

function handleKeyboard(event) {
  const target = event.target
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
.metro-view {
  max-width: 440px; margin: 0 auto;
  /* Sin padding lateral: .page ya lo aporta (16/20px) */
  padding: 12px 0 0;
  display: flex; flex-direction: column; gap: 14px;
  /* Llenar hasta el menú: alto de viewport menos header de la app y paddings de .page */
  min-height: calc(100dvh - 182px);
}
@media (max-width: 600px) {
  .metro-view { min-height: calc(100dvh - 136px); }
}

/* ---- Escenario ---- */
.stage {
  flex: 1; display: flex; flex-direction: column;
  position: relative; isolation: isolate; overflow: hidden;
  padding: 20px 16px 24px; border-radius: 26px; color: var(--color-text-primary);
  background: var(--color-primary-soft);
  border: 1px solid rgba(var(--color-primary-rgb), .24);
  box-shadow: var(--shadow-small);
}
.stage__ambient {
  position: absolute; z-index: -1; right: -55px; top: -85px;
  width: 195px; height: 195px; border-radius: 50%;
  background: var(--color-warning-soft);
}
.stage__head { text-align: center; }
.stage__label {
  color: var(--color-primary); font-size: 8px; font-weight: 900;
  letter-spacing: .12em; text-transform: uppercase;
}
.stage__title {
  margin-top: 3px; font-size: 17px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.stage__meta { margin-top: 3px; color: var(--color-text-secondary); font-size: 10px; }

/* margin auto arriba y abajo: el tempo y el dial se reparten el alto sobrante */
.stage__bpm { display: flex; align-items: center; justify-content: center; gap: 7px; margin-top: auto; padding-top: 16px; }
.bpm-btn {
  width: 46px; height: 42px; flex-shrink: 0; cursor: pointer;
  border: 1px solid rgba(var(--color-primary-rgb), .25); border-radius: 13px;
  background: var(--color-surface); color: var(--color-primary);
  font: inherit; font-size: 12px; font-weight: 800;
}
.bpm-btn--fine { width: 36px; background: var(--color-surface-secondary); }
.bpm-btn:active { background: var(--color-primary-soft); }
.bpm-value { display: flex; flex-direction: column; align-items: center; min-width: 118px; }
.bpm-value input {
  width: 118px; text-align: center; line-height: 1;
  font-size: 54px; font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: -.03em;
  background: none; border: none; color: var(--color-primary); outline: none;
  -moz-appearance: textfield; appearance: textfield;
}
.bpm-value input::-webkit-outer-spin-button,
.bpm-value input::-webkit-inner-spin-button { -webkit-appearance: none; }
.bpm-value span { color: var(--color-text-secondary); font-size: 8px; font-weight: 900; letter-spacing: .22em; }
.stage__tempo-range { width: min(300px, 88%); margin: 9px auto 0; accent-color: var(--color-primary); }
.stage__presets { display: flex; justify-content: center; gap: 5px; margin-top: 8px; }
.stage__presets button { min-width: 39px; padding: 4px 6px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface); color: var(--color-text-secondary); font: inherit; font-size: 9px; cursor: pointer; }

.stage__beats { display: flex; justify-content: center; gap: 11px; margin: 17px 0 4px; }
.stage__beats span {
  width: 11px; height: 11px; border-radius: 50%;
  background: var(--color-surface); border: 1px solid rgba(var(--color-primary-rgb), .3);
  transition: transform .06s, background .06s, box-shadow .06s;
}
.stage__beats .accent { border-color: var(--color-accent); }
.stage__beats .active { background: var(--color-primary); transform: scale(1.45); }
.stage__beats .accent.active { background: var(--color-accent); box-shadow: 0 0 0 5px var(--color-accent-soft); }

.stage__controls {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; margin-top: auto; padding-top: 14px;
}
.stage__tap {
  justify-self: center; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;
  border: 1px solid rgba(var(--color-primary-rgb), .28); background: var(--color-surface);
  color: var(--color-primary); font: inherit; font-size: 10px; font-weight: 800; letter-spacing: .08em;
}
.stage__tap:active { background: var(--color-primary-soft); }
.stage__play {
  width: 92px; height: 92px; border-radius: 50%; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  background: var(--color-accent); color: var(--color-text-on-accent);
  box-shadow: var(--shadow-medium);
  transition: transform .09s ease-out, box-shadow .09s ease-out;
}
.stage__play svg { width: 38px; height: 38px; }
.stage__play.beat { transform: scale(1.06); }
.stage__play.accent {
  box-shadow: 0 0 0 9px var(--color-accent-soft), var(--shadow-medium);
}
.stage.running .stage__play { background: var(--color-accent-pressed); color: var(--color-text-on-accent); box-shadow: var(--shadow-medium); }
.stage__timer {
  justify-self: center; min-width: 54px; text-align: center;
  color: var(--color-text-secondary); font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.stage__timer.running { color: var(--color-primary); }

.stage button:focus-visible, .metro-view button:focus-visible {
  outline: 2px solid var(--color-primary); outline-offset: 2px;
}
.stage button:focus-visible { outline-color: var(--color-focus); }

/* ---- Fuera del escenario ---- */
.metro-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 11px 14px; border: 1px solid var(--color-border); border-radius: 16px;
  background: var(--color-surface); box-shadow: var(--shadow-small);
}
.metro-row__label {
  color: var(--color-text-secondary); font-size: 10px; font-weight: 800;
  letter-spacing: .06em; text-transform: uppercase; flex-shrink: 0;
}
.metro-bar { display: flex; gap: 6px; }
.metro-bar button {
  width: 44px; height: 34px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700;
  background: var(--color-surface-secondary); border: 1px solid var(--color-border);
  border-radius: 10px; color: var(--color-text-secondary);
}
.metro-bar button small { font-size: 9px; font-weight: 500; color: inherit; opacity: .55; }
.metro-bar button.active { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-text-on-primary); }
.metro-bar button.active small { opacity: .75; }
.metro-row--stack { align-items: stretch; flex-direction: column; gap: 10px; }
.metro-setting { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.metro-subdivision { display: flex; gap: 5px; }
.metro-subdivision button { min-width: 66px; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface-secondary); color: var(--color-text-secondary); font: inherit; cursor: pointer; }
.metro-subdivision b { font-size: 15px; }
.metro-subdivision small { font-size: 8px; }
.metro-subdivision button.active { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary-hover); }
.metro-setting--sound { padding-top: 9px; border-top: 1px solid var(--color-border); }
.metro-toggle { padding: 6px 9px; border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface-secondary); color: var(--color-text-muted); font: inherit; font-size: 9px; font-weight: 700; cursor: pointer; }
.metro-toggle.active { color: var(--color-primary-hover); border-color: var(--color-primary); background: var(--color-primary-soft); }
.metro-volume { display: flex; align-items: center; gap: 7px; color: var(--color-text-muted); font-size: 10px; }
.metro-volume input { width: 120px; accent-color: var(--color-primary); }
.metro-row--trainer { display: grid; grid-template-columns: 1fr auto; }
.metro-row--trainer > div:first-child { display: flex; flex-direction: column; gap: 3px; }
.metro-row--trainer > div:first-child small { color: var(--color-text-muted); font-size: 9px; }
.switch { width: 40px; height: 23px; padding: 2px; border: 0; border-radius: 999px; background: var(--color-border); cursor: pointer; transition: background .15s; }
.switch span { display: block; width: 19px; height: 19px; border-radius: 50%; background: var(--color-surface); box-shadow: var(--shadow-small); transition: transform .15s; }
.switch.active { background: var(--color-primary); }
.switch.active span { transform: translateX(17px); }
.trainer-options { grid-column: 1 / -1; display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); }
.trainer-options label { flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; color: var(--color-text-muted); font-size: 9px; }
.trainer-options input { width: 42px; padding: 5px; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-surface-secondary); color: var(--color-text-primary); text-align: center; }

.metro-quality { display: flex; gap: 6px; }
.metro-quality button {
  display: flex; align-items: center; gap: 5px;
  padding: 8px 10px; cursor: pointer; font: inherit;
  background: var(--color-surface-secondary); border: 1px solid var(--color-border);
  border-radius: 10px; color: var(--color-text-secondary);
}
.metro-quality button.active { border-color: var(--color-primary); background: var(--color-primary-soft); color: var(--color-primary-hover); }
.metro-quality b { font-size: 11px; }
.metro-quality small { font-size: 11px; font-weight: 600; }

.metro-save { width: 100%; justify-content: center; padding: 13px; font-variant-numeric: tabular-nums; }

@media (max-width: 350px) {
  .stage { padding-inline: 12px; }
  .bpm-value { min-width: 104px; }
  .bpm-value input { width: 104px; font-size: 48px; }
  .bpm-btn { width: 40px; }
  .bpm-btn--fine { display: none; }
  .metro-row { flex-direction: column; align-items: stretch; }
  .metro-quality button { flex: 1; justify-content: center; }
  .metro-setting { align-items: stretch; flex-direction: column; }
  .metro-subdivision button { flex: 1; min-width: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .stage__play, .stage__beats span { transition: none; }
  .stage__play.beat { transform: none; }
}

.stage__label { font-size:11px; }.stage__title { font-size:21px; }.stage__meta { font-size:13px; }.bpm-value span { font-size:11px; }.stage__presets button { min-height:32px;font-size:11px;font-weight:800; }.stage__timer { font-size:17px; }
.metro-row { padding:13px 15px;border-radius:18px;box-shadow:none; }.metro-row__label { font-size:12px; }.metro-bar button { min-height:40px;font-size:14px; }.metro-subdivision button { min-height:44px; }.metro-subdivision small,.metro-toggle,.metro-row--trainer > div:first-child small,.trainer-options label { font-size:11px; }.metro-quality small { font-size:12px; }
</style>
