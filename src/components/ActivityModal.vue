<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal">
      <div class="modal-title">Nueva actividad</div>
      <div class="modal-sub">Ingresa la información básica del evento.</div>

      <div class="form-group">
        <label class="form-label">Título *</label>
        <input class="form-input" v-model="form.title" type="text" placeholder="Ej: Servicio dominical">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha *</label>
          <input class="form-input" v-model="form.date" type="date">
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
        <button class="btn btn-primary" @click="save">Crear y armar repertorio →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store  = useAppStore()

const isOpen = ref(false)
const form   = ref({ title: '', date: '', time: '', description: '' })

function open(date = '') {
  form.value = { title: '', date, time: '', description: '' }
  isOpen.value = true
}
function close() { isOpen.value = false }

function save() {
  if (!form.value.title.trim()) { alert('El título es obligatorio.'); return }
  if (!form.value.date)         { alert('La fecha es obligatoria.'); return }

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

defineExpose({ open })
</script>
