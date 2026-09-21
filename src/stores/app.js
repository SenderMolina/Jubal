import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '../supabase'
import { useBandStore } from './band'

// Sincroniza una tabla con el estado local, ACOTADO al ámbito activo (banda o
// espacio personal): upsert de las filas presentes y borrado de las que ya no
// existen en ese ámbito.
async function syncTable(table, bandId, rows) {
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows)
    if (error) { console.error(`Error guardando ${table}:`, error); return }
  }
  const ids = rows.map(r => r.id)
  // En personal (bandId null) RLS ya acota el delete a las filas del usuario.
  let del = supabase.from(table).delete()
  del = bandId ? del.eq('band_id', bandId) : del.is('band_id', null)
  if (ids.length) del = del.not('id', 'in', `(${ids.join(',')})`)
  const { error } = await del
  if (error) console.error(`Error limpiando ${table}:`, error)
}

export const useAppStore = defineStore('app', () => {
  const songs       = ref([])
  const activities  = ref([])
  const songTypes   = ref([])
  const repertoires = ref([])
  const readiness   = ref([])
  const assignments = ref([])

  const band = useBandStore()
  const bid = () => band.currentBandId
  // ¿Hay un ámbito activo? Banda, o espacio personal (band_id null + RLS).
  const scoped = () => band.currentBandId || band.personalMode
  // Acota una consulta al ámbito activo.
  const inScope = (q) => band.currentBandId ? q.eq('band_id', band.currentBandId) : q.is('band_id', null)
  let channels = []
  let repertoireReloadTimer = null
  let repertoireWriteCount = 0
  let repertoireStateVersion = 0

  function scheduleRepertoireReload() {
    clearTimeout(repertoireReloadTimer)
    repertoireReloadTimer = setTimeout(() => {
      if (repertoireWriteCount) {
        scheduleRepertoireReload()
        return
      }
      loadRepertoires()
    }, 250)
  }

  function beginRepertoireWrite() {
    repertoireWriteCount += 1
    repertoireStateVersion += 1
    clearTimeout(repertoireReloadTimer)
    repertoireReloadTimer = null
  }

  function endRepertoireWrite() {
    repertoireWriteCount = Math.max(0, repertoireWriteCount - 1)
    if (!repertoireWriteCount) scheduleRepertoireReload()
  }

  // ---------- Cargas (filtradas por ámbito) ----------
  async function loadSongs() {
    if (!scoped()) { songs.value = []; return }
    const requestedScope = band.currentBandId || '__personal__'
    const { data, error } = await inScope(supabase.from('songs').select('*')).order('id')
    const currentScope = band.currentBandId || '__personal__'
    if (requestedScope !== currentScope) return
    if (error) { console.error('Error cargando canciones:', error); return }
    songs.value = data || []
  }

  async function getSongsByIds(songIds) {
    const ids = [...new Set((songIds || []).filter(id => id !== null && id !== undefined))]
    if (!ids.length) return []
    const { data, error } = await supabase.from('songs').select('*').in('id', ids)
    if (error) { console.error('Error cargando canciones del repertorio:', error); return [] }
    return data || []
  }

  async function loadSongTypes() {
    if (!scoped()) { songTypes.value = []; return }
    const { data } = await inScope(supabase.from('song_types').select('*')).order('id')
    songTypes.value = data || []
  }

  async function loadActivities() {
    const b = bid(); if (!b) { activities.value = []; return }  // solo banda
    const { data, error } = await supabase.from('activities').select('*').eq('band_id', b).order('date').order('time')
    if (bid() !== b) return
    if (error) { console.error('Error cargando actividades:', error); return }
    activities.value = (data || []).map(a => ({ ...a, tiempos: a.tiempos || [] }))
  }

  async function loadRepertoires() {
    if (!scoped()) { repertoires.value = []; return }
    const requestedVersion = repertoireStateVersion
    const requestedScope = band.currentBandId || '__personal__'
    const { data: reps } = await inScope(supabase.from('repertoires').select('*')).order('id')
    const repIds = (reps || []).map(r => r.id)
    let links = []
    if (repIds.length) {
      const { data } = await supabase
        .from('repertoire_songs').select('*').in('repertoire_id', repIds).order('position')
      links = data || []
    }
    const currentScope = band.currentBandId || '__personal__'
    if (requestedVersion !== repertoireStateVersion || requestedScope !== currentScope) return
    repertoires.value = (reps || []).map(r => ({
      ...r,
      songs: links
        .filter(l => l.repertoire_id === r.id)
        .sort((a, b) => a.position - b.position)
        .map(l => l.song_id),
    }))
  }

  async function loadReadiness() {
    const b = bid()
    if (!b) { readiness.value = []; return }
    const { data, error } = await supabase
      .from('song_readiness')
      .select('*, profile:profiles(display_name,avatar_url)')
      .eq('band_id', b)
      .order('updated_at', { ascending: false })
    if (error) { console.error('Error cargando preparación:', error); return }
    readiness.value = data || []
  }

  async function loadAssignments() {
    const b = bid()
    if (!b) { assignments.value = []; return }
    const { data, error } = await supabase
      .from('band_song_assignments')
      .select('*, profile:profiles!band_song_assignments_user_id_fkey(display_name,avatar_url)')
      .eq('band_id', b)
      .order('created_at')
    if (error) { console.error('Error cargando asignaciones:', error); return }
    assignments.value = data || []
  }

  async function addSongAssignment({ song_id, user_id, responsibility, notes = null }) {
    const { data, error } = await supabase.from('band_song_assignments').insert({
      band_id: bid(), song_id, user_id, responsibility, notes,
    }).select('*, profile:profiles!band_song_assignments_user_id_fkey(display_name,avatar_url)').single()
    if (error) throw error
    assignments.value.push(data)
    return data
  }

  async function removeSongAssignment(id) {
    const { error } = await supabase.from('band_song_assignments').delete().eq('id', id)
    if (error) throw error
    assignments.value = assignments.value.filter(item => item.id !== id)
  }

  function loadAll() { loadSongs(); loadSongTypes(); loadActivities(); loadRepertoires(); loadReadiness(); loadAssignments() }

  // ---------- Guardados (incluyen band_id) ----------
  function saveSongs() {
    const b = bid()
    return syncTable('songs', b, songs.value.map(s => ({
      id: s.id, title: s.title, author: s.author,
      key: s.key, bpm: s.bpm ?? null, duration: s.duration ?? null,
      lyrics: s.lyrics ?? '', band_id: b,
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

  async function getActivity(id) {
    const b = bid()
    if (!b) throw new Error('Selecciona una banda para ver esta actividad.')
    const { data, error } = await supabase.from('activities').select('*')
      .eq('id', id).eq('band_id', b).maybeSingle()
    if (error) throw error
    return data
  }

  // El formulario guarda solo esta actividad y conserva su repertorio al editar.
  async function saveActivity(fields, id = null) {
    const b = bid()
    if (!b || !band.isLeader) throw new Error('Solo el líder puede guardar actividades.')
    const values = {
      title: fields.title.trim(), date: fields.date,
      time: fields.time || null, description: fields.description.trim(),
    }
    const query = id === null
      ? supabase.from('activities').insert({ id: Date.now(), ...values, band_id: b, tiempos: [] })
      : supabase.from('activities').update(values).eq('id', id).eq('band_id', b)
    const { data, error } = await query.select('*').single()
    if (error) throw error
    const activity = { ...data, tiempos: data.tiempos || [] }
    if (bid() === b) {
      const index = activities.value.findIndex(item => item.id === activity.id)
      if (index === -1) activities.value.push(activity)
      else activities.value[index] = activity
    }
    return activity
  }

  async function saveRepertoires() {
    const b = bid()
    // Capturar el estado antes del primer await evita que una recarga realtime
    // cambie las canciones que se están guardando durante la operación.
    const snapshot = repertoires.value.map(repertoire => ({
      id: repertoire.id,
      name: repertoire.name,
      songs: [...(repertoire.songs || [])],
    }))
    beginRepertoireWrite()
    try {
      await syncTable('repertoires', b, snapshot.map(r => ({ id: r.id, name: r.name, band_id: b })))
      const results = await Promise.all(snapshot.map(repertoire =>
        supabase.rpc('replace_repertoire_songs', {
          p_repertoire_id: repertoire.id,
          p_song_ids: repertoire.songs,
        })))
      const failed = results.find(result => result.error)
      if (failed) throw failed.error
    } finally {
      endRepertoireWrite()
    }
  }

  async function saveRepertoireSongs(repertoireId, songIds) {
    beginRepertoireWrite()
    try {
      const { error } = await supabase.rpc('replace_repertoire_songs', {
        p_repertoire_id: repertoireId,
        p_song_ids: [...songIds],
      })
      if (error) throw error
    } finally {
      endRepertoireWrite()
    }
  }

  // ---------- Realtime (solo en banda: en personal nadie más escribe) ----------
  function unsubscribe() {
    channels.forEach(c => supabase.removeChannel(c))
    channels = []
    clearTimeout(repertoireReloadTimer)
    repertoireReloadTimer = null
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'repertoires', filter }, scheduleRepertoireReload)
        // repertoire_songs no tiene band_id; RLS limita la visibilidad y recargamos.
        .on('postgres_changes', { event: '*', schema: 'public', table: 'repertoire_songs' }, scheduleRepertoireReload)
        .subscribe(),
      supabase.channel(`readiness-${b}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'song_readiness', filter }, loadReadiness)
        .subscribe(),
      supabase.channel(`assignments-${b}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'band_song_assignments', filter }, loadAssignments)
        .subscribe(),
    )
  }

  // Al cambiar de ámbito (banda o espacio personal), recargar y re-suscribir.
  watch(() => [band.currentBandId, band.personalMode], () => { loadAll(); subscribe() }, { immediate: true })

  return {
    songs, activities, songTypes, repertoires, readiness, assignments,
    saveSongs, saveActivities, saveActivity, getActivity, saveSongTypes, saveRepertoires, saveRepertoireSongs, loadSongs, getSongsByIds, loadActivities, loadRepertoires,
    addSongAssignment, removeSongAssignment,
  }
})
