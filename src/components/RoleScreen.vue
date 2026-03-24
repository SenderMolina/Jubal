<template>
  <div class="role-screen">
    <div class="role-box">
      <img :src="logo" alt="Jubal" class="role-logo">

      <div class="role-options">
        <!-- Cantante -->
        <div class="role-option" @click="roleStore.enterAs('cantante')">
          <img :src="singerIcon" alt="" class="role-option-icon">
          <div class="role-option-title">Cantante</div>
        </div>

        <!-- Músico -->
        <div class="role-option" @click="roleStore.enterAs('musico')">
          <img :src="musicianIcon" alt="" class="role-option-icon">
          <div class="role-option-title">Músico</div>
        </div>

        <!-- Líder -->
        <div class="role-option" :class="{ selected: showPassword }" @click="togglePassword">
          <img :src="leaderIcon" alt="" class="role-option-icon">
          <div class="role-option-title">Líder</div>
          <div v-if="showPassword" class="password-input-wrap" @click.stop>
            <input
              ref="passwordInput"
              v-model="password"
              type="password"
              placeholder="Contraseña"
              @keydown.enter="checkPassword"
            >
            <button class="btn btn-primary btn-sm" @click="checkPassword">Entrar</button>
          </div>
          <div v-if="passwordError" class="password-error">Contraseña incorrecta</div>
        </div>
      </div>

      <p>Selecciona cómo quieres entrar</p>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRoleStore } from '../stores/role'
import logo        from '../assets/jubal_logo.png'
import singerIcon  from '../assets/singer_icon.png'
import musicianIcon from '../assets/musician_icon.png'
import leaderIcon  from '../assets/leader_icon.png'

const roleStore     = useRoleStore()
const showPassword  = ref(false)
const password      = ref('')
const passwordError = ref(false)
const passwordInput = ref(null)

async function togglePassword() {
  showPassword.value = !showPassword.value
  if (showPassword.value) {
    await nextTick()
    passwordInput.value?.focus()
  }
}

async function checkPassword() {
  const ok = await roleStore.checkPassword(password.value)
  if (ok) {
    roleStore.enterAs('lider')
  } else {
    passwordError.value = true
    setTimeout(() => { passwordError.value = false }, 2000)
  }
}
</script>
