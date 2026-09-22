<template>
  <div class="activity-form-page">
    <PageBackHeader
      eyebrow="Agenda"
      :title="editing ? 'Editar actividad' : 'Nueva actividad'"
      :to="returnPath"
      :back-label="editing ? 'Volver a la actividad' : 'Volver a la agenda'"
    />

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
          <label class="form-label" for="activity-title">Nombre <span class="activity-required" aria-hidden="true">*</span></label>
          <input
            id="activity-title" ref="titleInput" v-model="form.title" class="form-input"
            :class="{ 'form-input--error': errors.title }" type="text" required maxlength="120"
            placeholder="Ej. Ensayo general" autocomplete="off" enterkeyhint="next"
            :aria-invalid="Boolean(errors.title)" :aria-describedby="errors.title ? 'activity-title-error' : undefined"
            @input="errors.title = ''"
          >
          <p v-if="errors.title" id="activity-title-error" class="activity-field-error">{{ errors.title }}</p>
        </div>

        <div class="activity-form-field">
          <div class="activity-date-grid">
            <div>
              <label class="form-label" for="activity-date">Fecha <span class="activity-required" aria-hidden="true">*</span></label>
              <input
                id="activity-date" ref="dateInput" v-model="form.date" class="form-input"
                :class="{ 'form-input--error': errors.date }" type="date" required max="9999-12-31"
                :aria-invalid="Boolean(errors.date)" :aria-describedby="errors.date ? 'activity-date-error' : undefined"
                @input="errors.date = ''"
              >
              <p v-if="errors.date" id="activity-date-error" class="activity-field-error">{{ errors.date }}</p>
            </div>
            <div>
              <label class="form-label" for="activity-time">Hora <span class="activity-optional">(opcional)</span></label>
              <input id="activity-time" v-model="form.time" class="form-input" type="time">
            </div>
          </div>
        </div>

        <div class="activity-form-field">
          <label class="form-label" for="activity-description">Notas <span class="activity-optional">(opcional)</span></label>
          <textarea
            id="activity-description" v-model="form.description" class="form-textarea" rows="3" maxlength="2000"
            placeholder="Lugar, dirección o indicaciones"
          />
        </div>
      </fieldset>

      <p v-if="saveError" class="activity-save-error" role="alert">{{ saveError }}</p>

      <div class="activity-form-actions">
        <button class="btn btn-primary" type="submit" :disabled="saving">
          {{ saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear actividad' }}
        </button>
        <button class="activity-form-cancel" type="button" :disabled="saving" @click="router.push(returnPath)">Cancelar</button>
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
import PageBackHeader from '../components/PageBackHeader.vue'

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
.activity-form-page { max-width: 560px; margin-inline: auto; font-family: var(--font-body); }
.activity-form { display: flex; flex-direction: column; gap: 20px; }
.activity-form fieldset { display: grid; gap: 18px; min-width: 0; padding: 0; border: 0; }
.activity-form-field { min-width: 0; }
.activity-form .form-label { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; color: var(--color-text-secondary); font-family: var(--font-body); font-size: 16px; font-weight: 600; line-height: 1.3; letter-spacing: 0; text-transform: none; }
.activity-required { color: var(--color-danger); }
.activity-form .form-input, .activity-form .form-textarea { display: block; width: 100%; min-width: 0; max-width: 100%; min-height: 50px; padding: 12px 14px; border-radius: 14px; background: var(--color-surface); font-family: var(--font-body); font-size: 17px; font-weight: 500; line-height: 1.35; }
.activity-form .form-textarea { min-height: 104px; resize: vertical; line-height: 1.45; }
.activity-optional { color: var(--color-text-muted); font-size: 14px; font-weight: 500; }
.activity-date-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .95fr); gap: 12px; }
.activity-date-grid > div { min-width: 0; }
.activity-form-actions { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: 10px; padding-bottom: env(safe-area-inset-bottom); }
.activity-form-actions .btn { width: 100%; min-height: 50px; padding: 12px 16px; border-radius: 14px; font-family: var(--font-display); font-size: 15px; font-weight: 600; box-shadow: none; }
.activity-form-cancel { min-height: 50px; padding: 12px 14px; border: 1px solid var(--color-danger); border-radius: 14px; background: var(--color-danger); color: var(--color-text-on-primary); font-family: var(--font-display); font-size: 15px; font-weight: 600; cursor: pointer; }
.activity-form-cancel:active:not(:disabled) { transform: scale(.98); }
.activity-form-cancel:disabled { border-color: var(--color-disabled-border); background: var(--color-disabled-background); color: var(--color-disabled-text); }
.activity-field-error { margin-top: 8px; color: var(--color-danger); font-size: 13px; line-height: 1.4; }
.activity-form .form-input--error { border-color: var(--color-danger); }
.activity-save-error { color: var(--color-danger); font-size: 13px; line-height: 1.5; }
.activity-form-state { display: grid; gap: 12px; padding-block: 12px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.5; }
@media (max-width: 359px) { .activity-date-grid { grid-template-columns: minmax(0, 1fr); gap: 16px; } }
</style>
