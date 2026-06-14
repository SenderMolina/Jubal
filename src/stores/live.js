import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { supabase } from '../supabase'
import { useBandStore } from './band'
import { useAuthStore } from './auth'

// Sesión en vivo por secciones. El controlador (líder) escribe los índices
// (canción/sección) en la tabla; los demás los siguen vía Realtime.
export const useLiveStore = defineStore('live', () => {
  const band = useBandStore()
  const auth = useAuthStore()

  const session = ref(null)   // fila live_sessions activa, o null
  let channel = null

  const isActive     = computed(() => !!session.value)
  const isController = computed(() => session.value?.controller_id === auth.user?.id)
  const currentSongId = computed(() =>
    session.value?.song_ids?.[session.value.current_song_index] ?? null)

  async function loadActive() {
    const b = band.currentBandId
    if (!b) { session.value = null; return }
    const { data } = await supabase
      .from('live_sessions').select('*')
      .eq('band_id', b).eq('is_active', true).maybeSingle()
    session.value = data || null
  }

  function subscribe() {
    unsubscribe()
    const b = band.currentBandId
    if (!b) return
    channel = supabase.channel(`live-${b}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions', filter: `band_id=eq.${b}` },
        loadActive)
      .subscribe()
    loadActive()
  }
  function unsubscribe() { if (channel) { supabase.removeChannel(channel); channel = null } }

  // ---------- Controlador ----------
  async function start({ source, activityId = null, tiempoId = null, songIds }) {
    const b = band.currentBandId
    await supabase.from('live_sessions').update({ is_active: false })
      .eq('band_id', b).eq('is_active', true)            // cerrar previa si la hubiera
    const { data, error } = await supabase.from('live_sessions').insert({
      band_id: b, source, activity_id: activityId, tiempo_id: tiempoId,
      song_ids: songIds, current_song_index: 0, current_section_index: 0,
      is_playing: true, controller_id: auth.user.id, is_active: true,
    }).select().single()
    if (error) throw error
    session.value = data
    return data
  }

  async function patch(fields) {
    if (!session.value) return
    const { data } = await supabase.from('live_sessions')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', session.value.id).select().single()
    if (data) session.value = data
  }
  const setSong    = (i) => patch({ current_song_index: i, current_section_index: 0 })
  const setSection = (i) => patch({ current_section_index: i })
  const togglePlay = ()  => patch({ is_playing: !session.value?.is_playing })

  async function end() {
    if (session.value) {
      await supabase.from('live_sessions')
        .update({ is_active: false, is_playing: false }).eq('id', session.value.id)
    }
    session.value = null
  }

  watch(() => band.currentBandId, subscribe, { immediate: true })

  return {
    session, isActive, isController, currentSongId,
    start, setSong, setSection, togglePlay, end, loadActive,
  }
})
