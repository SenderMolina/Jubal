<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-title">{{ editMode ? 'Editar actividad' : 'Nueva actividad' }}</div>
      <div class="modal-sub">{{ editMode ? 'Modifica los datos del evento.' : 'Ingresa la información básica del evento.' }}</div>

      <div class="form-group">
        <label class="form-label">Título <span class="req">*</span></label>
        <input
          ref="titleInput"
          class="form-input"
          :class="{ 'form-input--error': errors.title }"
          v-model="form.title"
          type="text"
          placeholder="Ej: Servicio dominical"
          @input="errors.title = ''"
        >
        <p v-if="errors.title" class="form-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ errors.title }}
        </p>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha <span class="req">*</span></label>
          <input
            class="form-input"
            :class="{ 'form-input--error': errors.date }"
            v-model="form.date"
            type="date"
            @input="errors.date = ''"
          >
          <p v-if="errors.date" class="form-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {{ errors.date }}
          </p>
        </div>
        <div class="form-group">
          <label class="form-label">Hora</label>
          <input class="form-input" v-model="form.time" type="time">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Descripción</label>
        <input class="form-input" v-model="form.description" type="text" placeholder="Ej: Ensayo de preparación">
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" @click="close">Cancelar</button>
        <button class="btn btn-primary" @click="save">
          {{ editMode ? 'Guardar cambios' : 'Crear y armar repertorio →' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store  = useAppStore()

const isOpen     = ref(false)
const editMode   = ref(false)
const editId     = ref(null)
const form       = ref({ title: '', date: '', time: '', description: '' })
const errors     = ref({ title: '', date: '' })
const titleInput = ref(null)

function onKey(e) { if (e.key === 'Escape') close() }

function reveal() {
  errors.value = { title: '', date: '' }
  isOpen.value = true
  document.addEventListener('keydown', onKey)
  nextTick(() => titleInput.value?.focus())
}

function open(date = '') {
  editMode.value = false
  editId.value   = null
  form.value     = { title: '', date, time: '', description: '' }
  reveal()
}

function openEdit(activity) {
  editMode.value = true
  editId.value   = activity.id
  form.value     = {
    title:       activity.title,
    date:        activity.date,
    time:        activity.time || '',
    description: activity.description || '',
  }
  reveal()
}

function close() {
  isOpen.value = false
  document.removeEventListener('keydown', onKey)
}
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))

function save() {
  if (!form.value.title.trim()) {
    errors.value.title = 'Ponle un nombre al evento.'
    titleInput.value?.focus()
    return
  }
  if (!form.value.date) {
    errors.value.date = 'Elige una fecha.'
    return
  }

  if (editMode.value) {
    const existing = store.activities.find(a => a.id === editId.value)
    if (existing) {
      existing.title       = form.value.title.trim()
      existing.date        = form.value.date
      existing.time        = form.value.time
      existing.description = form.value.description.trim()
      store.saveActivities()
    }
    close()
    return
  }

  const activity = {
    id:          Date.now(),
    title:       form.value.title.trim(),
    date:        form.value.date,
    time:        form.value.time,
    description: form.value.description.trim(),
    tiempos:     [],
  }

  store.activities.push(activity)
  store.saveActivities()
  close()
  router.push('/actividad/' + activity.id)
}

defineExpose({ open, openEdit })
</script>
