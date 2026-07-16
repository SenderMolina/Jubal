<template>
  <div ref="root" class="ui-combobox" :class="{ 'ui-combobox--open': open }">
    <input
      ref="input"
      class="form-input ui-combobox__input"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      role="combobox"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      :aria-controls="menuId"
      aria-autocomplete="list"
      @input="onInput"
      @focus="show"
      @keydown="onKeydown"
    >
    <svg class="ui-combobox__chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>

    <Teleport to="body">
      <Transition name="ui-select-menu">
        <div
          v-if="open && filteredOptions.length"
          :id="menuId"
          ref="menu"
          class="ui-select__menu ui-combobox__menu"
          :style="menuStyle"
          role="listbox"
        >
          <button
            v-for="(option, index) in filteredOptions"
            :key="option"
            type="button"
            class="ui-select__option"
            :class="{ selected: option === modelValue, active: index === activeIndex }"
            role="option"
            :aria-selected="option === modelValue"
            @mouseenter="activeIndex = index"
            @click="choose(option)"
          >
            <span class="ui-select__option-icon" aria-hidden="true">♬</span>
            <span>{{ option }}</span>
            <svg v-if="option === modelValue" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8l3 3 7-7"/></svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Campo con sugerencias' },
})
const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const input = ref(null)
const menu = ref(null)
const open = ref(false)
const activeIndex = ref(0)
const menuStyle = ref({})
const menuId = `ui-combobox-${Math.random().toString(36).slice(2, 9)}`
const filteredOptions = computed(() => {
  const query = props.modelValue.trim().toLocaleLowerCase('es')
  return [...new Set(props.options.filter(Boolean))]
    .filter(option => !query || option.toLocaleLowerCase('es').includes(query))
    .slice(0, 8)
})

async function show() {
  if (!filteredOptions.value.length) return
  open.value = true
  activeIndex.value = 0
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', close, true)
  await nextTick()
  positionMenu()
}
function close() {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', close, true)
}
function onOutside(event) {
  if (!root.value?.contains(event.target) && !menu.value?.contains(event.target)) close()
}
function positionMenu() {
  if (!input.value || !menu.value) return
  const rect = input.value.getBoundingClientRect()
  const margin = 8, gap = 6
  const height = Math.min(menu.value.scrollHeight, 220)
  const below = window.innerHeight - rect.bottom - margin
  const above = rect.top - margin
  const opensUp = below < Math.min(height, 150) && above > below
  const maxHeight = Math.max(96, Math.min(220, opensUp ? above - gap : below - gap))
  const width = Math.max(rect.width, 190)
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin)
  menuStyle.value = {
    position: 'fixed', left: `${left}px`, width: `${width}px`, maxHeight: `${maxHeight}px`,
    ...(opensUp ? { bottom: `${window.innerHeight - rect.top + gap}px` } : { top: `${rect.bottom + gap}px` }),
  }
}
function onInput(event) {
  emit('update:modelValue', event.target.value)
  nextTick(() => filteredOptions.value.length ? show() : close())
}
function choose(option) {
  emit('update:modelValue', option)
  close()
  nextTick(() => input.value?.focus())
}
function move(amount) {
  activeIndex.value = (activeIndex.value + amount + filteredOptions.value.length) % filteredOptions.value.length
  nextTick(() => menu.value?.children[activeIndex.value]?.scrollIntoView({ block: 'nearest' }))
}
function onKeydown(event) {
  if (event.key === 'ArrowDown') { event.preventDefault(); open.value ? move(1) : show() }
  if (event.key === 'ArrowUp') { event.preventDefault(); open.value ? move(-1) : show() }
  if (event.key === 'Escape') { event.preventDefault(); close() }
  if (event.key === 'Enter' && open.value) { event.preventDefault(); choose(filteredOptions.value[activeIndex.value]) }
}
onBeforeUnmount(close)
</script>

<style scoped>
.ui-combobox { position: relative; width: 100%; }.ui-combobox__input { padding-right: 36px; }.ui-combobox__chevron { position: absolute; top: 50%; right: 12px; width: 14px; height: 14px; pointer-events: none; fill: none; stroke: var(--text-muted); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transform: translateY(-50%); transition: transform .15s; }.ui-combobox--open .ui-combobox__chevron { transform: translateY(-50%) rotate(180deg); }
</style>
