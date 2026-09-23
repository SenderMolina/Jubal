import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useAuthStore } from './auth'

// Store de sesión de banda: maneja las bandas del usuario, la banda activa y
// el rol derivado de la membresía. Expone isLeader/isCantante para que
// las vistas existentes sigan funcionando sin cambios (vía el shim de role.js).
export const useBandStore = defineStore('band', () => {
  const bands         = ref([])   // [{ id, name, owner_id, role }]
  const currentBandId = ref(sessionStorage.getItem('bandId') || null)
  const personalMode  = ref(sessionStorage.getItem('personalMode') === '1')
  const ready         = ref(false)
  const pendingInvite = ref(localStorage.getItem('pendingInvite') || null)
  const inviteResult  = ref(null) // { ok, name?, role?, message? }

  const currentBand = computed(() =>
    bands.value.find(b => b.id === currentBandId.value) || null)

  const myRole     = computed(() => currentBand.value?.role || null)
  const isOwner    = computed(() => {
    const auth = useAuthStore()
    return Boolean(currentBand.value && auth.user?.id === currentBand.value.owner_id)
  })
  // En el espacio personal el músico es dueño de sus datos: mismas vistas, permisos de líder.
  const isLeader   = computed(() => myRole.value === 'leader' || personalMode.value)
  const isCantante = computed(() => myRole.value === 'singer')

  async function loadBands() {
    const auth = useAuthStore()
    if (!auth.user) { bands.value = []; return }

    const { data, error } = await supabase
      .from('band_members')
      .select('role, band:bands(*)')
      .eq('user_id', auth.user.id)

    if (error) console.error('Error cargando bandas:', error)
    bands.value = (data || [])
      .filter(r => r.band)
      .map(r => ({ ...r.band, role: r.role }))
  }

  // Cargar bandas y, si hay una invitación pendiente, canjearla.
  async function init() {
    await loadBands()
    if (pendingInvite.value) await redeemPending()
    const selectedBandExists = bands.value.some(b => b.id === currentBandId.value)
    if (selectedBandExists) {
      selectBand(currentBandId.value)
    } else if (!personalMode.value && bands.value.length) {
      selectBand(bands.value[0].id)
    } else if (!bands.value.length) {
      enterPersonal()
    }
    ready.value = true
  }

  async function createBand(name) {
    const { data, error } = await supabase.rpc('create_band', { p_name: name })
    if (error) throw error
    await loadBands()
    selectBand(data.id)
    return data
  }

  function updateCurrentBand(record) {
    const index = bands.value.findIndex(band => band.id === record.id)
    if (index < 0) return
    bands.value[index] = { ...bands.value[index], ...record }
  }

  async function updateBandName(name) {
    const id = currentBandId.value
    const cleanName = name.trim()
    if (!id || !cleanName) throw new Error('Escribe un nombre para la banda.')
    const { data, error } = await supabase
      .from('bands')
      .update({ name: cleanName })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    updateCurrentBand(data)
    return data
  }

  function imageStoragePath(url) {
    if (!url) return ''
    const marker = '/band-images/'
    const path = url.split(marker)[1]
    return path ? decodeURIComponent(path.split('?')[0]) : ''
  }

  async function updateBandImage(file) {
    const id = currentBandId.value
    if (!id || !file) throw new Error('Selecciona una imagen.')
    const extension = ({
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    })[file.type]
    if (!extension) throw new Error('Usa una imagen JPG, PNG o WebP.')
    if (file.size > 4 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 4 MB.')

    const previousPath = imageStoragePath(currentBand.value?.avatar_url)
    const path = `${id}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('band-images')
      .upload(path, file, { cacheControl: '3600', contentType: file.type })
    if (uploadError) throw uploadError

    const { data: publicData } = supabase.storage.from('band-images').getPublicUrl(path)
    const avatarUrl = publicData.publicUrl
    const { data, error } = await supabase
      .from('bands')
      .update({ avatar_url: avatarUrl })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      await supabase.storage.from('band-images').remove([path])
      throw error
    }

    updateCurrentBand(data)
    if (previousPath && previousPath !== path) {
      await supabase.storage.from('band-images').remove([previousPath])
    }
    return data
  }

  async function deleteBand() {
    const id = currentBandId.value
    if (!id) return
    const imagePath = imageStoragePath(currentBand.value?.avatar_url)
    if (imagePath) await supabase.storage.from('band-images').remove([imagePath])

    const { error } = await supabase.from('bands').delete().eq('id', id)
    if (error) throw error

    bands.value = bands.value.filter(band => band.id !== id)
    if (bands.value.length) selectBand(bands.value[0].id)
    else enterPersonal()
  }

  function selectBand(id) {
    currentBandId.value = id
    sessionStorage.setItem('bandId', id)
    personalMode.value = false
    sessionStorage.removeItem('personalMode')
  }

  // Modo práctica personal: sin banda activa, espacio del músico.
  function enterPersonal() {
    currentBandId.value = null
    sessionStorage.removeItem('bandId')
    personalMode.value = true
    sessionStorage.setItem('personalMode', '1')
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

  // "Cambiar de banda": vuelve al menú principal.
  function changeRole() {
    currentBandId.value = null
    sessionStorage.removeItem('bandId')
    personalMode.value = false
    sessionStorage.removeItem('personalMode')
  }

  // Limpiar todo al cerrar sesión.
  function reset() {
    bands.value = []
    ready.value = false
    changeRole()
  }

  return {
    bands, currentBandId, currentBand, ready, pendingInvite, inviteResult,
    personalMode, enterPersonal,
    myRole, isOwner, isLeader, isCantante,
    init, createBand, updateBandName, updateBandImage, deleteBand,
    selectBand, changeRole, reset,
    loadMembers, updateMemberRole, removeMember,
    loadInvites, createInvite, revokeInvite, inviteLink,
  }
})
