<template>
  <div class="metro-view">
    <p v-if="skill" class="metro-skill">
      {{ skill.name }}
      <span v-if="skill.target_bpm" class="metro-skill__goal">meta {{ skill.target_bpm }} bpm</span>
    </p>

    <!-- BPM -->
    <div class="metro-bpm">
      <button class="metro-bpm__btn" @click="setBpm(bpm - 5)">−5</button>
      <button class="metro-bpm__btn" @click="setBpm(bpm - 1)">−</button>
      <div class="metro-bpm__center">
        <input
          class="metro-bpm__value"
          type="number"
          :value="bpm"
          @change="setBpm(+$event.target.value)"
        >
        <span class="metro-bpm__unit">bpm</span>
      </div>
      <button class="metro-bpm__btn" @click="setBpm(bpm + 1)">+</button>
      <button class="metro-bpm__btn" @click="setBpm(bpm + 5)">+5</button>
    </div>

    <!-- Pulso visual + compás -->
    <div class="metro-beats">
      <span
        v-for="i in beatsPerBar"
        :key="i"
        class="metro-beats__dot"
        :class="{ active: currentBeat === i - 1, accent: i === 1 }"
      />
    </div>
    <div class="metro-bar">
      <button
        v-for="n in [2, 3, 4, 6]"
        :key="n"
        class="metro-bar__opt"
        :class="{ active: beatsPerBar === n }"
        @click="beatsPerBar = n"
      >{{ n }}</button>
    </div>

    <!-- Controles -->
    <div class="metro-controls">
      <button class="metro-tap" @click="tap">TAP</button>
      <button class="metro-play" :class="{ running: isRunning }" @click="toggle">
        <svg v-if="!isRunning" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
      </button>
      <span class="metro-timer" :class="{ running: isRunning }">{{ timerLabel }}</span>
    </div>

    <!-- Guardar sesión -->
    <button
      v-if="skill"
      class="btn btn-primary metro-save"
      :disabled="!elapsedSeconds"
      @click="saveSession"
    >Guardar sesión</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useMetronome } from '../composables/useMetronome'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'

const router = useRouter()
const {
  isRunning, bpm, beatsPerBar, currentBeat, elapsedSeconds, skill,
  close, stop, toggle, setBpm, tap,
} = useMetronome()
const store = usePracticeStore()
const { showToast } = useToast()
const { confirm } = useConfirm()

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
      bpm: bpm.value,
      duration_seconds: elapsedSeconds.value,
    })
    const mastered = s.target_bpm && bpm.value >= s.target_bpm && !wasMastered
    showToast(mastered ? '🎉 ¡Skill dominada!' : 'Sesión guardada ✓')
    close()
    router.back()
  } catch (e) {
    showToast(e.message || 'No se pudo guardar la sesión')
  }
}

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
  max-width: 420px; margin: 0 auto;
  padding: 28px 20px 40px;
  display: flex; flex-direction: column; align-items: center; gap: 22px;
}

.metro-skill { font-weight: 600; font-size: 16px; color: var(--text); display: flex; gap: 10px; align-items: baseline; }
.metro-skill__goal { font-size: 12px; font-weight: 500; color: var(--text-muted); }

.metro-bpm { display: flex; align-items: center; gap: 8px; }
.metro-bpm__btn {
  width: 46px; height: 46px; border-radius: 50%; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text); font-size: 15px; font-weight: 600;
}
.metro-bpm__btn:active { background: var(--accent); color: #fff; }
.metro-bpm__center { display: flex; flex-direction: column; align-items: center; min-width: 110px; }
.metro-bpm__value {
  width: 110px; text-align: center; font-size: 3.2rem; font-weight: 800; line-height: 1.1;
  background: none; border: none; color: var(--text); outline: none;
  -moz-appearance: textfield; appearance: textfield;
}
.metro-bpm__value::-webkit-outer-spin-button,
.metro-bpm__value::-webkit-inner-spin-button { -webkit-appearance: none; }
.metro-bpm__unit { font-size: 11px; color: var(--text-muted); letter-spacing: .08em; text-transform: uppercase; }

.metro-beats { display: flex; gap: 12px; }
.metro-beats__dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--surface2); border: 1px solid var(--border);
  transition: transform .05s, background .05s;
}
.metro-beats__dot.accent { border-color: var(--accent); }
.metro-beats__dot.active { background: var(--accent); transform: scale(1.35); }

.metro-bar { display: flex; gap: 6px; }
.metro-bar__opt {
  width: 36px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;
  background: var(--surface); border: 1px solid var(--border); color: var(--text-mid);
}
.metro-bar__opt.active { background: var(--accent); border-color: var(--accent); color: #fff; }

.metro-controls { display: flex; align-items: center; gap: 26px; margin-top: 4px; }
.metro-tap {
  width: 60px; height: 60px; border-radius: 50%; cursor: pointer;
  background: var(--surface); border: 1px solid var(--border);
  color: var(--text-mid); font-size: 12px; font-weight: 700; letter-spacing: .05em;
}
.metro-tap:active { background: var(--accent); color: #fff; }
.metro-play {
  width: 84px; height: 84px; border-radius: 50%; cursor: pointer;
  background: var(--accent); border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-hover);
}
.metro-play svg { width: 38px; height: 38px; }
.metro-play.running { background: var(--red); }
.metro-timer {
  min-width: 60px; font-variant-numeric: tabular-nums;
  font-size: 16px; font-weight: 600; color: var(--text-muted);
}
.metro-timer.running { color: var(--text); }

.metro-save { width: 100%; justify-content: center; padding: 13px; }
</style>
