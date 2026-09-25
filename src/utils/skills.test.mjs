import assert from 'node:assert/strict'
import { groupBySource, progressFromSessions, skillProgress, stableBpm, todayBpm } from './skills.js'

assert.equal(stableBpm([]), null)
// Un pico corto o de baja calidad no cuenta como tempo alcanzado
assert.equal(stableBpm([{ bpm: 200, duration_seconds: 20, quality: 5 }]), null)
assert.equal(stableBpm([{ bpm: 200, duration_seconds: 120, quality: 1 }]), null)
assert.equal(stableBpm([
  { bpm: 100, duration_seconds: 120, quality: 4 },
  { bpm: 110, duration_seconds: 120, quality: 4 },
  { bpm: 90, duration_seconds: 120, quality: 4 },
]), 100)

assert.equal(skillProgress(null), 0)
assert.equal(skillProgress({ status: 'learning', parts: [] }), 0)
assert.equal(skillProgress({ status: 'practicing', parts: [] }), 25)
assert.equal(skillProgress({ status: 'mastered', parts: [] }), 100)
assert.equal(skillProgress({ status: 'practicing', current_bpm: 80, target_bpm: 100, parts: [] }), 80)
assert.equal(skillProgress({
  status: 'practicing', current_bpm: 80, target_bpm: 100,
  parts: [{ progress: 40 }, { progress: 60 }],
}), 65)

assert.equal(progressFromSessions([]), 0)
assert.equal(progressFromSessions([{ duration_seconds: 5, quality: 5, bpm: 120 }], 120), 0)
assert.equal(progressFromSessions([
  { duration_seconds: 600, quality: 5, bpm: 120 },
  { duration_seconds: 120, quality: 5, bpm: 120 },
  { duration_seconds: 120, quality: 5, bpm: 120 },
], 120), 100)
// Calidad 4 sostenida ya satura el score de calidad: el 100% es alcanzable
assert.equal(progressFromSessions([
  { duration_seconds: 600, quality: 4, bpm: 120 },
  { duration_seconds: 120, quality: 4, bpm: 120 },
  { duration_seconds: 120, quality: 4, bpm: 120 },
], 120), 100)
assert.ok(progressFromSessions([{ duration_seconds: 60, quality: 3, bpm: 70 }], 100) > 0)
assert.ok(progressFromSessions([{ duration_seconds: 60, quality: 3, bpm: 70 }], 100) < 100)

const now = new Date('2026-09-24T10:00:00').getTime()
assert.equal(todayBpm({ current_bpm: 120, target_bpm: 180 }, now), 120)          // sin fecha meta
assert.equal(todayBpm({ target_bpm: 180, target_date: '2026-10-24' }, now), null) // sin tempo actual
assert.equal(todayBpm({ current_bpm: 120, target_bpm: 180, target_date: '2026-10-24' }, now), 122) // 60 bpm / 30 días
assert.equal(todayBpm({ current_bpm: 170, target_bpm: 180, target_date: '2026-09-24' }, now), 180) // último día
assert.equal(todayBpm({ current_bpm: 190, target_bpm: 180, target_date: '2026-10-24' }, now), 190) // ya pasó la meta

const sources = [{ id: 'y', name: 'YouTube' }, { id: 'j', name: 'Julio Valle' }]
assert.deepEqual(groupBySource([
  { id: 1, source_id: 'y' }, { id: 2 }, { id: 3, source_id: 'j' }, { id: 4, source_id: 'y' }, { id: 5, source_id: 'borrada' },
], sources).map(group => [group.name, group.items.map(item => item.id)]), [
  ['Julio Valle', [3]], ['YouTube', [1, 4]], ['Sin fuente', [2, 5]],
])

console.log('skill progress: ok')
