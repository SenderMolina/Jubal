<template>
  <div>
    <div class="page-heading">
      <div>
        <h1 class="section-title">Actividades</h1>
        <p class="section-subtitle">Eventos y servicios del grupo.</p>
      </div>
      <button v-if="roleStore.isLeader" class="btn btn-primary btn-sm" @click="modal?.open()">+ Nueva actividad</button>
    </div>

    <div v-if="upcoming.length === 0" class="setlist-empty">
      <div class="icon">📅</div>
      <p>
        No hay actividades próximas.
        <template v-if="roleStore.isLeader"><br>Crea la primera con el botón de arriba.</template>
      </p>
    </div>

    <div v-else class="activities-list">
      <div
        v-for="a in upcoming"
        :key="a.id"
        class="activity-card activity-card-link"
        @click="router.push('/actividad/' + a.id)"
      >
        <div class="activity-date-badge">
          <div class="day">{{ getDay(a.date) }}</div>
          <div class="month">{{ getMonth(a.date) }}</div>
        </div>
        <div class="activity-info">
          <div class="activity-title">{{ a.title }}</div>
          <div class="activity-meta">
            {{ [a.time, a.description].filter(Boolean).join(' · ') }}
          </div>
          <div v-if="a.tiempos?.length" class="activity-tiempos-preview">
            {{ a.tiempos.length }} tiempo{{ a.tiempos.length !== 1 ? 's' : '' }} ·
            {{ totalSongs(a) }} canción{{ totalSongs(a) !== 1 ? 'es' : '' }}
          </div>
        </div>
        <span class="activity-chevron">→</span>
      </div>
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

const upcoming = computed(() => {
  const today = pad2(new Date())
  return store.activities
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''))
})
</script>
