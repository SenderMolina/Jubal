import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '../supabase'
import { useBandStore } from './band'
import { clearLoadError, reportLoadError } from '../composables/useLoadErrors'

// Columnas editables de una canción (el resto las pone la base o el ámbito).
const SONG_FIELDS = ['title', 'author', 'key', 'bpm', 'duration', 'lyrics', 'types']
const pick = (fields, keys) => Object.fromEntries(keys.filter(k => k in fields).map(k => [k, fields[k]]))

export const useAppStore = defineStore('app', () => {
  const songs       = ref([])
  const activities  = ref([])
  const songTypes   = ref([])
  const repertoires = ref([])

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
    if (error) { songs.value = []; reportLoadError('canciones', error, loadSongs); return }
    clearLoadError('canciones')
    songs.value = data || []
  }

  async function getSongsByIds(songIds) {
    const ids = [...new Set((songIds || []).filter(id => id !== null && id !== undefined))]
    if (!ids.length) return []
    const { data, error } = await supabase.from('songs').select('*').in('id', ids)
    if (error) throw error
    return data || []
  }

  async function loadSongTypes() {
    if (!scoped()) { songTypes.value = []; return }
    const { data, error } = await inScope(supabase.from('song_types').select('*')).order('id')
    if (error) { songTypes.value = []; reportLoadError('tipos de canción', error, loadSongTypes); return }
    clearLoadError('tipos de canción')
    songTypes.value = data || []
  }

  async function loadActivities() {
    const b = bid(); if (!b) { activities.value = []; return }  // solo banda
    const { data, error } = await supabase.from('activities').select('*').eq('band_id', b).order('date').order('time')
    if (bid() !== b) return
    if (error) { activities.value = []; reportLoadError('actividades', error, loadActivities); return }
    clearLoadError('actividades')
    activities.value = (data || []).map(a => ({ ...a, tiempos: a.tiempos || [] }))
  }

  async function loadRepertoires() {
    if (!scoped()) { repertoires.value = []; return }
    const requestedVersion = repertoireStateVersion
    const requestedScope = band.currentBandId || '__personal__'
    const { data: reps, error } = await inScope(supabase.from('repertoires').select('*')).order('id')
    const repIds = (reps || []).map(r => r.id)
    let links = []
    let linksError = null
    if (!error && repIds.length) {
      const result = await supabase
        .from('repertoire_songs').select('*').in('repertoire_id', repIds).order('position')
      links = result.data || []
      linksError = result.error
    }
    const currentScope = band.currentBandId || '__personal__'
    if (requestedVersion !== repertoireStateVersion || requestedScope !== currentScope) return
    if (error || linksError) { repertoires.value = []; reportLoadError('repertorios', error || linksError, loadRepertoires); return }
    clearLoadError('repertorios')
    repertoires.value = (reps || []).map(r => ({
      ...r,
      songs: links
        .filter(l => l.repertoire_id === r.id)
        .sort((a, b) => a.position - b.position)
        .map(l => l.song_id),
    }))
  }

  function loadAll() { loadSongs(); loadSongTypes(); loadActivities(); loadRepertoires() }

  // ---------- Escrituras: un registro a la vez; los errores se lanzan ----------
  // Los ids son bigint generados en el cliente (Date.now()), como en el resto
  // del esquema heredado de Firebase.
  async function insertRow(table, values) {
    const { data, error } = await supabase.from(table)
      .insert({ id: Date.now(), ...values, band_id: bid() || null })
      .select('*').single()
    if (error) throw error
    return data
  }

  async function updateRow(table, id, values) {
    const { data, error } = await supabase.from(table).update(values).eq('id', id).select('*').single()
    if (error) throw error
    return data
  }

  async function deleteRow(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
  }

  const replaceIn = (list, row) => list.map(item => item.id === row.id ? { ...item, ...row } : item)

  async function createSong(fields) {
    const song = await insertRow('songs', pick(fields, SONG_FIELDS))
    songs.value = [...songs.value, song]
    return song
  }

  async function updateSong(id, fields) {
    const song = await updateRow('songs', id, pick(fields, SONG_FIELDS))
    songs.value = replaceIn(songs.value, song)
    return song
  }

  async function deleteSong(id) {
    await deleteRow('songs', id)
    songs.value = songs.value.filter(song => song.id !== id)
    // repertoire_songs borra en cascada; reflejarlo sin esperar al realtime.
    repertoires.value = repertoires.value.map(repertoire => ({
      ...repertoire, songs: (repertoire.songs || []).filter(songId => songId !== id),
    }))
  }

  async function createSongType(name) {
    const type = await insertRow('song_types', { name })
    songTypes.value = [...songTypes.value, type]
    return type
  }

  async function deleteSongType(id) {
    await deleteRow('song_types', id)
    songTypes.value = songTypes.value.filter(type => type.id !== id)
  }

  async function updateActivityTiempos(id, tiempos) {
    const activity = await updateRow('activities', id, { tiempos })
    activities.value = replaceIn(activities.value, { ...activity, tiempos: activity.tiempos || [] })
    return activity
  }

  async function deleteActivity(id) {
    await deleteRow('activities', id)
    activities.value = activities.value.filter(activity => activity.id !== id)
  }

  async function createRepertoire(name) {
    const repertoire = { ...(await insertRow('repertoires', { name })), songs: [] }
    repertoires.value = [...repertoires.value, repertoire]
    return repertoire
  }

  async function renameRepertoire(id, name) {
    const repertoire = await updateRow('repertoires', id, { name })
    repertoires.value = replaceIn(repertoires.value, repertoire)
    return repertoire
  }

  async function deleteRepertoire(id) {
    await deleteRow('repertoires', id)
    repertoires.value = repertoires.value.filter(repertoire => repertoire.id !== id)
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
    if (!b || !band.can.manageActivities) throw new Error('Solo el líder puede guardar actividades.')
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
    )
  }

  // Al cambiar de ámbito (banda o espacio personal), recargar y re-suscribir.
  watch(() => [band.currentBandId, band.personalMode], () => { loadAll(); subscribe() }, { immediate: true })

  return {
    songs, activities, songTypes, repertoires,
    loadSongs, getSongsByIds, loadActivities, loadRepertoires,
    createSong, updateSong, deleteSong, createSongType, deleteSongType,
    getActivity, saveActivity, updateActivityTiempos, deleteActivity,
    createRepertoire, renameRepertoire, deleteRepertoire, saveRepertoireSongs,
  }
})
