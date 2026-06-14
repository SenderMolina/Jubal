import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../supabase'
import { useBandStore } from './band'
import { useAuthStore } from './auth'

// POC de sesión en vivo (solo Broadcast, sin tabla todavía).
// El líder controla canción + scroll; los seguidores se sincronizan.
export const useLiveStore = defineStore('live', () => {
  const band = useBandStore()
  const auth = useAuthStore()

  // Estado compartido: qué canción y posición de scroll (proporción 0–1).
  const state     = ref({ songId: null, ratio: 0, controllerId: null })
  const following = ref(true)   // el seguidor puede soltarse (scroll libre)
  const connected = ref(false)

  let channel = null
  let heartbeat = null

  const isController = computed(() => band.isLeader)

  function connect() {
    disconnect()
    const b = band.currentBandId
    if (!b) return
    channel = supabase.channel(`live-${b}`, { config: { broadcast: { self: false } } })

    channel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (isController.value) return            // el líder no se sigue a sí mismo
      if (following.value) state.value = payload // sigue canción + scroll
      else state.value.songId = payload.songId   // suelto: sigue solo la canción
    })

    // Un seguidor que entra pide el estado actual; el líder responde.
    channel.on('broadcast', { event: 'hello' }, () => { if (isController.value) push() })

    channel.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      connected.value = true
      if (isController.value) heartbeat = setInterval(push, 2000) // late-join
      else channel.send({ type: 'broadcast', event: 'hello', payload: {} })
    })
  }

  function disconnect() {
    if (heartbeat) { clearInterval(heartbeat); heartbeat = null }
    if (channel) { supabase.removeChannel(channel); channel = null }
    connected.value = false
  }

  // ---- Controlador ----
  function setSong(id) { state.value = { ...state.value, songId: id, ratio: 0 }; push() }
  function setRatio(r) { state.value.ratio = r; push() }
  function push() {
    if (!channel || !isController.value) return
    channel.send({ type: 'broadcast', event: 'state', payload: {
      songId: state.value.songId, ratio: state.value.ratio, controllerId: auth.user?.id,
    }})
  }

  // ---- Seguidor ----
  function detach()   { following.value = false }
  function reattach() { following.value = true }

  return { state, following, connected, isController, connect, disconnect, setSong, setRatio, detach, reattach }
})
