<template>
  <!-- Modo práctica personal -->
  <nav v-if="band.personalMode" class="bottom-nav">
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/practica') }" to="/practica">
      <span class="bottom-nav__icon bottom-nav__icon--image bottom-nav__icon--wide" :style="{ backgroundImage: `url(${homeIcon})` }" aria-hidden="true"></span>
      <span class="bottom-nav__label">Dashboard de práctica</span>
    </RouterLink>
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/entrenar') }" to="/entrenar">
      <img class="bottom-nav__icon bottom-nav__icon--image" :src="trainIcon" alt="">
      <span class="bottom-nav__label">Entrenar</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/canciones') }" to="/canciones">
      <img class="bottom-nav__icon bottom-nav__icon--image" :src="songsIcon" alt="">
      <span class="bottom-nav__label">Canciones</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/repertorio') }" to="/repertorio">
      <img class="bottom-nav__icon bottom-nav__icon--image" :src="setlistIcon" alt="">
      <span class="bottom-nav__label">Repertorio</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/metronomo') }" to="/metronomo">
      <span class="bottom-nav__icon bottom-nav__icon--image bottom-nav__icon--wide" :style="{ backgroundImage: `url(${metronomeIcon})` }" aria-hidden="true"></span>
      <span class="bottom-nav__label">Metrónomo</span>
    </RouterLink>

    <!-- Estadística y Perfil quedan en el drawer/header: 5 items es el tope del tab bar -->
  </nav>

  <!-- Modo banda -->
  <nav v-else-if="band.currentBand" class="bottom-nav">
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/inicio') }" to="/inicio">
      <span class="bottom-nav__icon bottom-nav__icon--image bottom-nav__icon--wide" :style="{ backgroundImage: `url(${homeIcon})` }" aria-hidden="true"></span>
      <span class="bottom-nav__label">Inicio</span>
    </RouterLink>
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
      <img class="bottom-nav__icon bottom-nav__icon--image" :src="setlistIcon" alt="">
      <span class="bottom-nav__label">Repertorios</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/canciones') }" to="/canciones">
      <img class="bottom-nav__icon bottom-nav__icon--image" :src="songsIcon" alt="">
      <span class="bottom-nav__label">Canciones</span>
    </RouterLink>

    <template v-if="roleStore.isLeader">
      <RouterLink class="bottom-nav__item" :class="{ active: isActive('/banda') }" to="/banda">
        <img class="bottom-nav__icon bottom-nav__icon--image" :src="bandIcon" alt="">
        <span class="bottom-nav__label">Banda</span>
      </RouterLink>
    </template>

  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useRoleStore } from '../stores/role'
import { useBandStore } from '../stores/band'
import trainIcon from '../../icons/train.png'
import bandIcon from '../../icons/band.png'
import songsIcon from '../../icons/songs.png'
import setlistIcon from '../../icons/setlist.png'
import homeIcon from '../../icons/inicio.png'
import metronomeIcon from '../../icons/metronomo.png'

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
