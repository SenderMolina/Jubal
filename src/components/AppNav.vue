<template>
  <!-- Modo práctica personal -->
  <nav v-if="band.personalMode" class="bottom-nav">
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/practica') }" to="/practica">
      <JubalNavIcon class="bottom-nav__icon" name="home" />
      <span class="bottom-nav__label">Inicio</span>
    </RouterLink>
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/entrenar') || isActive('/skill/') }" to="/entrenar">
      <JubalNavIcon class="bottom-nav__icon" name="tracker" />
      <span class="bottom-nav__label">Tracker</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/canciones') }" to="/canciones">
      <JubalNavIcon class="bottom-nav__icon" name="songs" />
      <span class="bottom-nav__label">Canciones</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/repertorio') }" to="/repertorio">
      <JubalNavIcon class="bottom-nav__icon" name="repertoire" />
      <span class="bottom-nav__label">Repertorio</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/metronomo') }" to="/metronomo">
      <JubalNavIcon class="bottom-nav__icon" name="metronome" />
      <span class="bottom-nav__label">Metrónomo</span>
    </RouterLink>

    <!-- Estadística y Perfil quedan en el drawer/header: 5 items es el tope del tab bar -->
  </nav>

  <!-- Modo banda -->
  <nav v-else-if="band.currentBand" class="bottom-nav">
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/inicio') }" to="/inicio">
      <JubalNavIcon class="bottom-nav__icon" name="home" />
      <span class="bottom-nav__label">Inicio</span>
    </RouterLink>
    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/actividades') }" to="/actividades">
      <JubalNavIcon class="bottom-nav__icon" name="activities" />
      <span class="bottom-nav__label">Actividades</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/repertorio') }" to="/repertorio">
      <JubalNavIcon class="bottom-nav__icon" name="repertoire" />
      <span class="bottom-nav__label">Repertorios</span>
    </RouterLink>

    <RouterLink class="bottom-nav__item" :class="{ active: isActive('/canciones') }" to="/canciones">
      <JubalNavIcon class="bottom-nav__icon" name="songs" />
      <span class="bottom-nav__label">Canciones</span>
    </RouterLink>

    <template v-if="roleStore.isLeader">
      <RouterLink class="bottom-nav__item" :class="{ active: isActive('/banda') }" to="/banda">
        <JubalNavIcon class="bottom-nav__icon" name="band" />
        <span class="bottom-nav__label">Banda</span>
      </RouterLink>
    </template>

  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useRoleStore } from '../stores/role'
import { useBandStore } from '../stores/band'
import JubalNavIcon from './JubalNavIcon.vue'

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
