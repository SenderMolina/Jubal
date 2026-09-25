<template>
  <div class="tempo-dial" :class="{ dragging }">
    <div
      ref="wheel"
      class="tempo-dial__wheel"
      role="slider"
      tabindex="0"
      aria-label="Velocidad del metrónomo"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="modelValue"
      :aria-valuetext="`${modelValue} BPM`"
      @pointerdown="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @lostpointercapture="endDrag"
      @keydown="handleKey"
    >
      <svg class="tempo-dial__marks" viewBox="0 0 280 280" aria-hidden="true" :style="{ transform: `rotate(${(modelValue - min) * DEGREES_PER_BPM}deg)` }">
        <line v-for="tick in 60" :key="tick" x1="140" y1="10" x2="140" :y2="tick % 5 === 0 ? 26 : 19" :transform="`rotate(${tick * 6} 140 140)`" :class="{ major: tick % 5 === 0 }" />
        <circle cx="140" cy="38" r="4.5" />
      </svg>
      <div class="tempo-dial__face" aria-hidden="true" />
    </div>
    <div class="tempo-dial__center"><slot /></div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// Perilla de tempo: se gira arrastrando (varias vueltas) o con flechas.
// El centro es un slot para los controles (play, ±1).
const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 20 },
  max: { type: Number, default: 300 },
})
const emit = defineEmits(['update:modelValue'])
const DEGREES_PER_BPM = 3
const wheel = ref(null)
const dragging = ref(false)
let pointerId = null
let previousAngle = null
let remainder = 0

function angleAt(event) {
  const rect = wheel.value.getBoundingClientRect()
  const x = event.clientX - rect.left - rect.width / 2
  const y = event.clientY - rect.top - rect.height / 2
  // El centro no tiene un ángulo estable; evita saltos al cruzarlo.
  if (Math.hypot(x, y) < rect.width * 0.18) return null
  return Math.atan2(y, x) * 180 / Math.PI
}

function startDrag(event) {
  if (!event.isPrimary || event.button !== 0 || dragging.value) return
  event.preventDefault()
  wheel.value.focus({ preventScroll: true })
  pointerId = event.pointerId
  previousAngle = angleAt(event)
  remainder = 0
  dragging.value = true
  wheel.value.setPointerCapture(pointerId)
}

function drag(event) {
  if (!dragging.value || event.pointerId !== pointerId) return
  const angle = angleAt(event)
  if (angle !== null && previousAngle !== null) {
    // Cruza ±180° sin saltar y permite dar varias vueltas.
    const delta = ((angle - previousAngle + 540) % 360) - 180
    remainder += delta / DEGREES_PER_BPM
    const steps = Math.trunc(remainder)
    const next = Math.min(props.max, Math.max(props.min, props.modelValue + steps))
    remainder -= steps
    if (next !== props.modelValue) emit('update:modelValue', next)
    if (next === props.min || next === props.max) remainder = 0
  }
  previousAngle = angle
}

function endDrag(event) {
  if (event.pointerId !== pointerId) return
  dragging.value = false
  if (wheel.value.hasPointerCapture(pointerId)) wheel.value.releasePointerCapture(pointerId)
  pointerId = null
  previousAngle = null
  remainder = 0
}

function handleKey(event) {
  const steps = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }
  let next
  if (event.key === 'Home') next = props.min
  else if (event.key === 'End') next = props.max
  else if (event.key in steps) next = props.modelValue + steps[event.key]
  else return
  event.preventDefault()
  event.stopPropagation()
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, next)))
}
</script>

<style scoped>
/* Perilla metálica: anillo con marcas que gira con el tempo y una cara
   hundida donde viven los controles del slot. */
.tempo-dial { position: relative; width: min(100%, 268px); aspect-ratio: 1; margin: 0 auto; container-type: inline-size; }
.tempo-dial__wheel {
  position: absolute; inset: 0; overflow: hidden; border-radius: 50%; cursor: grab;
  touch-action: none; user-select: none; -webkit-user-select: none;
  background: radial-gradient(circle at 50% 30%, #f4f9fb, #c3d5dd 70%, #a9c0ca);
  box-shadow: 0 10px 24px rgba(1, 20, 31, .45), inset 0 2px 0 rgba(255, 255, 255, .8), inset 0 -3px 6px rgba(5, 43, 66, .25);
  -webkit-tap-highlight-color: transparent;
}
.dragging .tempo-dial__wheel { cursor: grabbing; }
.tempo-dial__wheel:focus-visible { outline: 3px solid #7fe6f5; outline-offset: 5px; }
.tempo-dial__marks { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.tempo-dial__marks line { stroke: #8fa9b5; stroke-width: 2; stroke-linecap: round; }
.tempo-dial__marks .major { stroke: #083b59; stroke-width: 3; }
.tempo-dial__marks circle { fill: #f39015; }
.tempo-dial__face {
  position: absolute; inset: 17%; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle at 50% 35%, #e9f1f4, #cddde4);
  box-shadow: inset 0 3px 8px rgba(5, 43, 66, .28), 0 1px 0 rgba(255, 255, 255, .9);
}
.tempo-dial__center { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; }
.tempo-dial__center :slotted(*) { pointer-events: auto; }
</style>
