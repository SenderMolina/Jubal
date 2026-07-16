export const TYPE_LABELS = {
  lick: 'Lick',
  solo: 'Solo',
  technique: 'Técnica',
  song: 'Canción',
}

export const STATUS_LABELS = {
  learning: 'Por aprender',
  practicing: 'Practicando',
  mastered: 'Dominada',
}

// Única fuente de verdad para el dominio 0..100. Combina estructura, tempo
// y estado cuando existen; todas las vistas deben consumir esta función.
export function skillProgress(s) {
  if (!s) return 0
  if (s.status === 'mastered') return 100
  const partsScore = s.parts?.length
    ? s.parts.reduce((total, part) => total + (Number(part.progress) || 0), 0) / s.parts.length
    : null
  const tempoScore = s.target_bpm
    ? Math.min(100, ((Number(s.current_bpm) || 0) / Number(s.target_bpm)) * 100)
    : null
  const evidence = [partsScore, tempoScore].filter(value => value !== null)
  if (evidence.length) return Math.round(evidence.reduce((total, value) => total + value, 0) / evidence.length)
  return s.status === 'practicing' ? 25 : 0
}

// Tempo estable: promedio de las 3 mejores sesiones confiables (≥60 s,
// calidad ≥3). Un pico aislado no cuenta como tempo alcanzado.
export function stableBpm(sessions = []) {
  const tempos = sessions
    .filter(s => Number(s.bpm) && Number(s.duration_seconds) >= 60 && (s.quality || 3) >= 3)
    .map(s => Number(s.bpm))
    .sort((a, b) => b - a)
    .slice(0, 3)
  return tempos.length ? Math.round(tempos.reduce((total, value) => total + value, 0) / tempos.length) : null
}

// Convierte sesiones reales en avance de una parte. Premia tiempo útil,
// constancia, calidad y tempo sin permitir que una única sesión corta marque
// una parte como dominada.
export function progressFromSessions(sessions = [], targetBpm = null) {
  if (!sessions.length) return 0
  const useful = sessions.filter(session => Number(session.duration_seconds) >= 10)
  if (!useful.length) return 0
  const seconds = useful.reduce((total, session) => total + Number(session.duration_seconds || 0), 0)
  const timeScore = Math.min(100, (seconds / 600) * 100)
  const consistencyScore = Math.min(100, (useful.length / 3) * 100)
  // Satura en calidad 4: "bien consistente" ya cuenta como logrado; exigir
  // promedio perfecto de 5 hacía el 100% inalcanzable con sesiones reales.
  const qualityScore = Math.min(100, useful.reduce((total, session) => total + Number(session.quality || 3), 0)
    / useful.length / 4 * 100)
  const scores = [timeScore, consistencyScore, qualityScore]
  if (targetBpm) {
    const tempos = useful.map(session => Number(session.bpm)).filter(Boolean).sort((a, b) => b - a).slice(0, 3)
    if (tempos.length) {
      const stableTempo = tempos.reduce((total, value) => total + value, 0) / tempos.length
      scores.push(Math.min(100, (stableTempo / Number(targetBpm)) * 100))
    }
  }
  return Math.min(100, Math.round(scores.reduce((total, value) => total + value, 0) / scores.length))
}
