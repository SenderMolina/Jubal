<template>
  <!-- Coristas: solo la letra, sin acordes encima -->
  <div v-if="hideChords" class="cp-line cp-line--plain">{{ plain }}</div>
  <div v-else class="cp-line">
    <span v-for="(p, i) in pairs" :key="i" class="cp-pair">
      <span class="cp-chord">{{ p.chord }}</span>
      <span class="cp-text">{{ p.text }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  pairs: { type: Array, required: true },
  hideChords: { type: Boolean, default: false },
})
const plain = computed(() => props.pairs.map(p => p.text).join(''))
</script>

<style scoped>
.cp-line {
  font-family: ui-monospace, 'Roboto Mono', Menlo, Consolas, monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 8px;
}
.cp-pair { display: inline-flex; flex-direction: column; vertical-align: bottom; }
.cp-chord {
  color: var(--accent);
  font-weight: 600;
  font-size: 0.78em;
  min-height: 1.25em;
  line-height: 1.25;
  white-space: pre;
}
.cp-text { color: var(--text); white-space: pre-wrap; line-height: 1.6; }
.cp-line--plain { white-space: pre-wrap; color: var(--text); line-height: 2; }
</style>
