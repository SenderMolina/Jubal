<template>
  <div class="tiempo-inline-create">
    <input
      ref="nameInput"
      class="form-input"
      v-model="form.name"
      placeholder="Nombre del tiempo (ej: Adoración, Alabanza...)"
      @keydown.enter="$emit('save')"
      @keydown.escape="$emit('cancel')"
    >
    <div class="tiempo-form-times">
      <label class="tiempo-form-time">Inicio
        <input type="time" class="form-input" v-model="form.start">
      </label>
      <label class="tiempo-form-time">Fin
        <input type="time" class="form-input" v-model="form.end">
      </label>
    </div>
    <div class="tiempo-inline-actions">
      <button class="btn btn-primary btn-sm" @click="$emit('save')">{{ form.id ? 'Guardar' : 'Crear' }}</button>
      <button class="btn btn-ghost btn-sm" @click="$emit('cancel')">Cancelar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
defineProps({ form: { type: Object, required: true } })
defineEmits(['save', 'cancel'])
const nameInput = ref(null)
onMounted(() => nameInput.value?.focus())
</script>

<style scoped>
.tiempo-form-times { display: flex; gap: 10px; margin-top: 8px; }
.tiempo-form-time {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: .76rem;
  font-weight: 600;
  color: var(--text-muted);
}
</style>
