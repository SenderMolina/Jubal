export const TYPE_LABELS = {
  lick: 'Riff / Lick',
  solo: 'Solo',
  technique: 'Técnica',
  song: 'Canción',
}

// Ciclo de vida. 'mastered' (Concluido) solo lo marca el músico.
export const STATUS_LABELS = {
  wishlist: 'Deseo',
  learning: 'Aprendiendo',
  practicing: 'Practicando',
  mastered: 'Concluido',
}

// Agrupa por fuente del catálogo (A–Z, "Sin fuente" al final) conservando
// el orden de cada grupo. Lo usan la biblioteca y el selector de rutinas.
export const NO_SOURCE = 'Sin fuente'
export function groupBySource(skills = [], sources = []) {
  const names = new Map(sources.map(source => [source.id, source.name]))
  const groups = new Map()
  for (const skill of skills) {
    const id = names.has(skill.source_id) ? skill.source_id : null
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(skill)
  }
  return [...groups].map(([id, items]) => ({ id, name: id ? names.get(id) : NO_SOURCE, items }))
    .sort((a, b) => (!a.id) - (!b.id) || a.name.localeCompare(b.name, 'es', { numeric: true }))
}

// Tempo de trabajo del día: reparte lo que falta hasta la meta entre los días
// que quedan a la fecha meta. Se recalcula con el BPM actual, así que si un día
// no practicas el paso diario sube solo. Sin fecha meta = tempo actual.
export function todayBpm(s, now = Date.now()) {
  const current = Number(s?.current_bpm) || null
  const target = Number(s?.target_bpm) || null
  if (!current || !target || !s.target_date || current >= target) return current
  const days = Math.ceil((new Date(`${s.target_date}T23:59:59`) - now) / 86400000)
  if (days <= 1) return target
  return Math.min(target, current + Math.ceil((target - current) / days))
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
