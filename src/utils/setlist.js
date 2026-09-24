// Canciones de un tiempo que siguen existiendo: los tiempos guardan ids y una
// canción borrada queda ahí hasta que se edite la actividad.
export function songsInTiempo(tiempo, songs) {
  const byId = new Map(songs.map(song => [song.id, song]))
  return (tiempo.songs || []).map(id => byId.get(id)).filter(Boolean)
}

export function activitySongCount(activity, songs) {
  return (activity.tiempos || []).reduce((sum, t) => sum + songsInTiempo(t, songs).length, 0)
}

// Nombre visible de un tiempo: su nombre, o su horario, o un genérico.
export function tiempoName(tiempo) {
  if (tiempo.name?.trim()) return tiempo.name.trim()
  if (tiempo.start) return tiempo.end ? `${tiempo.start} – ${tiempo.end}` : tiempo.start
  return 'Tiempo'
}
