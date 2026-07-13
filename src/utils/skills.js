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

// Progreso 0..100: promedio de partes si las hay; si no, bpm actual vs meta.
export function skillProgress(s) {
  if (s.parts?.length) {
    return Math.round(s.parts.reduce((a, p) => a + p.progress, 0) / s.parts.length)
  }
  if (s.target_bpm && s.current_bpm) {
    return Math.min(100, Math.round((s.current_bpm / s.target_bpm) * 100))
  }
  return s.status === 'mastered' ? 100 : 0
}
