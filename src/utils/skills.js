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
