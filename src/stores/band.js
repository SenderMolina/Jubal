import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuthStore } from './auth'

// Store de sesión de banda: maneja las bandas del usuario, la banda activa y
// el rol derivado de la membresía. Expone isLeader/isMusico/isCantante para que
// las vistas existentes sigan funcionando sin cambios (vía el shim de role.js).
export const useBandStore = defineStore('band', () => {
  const bands         = ref([])   // [{ id, name, owner_id, role }]
  const currentBandId = ref(sessionStorage.getItem('bandId') || null)
  const ready         = ref(false)
  const pendingInvite = ref(localStorage.getItem('pendingInvite') || null)
  const inviteResult  = ref(null) // { ok, name?, role?, message? }

  const currentBand = computed(() =>
    bands.value.find(b => b.id === currentBandId.value) || null)

  const myRole     = computed(() => currentBand.value?.role || null)
  const isLeader   = computed(() => myRole.value === 'leader')
  const isMusico   = computed(() => myRole.value === 'musician')
  const isCantante = computed(() => myRole.value === 'singer')

  async function loadBands() {
    const auth = useAuthStore()
    if (!auth.user) { bands.value = []; ready.value = true; return }

    const { data, error } = await supabase
      .from('band_members')
      .select('role, band:bands(id, name, owner_id)')
      .eq('user_id', auth.user.id)

    if (error) console.error('Error cargando bandas:', error)
    bands.value = (data || [])
      .filter(r => r.band)
      .map(r => ({ id: r.band.id, name: r.band.name, owner_id: r.band.owner_id, role: r.role }))
    ready.value = true
  }

  // Cargar bandas y, si hay una invitación pendiente, canjearla.
  async function init() {
    await loadBands()
    if (pendingInvite.value) await redeemPending()
  }

  async function createBand(name) {
    const { data, error } = await supabase.rpc('create_band', { p_name: name })
    if (error) throw error
    await loadBands()
    selectBand(data.id)
    return data
  }

  function selectBand(id) {
    currentBandId.value = id
    sessionStorage.setItem('bandId', id)
  }

  function clearPending() {
    pendingInvite.value = null
    localStorage.removeItem('pendingInvite')
  }

  async function redeemPending() {
    const token = pendingInvite.value
    clearPending()
    try {
      const { data, error } = await supabase.rpc('redeem_invitation', { p_token: token })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (row?.out_band_id) {
        await loadBands()
        selectBand(row.out_band_id)
        inviteResult.value = { ok: true, name: row.out_band_name, role: row.out_role }
      }
    } catch (e) {
      inviteResult.value = { ok: false, message: e.message || 'No se pudo unir a la banda.' }
    }
  }

  // ---------- Gestión (líder) ----------
  async function loadMembers() {
    const b = currentBandId.value; if (!b) return []
    const { data, error } = await supabase
      .from('band_members')
      .select('user_id, role, joined_at, profile:profiles(display_name, email, avatar_url)')
      .eq('band_id', b)
    if (error) { console.error('Error cargando miembros:', error); return [] }
    return data || []
  }

  async function updateMemberRole(userId, role) {
    const b = currentBandId.value
    const { error } = await supabase.from('band_members')
      .update({ role }).eq('band_id', b).eq('user_id', userId)
    if (error) throw error
  }

  async function removeMember(userId) {
    const b = currentBandId.value
    const { error } = await supabase.from('band_members')
      .delete().eq('band_id', b).eq('user_id', userId)
    if (error) throw error
  }

  async function loadInvites() {
    const b = currentBandId.value; if (!b) return []
    const { data, error } = await supabase
      .from('invitations')
      .select('*').eq('band_id', b).eq('revoked', false)
      .order('created_at', { ascending: false })
    if (error) { console.error('Error cargando invitaciones:', error); return [] }
    return data || []
  }

  async function createInvite(role) {
    const b = currentBandId.value
    const { data, error } = await supabase
      .from('invitations').insert({ band_id: b, role }).select().single()
    if (error) throw error
    return data
  }

  async function revokeInvite(id) {
    const { error } = await supabase.from('invitations').update({ revoked: true }).eq('id', id)
    if (error) throw error
  }

  function inviteLink(token) {
    return `${window.location.origin}${window.location.pathname}#/join/${token}`
  }

  // "Cambiar de banda": vuelve a la pantalla de selección.
  function changeRole() {
    currentBandId.value = null
    sessionStorage.removeItem('bandId')
  }

  // Limpiar todo al cerrar sesión.
  function reset() {
    bands.value = []
    ready.value = false
    changeRole()
  }

  return {
    bands, currentBandId, currentBand, ready, pendingInvite, inviteResult,
    myRole, isLeader, isMusico, isCantante,
    loadBands, init, createBand, selectBand, redeemPending, changeRole, reset,
    loadMembers, updateMemberRole, removeMember,
    loadInvites, createInvite, revokeInvite, inviteLink,
  }
})
