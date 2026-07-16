import assert from 'node:assert/strict'
import { lastSevenDays, levelFromXp, maxStreak, practiceStreak, xpAtLevel, xpForProgress } from './gamification.js'

const sessions = [
  { duration_seconds: 600, practiced_at: '2026-07-15T18:00:00' },
  { duration_seconds: 300, practiced_at: '2026-07-14T18:00:00' },
]

assert.equal(xpForProgress(sessions, 1), 165)
assert.equal(xpForProgress([{ duration_seconds: 5, practiced_at: '2026-07-15T18:00:00' }]), 0)
assert.equal(xpForProgress(sessions, 1, [{ status: 'completed', xp_earned: 40 }]), 205)
// Sesión de misión: no suma tiempo (el run la paga), pero sí cuenta el día activo
assert.equal(xpForProgress([
  { duration_seconds: 600, practiced_at: '2026-07-15T18:00:00', routine_run_item_id: 'x' },
]), 10)
assert.deepEqual(levelFromXp(0), { level: 1, earned: 0, needed: 200, remaining: 200, percent: 0 })
assert.equal(levelFromXp(xpAtLevel(2)).level, 2)
assert.equal(practiceStreak(sessions, new Date('2026-07-15T12:00:00')), 2)
assert.equal(practiceStreak(sessions, new Date('2026-07-16T12:00:00')), 2)
// Una sesión de segundos no sostiene la racha
assert.equal(practiceStreak([{ duration_seconds: 5, practiced_at: '2026-07-15T18:00:00' }], new Date('2026-07-15T12:00:00')), 0)
assert.equal(maxStreak([]), 0)
assert.equal(maxStreak([
  ...sessions,
  { duration_seconds: 300, practiced_at: '2026-07-10T18:00:00' },
  { duration_seconds: 300, practiced_at: '2026-07-09T18:00:00' },
  { duration_seconds: 300, practiced_at: '2026-07-08T18:00:00' },
]), 3)
assert.equal(lastSevenDays(sessions, new Date('2026-07-15T12:00:00')).at(-1).seconds, 600)

console.log('gamification utils: ok')
