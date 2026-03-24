<template>
  <div>
    <div class="firebase-notice">
      <div class="dot"></div>
      <span>Conectado — Los cambios se sincronizan en tiempo real con tu equipo.</span>
    </div>

    <h1 class="section-title">Servicios</h1>
    <p class="section-subtitle">Selecciona la fecha del servicio para ver o armar el setlist.</p>

    <div class="date-picker-wrap">
      <label class="form-label">Fecha del servicio</label>
      <input type="date" class="form-input date-picker-input" v-model="selectedDate">
    </div>

    <!-- Setlist -->
    <div v-if="!selectedDate" class="setlist-empty">
      <div class="icon">📅</div>
      <p>Selecciona una fecha de servicio para ver o armar el setlist.</p>
    </div>
    <div v-else-if="setlistSongs.length === 0" class="setlist-empty">
      <div class="icon">🎶</div>
      <p>
        No hay canciones para este servicio.
        <template v-if="roleStore.isLeader"><br>Ve al <strong>Repertorio</strong> y agrégalas.</template>
      </p>
    </div>
    <div v-else class="setlist-songs">
      <div
        v-for="(song, i) in setlistSongs"
        :key="song.id"
        class="setlist-card"
        @click="router.push('/cancion/' + song.id)"
      >
        <div class="song-num">{{ i + 1 }}</div>
        <div class="song-info">
          <div class="song-title">{{ song.title }}</div>
          <div class="song-meta"><span>{{ song.author }}</span></div>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
          <span v-if="song.key" class="tag tag-key">{{ song.key }}</span>
          <span v-if="song.bpm" class="tag tag-bpm">{{ song.bpm }}</span>
          <button
            v-if="roleStore.isLeader"
            class="btn btn-ghost btn-sm"
            @click.stop="removeFromSetlist(song.id)"
          >✕</button>
        </div>
      </div>
    </div>

    <!-- Dashboard actividades -->
    <div class="dashboard-activities">
      <h2 class="section-title" style="margin-top:32px; font-size:1.2rem;">Próximas actividades</h2>
      <div v-if="upcomingActivities.length === 0" class="activity-empty">No hay actividades próximas.</div>
      <div v-for="a in upcomingActivities" :key="a.id" class="activity-card">
        <div class="activity-date-badge">
          <div class="day">{{ a.day }}</div>
          <div class="month">{{ a.monthStr }}</div>
        </div>
        <div class="activity-info">
          <div class="activity-title">{{ a.title }}</div>
          <div class="activity-meta">{{ [a.time, a.description].filter(Boolean).join(' · ') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'

const router    = useRouter()
const store     = useAppStore()
const roleStore = useRoleStore()

const monthNamesShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function pad2(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`
}

const selectedDate = ref(pad2(new Date()))

const setlistSongs = computed(() => {
  if (!selectedDate.value) return []
  const ids = store.services[selectedDate.value] || []
  return ids.map(id => store.songs.find(s => s.id === id)).filter(Boolean)
})

function removeFromSetlist(id) {
  const date = selectedDate.value
  if (!date) return
  const list = store.services[date] || []
  store.services[date] = list.filter(x => x !== id)
  if (store.services[date].length === 0) delete store.services[date]
  store.saveServices()
}

const upcomingActivities = computed(() => {
  const today = pad2(new Date())
  return store.activities
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''))
    .slice(0, 3)
    .map(a => {
      const [, m, d] = a.date.split('-').map(Number)
      return { ...a, day: d, monthStr: monthNamesShort[m - 1] }
    })
})
</script>
