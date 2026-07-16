import assert from 'node:assert/strict'
import { progressFromSessions, skillProgress, stableBpm } from './skills.js'

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

console.log('skill progress: ok')
