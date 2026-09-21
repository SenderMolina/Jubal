<template>
  <div class="activity-form-page">
    <RouterLink class="activity-form-back" :to="returnPath" :aria-label="editing ? 'Volver a la actividad' : 'Volver a la agenda'">
      <span aria-hidden="true">←</span> Volver
    </RouterLink>

    <div v-if="loading" class="activity-form-state" role="status">Cargando actividad…</div>
    <div v-else-if="loadError" class="activity-form-state" role="alert">
      <p>{{ loadError }}</p>
      <button class="btn btn-ghost" @click="initialize">Volver a intentar</button>
    </div>
    <div v-else-if="!canEdit" class="activity-form-state" role="status">
      Solo el líder de la banda puede crear o editar actividades.
    </div>

    <form v-else class="activity-form" novalidate :aria-busy="saving" @submit.prevent="save">
      <fieldset :disabled="saving" aria-label="Datos de la actividad">
        <div class="activity-form-field">
          <label class="form-label" for="activity-title">Nombre <span aria-hidden="true">*</span></label>
          <input
            id="activity-title" ref="titleInput" v-model="form.title" class="form-input"
            :class="{ 'form-input--error': errors.title }" type="text" required maxlength="120"
            placeholder="Ej. Ensayo del domingo" autocomplete="off" enterkeyhint="next"
            :aria-invalid="Boolean(errors.title)" :aria-describedby="errors.title ? 'activity-title-error' : undefined"
            @input="errors.title = ''"
          >
          <p v-if="errors.title" id="activity-title-error" class="activity-field-error">{{ errors.title }}</p>
        </div>

        <div class="activity-form-field">
          <div class="activity-date-grid">
            <div>
              <label class="form-label" for="activity-date">Fecha <span aria-hidden="true">*</span></label>
              <input
                id="activity-date" ref="dateInput" v-model="form.date" class="form-input"
                :class="{ 'form-input--error': errors.date }" type="date" required max="9999-12-31"
                :aria-invalid="Boolean(errors.date)" :aria-describedby="errors.date ? 'activity-date-error' : undefined"
                @input="errors.date = ''"
              >
              <p v-if="errors.date" id="activity-date-error" class="activity-field-error">{{ errors.date }}</p>
            </div>
            <div>
              <label class="form-label" for="activity-time">Hora <span class="activity-optional">Opcional</span></label>
              <input id="activity-time" v-model="form.time" class="form-input" type="time">
            </div>
          </div>
          <div class="activity-date-shortcuts" role="group" aria-label="Elegir una fecha rápida">
            <button type="button" :aria-pressed="form.date === localDate(0)" @click="setDate(0)">Hoy</button>
            <button type="button" :aria-pressed="form.date === localDate(1)" @click="setDate(1)">Mañana</button>
          </div>
        </div>

        <div class="activity-form-field">
          <label class="form-label" for="activity-description">Notas <span class="activity-optional">Opcional</span></label>
          <textarea
            id="activity-description" v-model="form.description" class="form-textarea" rows="2" maxlength="2000"
            placeholder="Lugar o indicaciones."
          />
        </div>
      </fieldset>

      <p v-if="saveError" class="activity-save-error" role="alert">{{ saveError }}</p>

      <div class="activity-form-actions">
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear actividad' }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="saving" @click="router.push(returnPath)">Cancelar</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useConfirm } from '../composables/useConfirm'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const band = useBandStore()
const { confirm } = useConfirm()
const { showToast } = useToast()
const form = reactive({ title: '', date: '', time: '', description: '' })
const errors = reactive({ title: '', date: '' })
const titleInput = ref(null)
const dateInput = ref(null)
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const original = ref('')
const sourceBandId = ref(band.currentBandId)
const saved = ref(false)
let loadVersion = 0

const editing = computed(() => Boolean(route.params.id))
const returnPath = computed(() => editing.value ? `/actividad/${route.params.id}` : '/actividades')
const canEdit = computed(() => band.isLeader && band.currentBandId && band.currentBandId === sourceBandId.value)
const dirty = computed(() => original.value && JSON.stringify(form) !== original.value)

function localDate(offset) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function setDate(offset) {
  form.date = localDate(offset)
  errors.date = ''
}

async function initialize() {
  const version = ++loadVersion
  sourceBandId.value = band.currentBandId
  loadError.value = ''
  saveError.value = ''
  original.value = ''
  saved.value = false
  errors.title = errors.date = ''
  if (!canEdit.value) return
  loading.value = true
  try {
    const activity = editing.value ? await store.getActivity(route.params.id) : null
    if (version !== loadVersion) return
    if (editing.value && !activity) {
      loadError.value = 'Esta actividad ya no existe o no pertenece a tu banda.'
      return
    }
    const presetDate = typeof route.query.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.fecha) ? route.query.fecha : ''
    Object.assign(form, {
      title: activity?.title || '', date: activity?.date || presetDate,
      time: activity?.time || '', description: activity?.description || '',
    })
    original.value = JSON.stringify(form)
  } catch {
    if (version === loadVersion) loadError.value = 'No pudimos cargar la actividad. Revisa tu conexión e inténtalo de nuevo.'
  } finally {
    if (version === loadVersion) loading.value = false
  }
}
watch(() => route.params.id, initialize, { immediate: true })
onBeforeUnmount(() => { loadVersion++ })

async function save() {
  if (saving.value || !canEdit.value) return
  errors.title = form.title.trim() ? '' : 'Escribe un nombre para la actividad.'
  errors.date = form.date && dateInput.value?.validity.valid ? '' : 'Elige una fecha válida.'
  if (errors.title || errors.date) {
    await nextTick()
    const invalidInput = errors.title ? titleInput.value : dateInput.value
    invalidInput?.focus()
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    await store.saveActivity({ ...form }, editing.value ? Number(route.params.id) : null)
    saved.value = true
    showToast(editing.value ? 'Actividad actualizada' : 'Actividad creada')
    await router.replace(returnPath.value)
  } catch {
    saveError.value = 'No pudimos guardar la actividad. Tus datos siguen aquí; revisa tu conexión y vuelve a intentarlo.'
  } finally {
    saving.value = false
  }
}

function canLeave() {
  if (saved.value) return true
  if (saving.value) return false
  if (band.currentBandId !== sourceBandId.value) return true
  if (!dirty.value) return true

  return confirm(
    'Cambios sin guardar',
    'Si sales ahora, perderás la información que escribiste.',
    {
      confirmLabel: 'Salir y descartar',
      cancelLabel: 'Seguir editando',
      tone: 'danger',
    },
  )
}
onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate(canLeave)
</script>

<style scoped>
.activity-form-page { max-width: 560px; margin-inline: auto; }
.activity-form-back { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin: -10px 0 8px; color: var(--color-text-muted); font-size: 13px; text-decoration: none; }
.activity-form-back span { font-size: 18px; }
.activity-form { display: flex; flex-direction: column; gap: 16px; }
.activity-form fieldset { display: grid; gap: 14px; min-width: 0; padding: 0; border: 0; }
.activity-form-field { min-width: 0; }
.activity-form .form-label { display: flex; align-items: baseline; gap: 5px; margin-bottom: 6px; font-size: 13px; font-weight: 600; letter-spacing: 0; text-transform: none; }
.activity-form .form-input, .activity-form .form-textarea { display: block; width: 100%; min-width: 0; max-width: 100%; min-height: 44px; padding: 9px 10px; border-radius: 8px; font-size: 16px; font-weight: 400; }
.activity-form .form-textarea { min-height: 80px; resize: vertical; line-height: 1.4; }
.activity-optional { color: var(--color-text-muted); font-size: 11px; font-weight: 600; }
.activity-date-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 12px; }
.activity-date-grid > div { min-width: 0; }
.activity-date-shortcuts { display: flex; gap: 8px; margin-top: 2px; }
.activity-date-shortcuts button { min-height: 44px; padding: 6px 10px; border: 0; border-radius: 6px; background: transparent; color: var(--color-text-muted); font-size: 12px; font-weight: 600; cursor: pointer; }
.activity-date-shortcuts button[aria-pressed='true'] { color: var(--color-primary); text-decoration: underline; text-underline-offset: 4px; }
.activity-form-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; padding-bottom: env(safe-area-inset-bottom); }
.activity-form-actions .btn { min-height: 44px; padding: 10px 14px; border-radius: 8px; font-size: 14px; font-weight: 700; box-shadow: none; }
.activity-field-error { margin-top: 8px; color: var(--color-danger); font-size: 13px; line-height: 1.4; }
.activity-form .form-input--error { border-color: var(--color-danger); }
.activity-save-error { color: var(--color-danger); font-size: 13px; line-height: 1.5; }
.activity-form-state { display: grid; gap: 12px; padding-block: 12px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }
@media (max-width: 359px) { .activity-date-grid { grid-template-columns: minmax(0, 1fr); gap: 14px; } }
</style>
