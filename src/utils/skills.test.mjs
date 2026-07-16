import assert from 'node:assert/strict'
import { skillProgress } from './skills.js'

assert.equal(skillProgress(null), 0)
assert.equal(skillProgress({ status: 'learning', parts: [] }), 0)
assert.equal(skillProgress({ status: 'practicing', parts: [] }), 25)
assert.equal(skillProgress({ status: 'mastered', parts: [] }), 100)
assert.equal(skillProgress({ status: 'practicing', current_bpm: 80, target_bpm: 100, parts: [] }), 80)
assert.equal(skillProgress({
  status: 'practicing', current_bpm: 80, target_bpm: 100,
  parts: [{ progress: 40 }, { progress: 60 }],
}), 65)

console.log('skill progress: ok')
