<template>
  <div class="catalog-picker">
    <div class="type-pills type-pills--form">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="type-pill"
        :class="{ active: isSelected(item.id) }"
        :aria-pressed="isSelected(item.id)"
        @click="toggle(item.id)"
      >{{ item.name }}</button>
      <button v-if="!adding" type="button" class="type-pill catalog-picker__new" @click="startAdding">＋ Nueva</button>
    </div>
    <div v-if="adding" class="catalog-picker__add">
      <input
        ref="input"
        v-model="newName"
        class="form-input"
        type="text"
        maxlength="80"
        :placeholder="kind === 'source' ? 'Nombre de la fuente' : 'Nombre de la técnica'"
        :aria-label="kind === 'source' ? 'Nueva fuente' : 'Nueva técnica'"
        @keydown.enter.prevent="create"
      >
      <button type="button" class="btn btn-primary" :disabled="busy || !newName.trim()" @click="create">Agregar</button>
      <button type="button" class="btn" @click="adding = false">Cancelar</button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { usePracticeStore } from '../stores/practice'
import { useToast } from '../composables/useToast'

// Elige del catálogo personal: una fuente (id o null) o varias técnicas
// (arreglo de ids). "＋ Nueva" la crea sin salir del formulario.
const props = defineProps({
  kind: { type: String, required: true }, // 'source' | 'technique'
  modelValue: { type: [String, Array], default: null },
})
const emit = defineEmits(['update:modelValue'])

const store = usePracticeStore()
const { attempt } = useToast()
const multiple = computed(() => props.kind === 'technique')
const items = computed(() => props.kind === 'source' ? store.sources : store.techniques)

const adding = ref(false)
const newName = ref('')
const busy = ref(false)
const input = ref(null)

function isSelected(id) {
  return multiple.value ? (props.modelValue || []).includes(id) : props.modelValue === id
}

function toggle(id) {
  if (!multiple.value) return emit('update:modelValue', props.modelValue === id ? null : id)
  const current = props.modelValue || []
  emit('update:modelValue', current.includes(id) ? current.filter(value => value !== id) : [...current, id])
}

async function startAdding() {
  adding.value = true
  newName.value = ''
  await nextTick()
  input.value?.focus()
}

async function create() {
  if (busy.value || !newName.value.trim()) return
  busy.value = true
  let item = null
  await attempt(async () => { item = await store.createCatalogItem(props.kind, newName.value) }, { error: 'No se pudo agregar.' })
  busy.value = false
  if (!item) return
  adding.value = false
  toggle(item.id)
}
</script>

<style scoped>
.catalog-picker__new { border-style: dashed; }
.catalog-picker__add { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; margin-top: 8px; }
.catalog-picker__add .btn { justify-content: center; }
@media (max-width: 400px) { .catalog-picker__add { grid-template-columns: 1fr 1fr; } .catalog-picker__add .form-input { grid-column: 1 / -1; } }
</style>
