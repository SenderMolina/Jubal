<template>
  <div>
    <div class="acts-greeting">
      <p class="acts-greeting__hi">Hola{{ firstName ? ', ' + firstName : '' }}</p>
      <h2 class="acts-greeting__band">{{ band.currentBand?.name || 'Jubal' }}</h2>
    </div>

    <div class="page-actions cal-anchor">
      <button
        class="btn-pill"
        :class="{ 'btn-pill--active': selectedDate || showCalendar }"
        @click="toggleCalendar"
      >
        <template v-if="selectedDate">
          {{ selectedDateLabel }}
          <span class="btn-pill__clear" @click.stop="clearFilter" aria-label="Quitar filtro">✕</span>
        </template>
        <template v-else>📅 Pasadas</template>
      </button>
      <button v-if="roleStore.isLeader" class="btn-pill btn-pill--primary" @click="modal?.open()">
        <span class="btn-pill__icon">+</span> Agregar
      </button>

      <!-- CALENDARIO (popover sobre la lista) -->
      <Teleport to="body">
        <div v-if="showCalendar" class="cal-overlay" @click="showCalendar = false"></div>
      </Teleport>
      <div v-if="showCalendar" class="cal-widget">
        <div class="cal-header">
          <button class="cal-nav" @click="prevMonth" aria-label="Mes anterior">‹</button>
          <div class="cal-title">{{ monthNamesFull[calMonth] }} {{ calYear }}</div>
          <button class="cal-nav" @click="nextMonth" aria-label="Mes siguiente">›</button>
        </div>
        <div class="cal-grid">
          <div v-for="d in ['L','M','X','J','V','S','D']" :key="d" class="cal-dow">{{ d }}</div>
          <div
            v-for="cell in calCells"
            :key="cell.key"
            class="cal-day"
            :class="{
              'cal-day--has': cell.has,
              'cal-day--today': cell.date === today,
              'cal-day--selected': cell.date === selectedDate,
            }"
            @click="cell.has && selectDate(cell.date)"
          >
            <span>{{ cell.day }}</span>
            <span v-if="cell.has" class="cal-dot"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- ACTIVIDADES DEL DÍA SELECCIONADO -->
    <div v-if="selectedDate" class="activities-dashboard">
      <div class="activities-section-label">{{ selectedDateFullLabel }}</div>
      <div v-if="selectedDayActivities.length === 0" class="activity-empty">
        No hay actividades en esta fecha.
      </div>
      <div
        v-for="a in selectedDayActivities"
        :key="a.id"
        class="activity-card"
        @click="router.push('/actividad/' + a.id)"
      >
        <div class="activity-date-badge">
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
        <button v-if="roleStore.isLeader" class="dots-btn" aria-label="Opciones" @click.stop="openMenu(a)">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
        </button>
      </div>
    </div>

    <!-- VISTA NORMAL (sin filtro) -->
    <template v-else>
      <div v-if="upcoming.length === 0" class="setlist-empty">
        <div class="icon">📅</div>
        <p>
          No hay actividades próximas.
          <template v-if="roleStore.isLeader"><br>Crea la primera con el botón de arriba.</template>
        </p>
      </div>

      <div v-else class="activities-dashboard">
        <div
          v-for="a in upcoming"
          :key="a.id"
          :class="['activity-card', a.date > next7 ? 'activity-card--later' : '', a.id === featuredId ? 'activity-card--featured' : '']"
          @click="router.push('/actividad/' + a.id)"
        >
          <div
            class="activity-date-badge"
            :class="{
              'activity-date-badge--today': a.date === today,
              'activity-date-badge--later': a.date > next7,
              'activity-date-badge--featured': a.id === featuredId,
            }"
          >
            <template v-if="a.date === today">
              <div class="day-today">HOY</div>
            </template>
            <template v-else>
              <div class="day">{{ getDay(a.date) }}</div>
              <div class="month">{{ getMonth(a.date) }}</div>
            </template>
          </div>
          <div class="activity-info">
            <div class="activity-title">{{ a.title }}</div>
            <div v-if="a.time" class="activity-time">{{ a.time }}</div>
            <span v-if="statusChip(a.date)" class="act-chip" :class="'act-chip--' + statusChip(a.date).cls">{{ statusChip(a.date).label }}</span>
            <div v-if="a.tiempos?.length" class="activity-badges">
              <span class="activity-badge activity-badge--tiempos">{{ a.tiempos.length }} tiempo{{ a.tiempos.length !== 1 ? 's' : '' }}</span>
              <span class="activity-badge activity-badge--songs">{{ totalSongs(a) }} canción{{ totalSongs(a) !== 1 ? 'es' : '' }}</span>
            </div>
          </div>
          <button v-if="roleStore.isLeader" class="dots-btn" aria-label="Opciones" @click.stop="openMenu(a)">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>
      </div>
    </template>

    <ActivityModal ref="modal" />
    <ActionSheet ref="sheet" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useRoleStore } from '../stores/role'
import { useBandStore } from '../stores/band'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import ActivityModal from '../components/ActivityModal.vue'
import ActionSheet from '../components/ActionSheet.vue'

const router    = useRouter()
const route     = useRoute()
const store     = useAppStore()
const roleStore = useRoleStore()
const band      = useBandStore()
const auth      = useAuthStore()

const firstName = computed(() => {
  const n = auth.user?.user_metadata?.full_name || ''
  return n.split(' ')[0]
})
const modal     = ref(null)
const sheet     = ref(null)
const { showToast } = useToast()
const { confirm }   = useConfirm()

// Acción rápida desde Inicio: /actividades?nueva=1 abre el modal de creación.
onMounted(async () => {
  if (route.query.nueva && roleStore.isLeader) {
    await nextTick()
    modal.value?.open()
    router.replace('/actividades')
  }
})

function openMenu(a) {
  sheet.value?.open({
    title: a.title,
    actions: [
      { label: 'Editar actividad', icon: 'edit', onSelect: () => modal.value?.openEdit(a) },
      { label: 'Eliminar actividad', icon: 'trash', danger: true, onSelect: () => deleteActivity(a) },
    ],
  })
}

async function deleteActivity(a) {
  const ok = await confirm('¿Estás seguro que quieres eliminar esta actividad?', `"${a.title}"`)
  if (!ok) return
  store.activities = store.activities.filter(x => x.id !== a.id)
  store.saveActivities()
  showToast('Actividad eliminada')
}

const monthNamesShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const monthNamesFull  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

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

const today    = pad2(new Date())
const tomorrow = pad2(new Date(Date.now() + 86400000))
const next7     = pad2(new Date(Date.now() + 7 * 86400000))

// Chip de estado temporal. "Hoy" ya se distingue en el badge de fecha, así que
// solo etiquetamos lo que viene (mañana / dentro de la próxima semana).
function statusChip(date) {
  if (date === tomorrow) return { label: 'Mañana', cls: 'soon' }
  if (date > today && date <= next7) return { label: 'Próxima semana', cls: 'week' }
  return null
}

const upcoming = computed(() =>
  store.activities
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''))
)

const featuredId = computed(() => upcoming.value[0]?.id)

/* ── Calendario / filtro por fecha ── */
const now          = new Date()
const showCalendar = ref(false)
const selectedDate = ref(null)
const calMonth     = ref(now.getMonth())
const calYear      = ref(now.getFullYear())

const activityDates = computed(() => new Set(store.activities.map(a => a.date)))

const calCells = computed(() => {
  const first       = new Date(calYear.value, calMonth.value, 1)
  const startBlanks = (first.getDay() + 6) % 7 // semana inicia en lunes
  const daysInMonth = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startBlanks; i++) cells.push({ key: 'b' + i, day: '', date: null, has: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${calYear.value}-${String(calMonth.value + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    cells.push({ key: date, day: d, date, has: activityDates.value.has(date) })
  }
  return cells
})

function prevMonth() {
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- }
  else calMonth.value--
}
function nextMonth() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ }
  else calMonth.value++
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value && selectedDate.value) {
    const [y, m] = selectedDate.value.split('-')
    calYear.value  = parseInt(y)
    calMonth.value = parseInt(m) - 1
  }
}

function selectDate(date) {
  selectedDate.value = date
  showCalendar.value = false
}

function clearFilter() {
  selectedDate.value = null
  showCalendar.value = false
}

const selectedDateLabel = computed(() =>
  selectedDate.value ? `${getDay(selectedDate.value)} ${getMonth(selectedDate.value)}` : ''
)

const selectedDateFullLabel = computed(() => {
  if (!selectedDate.value) return ''
  const [y, m, d] = selectedDate.value.split('-')
  return `${parseInt(d)} de ${monthNamesFull[parseInt(m) - 1]} ${y}`
})

const selectedDayActivities = computed(() =>
  store.activities
    .filter(a => a.date === selectedDate.value)
    .sort((a, b) => (a.time||'').localeCompare(b.time||''))
)
</script>

<style scoped>
.acts-greeting {
  background: var(--header-grad);
  border-radius: var(--radius);
  padding: 28px 24px;
  margin: 4px 0 20px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.acts-greeting__hi { color: var(--text-mid); font-size: .95rem; font-weight: 500; }
.acts-greeting__band {
  font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 1.9rem;
  line-height: 1.15; color: var(--text); margin: 4px 0 0;
}

.act-chip {
  display: inline-block; font-size: .68rem; font-weight: 600;
  padding: 2px 10px; border-radius: 999px; margin-top: 6px;
}
.act-chip--soon { background: var(--accent-soft); color: var(--accent); }
.act-chip--week { background: var(--surface2); color: var(--text-mid); }
</style>
