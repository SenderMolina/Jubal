// Parsea la letra en secciones a partir de los marcadores [Nombre] / [Nombre m:ss].
// Cada sección: { label, secs (DURACIÓN de la sección en seg —cuánto permanece
// antes de pasar a la siguiente— o null), lines: [{type,text}] }
// type ∈ 'chord' | 'lyric' | 'spacer'.
// Importante: la estructura de secciones es IDÉNTICA para todos los roles (incluye
// acordes); ocultar acordes para coristas es responsabilidad del render, no del parseo,
// para que los índices de sección coincidan entre dispositivos.

const chordRegex = /^[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*(\s+[A-G][#b]?(m|maj|min|sus|aug|dim|add|2|4|5|6|7|9|11|13|\/)?[A-G0-9#b]*)*\s*$/
const sectionRegex = /^\[(.+?)(?:\s+(\d+):([0-5]?\d))?\]\s*(.*)$/
// Un solo acorde dentro de un corchete inline: C, Cm7, F#sus4, A/C#, Gm7b5…
// Restringido al vocabulario real de acordes para no confundir "Coro", "Verso", etc.
const chordToken = /^[A-G][#b]?(?:m|maj|min|M|aug|dim|sus|add|\+|°|º)?[0-9]*(?:(?:add|sus|maj|b|#)[0-9]+)*(?:\/[A-G][#b]?)?$/

// ChordPro inline: "[C]Sublime [G]gra[Am]cia" -> pares acorde/texto.
// El texto previo a un acorde pertenece al par anterior; lo de antes del
// primer acorde va con chord:'' (se renderiza sin acorde encima).
export function splitChordPro(line) {
  const pairs = []
  const re = /\[([^\]]+)\]/g
  let last = 0, m, chord = ''
  while ((m = re.exec(line))) {
    pairs.push({ chord, text: line.slice(last, m.index) })
    chord = m[1].trim()
    last = re.lastIndex
  }
  pairs.push({ chord, text: line.slice(last) })
  // Quitar el par inicial vacío (cuando la línea empieza con un acorde).
  return pairs.filter((p, i) => !(i === 0 && !p.chord && !p.text))
}

function hasInlineChords(line) {
  const re = /\[([^\]]+)\]/g
  let m
  while ((m = re.exec(line))) if (chordToken.test(m[1].trim())) return true
  return false
}

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
    if (hasInlineChords(raw)) { ensure().lines.push({ type: 'chordpro', pairs: splitChordPro(raw) }); return }
    const isChord = chordRegex.test(raw.trim())
    ensure().lines.push({ type: isChord ? 'chord' : 'lyric', text: raw })
  }

  for (const line of lyrics.split('\n')) {
    const m = line.trim().match(sectionRegex)
    // "[C]Sublime" matchea sectionRegex pero su etiqueta es un acorde -> no es sección.
    if (m && !chordToken.test(m[1].trim())) {
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

// Traduce la estructura musical de la letra a partes personales. Conserva el
// índice de origen para poder sincronizar nombres sin borrar progreso/historial.
export function sectionsToPracticeParts(lyrics) {
  const seen = new Map()
  return parseSections(lyrics).map((section, index) => {
    const base = section.label || `Parte ${index + 1}`
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)
    return { name: count > 1 ? `${base} ${count}` : base, source_section_index: index }
  })
}
