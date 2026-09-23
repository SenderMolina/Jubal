// Umbral único de "día activo": vale para racha y meta semanal.
export const ACTIVE_DAY_SECONDS = 60

export function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function practiceStreak(sessions = [], now = new Date()) {
  const practicedDays = activeDayKeys(sessions)
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

function activeDayKeys(sessions) {
  return new Set(sessions
    .filter(session => Number(session.duration_seconds) >= ACTIVE_DAY_SECONDS)
    .map(session => dateKey(session.practiced_at)))
}

// Racha más larga de la historia: días activos consecutivos.
export function maxStreak(sessions = []) {
  const days = [...activeDayKeys(sessions)].sort()
  let best = 0, current = 0, previous = null
  for (const day of days) {
    if (previous) {
      const next = new Date(`${previous}T12:00:00`)
      next.setDate(next.getDate() + 1)
      current = dateKey(next) === day ? current + 1 : 1
    } else current = 1
    best = Math.max(best, current)
    previous = day
  }
  return best
}

export function dailySecondsMap(sessions = []) {
  return sessions.reduce((days, session) => {
    const key = dateKey(session.practiced_at)
    days[key] = (days[key] || 0) + (Number(session.duration_seconds) || 0)
    return days
  }, {})
}

export function lastSevenDays(sessions = [], now = new Date()) {
  const secondsByDay = dailySecondsMap(sessions)
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
