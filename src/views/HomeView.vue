<template>
  <div class="home">
    <div class="home-hero">
      <p class="home-hero__hi">Hola{{ firstName ? ', ' + firstName : '' }}</p>
      <h1 class="home-hero__band">{{ band.currentBand?.name || 'Jubal' }}</h1>
      <span class="home-hero__role" :class="'role-' + band.myRole">{{ roleLabel }}</span>
    </div>

    <!-- Próxima actividad -->
    <h2 class="home-section">Próxima actividad</h2>
    <RouterLink v-if="nextActivity" class="home-next" :to="'/actividad/' + nextActivity.id">
      <div class="home-next__date">
        <span class="home-next__day">{{ dayNum(nextActivity.date) }}</span>
        <span class="home-next__mon">{{ monthShort(nextActivity.date) }}</span>
      </div>
      <div class="home-next__info">
        <div class="home-next__title">{{ nextActivity.title }}</div>
        <div class="home-next__meta">{{ longDate(nextActivity.date) }}<template v-if="nextActivity.time"> · {{ nextActivity.time }}</template></div>
      </div>
      <span class="home-next__arrow">›</span>
    </RouterLink>
    <p v-else class="home-empty">No hay actividades próximas.</p>

    <!-- Acciones rápidas (solo líder) -->
    <template v-if="band.isLeader">
      <h2 class="home-section">Acciones rápidas</h2>
      <div class="home-actions">
        <RouterLink class="home-action" to="/actividades?nueva=1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Nueva actividad</span>
        </RouterLink>
        <RouterLink class="home-action" to="/banda">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          <span>Invitar miembro</span>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'
import { useBandStore } from '../stores/band'
import { useAuthStore } from '../stores/auth'

const store = useAppStore()
const band  = useBandStore()
const auth  = useAuthStore()

const firstName = computed(() => {
  const n = auth.user?.user_metadata?.full_name || ''
  return n.split(' ')[0]
})

const roleLabel = computed(() =>
  ({ leader: 'Líder', musician: 'Músico', singer: 'Corista' }[band.myRole] || ''))

const nextActivity = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return [...store.activities]
    .filter(a => a.date && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null
})

function d(dateStr) { return new Date(dateStr + 'T00:00:00') }
function dayNum(s)    { return d(s).getDate() }
function monthShort(s){ return d(s).toLocaleDateString('es', { month: 'short' }).replace('.', '') }
function longDate(s)  { return d(s).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) }
</script>

<style scoped>
.home-hero { margin-bottom: 22px; }
.home-hero__hi { color: var(--text-mid); font-size: .95rem; }
.home-hero__band {
  font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 2rem; line-height: 1.15;
  color: var(--text); margin: 2px 0 8px;
}
.home-hero__role {
  font-size: 12px; padding: 3px 12px; border-radius: 999px;
  background: var(--surface2); color: var(--text-mid); font-weight: 600;
}
.home-hero__role.role-leader { background: var(--accent); color: #fff; }

.home-section { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em;
  color: var(--text-muted); margin: 22px 0 10px; font-weight: 700; }

.home-next {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow); text-decoration: none;
  color: var(--text); transition: all .15s;
}
.home-next:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: var(--shadow-hover); }
.home-next__date {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: 12px; background: var(--accent-soft); flex-shrink: 0;
}
.home-next__day { font-size: 1.3rem; font-weight: 700; color: var(--accent); line-height: 1; }
.home-next__mon { font-size: .7rem; text-transform: uppercase; color: var(--accent); }
.home-next__info { flex: 1; min-width: 0; }
.home-next__title { font-weight: 600; font-size: 1rem; }
.home-next__meta { color: var(--text-muted); font-size: .82rem; text-transform: capitalize; }
.home-next__arrow { color: var(--text-muted); font-size: 1.6rem; line-height: 1; }

.home-empty { color: var(--text-muted); font-size: 14px; }

.home-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.home-action {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 18px 12px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow); text-decoration: none;
  color: var(--text-mid); font-weight: 600; font-size: .9rem; transition: all .15s;
}
.home-action svg { width: 24px; height: 24px; color: var(--accent); }
.home-action:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); box-shadow: var(--shadow-hover); }
</style>
