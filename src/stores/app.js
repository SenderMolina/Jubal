import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../supabase'

const defaultSongs = [
  { id: 1, title: "Cuán Grande es Él", author: "Stuart K. Hine", key: "G", bpm: 68, lyrics: `[Intro]\nG  C  G  D\n\n[Verso 1]\nG                    C\nSeñor mi Dios, al contemplar los cielos\nG               D\nEl firmamento y las estrellas mil\nG                    C\nAl oír Tu voz en los poderosos truenos\nG         D       G\nY ver brillar el sol en su cenit\n\n[Coro]\nG       C      G\nMi alma canta a Ti\n          D\nSeñor mi Dios\nG       C       G    D    G\n¡Cuán grande es Él! ¡Cuán grande es Él!` },
  { id: 2, title: "Santo, Santo, Santo", author: "Reginald Heber", key: "D", bpm: 72, lyrics: `[Intro]\nD  A  Bm  G  D\n\n[Verso 1]\nD          A        D\nSanto, Santo, Santo\nD          G        A\nSeñor omnipotente\nD         A          D    G\nSiempre el labio mío loores te dará\nD        A        D\nSanto, Santo, Santo\nG          D       A    D\nTe adoro reverente\n\n[Coro]\nG         D\nSanto, Santo, Santo\nA              D\nEs el Señor` },
  { id: 3, title: "Majestuoso", author: "Danilo Montero", key: "E", bpm: 80, lyrics: `[Intro]\nE  B  C#m  A  (x2)\n\n[Verso 1]\nE              B\nMajestuoso y poderoso\nC#m              A\nDigno de honor y gloria eres Tú\nE              B\nRey de reyes, Señor de señores\nC#m          A      B\nTodo el cielo proclama Tu valor\n\n[Coro]\nE         B\n¡Majestuoso!\nC#m         A\n¡Glorioso!\nE          B\n¡Poderoso!\nC#m    A    B\n¡Rey!` },
  { id: 4, title: "Tu Fidelidad", author: "Marcos Witt", key: "C", bpm: 64, lyrics: `[Intro]\nC  G  Am  F  (x2)\n\n[Verso 1]\nC           G\nGrande es Tu fidelidad\nAm            F\nDios mi padre, no hay sombra\nC           G\nDe variación en Ti\nAm      F\nSiempre el mismo serás\n\n[Coro]\nC         G         Am\nGrande es Tu fidelidad\nF          C\nGrande es Tu fidelidad\nG              Am    F\nCada mañana se renueva\nC  G  Am  F\nTu misericordia en mí` },
  { id: 5, title: "Eres Todo Poderoso", author: "Generación 12", key: "A", bpm: 88, lyrics: `[Intro]\nA  E  F#m  D  (x2)\n\n[Verso 1]\nA                E\nEres todopoderoso, eres asombroso\nF#m                D\nDigno de alabanza, digno de honor\nA                E\nTu nombre es eterno, Tu nombre es glorioso\nF#m             D        E\nPor siempre y para siempre, Señor\n\n[Coro]\nA       E\n¡Aleluya! ¡Aleluya!\nF#m      D\nAl Rey adoramos\nA       E\n¡Aleluya! ¡Aleluya!\nF#m    D   E   A\nSu nombre alabamos` },
]

// Sincroniza una tabla con el estado local: upsert de las filas presentes y
// borrado de las que ya no existen. Reemplaza el `set()` de Firebase pero por filas.
async function syncTable(table, rows) {
  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows)
    if (error) { console.error(`Error guardando ${table}:`, error); return }
  }
  const ids = rows.map(r => r.id)
  const del = supabase.from(table).delete()
  const { error } = ids.length
    ? await del.not('id', 'in', `(${ids.join(',')})`)
    : await del.gte('id', 0)            // tabla vacía → borrar todo
  if (error) console.error(`Error limpiando ${table}:`, error)
}

export const useAppStore = defineStore('app', () => {
  const songs       = ref([])
  const activities  = ref([])
  const songTypes   = ref([])
  const repertoires = ref([])
  let seeded = false

  // ---------- Cargas ----------
  async function loadSongs() {
    const { data } = await supabase.from('songs').select('*').order('id')
    if (data && data.length) {
      songs.value = data
    } else if (!seeded) {
      songs.value = defaultSongs
      await supabase.from('songs').upsert(defaultSongs)
    } else {
      songs.value = []
    }
    seeded = true
  }

  async function loadSongTypes() {
    const { data } = await supabase.from('song_types').select('*').order('id')
    songTypes.value = data || []
  }

  async function loadActivities() {
    const { data } = await supabase.from('activities').select('*').order('id')
    activities.value = (data || []).map(a => ({ ...a, tiempos: a.tiempos || [] }))
  }

  async function loadRepertoires() {
    const [{ data: reps }, { data: links }] = await Promise.all([
      supabase.from('repertoires').select('*').order('id'),
      supabase.from('repertoire_songs').select('*').order('position'),
    ])
    repertoires.value = (reps || []).map(r => ({
      ...r,
      songs: (links || [])
        .filter(l => l.repertoire_id === r.id)
        .sort((a, b) => a.position - b.position)
        .map(l => l.song_id),
    }))
  }

  // ---------- Guardados ----------
  function saveSongs() {
    return syncTable('songs', songs.value.map(s => ({
      id: s.id, title: s.title, author: s.author,
      key: s.key, bpm: s.bpm ?? null, lyrics: s.lyrics ?? '',
    })))
  }

  function saveSongTypes() {
    return syncTable('song_types', songTypes.value.map(t => ({ id: t.id, name: t.name })))
  }

  function saveActivities() {
    return syncTable('activities', activities.value.map(a => ({
      id: a.id, title: a.title, date: a.date ?? null, time: a.time ?? null,
      description: a.description ?? '', tiempos: a.tiempos || [],
    })))
  }

  async function saveRepertoires() {
    await syncTable('repertoires', repertoires.value.map(r => ({ id: r.id, name: r.name })))
    // Reconstruir la tabla puente con el orden actual.
    const links = repertoires.value.flatMap(r =>
      (r.songs || []).map((songId, i) => ({
        repertoire_id: r.id, song_id: songId, position: i,
      }))
    )
    const repIds = repertoires.value.map(r => r.id)
    const clear = supabase.from('repertoire_songs').delete()
    await (repIds.length ? clear.not('repertoire_id', 'in', `(${repIds.join(',')})`) : clear.gte('repertoire_id', 0))
    for (const r of repertoires.value) {
      await supabase.from('repertoire_songs').delete().eq('repertoire_id', r.id)
    }
    if (links.length) {
      const { error } = await supabase.from('repertoire_songs').insert(links)
      if (error) console.error('Error guardando repertorios:', error)
    }
  }

  // ---------- Realtime ----------
  // Cualquier cambio remoto refresca el recurso afectado (reemplaza onValue).
  loadSongs(); loadSongTypes(); loadActivities(); loadRepertoires()

  supabase.channel('songs-ch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, loadSongs)
    .subscribe()
  supabase.channel('song_types-ch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'song_types' }, loadSongTypes)
    .subscribe()
  supabase.channel('activities-ch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, loadActivities)
    .subscribe()
  supabase.channel('repertoires-ch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'repertoires' }, loadRepertoires)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'repertoire_songs' }, loadRepertoires)
    .subscribe()

  return { songs, activities, songTypes, repertoires, saveSongs, saveActivities, saveSongTypes, saveRepertoires }
})
