<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" class="sheet-overlay" @click="close">
        <div class="sheet" @click.stop>
          <div class="sheet-handle"></div>
          <div v-if="title" class="sheet-title">{{ title }}</div>
          <button
            v-for="(act, i) in actions"
            :key="i"
            class="sheet-item"
            :class="{ 'sheet-item--danger': act.danger }"
            @click="onSelect(act)"
          >
            <svg v-if="act.icon === 'edit'" class="sheet-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <svg v-else-if="act.icon === 'trash'" class="sheet-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            <span>{{ act.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(false)
const title   = ref('')
const actions = ref([])

function open(opts) {
  title.value   = opts.title || ''
  actions.value = opts.actions || []
  visible.value = true
}

function close() {
  visible.value = false
}

function onSelect(act) {
  close()
  act.onSelect?.()
}

defineExpose({ open, close })
</script>
