// Parsea la letra en secciones a partir de los marcadores [Nombre] / [Nombre m:ss].
// Cada sección: { label, secs (tiempo absoluto en seg o null), lines: [{type,text}] }
// type ∈ 'chord' | 'lyric' | 'spacer'.
// Importante: la estructura de secciones es IDÉNTICA para todos los roles (incluye
// acordes); ocultar acordes para coristas es responsabilidad del render, no del parseo,
// para que los índices de sección coincidan entre dispositivos.

const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/
const sectionRegex = /^\[(.+?)(?:\s+(\d+):([0-5]?\d))?\]\s*(.*)$/

export function parseSections(lyrics) {
  if (!lyrics) return []
  const sections = []
  let current = null

  const ensure = () => {
    if (!current) { current = { label: null, secs: null, lines: [] }; sections.push(current) }
    return current
  }
  const pushLine = (raw) => {
    if (!raw.trim()) { ensure().lines.push({ type: 'spacer' }); return }
    const isChord = chordRegex.test(raw.trim())
    ensure().lines.push({ type: isChord ? 'chord' : 'lyric', text: raw })
  }

  for (const line of lyrics.split('\n')) {
    const m = line.trim().match(sectionRegex)
    if (m) {
      current = {
        label: m[1],
        secs: m[2] != null ? Number(m[2]) * 60 + Number(m[3]) : null,
        lines: [],
      }
      sections.push(current)
      if (m[4]) pushLine(m[4])   // contenido en la misma línea del marcador
    } else {
      pushLine(line)
    }
  }
  // Quitar secciones totalmente vacías (solo spacers)
  return sections.filter(s => s.label || s.lines.some(l => l.type !== 'spacer'))
}
