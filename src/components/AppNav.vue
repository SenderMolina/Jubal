<template>
  <!-- Modo práctica personal -->
  <nav v-if="band.personalMode" class="bottom-nav">
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/entrenar') }" to="/entrenar">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
      <span class="bottom-nav__label">Entrenar</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/metronomo') }" to="/metronomo">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3L5 20h14L12 3z"/>
        <line x1="12" y1="14" x2="17" y2="6"/>
      </svg>
      <span class="bottom-nav__label">Metrónomo</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/estadisticas') }" to="/estadisticas">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
      <span class="bottom-nav__label">Estadística</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/perfil') }" to="/perfil">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      <span class="bottom-nav__label">Perfil</span>
    </RouterLink>
  </nav>

  <!-- Modo banda -->
  <nav v-else-if="band.currentBand" class="bottom-nav">
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/actividades') }" to="/actividades">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span class="bottom-nav__label">Actividades</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/repertorio') }" to="/repertorio">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
      <span class="bottom-nav__label">Repertorios</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/canciones') }" to="/canciones">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <path d="M9 9l12-2"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
      <span class="bottom-nav__label">Canciones</span>
    </RouterLink>

    <template v-if="roleStore.isLeader">
      <RouterLink class="bottom-nav__item" :class="{ active: isActive('/banda') }" to="/banda">
        <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <span class="bottom-nav__label">Banda</span>
      </RouterLink>
    </template>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/perfil') }" to="/perfil">
      <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
      <span class="bottom-nav__label">Perfil</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useRoleStore } from '../stores/role'
import { useBandStore } from '../stores/band'

const route     = useRoute()
const roleStore = useRoleStore()
const band      = useBandStore()

function isActive(path) {
  if (path === '/actividades') {
    return route.path.startsWith('/actividades') || route.path.startsWith('/actividad/')
  }
  return route.path.startsWith(path)
}
</script>

