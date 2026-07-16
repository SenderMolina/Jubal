import assert from 'node:assert/strict'
import { lastSevenDays, levelFromXp, practiceStreak, xpAtLevel, xpForProgress } from './gamification.js'

const sessions = [
  { duration_seconds: 600, practiced_at: '2026-07-15T18:00:00' },
  { duration_seconds: 300, practiced_at: '2026-07-14T18:00:00' },
]

assert.equal(xpForProgress(sessions, 1), 165)
assert.equal(xpForProgress([{ duration_seconds: 5, practiced_at: '2026-07-15T18:00:00' }]), 0)
assert.equal(xpForProgress(sessions, 1, [{ status: 'completed', xp_earned: 40 }]), 205)
assert.deepEqual(levelFromXp(0), { level: 1, earned: 0, needed: 200, remaining: 200, percent: 0 })
assert.equal(levelFromXp(xpAtLevel(2)).level, 2)
assert.equal(practiceStreak(sessions, new Date('2026-07-15T12:00:00')), 2)
assert.equal(practiceStreak(sessions, new Date('2026-07-16T12:00:00')), 2)
assert.equal(lastSevenDays(sessions, new Date('2026-07-15T12:00:00')).at(-1).seconds, 600)

console.log('gamification utils: ok')
