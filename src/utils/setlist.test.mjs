import assert from 'node:assert/strict'
import { activitySongCount, songsInTiempo, tiempoName } from './setlist.js'

const songs = [{ id: 1, title: 'A' }, { id: 2, title: 'B' }]
// Las canciones borradas (id 99) no aparecen ni se cuentan
assert.deepEqual(songsInTiempo({ songs: [2, 99, 1] }, songs).map(s => s.id), [2, 1])
assert.equal(activitySongCount({ tiempos: [{ songs: [1, 99] }, { songs: [2] }, {}] }, songs), 2)
assert.equal(activitySongCount({}, songs), 0)

assert.equal(tiempoName({ name: '  Alabanza ' }), 'Alabanza')
assert.equal(tiempoName({ name: '', start: '09:40', end: '10:00' }), '09:40 – 10:00')
assert.equal(tiempoName({ start: '09:40' }), '09:40')
assert.equal(tiempoName({}), 'Tiempo')

console.log('setlist: ok')
