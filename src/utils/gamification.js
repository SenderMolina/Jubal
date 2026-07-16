const LEVEL_BASE_XP = 200

export function xpForProgress(sessions = [], masteredSkills = 0, runs = []) {
  const totalSeconds = sessions.reduce((total, session) =>
    total + Math.max(0, Number(session.duration_seconds) || 0), 0)
  const activeDays = new Set(sessions
    .filter(session => Number(session.duration_seconds) >= 60)
    .map(session => dateKey(session.practiced_at))).size
  const runXp = runs
    .filter(run => run.status === 'completed')
    .reduce((total, run) => total + Math.max(0, Number(run.xp_earned) || 0), 0)

  return Math.floor(totalSeconds / 60) * 3 + activeDays * 10 + masteredSkills * 100 + runXp
}

export function xpAtLevel(level) {
  const safeLevel = Math.max(1, Math.floor(level || 1))
  let total = 0
  for (let current = 1; current < safeLevel; current += 1) {
    total += Math.round(LEVEL_BASE_XP * Math.pow(current, 1.25))
  }
  return total
}

export function levelFromXp(xp = 0) {
  const safeXp = Math.max(0, Math.floor(xp))
  let level = 1
  while (safeXp >= xpAtLevel(level + 1)) level += 1

  const levelStart = xpAtLevel(level)
  const levelEnd = xpAtLevel(level + 1)
  const earned = safeXp - levelStart
  const needed = levelEnd - levelStart

  return {
    level,
    earned,
    needed,
    remaining: Math.max(0, needed - earned),
    percent: needed ? Math.min(100, Math.round((earned / needed) * 100)) : 100,
  }
}

export function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function practiceStreak(sessions = [], now = new Date()) {
  const practicedDays = new Set(sessions.map(session => dateKey(session.practiced_at)))
  const cursor = new Date(now)
  cursor.setHours(12, 0, 0, 0)

  if (!practicedDays.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (practicedDays.has(dateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function lastSevenDays(sessions = [], now = new Date()) {
  const secondsByDay = sessions.reduce((days, session) => {
    const key = dateKey(session.practiced_at)
    days[key] = (days[key] || 0) + (Number(session.duration_seconds) || 0)
    return days
  }, {})
  const formatter = new Intl.DateTimeFormat('es', { weekday: 'short' })

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const key = dateKey(date)
    return {
      key,
      label: formatter.format(date).replace('.', '').slice(0, 2),
      seconds: secondsByDay[key] || 0,
      isToday: index === 6,
    }
  })
}
