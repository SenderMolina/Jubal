import { ref } from 'vue'
import { todayBpm } from '../utils/skills'

// Metrónomo con Web Audio: los clicks se agendan con lookahead sobre el reloj
// del AudioContext (setInterval solo alimenta la cola), así el tempo no se
// desfasa aunque el main thread se atore. Estado a nivel módulo: una sola
// instancia compartida (panel + vistas).

const MIN_BPM = 20
const MAX_BPM = 300
const LOOKAHEAD_S = 0.1   // cuánto audio agendar por adelantado
const TICK_MS = 25        // frecuencia del alimentador

const isRunning      = ref(false)
const bpm            = ref(100)
const beatsPerBar    = ref(4)
const subdivision    = ref(1)    // pulsos por beat: negra, corcheas o semicorcheas
const volume         = ref(0.7)
const accentEnabled  = ref(true)
const currentBeat    = ref(-1)  // para el pulso visual (-1 = detenido)
const elapsedSeconds = ref(0)   // tiempo practicado acumulado (entre guardados)
const skill          = ref(null) // skill en práctica, o null (metrónomo libre)
const part           = ref(null) // parte concreta de la skill, o null

let ctx = null
let timer = null
let nextNoteTime = 0
let pulseCount = 0
let accumulatedMs = 0
let runStartMs = 0
let taps = []
let wakeLock = null
const scheduledNodes = new Set()

function clampBpm(v) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v)))
}

function setBpm(v) {
  if (!v || isNaN(v)) return
  bpm.value = clampBpm(v)
}

function setSubdivision(value) {
  const parsed = Number(value)
  if ([1, 2, 4].includes(parsed)) subdivision.value = parsed
}

function setVolume(value) {
  volume.value = Math.min(1, Math.max(0, Number(value) || 0))
}

function scheduleClick(time, { accent = false, primary = true } = {}) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  const audibleAccent = accent && accentEnabled.value
  osc.frequency.value = audibleAccent ? 1250 : (primary ? 850 : 560)
  const peak = Math.max(0.0001, volume.value * (audibleAccent ? 0.72 : (primary ? 0.46 : 0.22)))
  gain.gain.setValueAtTime(0.001, time)
  gain.gain.exponentialRampToValueAtTime(peak, time + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
  osc.connect(gain).connect(ctx.destination)
  scheduledNodes.add(osc)
  osc.onended = () => scheduledNodes.delete(osc)
  osc.start(time)
  osc.stop(time + 0.06)
}

function tick() {
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
    const pulsesPerBeat = subdivision.value
    const sub = pulseCount % pulsesPerBeat
    const beat = Math.floor(pulseCount / pulsesPerBeat) % beatsPerBar.value
    const primary = sub === 0
    scheduleClick(nextNoteTime, { accent: primary && beat === 0, primary })
    // Sincronizar el pulso visual con el audio agendado
    const delay = Math.max(0, (nextNoteTime - ctx.currentTime) * 1000)
    setTimeout(() => {
      if (!isRunning.value) return
      currentBeat.value = beat
    }, delay)
    nextNoteTime += 60 / bpm.value / pulsesPerBeat
    pulseCount++
  }
  elapsedSeconds.value = Math.floor((accumulatedMs + performance.now() - runStartMs) / 1000)
}

async function start() {
  if (isRunning.value) return
  ctx ??= new (window.AudioContext || window.webkitAudioContext)()
  await ctx.resume()
  nextNoteTime = ctx.currentTime + 0.05
  pulseCount = 0
  runStartMs = performance.now()
  isRunning.value = true
  timer = setInterval(tick, TICK_MS)
  // Pantalla encendida mientras suena: al apagarse, el navegador suspende el
  // AudioContext y el metrónomo muere a media práctica.
  // ponytail: sin re-adquirir en visibilitychange; si cambia de app, se
  // recupera en el próximo play.
  try { wakeLock = await navigator.wakeLock?.request('screen') } catch { /* no soportado */ }
}

function stop() {
  if (!isRunning.value) return
  clearInterval(timer)
  accumulatedMs += performance.now() - runStartMs
  elapsedSeconds.value = Math.floor(accumulatedMs / 1000)
  isRunning.value = false
  currentBeat.value = -1
  scheduledNodes.forEach(node => { try { node.stop() } catch { /* ya finalizó */ } })
  scheduledNodes.clear()
  wakeLock?.release().catch(() => {})
  wakeLock = null
}

function toggle() {
  isRunning.value ? stop() : start()
}

function tap() {
  const now = performance.now()
  taps = taps.filter(t => now - t < 2500)
  taps.push(now)
  if (taps.length >= 2) {
    setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)))
  }
}

function resetElapsed() {
  accumulatedMs = 0
  elapsedSeconds.value = 0
}

// Preparar el metrónomo antes de navegar a /metronomo: opcionalmente con una
// skill en práctica y un tempo de trabajo (p. ej. el planeado en la rutina).
function open(s = null, workBpm = null, selectedPart = null) {
  skill.value = s
  part.value = selectedPart
  if (workBpm) {
    setBpm(workBpm)
  } else if (selectedPart?.current_bpm || selectedPart?.target_bpm) {
    // La parte tiene su propio tempo: arrancar ahí, o por debajo de su meta
    setBpm(selectedPart.current_bpm || Math.round(selectedPart.target_bpm * 0.7))
  } else if (s?.current_bpm || s?.target_bpm) {
    // Arrancar en el tempo de hoy (plan hacia la fecha meta), o algo por
    // debajo de la meta si aún no hay tempo alcanzado
    setBpm(todayBpm(s) || Math.round(s.target_bpm * 0.7))
  }
  resetElapsed()
}

// Limpiar al salir de la vista.
function close() {
  stop()
  resetElapsed()
  skill.value = null
  part.value = null
}

export function useMetronome() {
  return {
    isRunning, bpm, beatsPerBar, subdivision, volume, accentEnabled,
    currentBeat, elapsedSeconds, skill, part,
    open, close, start, stop, toggle, setBpm, setSubdivision, setVolume, tap,
  }
}
