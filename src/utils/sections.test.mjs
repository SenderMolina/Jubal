// Run: node src/utils/sections.test.mjs
import assert from 'node:assert'
import { parseSections, splitChordPro } from './sections.js'

// Inline ChordPro: pares acorde/texto
assert.deepEqual(splitChordPro('[C]Sublime [G]gra[Am]cia'), [
  { chord: 'C', text: 'Sublime ' },
  { chord: 'G', text: 'gra' },
  { chord: 'Am', text: 'cia' },
])
// Texto antes del primer acorde -> par sin acorde
assert.deepEqual(splitChordPro('Sub[C]lime'), [
  { chord: '', text: 'Sub' },
  { chord: 'C', text: 'lime' },
])

// Una línea ChordPro se detecta como tal
const s1 = parseSections('[C]Hola [G]mundo')
assert.equal(s1[0].lines[0].type, 'chordpro')

// [Coro 1:10] sigue siendo sección (no acorde), con su tiempo
const s2 = parseSections('[Coro 1:10]\nletra normal')
assert.equal(s2[0].label, 'Coro')
assert.equal(s2[0].secs, 70)
assert.equal(s2[0].lines[0].type, 'lyric')

// Formato viejo (acorde en línea aparte) intacto
const s3 = parseSections('C  G  Am\nletra')
assert.equal(s3[0].lines[0].type, 'chord')
assert.equal(s3[0].lines[1].type, 'lyric')

console.log('sections.test.mjs OK')
