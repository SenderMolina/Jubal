import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '../supabase'
import { useBandStore } from './band'

// Sincroniza una tabla con el estado local, ACOTADO a la banda activa:
// upsert de las filas presentes y borrado de las que ya no existen en esa banda.
async function syncTable(table, bandId, rows) {
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows)
    if (error) { console.error(`Error guardando ${table}:`, error); return }
  }
  const ids = rows.map(r => r.id)
  let del = supabase.from(table).delete().eq('band_id', bandId)
  if (ids.length) del = del.not('id', 'in', `(${ids.join(',')})`)
  const { error } = await del
  if (error) console.error(`Error limpiando ${table}:`, error)
}

export const useAppStore = defineStore('app', () => {
  const songs       = ref([])
  const activities  = ref([])
  const songTypes   = ref([])
  const repertoires = ref([])

  const band = useBandStore()
  const bid = () => band.currentBandId
  let channels = []

  // ---------- Cargas (filtradas por banda) ----------
  async function loadSongs() {
    const b = bid(); if (!b) { songs.value = []; return }
    const { data } = await supabase.from('songs').select('*').eq('band_id', b).order('id')
    songs.value = data || []
  }

  async function loadSongTypes() {
    const b = bid(); if (!b) { songTypes.value = []; return }
    const { data } = await supabase.from('song_types').select('*').eq('band_id', b).order('id')
    songTypes.value = data || []
  }

  async function loadActivities() {
    const b = bid(); if (!b) { activities.value = []; return }
    const { data } = await supabase.from('activities').select('*').eq('band_id', b).order('id')
    activities.value = (data || []).map(a => ({ ...a, tiempos: a.tiempos || [] }))
  }

  async function loadRepertoires() {
    const b = bid(); if (!b) { repertoires.value = []; return }
    const { data: reps } = await supabase.from('repertoires').select('*').eq('band_id', b).order('id')
    const repIds = (reps || []).map(r => r.id)
    let links = []
    if (repIds.length) {
      const { data } = await supabase
        .from('repertoire_songs').select('*').in('repertoire_id', repIds).order('position')
      links = data || []
    }
    repertoires.value = (reps || []).map(r => ({
      ...r,
      songs: links
        .filter(l => l.repertoire_id === r.id)
        .sort((a, b) => a.position - b.position)
        .map(l => l.song_id),
    }))
  }

  function loadAll() { loadSongs(); loadSongTypes(); loadActivities(); loadRepertoires() }

  // ---------- Guardados (incluyen band_id) ----------
  function saveSongs() {
    const b = bid()
    return syncTable('songs', b, songs.value.map(s => ({
      id: s.id, title: s.title, author: s.author,
      key: s.key, bpm: s.bpm ?? null, lyrics: s.lyrics ?? '', band_id: b,
    })))
  }

  function saveSongTypes() {
    const b = bid()
    return syncTable('song_types', b, songTypes.value.map(t => ({ id: t.id, name: t.name, band_id: b })))
  }

  function saveActivities() {
    const b = bid()
    return syncTable('activities', b, activities.value.map(a => ({
      id: a.id, title: a.title, date: a.date ?? null, time: a.time ?? null,
      description: a.description ?? '', tiempos: a.tiempos || [], band_id: b,
    })))
  }

  async function saveRepertoires() {
    const b = bid()
    await syncTable('repertoires', b, repertoires.value.map(r => ({ id: r.id, name: r.name, band_id: b })))
    // Reconstruir la tabla puente solo para los repertorios de esta banda.
    const repIds = repertoires.value.map(r => r.id)
    if (repIds.length) {
      await supabase.from('repertoire_songs').delete().in('repertoire_id', repIds)
    }
    const links = repertoires.value.flatMap(r =>
      (r.songs || []).map((songId, i) => ({ repertoire_id: r.id, song_id: songId, position: i }))
    )
    if (links.length) {
      const { error } = await supabase.from('repertoire_songs').insert(links)
      if (error) console.error('Error guardando repertorios:', error)
    }
  }

  // ---------- Realtime (re-suscrito por banda) ----------
  function unsubscribe() {
    channels.forEach(c => supabase.removeChannel(c))
    channels = []
  }

  function subscribe() {
    unsubscribe()
    const b = bid(); if (!b) return
    const filter = `band_id=eq.${b}`
    channels.push(
      supabase.channel(`songs-${b}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'songs', filter }, loadSongs).subscribe(),
      supabase.channel(`song_types-${b}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'song_types', filter }, loadSongTypes).subscribe(),
      supabase.channel(`activities-${b}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter }, loadActivities).subscribe(),
      supabase.channel(`repertoires-${b}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'repertoires', filter }, loadRepertoires)
        // repertoire_songs no tiene band_id; RLS limita la visibilidad y recargamos.
        .on('postgres_changes', { event: '*', schema: 'public', table: 'repertoire_songs' }, loadRepertoires)
        .subscribe(),
    )
  }

  // Al cambiar de banda (o entrar a una), recargar y re-suscribir.
  watch(() => band.currentBandId, () => { loadAll(); subscribe() }, { immediate: true })

  return { songs, activities, songTypes, repertoires, saveSongs, saveActivities, saveSongTypes, saveRepertoires }
})
