import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'

async function getLeaderPassword() {
  const { data } = await supabase
    .from('app_config').select('value').eq('key', 'leaderPassword').maybeSingle()
  return data?.value ?? null
}

export const useRoleStore = defineStore('role', () => {
  const currentRole = ref(sessionStorage.getItem('role') || null)

  const isLeader   = computed(() => currentRole.value === 'lider')
  const isCantante = computed(() => currentRole.value === 'cantante')
  const isMusico   = computed(() => currentRole.value === 'musico')

  // Garantizar que exista la contraseña por defecto en el primer arranque.
  getLeaderPassword().then(pwd => {
    if (!pwd) supabase.from('app_config').upsert({ key: 'leaderPassword', value: 'musicman' })
  })

  async function checkPassword(input) {
    return input === await getLeaderPassword()
  }

  function enterAs(role) {
    currentRole.value = role
    sessionStorage.setItem('role', role)
  }

  function changeRole() {
    currentRole.value = null
    sessionStorage.removeItem('role')
  }

  return { currentRole, isLeader, isCantante, isMusico, checkPassword, enterAs, changeRole }
})
