// Duración de canciones: se guarda en segundos, se muestra como m:ss.

// Acepta "4:30" (min:seg) o "4" (minutos). Devuelve segundos o null.
export function parseDuration(text) {
  const s = String(text || '').trim()
  if (!s) return null
  const m = s.match(/^(\d+):([0-5]?\d)$/)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  if (/^\d+$/.test(s)) return Number(s) * 60
  return null
}

export function formatDuration(secs) {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
