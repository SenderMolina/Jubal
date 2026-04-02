<template>
  <nav class="bottom-nav">
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/') }" to="/">
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
      <RouterLink class="bottom-nav__item" :class="{ active: isActive('/tipos') }" to="/tipos">
        <svg class="bottom-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        <span class="bottom-nav__label">Tipos</span>
      </RouterLink>
    </template>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useRoleStore } from '../stores/role'

const route     = useRoute()
const roleStore = useRoleStore()

function isActive(path) {
  if (path === '/') return route.path === '/' || route.path.startsWith('/actividad/')
  return route.path.startsWith(path)
}
</script>
