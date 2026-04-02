import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../firebase'
import { ref as dbRef, onValue, set } from 'firebase/database'

const defaultSongs = [
  { id: 1, title: "Cuán Grande es Él", author: "Stuart K. Hine", key: "G", bpm: 68, lyrics: `[Intro]\nG  C  G  D\n\n[Verso 1]\nG                    C\nSeñor mi Dios, al contemplar los cielos\nG               D\nEl firmamento y las estrellas mil\nG                    C\nAl oír Tu voz en los poderosos truenos\nG         D       G\nY ver brillar el sol en su cenit\n\n[Coro]\nG       C      G\nMi alma canta a Ti\n          D\nSeñor mi Dios\nG       C       G    D    G\n¡Cuán grande es Él! ¡Cuán grande es Él!` },
  { id: 2, title: "Santo, Santo, Santo", author: "Reginald Heber", key: "D", bpm: 72, lyrics: `[Intro]\nD  A  Bm  G  D\n\n[Verso 1]\nD          A        D\nSanto, Santo, Santo\nD          G        A\nSeñor omnipotente\nD         A          D    G\nSiempre el labio mío loores te dará\nD        A        D\nSanto, Santo, Santo\nG          D       A    D\nTe adoro reverente\n\n[Coro]\nG         D\nSanto, Santo, Santo\nA              D\nEs el Señor` },
  { id: 3, title: "Majestuoso", author: "Danilo Montero", key: "E", bpm: 80, lyrics: `[Intro]\nE  B  C#m  A  (x2)\n\n[Verso 1]\nE              B\nMajestuoso y poderoso\nC#m              A\nDigno de honor y gloria eres Tú\nE              B\nRey de reyes, Señor de señores\nC#m          A      B\nTodo el cielo proclama Tu valor\n\n[Coro]\nE         B\n¡Majestuoso!\nC#m         A\n¡Glorioso!\nE          B\n¡Poderoso!\nC#m    A    B\n¡Rey!` },
  { id: 4, title: "Tu Fidelidad", author: "Marcos Witt", key: "C", bpm: 64, lyrics: `[Intro]\nC  G  Am  F  (x2)\n\n[Verso 1]\nC           G\nGrande es Tu fidelidad\nAm            F\nDios mi padre, no hay sombra\nC           G\nDe variación en Ti\nAm      F\nSiempre el mismo serás\n\n[Coro]\nC         G         Am\nGrande es Tu fidelidad\nF          C\nGrande es Tu fidelidad\nG              Am    F\nCada mañana se renueva\nC  G  Am  F\nTu misericordia en mí` },
  { id: 5, title: "Eres Todo Poderoso", author: "Generación 12", key: "A", bpm: 88, lyrics: `[Intro]\nA  E  F#m  D  (x2)\n\n[Verso 1]\nA                E\nEres todopoderoso, eres asombroso\nF#m                D\nDigno de alabanza, digno de honor\nA                E\nTu nombre es eterno, Tu nombre es glorioso\nF#m             D        E\nPor siempre y para siempre, Señor\n\n[Coro]\nA       E\n¡Aleluya! ¡Aleluya!\nF#m      D\nAl Rey adoramos\nA       E\n¡Aleluya! ¡Aleluya!\nF#m    D   E   A\nSu nombre alabamos` },
]

export const useAppStore = defineStore('app', () => {
  const songs       = ref([])
  const activities  = ref([])
  const songTypes   = ref([])
  const repertoires = ref([])
  let firebaseReady = false

  onValue(dbRef(db, 'songs'), snap => {
    const data = snap.val()
    if (data) {
      songs.value = Array.isArray(data) ? data.filter(Boolean) : Object.values(data)
    } else if (!firebaseReady) {
      songs.value = defaultSongs
      set(dbRef(db, 'songs'), defaultSongs)
    } else {
      songs.value = []
    }
    firebaseReady = true
  })

  onValue(dbRef(db, 'activities'), snap => {
    const data = snap.val()
    activities.value = data
      ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data))
      : []
  })

  onValue(dbRef(db, 'songTypes'), snap => {
    const data = snap.val()
    songTypes.value = data
      ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data))
      : []
  })

  onValue(dbRef(db, 'repertoires'), snap => {
    const data = snap.val()
    repertoires.value = data
      ? (Array.isArray(data) ? data.filter(Boolean) : Object.values(data))
      : []
  })

  function saveSongs()       { set(dbRef(db, 'songs'), JSON.parse(JSON.stringify(songs.value))) }
  function saveActivities()  { set(dbRef(db, 'activities'), activities.value.length ? JSON.parse(JSON.stringify(activities.value)) : null) }
  function saveSongTypes()   { set(dbRef(db, 'songTypes'), songTypes.value.length ? JSON.parse(JSON.stringify(songTypes.value)) : null) }
  function saveRepertoires() {
    const clean = repertoires.value.map(r => ({
      ...JSON.parse(JSON.stringify(r)),
      songs: r.songs && r.songs.length ? r.songs : null,
    }))
    set(dbRef(db, 'repertoires'), clean.length ? clean : null)
      .catch(err => console.error('Error guardando repertorios:', err))
  }

  return { songs, activities, songTypes, repertoires, saveSongs, saveActivities, saveSongTypes, saveRepertoires }
})
