<template>
  <div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px;margin-top:8px;">
      <button v-if="roleStore.isLeader" class="btn btn-primary btn-sm" @click="modal?.open()">+ Agregar</button>
    </div>

    <div v-if="upcoming.length === 0" class="setlist-empty">
      <div class="icon">📅</div>
      <p>
        No hay actividades próximas.
        <template v-if="roleStore.isLeader"><br>Crea la primera con el botón de arriba.</template>
      </p>
    </div>

    <div v-else class="activities-dashboard">

      <!-- HOY -->
      <template v-if="todayEvents.length">
        <div class="activities-section-label activities-section-label--today">Hoy</div>
        <div
          v-for="a in todayEvents"
          :key="a.id"
          :class="['activity-card', a.id === featuredId ? 'activity-card--featured' : 'activity-card--today']"
          @click="router.push('/actividad/' + a.id)"
        >
          <div class="activity-date-badge activity-date-badge--today" :class="{ 'activity-date-badge--featured': a.id === featuredId }">
            <div class="day-today">HOY</div>
          </div>
          <div class="activity-info">
            <div class="activity-title">{{ a.title }}</div>
            <div v-if="a.time" class="activity-time">{{ a.time }}</div>
            <div v-if="a.tiempos?.length" class="activity-badges">
              <span class="activity-badge activity-badge--tiempos">{{ a.tiempos.length }} tiempo{{ a.tiempos.length !== 1 ? 's' : '' }}</span>
              <span class="activity-badge activity-badge--songs">{{ totalSongs(a) }} canción{{ totalSongs(a) !== 1 ? 'es' : '' }}</span>
            </div>
          </div>
          <span class="activity-chevron">›</span>
        </div>
      </template>

      <!-- PRÓXIMOS (próximos 7 días) -->
      <template v-if="nearEvents.length">
        <div class="activities-section-label">Próximos</div>
        <div
          v-for="a in nearEvents"
          :key="a.id"
          :class="['activity-card', a.id === featuredId ? 'activity-card--featured' : '']"
          @click="router.push('/actividad/' + a.id)"
        >
          <div class="activity-date-badge" :class="{ 'activity-date-badge--featured': a.id === featuredId }">
            <div class="day">{{ getDay(a.date) }}</div>
            <div class="month">{{ getMonth(a.date) }}</div>
          </div>
          <div class="activity-info">
            <div class="activity-title">{{ a.title }}</div>
            <div v-if="a.time" class="activity-time">{{ a.time }}</div>
            <div v-if="a.tiempos?.length" class="activity-badges">
              <span class="activity-badge activity-badge--tiempos">{{ a.tiempos.length }} tiempo{{ a.tiempos.length !== 1 ? 's' : '' }}</span>
              <span class="activity-badge activity-badge--songs">{{ totalSongs(a) }} canción{{ totalSongs(a) !== 1 ? 'es' : '' }}</span>
            </div>
          </div>
          <span class="activity-chevron">›</span>
        </div>
      </template>

      <!-- MÁS ADELANTE -->
      <template v-if="laterEvents.length">
        <div class="activities-section-label activities-section-label--later">Más adelante</div>
        <div
          v-for="a in laterEvents"
          :key="a.id"
          :class="['activity-card activity-card--later', a.id === featuredId ? 'activity-card--featured' : '']"
          @click="router.push('/actividad/' + a.id)"
        >
          <div class="activity-date-badge activity-date-badge--later" :class="{ 'activity-date-badge--featured': a.id === featuredId }">
            <div class="day">{{ getDay(a.date) }}</div>
            <div class="month">{{ getMonth(a.date) }}</div>
          </div>
          <div class="activity-info">
            <div class="activity-title">{{ a.title }}</div>
            <div v-if="a.time" class="activity-time">{{ a.time }}</div>
            <div v-if="a.tiempos?.length" class="activity-badges">
              <span class="activity-badge activity-badge--tiempos">{{ a.tiempos.length }} tiempo{{ a.tiempos.length !== 1 ? 's' : '' }}</span>
              <span class="activity-badge activity-badge--songs">{{ totalSongs(a) }} canción{{ totalSongs(a) !== 1 ? 'es' : '' }}</span>
            </div>
          </div>
          <span class="activity-chevron">›</span>
        </div>
      </template>

    </div>

    <ActivityModal ref="modal" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import ActivityModal from '../components/ActivityModal.vue'

const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()
const modal     = ref(null)

const monthNamesShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function pad2(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
}

function getDay(date)   { return date?.split('-')[2] }
function getMonth(date) {
  const m = parseInt(date?.split('-')[1]) - 1
  return monthNamesShort[m] || ''
}

function totalSongs(a) {
  return (a.tiempos || []).reduce((sum, t) => sum + (t.songs?.length || 0), 0)
}

const today = pad2(new Date())
const next7  = pad2(new Date(Date.now() + 7 * 86400000))

const upcoming = computed(() =>
  store.activities
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''))
)

const featuredId   = computed(() => upcoming.value[0]?.id)
const todayEvents  = computed(() => upcoming.value.filter(a => a.date === today))
const nearEvents   = computed(() => upcoming.value.filter(a => a.date > today && a.date <= next7))
const laterEvents  = computed(() => upcoming.value.filter(a => a.date > next7))
</script>
