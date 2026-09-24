<template>
  <article class="activity-card" :class="{ 'activity-card--open': open, 'activity-card--featured': featured }">
    <div class="activity-card__row">
      <!-- Flecha sutil a la izquierda: despliega el setlist. Sin canciones queda
           el hueco para que todas las fechas se alineen. -->
      <button
        v-if="songCount"
        class="activity-card__toggle"
        type="button"
        :aria-expanded="open"
        :aria-controls="panelId"
        :aria-label="open ? `Ocultar canciones de ${activity.title}` : `Ver canciones de ${activity.title}`"
        @click="open = !open"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>
      </button>
      <span v-else class="activity-card__toggle" aria-hidden="true"></span>

      <RouterLink class="activity-card__main" :to="'/actividad/' + activity.id">
        <span class="activity-card__date" :class="{ 'activity-card__date--today': isToday }">
          <span v-if="isToday" class="activity-card__today">HOY</span>
          <template v-else>
            <span class="activity-card__day">{{ day }}</span>
            <span class="activity-card__month">{{ month }}</span>
          </template>
        </span>
        <span class="activity-card__info">
          <span class="activity-card__title">{{ activity.title }}</span>
          <span class="activity-card__meta">
            <template v-if="activity.time">{{ activity.time }}</template>
            <span v-if="countdown" class="activity-card__countdown">{{ countdown }}</span>
          </span>
        </span>
      </RouterLink>

      <button v-if="canManage" class="dots-btn activity-card__menu" type="button" :aria-label="`Opciones de ${activity.title}`" @click="$emit('menu', activity)">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
    </div>

    <div v-if="open" :id="panelId" class="activity-card__panel">
      <ActivitySetlist :activity="activity" />
    </div>
  </article>
</template>

<script setup>
import { computed, ref, useId } from 'vue'
import { useAppStore } from '../stores/app'
import { activitySongCount } from '../utils/setlist'
import ActivitySetlist from './ActivitySetlist.vue'

const props = defineProps({
  activity: { type: Object, required: true },
  canManage: { type: Boolean, default: false },
  today: { type: String, default: '' },          // 'YYYY-MM-DD'
  countdown: { type: String, default: '' },      // "En 2 días" (solo la próxima)
  featured: { type: Boolean, default: false },   // la próxima: resaltada y abierta
})
defineEmits(['menu'])

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const store = useAppStore()
const panelId = useId()
const open = ref(props.featured)

const isToday = computed(() => props.activity.date === props.today)
const day = computed(() => props.activity.date?.split('-')[2] || '')
const month = computed(() => MONTHS[Number(props.activity.date?.split('-')[1]) - 1] || '')
const songCount = computed(() => activitySongCount(props.activity, store.songs))
</script>

<style scoped>
/* La tarjeta global es flex en fila; aquí es una columna: fila principal + setlist. */
.activity-card { display: block; padding: 0; overflow: hidden; }
.activity-card--featured { margin-bottom: 22px; border-radius: 22px; box-shadow: var(--shadow-medium); }
.activity-card__row { display: flex; align-items: center; min-height: 76px; }

.activity-card__toggle { flex: 0 0 34px; align-self: stretch; display: grid; place-items: center; padding: 0 0 0 6px; border: 0; background: transparent; color: var(--color-text-muted); cursor: pointer; }
button.activity-card__toggle:hover { color: var(--color-primary); }
button.activity-card__toggle:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -4px; border-radius: 12px; }
.activity-card__toggle svg { width: 18px; height: 18px; transition: transform .2s ease; }
.activity-card--open .activity-card__toggle svg { transform: rotate(90deg); color: var(--color-primary); }

.activity-card__main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 12px 4px 12px 2px; color: inherit; text-decoration: none; }
.activity-card__main:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; border-radius: 12px; }

/* Fecha: cuadro fijo, número y mes centrados. */
.activity-card__date { width: 52px; height: 52px; flex: 0 0 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 12px; background: var(--color-info-soft); color: var(--color-info-text); text-align: center; }
.activity-card__day { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; line-height: 1; }
.activity-card__month { font-size: .62rem; font-weight: 800; letter-spacing: .06em; line-height: 1; }
.activity-card__today { font-family: var(--font-display); font-size: .78rem; font-weight: 700; letter-spacing: .06em; }
.activity-card__date--today { background: var(--color-primary); color: var(--color-text-on-primary); }

.activity-card__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.activity-card__title { overflow: hidden; color: var(--color-text-primary); font-family: var(--font-display); font-size: 1rem; font-weight: 700; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.activity-card__meta { display: flex; align-items: center; gap: 8px; color: var(--color-text-muted); font-size: .8125rem; }
.activity-card__countdown { padding: 2px 9px; border-radius: 999px; background: var(--color-info-soft); color: var(--color-info-text); font-size: .72rem; font-weight: 800; }

.activity-card__menu { width: 44px; height: 44px; justify-content: center; margin-right: 6px; }
.activity-card__panel { padding: 12px 10px 14px; border-top: 1px solid var(--color-border); }

@media (prefers-reduced-motion: reduce) {
  .activity-card__toggle svg { transition: none; }
}
</style>
