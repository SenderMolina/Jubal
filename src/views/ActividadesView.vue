<template>
  <div>
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
      <RouterLink v-if="band.can.manageActivities" class="btn-pill btn-pill--primary" :to="{ path: '/actividades/nueva', query: selectedDate ? { fecha: selectedDate } : {} }">
        <span class="btn-pill__icon">+</span> Nueva actividad
      </RouterLink>

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
        <button v-if="band.can.manageActivities" class="dots-btn" aria-label="Opciones" @click.stop="openMenu(a)">
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
          <template v-if="band.can.manageActivities"><br>Toca “Nueva actividad” para agregarla a tu agenda.</template>
        </p>
      </div>

      <template v-else>
        <!-- PRÓXIMO: la siguiente actividad con su setlist a la vista -->
        <section class="next-hero" aria-labelledby="next-hero-title">
          <RouterLink class="next-hero__head" :to="'/actividad/' + hero.id">
            <span class="next-hero__top">
              <span class="next-hero__eyebrow">Próximo</span>
              <span class="next-hero__count">{{ countdownLabel(hero.date) }}</span>
            </span>
            <span id="next-hero-title" class="next-hero__title">{{ hero.title }}</span>
            <span class="next-hero__when">
              {{ heroDateLabel(hero.date) }}<template v-if="hero.time"> · {{ hero.time }}</template>
            </span>
          </RouterLink>
          <button v-if="band.can.manageActivities" class="dots-btn next-hero__menu" aria-label="Opciones" @click="openMenu(hero)">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>

          <ol v-if="hero.tiempos?.length" class="next-hero__setlist" aria-label="Setlist">
            <li v-for="t in hero.tiempos" :key="t.id" class="next-hero__tiempo">
              <span class="next-hero__tiempo-name">{{ tiempoName(t) }}</span>
              <ol v-if="tiempoSongs(t).length" class="next-hero__songs">
                <li v-for="song in tiempoSongs(t)" :key="song.id">
                  <!-- act: al pasar de canción se recorre este mismo setlist -->
                  <RouterLink class="next-hero__song" :to="{ path: '/cancion/' + song.id, query: { act: hero.id } }">
                    <span class="next-hero__song-title">{{ song.title }}</span>
                    <span v-if="song.key" class="next-hero__song-key">{{ fmtKey(song.key) }}</span>
                  </RouterLink>
                </li>
              </ol>
              <span v-else class="next-hero__empty">Sin canciones aún</span>
            </li>
          </ol>
          <p v-else class="next-hero__empty next-hero__empty--all">
            {{ band.can.manageActivities ? 'Aún no tiene setlist. Ábrela para armarlo.' : 'El setlist aún no está listo.' }}
          </p>
        </section>

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
              <button v-if="band.can.manageActivities" class="dots-btn" aria-label="Opciones" @click.stop="openMenu(a)">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>
          </template>
        </div>
      </template>
    </template>

    <ActionSheet ref="sheet" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import ActionSheet from '../components/ActionSheet.vue'
import { fmtKey } from '../utils/keys'

const router    = useRouter()
const route     = useRoute()
const store     = useAppStore()
const band = useBandStore()
const sheet     = ref(null)
const { attempt } = useToast()
const { confirm }   = useConfirm()

// Compatibilidad con enlaces antiguos durante la restauración de la sesión.
onMounted(async () => {
  await store.loadActivities()
  if (route.query.nueva && band.can.manageActivities) {
    router.replace({ path: '/actividades/nueva', query: route.query.fecha ? { fecha: route.query.fecha } : {} })
  }
})

function openMenu(a) {
  sheet.value?.open({
    title: a.title,
    actions: [
      { label: 'Editar actividad', icon: 'edit', onSelect: () => router.push(`/actividades/${a.id}/editar`) },
      { label: 'Eliminar actividad', icon: 'trash', danger: true, onSelect: () => deleteActivity(a) },
    ],
  })
}

async function deleteActivity(a) {
  const ok = await confirm('¿Estás seguro que quieres eliminar esta actividad?', `"${a.title}"`)
  if (!ok) return
  await attempt(() => store.deleteActivity(a.id), { success: 'Actividad eliminada', error: 'No se pudo eliminar la actividad.' })
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

// Solo canciones que siguen existiendo: los tiempos guardan ids y una canción
// borrada queda ahí hasta que se edite la actividad.
const songsById = computed(() => new Map(store.songs.map(song => [song.id, song])))
function tiempoSongs(t) {
  return (t.songs || []).map(id => songsById.value.get(id)).filter(Boolean)
}
function totalSongs(a) {
  return (a.tiempos || []).reduce((sum, t) => sum + tiempoSongs(t).length, 0)
}
function tiempoName(t) {
  if (t.name?.trim()) return t.name.trim()
  if (t.start) return t.end ? `${t.start} – ${t.end}` : t.start
  return 'Tiempo'
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
.btn-pill__cal { width: 15px; height: 15px; display: block; }


/* Icono del estado vacío como SVG (a juego con la nav), reemplaza el emoji */
.setlist-empty__svg { width: 40px; height: 40px; color: var(--color-text-muted); opacity: .6; margin: 0 auto 12px; display: block; }

/* ── PRÓXIMO: la siguiente actividad con su setlist ── */
.next-hero {
  position: relative;
  margin-bottom: 28px;
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: 24px;
  background: var(--color-surface);
  box-shadow: var(--shadow-small);
}
.next-hero__head { display: flex; flex-direction: column; color: inherit; text-decoration: none; border-radius: 14px; }
.next-hero__head:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 4px; }
.next-hero__top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-right: 40px; }
.next-hero__eyebrow { color: var(--color-info-text); font-size: 12px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.next-hero__count { padding: 5px 11px; border-radius: 999px; background: var(--color-info-soft); color: var(--color-info-text); font-size: 12px; font-weight: 900; }
.next-hero__title { padding-right: 36px; color: var(--color-text-primary); font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; line-height: 1.2; }
.next-hero__when { margin-top: 4px; color: var(--color-text-secondary); font-size: .88rem; font-weight: 600; }
.next-hero__menu { position: absolute; top: 10px; right: 8px; width: 40px; height: 40px; justify-content: center; }

/* Numeración corrida en todo el setlist (coincide con "3 de 4" en la canción). */
.next-hero__setlist { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--color-border); list-style: none; counter-reset: song; }
.next-hero__tiempo-name { display: block; margin-bottom: 4px; color: var(--color-section); font-family: var(--font-display); font-size: .72rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.next-hero__songs { list-style: none; }
.next-hero__song { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 8px; border-radius: 12px; color: var(--color-text-primary); text-decoration: none; counter-increment: song; }
.next-hero__song::before { content: counter(song); width: 18px; flex: 0 0 18px; color: var(--color-text-muted); font-size: .8rem; font-weight: 700; text-align: right; }
.next-hero__song:hover { background: var(--color-surface-hover); }
.next-hero__song:focus-visible { outline: 2px solid var(--color-focus); outline-offset: -2px; }
.next-hero__song-title { flex: 1; min-width: 0; overflow: hidden; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.next-hero__song-key { flex: 0 0 auto; min-width: 32px; padding: 3px 8px; border-radius: 8px; background: var(--color-accent-soft); color: var(--color-chord); font-family: var(--font-display); font-size: .8rem; font-weight: 700; text-align: center; }
.next-hero__empty { color: var(--color-text-muted); font-size: .82rem; }
.next-hero__empty--all { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--color-border); }
</style>
