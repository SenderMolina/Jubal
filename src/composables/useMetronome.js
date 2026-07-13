import { ref } from 'vue'

// Metrónomo con Web Audio: los clicks se agendan con lookahead sobre el reloj
// del AudioContext (setInterval solo alimenta la cola), así el tempo no se
// desfasa aunque el main thread se atore. Estado a nivel módulo: una sola
// instancia compartida (panel + vistas).

const MIN_BPM = 20
const MAX_BPM = 300
const LOOKAHEAD_S = 0.1   // cuánto audio agendar por adelantado
const TICK_MS = 25        // frecuencia del alimentador

const isOpen         = ref(false)
const isRunning      = ref(false)
const bpm            = ref(100)
const beatsPerBar    = ref(4)
const currentBeat    = ref(-1)  // para el pulso visual (-1 = detenido)
const elapsedSeconds = ref(0)   // tiempo practicado acumulado (entre guardados)
const skill          = ref(null) // skill en práctica, o null (metrónomo libre)

let ctx = null
let timer = null
let nextNoteTime = 0
let beatCount = 0
let accumulatedMs = 0
let runStartMs = 0
let taps = []
let wakeLock = null

function clampBpm(v) {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v)))
}

function setBpm(v) {
  if (!v || isNaN(v)) return
  bpm.value = clampBpm(v)
}

function scheduleClick(time, accent) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = accent ? 1100 : 800
  gain.gain.setValueAtTime(0.001, time)
  gain.gain.exponentialRampToValueAtTime(0.5, time + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
  osc.connect(gain).connect(ctx.destination)
  osc.start(time)
  osc.stop(time + 0.06)
}

function tick() {
  while (nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
    const beat = beatCount % beatsPerBar.value
    scheduleClick(nextNoteTime, beat === 0)
    // Sincronizar el pulso visual con el audio agendado
    const delay = Math.max(0, (nextNoteTime - ctx.currentTime) * 1000)
    setTimeout(() => { if (isRunning.value) currentBeat.value = beat }, delay)
    nextNoteTime += 60 / bpm.value
    beatCount++
  }
  elapsedSeconds.value = Math.floor((accumulatedMs + Date.now() - runStartMs) / 1000)
}

async function start() {
  if (isRunning.value) return
  ctx ??= new (window.AudioContext || window.webkitAudioContext)()
  await ctx.resume()
  nextNoteTime = ctx.currentTime + 0.05
  beatCount = 0
  runStartMs = Date.now()
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
  accumulatedMs += Date.now() - runStartMs
  elapsedSeconds.value = Math.floor(accumulatedMs / 1000)
  isRunning.value = false
  currentBeat.value = -1
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

// Abrir el panel, opcionalmente con una skill en práctica y un tempo de
// trabajo (p. ej. el planeado en la rutina).
function open(s = null, workBpm = null) {
  skill.value = s
  if (workBpm) {
    setBpm(workBpm)
  } else if (s?.current_bpm || s?.target_bpm) {
    // Arrancar en el bpm alcanzado, o algo por debajo de la meta
    setBpm(s.current_bpm || Math.round(s.target_bpm * 0.7))
  }
  resetElapsed()
  isOpen.value = true
}

function close() {
  stop()
  resetElapsed()
  skill.value = null
  isOpen.value = false
}

export function useMetronome() {
  return {
    isOpen, isRunning, bpm, beatsPerBar, currentBeat, elapsedSeconds, skill,
    open, close, start, stop, toggle, setBpm, tap, resetElapsed,
  }
}
