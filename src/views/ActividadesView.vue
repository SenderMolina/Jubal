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
        <template v-else>
          <svg class="btn-pill__cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Pasadas
        </template>
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
        <svg class="setlist-empty__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <p>
          Nada en la agenda todavía.
          <template v-if="roleStore.isLeader"><br>Crea la primera actividad con “Agregar”.</template>
        </p>
      </div>

      <template v-else>
        <!-- HERO: la próxima actividad, con cuenta regresiva -->
        <div
          class="next-hero"
          role="link"
          tabindex="0"
          @click="router.push('/actividad/' + hero.id)"
          @keyup.enter="router.push('/actividad/' + hero.id)"
        >
          <div class="next-hero__top">
            <span class="next-hero__eyebrow">Próximo</span>
            <span class="next-hero__count">{{ countdownLabel(hero.date) }}</span>
          </div>
          <div class="next-hero__title">{{ hero.title }}</div>
          <div class="next-hero__when">
            {{ heroDateLabel(hero.date) }}<template v-if="hero.time"> · {{ hero.time }}</template>
          </div>
          <div v-if="hero.tiempos?.length" class="next-hero__summary">
            {{ hero.tiempos.length }} tiempo{{ hero.tiempos.length !== 1 ? 's' : '' }}
            · {{ totalSongs(hero) }} canción{{ totalSongs(hero) !== 1 ? 'es' : '' }}
          </div>
          <button v-if="roleStore.isLeader" class="dots-btn next-hero__menu" aria-label="Opciones" @click.stop="openMenu(hero)">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>

        <!-- AGENDA: el resto de lo que viene -->
        <div v-if="agenda.length" class="activities-dashboard">
          <div v-if="agendaThisWeek.length" class="activities-section-label">Esta semana</div>
          <template v-for="(a, i) in agenda" :key="a.id">
            <div v-if="i === laterStartIndex" class="activities-section-label activities-section-label--later">Más adelante</div>
            <div class="activity-card" @click="router.push('/actividad/' + a.id)">
              <div class="activity-date-badge" :class="{ 'activity-date-badge--today': a.date === today }">
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
                <div v-if="a.tiempos?.length" class="activity-badges">
                  <span class="activity-badge activity-badge--tiempos">{{ a.tiempos.length }} tiempo{{ a.tiempos.length !== 1 ? 's' : '' }}</span>
                  <span class="activity-badge activity-badge--songs">{{ totalSongs(a) }} canción{{ totalSongs(a) !== 1 ? 'es' : '' }}</span>
                </div>
              </div>
              <button v-if="roleStore.isLeader" class="dots-btn" aria-label="Opciones" @click.stop="openMenu(a)">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>
          </template>
        </div>
      </template>
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

const today = pad2(new Date())
const next7  = pad2(new Date(Date.now() + 7 * 86400000))

const weekdaysShort = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function daysUntil(date) {
  const [y, m, d] = date.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const base = new Date(); base.setHours(0, 0, 0, 0)
  return Math.round((target - base) / 86400000)
}
function countdownLabel(date) {
  const n = daysUntil(date)
  if (n <= 0) return 'Hoy'
  if (n === 1) return 'Mañana'
  return `En ${n} días`
}
function heroDateLabel(date) {
  const [y, m, d] = date.split('-').map(Number)
  return `${weekdaysShort[new Date(y, m - 1, d).getDay()]} ${d} ${monthNamesShort[m - 1]}`
}

const upcoming = computed(() =>
  store.activities
    .filter(a => a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''))
)

// La primera próxima va al hero; el resto se reparte en "esta semana" / "más adelante".
const hero            = computed(() => upcoming.value[0])
const agenda          = computed(() => upcoming.value.slice(1))
const agendaThisWeek  = computed(() => agenda.value.filter(a => a.date <= next7))
const laterStartIndex = computed(() => agenda.value.findIndex(a => a.date > next7))

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
/* Saludo compacto: la fuerza visual se concentra en el hero, no aquí */
.acts-greeting { padding: 10px 2px 2px; margin: 2px 0 14px; }
.acts-greeting__hi { color: var(--text-mid); font-size: .9rem; font-weight: 500; }
.acts-greeting__band {
  font-weight: 700; font-size: 1.45rem;
  line-height: 1.15; color: var(--text); margin: 2px 0 0;
}

.btn-pill__cal { width: 15px; height: 15px; display: block; }

/* ── HERO: la próxima actividad (firma de la pantalla) ── */
.next-hero {
  position: relative;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: linear-gradient(135deg, var(--accent-soft) 0%, #FFF4E8 100%);
  padding: 16px 18px 18px;
  margin-bottom: 22px;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform .18s ease, box-shadow .18s ease;
  -webkit-tap-highlight-color: transparent;
}
.next-hero:hover { transform: translateY(-1px); box-shadow: var(--shadow-hover); }
.next-hero:active { transform: scale(.995); }
.next-hero:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.next-hero__top { display: flex; align-items: center; margin-bottom: 9px; }
.next-hero__eyebrow {
  font-size: .68rem; font-weight: 700; letter-spacing: .12em;
  text-transform: uppercase; color: var(--text-mid);
}
.next-hero__count {
  margin-left: auto;
  background: var(--action); color: #fff;
  font-size: .7rem; font-weight: 700;
  padding: 3px 11px; border-radius: 999px;
}
.next-hero__title {
  font-size: 1.4rem; font-weight: 700; line-height: 1.15;
  color: var(--text); padding-right: 30px;
}
.next-hero__when { font-size: .88rem; font-weight: 600; color: var(--text-mid); margin-top: 5px; }
.next-hero__summary { font-size: .8rem; color: var(--text-muted); margin-top: 6px; }
.next-hero__menu { position: absolute; top: 10px; right: 8px; }

/* Icono del estado vacío como SVG (a juego con la nav), reemplaza el emoji */
.setlist-empty__svg { width: 40px; height: 40px; color: var(--text-muted); opacity: .6; margin: 0 auto 12px; display: block; }

@media (prefers-reduced-motion: reduce) {
  .next-hero { transition: none; }
  .next-hero:hover, .next-hero:active { transform: none; }
}
</style>
