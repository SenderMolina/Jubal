<template>
  <div ref="root" class="ui-select" :class="{ 'ui-select--open': open, 'ui-select--disabled': disabled }">
    <button
      ref="trigger"
      type="button"
      class="ui-select__trigger"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-controls="menuId"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span v-if="selected?.icon" class="ui-select__leading" aria-hidden="true">{{ selected.icon }}</span>
      <span class="ui-select__value" :class="{ 'ui-select__value--placeholder': !selected }">
        {{ selected?.label || placeholder }}
      </span>
      <svg class="ui-select__chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>
    </button>

    <Teleport to="body">
      <Transition name="ui-select-menu">
        <div
          v-if="open"
          :id="menuId"
          ref="menu"
          class="ui-select__menu"
          :style="menuStyle"
          role="listbox"
          tabindex="-1"
          :aria-label="ariaLabel || placeholder"
          @keydown="onMenuKeydown"
        >
          <button
            v-for="(option, index) in options"
            :key="String(option.value)"
            type="button"
            class="ui-select__option"
            :class="{ selected: sameValue(option.value, modelValue), active: index === activeIndex }"
            role="option"
            :aria-selected="sameValue(option.value, modelValue)"
            @mouseenter="activeIndex = index"
            @click="choose(option)"
          >
            <span v-if="option.icon" class="ui-select__option-icon" aria-hidden="true">{{ option.icon }}</span>
            <span>{{ option.label }}</span>
            <svg v-if="sameValue(option.value, modelValue)" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8l3 3 7-7"/></svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Seleccionar…' },
  ariaLabel: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const root = ref(null)
const trigger = ref(null)
const menu = ref(null)
const open = ref(false)
const activeIndex = ref(0)
const menuStyle = ref({})
const menuId = `ui-select-${Math.random().toString(36).slice(2, 9)}`

const sameValue = (a, b) => String(a) === String(b)
const selected = computed(() => props.options.find(option => sameValue(option.value, props.modelValue)))

async function show() {
  if (props.disabled || !props.options.length) return
  open.value = true
  const selectedIndex = props.options.findIndex(option => sameValue(option.value, props.modelValue))
  activeIndex.value = selectedIndex >= 0 ? selectedIndex : 0
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', close, true)
  await nextTick()
  positionMenu()
  await nextTick()
  positionMenu()
  menu.value?.focus?.()
}

function close() {
  open.value = false
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', close, true)
}
function toggle() { open.value ? close() : show() }
function onOutside(event) {
  if (!root.value?.contains(event.target) && !menu.value?.contains(event.target)) close()
}
function positionMenu() {
  if (!trigger.value || !menu.value) return
  const rect = trigger.value.getBoundingClientRect()
  const margin = 8
  const gap = 6
  const desiredHeight = Math.min(menu.value.scrollHeight, 240)
  const below = window.innerHeight - rect.bottom - margin
  const above = rect.top - margin
  const opensUp = below < Math.min(desiredHeight, 150) && above > below
  const maxHeight = Math.max(96, Math.min(240, opensUp ? above - gap : below - gap))
  const width = Math.max(rect.width, 170)
  const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin)

  menuStyle.value = {
    position: 'fixed',
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    ...(opensUp
      ? { bottom: `${window.innerHeight - rect.top + gap}px` }
      : { top: `${rect.bottom + gap}px` }),
  }
}
function choose(option) {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
  nextTick(() => trigger.value?.focus())
}
function moveActive(amount) {
  activeIndex.value = (activeIndex.value + amount + props.options.length) % props.options.length
  nextTick(() => menu.value?.children[activeIndex.value]?.scrollIntoView({ block: 'nearest' }))
}
function onTriggerKeydown(event) {
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
    if (!open.value) show()
    else moveActive(event.key === 'ArrowDown' ? 1 : -1)
  }
}
function onMenuKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); close(); trigger.value?.focus() }
  if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) }
  if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) }
  if (event.key === 'Enter') { event.preventDefault(); choose(props.options[activeIndex.value]) }
}

onBeforeUnmount(close)
</script>

<style scoped>
.ui-select { width: 100%; min-width: 0; }
.ui-select__trigger { width: 100%; min-height: 38px; display: flex; align-items: center; gap: 7px; padding: 8px 10px 8px 12px; border: 1px solid var(--border); border-radius: 11px; background: var(--surface); color: var(--text); font: inherit; font-size: 11px; text-align: left; cursor: pointer; transition: border-color .15s, box-shadow .15s, background .15s; }
.ui-select__trigger:hover { border-color: var(--accent); }.ui-select--open .ui-select__trigger,.ui-select__trigger:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--brand-rgb),.14); outline: 0; }
.ui-select__value { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.ui-select__value--placeholder { color: var(--text-muted); }
.ui-select__leading { width: 21px; height: 21px; flex: 0 0 21px; display: grid; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent2); font-size: 9px; }
.ui-select__chevron { width: 14px; height: 14px; flex: 0 0 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; color: var(--text-muted); transition: transform .15s; }.ui-select--open .ui-select__chevron { transform: rotate(180deg); }
.ui-select--disabled { opacity: .55; }.ui-select--disabled .ui-select__trigger { cursor: default; }
</style>

<style>
.ui-select__menu { z-index: 900; overflow-y: auto; padding: 5px; border: 1px solid var(--border); border-radius: 13px; background: var(--surface); box-shadow: 0 12px 30px rgba(var(--ink-rgb),.18); overscroll-behavior: contain; }
.ui-select__option { width: 100%; min-height: 38px; display: flex; align-items: center; gap: 8px; padding: 7px 9px; border: 0; border-radius: 9px; background: transparent; color: var(--text-mid); font-family: var(--font); font-size: 11px; font-weight: 650; text-align: left; cursor: pointer; }.ui-select__option:hover,.ui-select__option.active { background: var(--surface2); color: var(--text); }.ui-select__option.selected { background: var(--accent-soft); color: var(--accent2); }.ui-select__option > span:nth-child(2),.ui-select__option > span:first-child:last-of-type { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.ui-select__option > svg { width: 14px; height: 14px; flex: 0 0 14px; fill: none; stroke: var(--accent2); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ui-select__option-icon { width: 22px; height: 22px; flex: 0 0 22px; display: grid; place-items: center; border-radius: 50%; background: var(--surface); color: var(--accent2); box-shadow: inset 0 0 0 1px var(--border); font-size: 10px; }
.ui-select-menu-enter-active,.ui-select-menu-leave-active { transition: opacity .13s ease, transform .13s ease; transform-origin: top; }.ui-select-menu-enter-from,.ui-select-menu-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
@media (prefers-reduced-motion: reduce) { .ui-select-menu-enter-active,.ui-select-menu-leave-active { transition: none; } }
</style>
