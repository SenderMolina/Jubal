// Traduce un error (Supabase, red o propio) a un mensaje para el usuario.
// Los errores de Postgres/PostgREST llegan en inglés: se usan solo cuando son
// excepciones propias (P0001, raise exception en español); si no, el fallback.
export function errorMessage(error, fallback = 'No se pudo completar la acción.') {
  const text = String(error?.message || '')
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline || /failed to fetch|networkerror|network request failed|load failed/i.test(text)) {
    return 'Sin conexión. Revisa tu internet e intenta de nuevo.'
  }
  if (error?.code === '42501' || /row-level security|permission denied/i.test(text)) {
    return 'No tienes permiso para hacer esto.'
  }
  if (error?.code === '23505') return 'Ya existe un registro igual.'
  if (error?.code === 'P0001' && text) return text
  // Error propio de la app (new Error('…')): su mensaje ya es para el usuario.
  if (error instanceof Error && !error.code && !error.status && text) return text
  return fallback
}
