<template>
  <nav v-if="band.personalMode || band.currentBand" class="bottom-nav" aria-label="Navegación principal">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="bottom-nav__item" :class="{ active: isActive(item) }" :aria-current="isActive(item) ? 'page' : undefined">
      <JubalNavIcon class="bottom-nav__icon" :name="item.icon" />
      <span class="bottom-nav__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useBandStore } from '../stores/band'
import JubalNavIcon from './JubalNavIcon.vue'

const route = useRoute()
const band = useBandStore()
const items = computed(() => band.personalMode ? [
  { to: '/practica', label: 'Inicio', icon: 'home' },
  { to: '/entrenar', label: 'Practicar', icon: 'tracker', paths: ['/skill/'] },
  { to: '/rutina', label: 'Rutinas', icon: 'activities' },
  { to: '/canciones', label: 'Canciones', icon: 'songs' },
] : [
  { to: '/actividades', label: 'Agenda', icon: 'activities', paths: ['/actividad/'] },
  { to: '/repertorio', label: 'Repertorios', icon: 'repertoire' },
  { to: '/canciones', label: 'Canciones', icon: 'songs' },
])
function isActive(item) { return [item.to, ...(item.paths || [])].some(path => route.path.startsWith(path)) }
</script>
