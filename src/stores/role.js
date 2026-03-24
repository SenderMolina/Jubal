import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../firebase'
import { ref as dbRef, get, set } from 'firebase/database'

export const useRoleStore = defineStore('role', () => {
  const currentRole = ref(sessionStorage.getItem('role') || null)

  const isLeader   = computed(() => currentRole.value === 'lider')
  const isCantante = computed(() => currentRole.value === 'cantante')

  // Ensure default password exists on first run
  get(dbRef(db, 'config/leaderPassword')).then(snap => {
    if (!snap.val()) set(dbRef(db, 'config/leaderPassword'), 'musicman')
  })

  async function checkPassword(input) {
    const snap = await get(dbRef(db, 'config/leaderPassword'))
    return input === snap.val()
  }

  function enterAs(role) {
    currentRole.value = role
    sessionStorage.setItem('role', role)
  }

  function changeRole() {
    currentRole.value = null
    sessionStorage.removeItem('role')
  }

  return { currentRole, isLeader, isCantante, checkPassword, enterAs, changeRole }
})
