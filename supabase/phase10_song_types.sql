-- =====================================================================
-- Jubal — Fase 10: persistir los tipos de cada canción
-- Ejecutar después de phase9_cleanup_unused.sql
-- La UI ya permitía elegir tipos, pero no existía la columna y se perdían
-- al recargar. Guarda ids de song_types (sin FK: si se borra un tipo, la UI
-- ignora los ids que ya no existen).
-- =====================================================================

alter table public.songs
  add column if not exists types bigint[] not null default '{}';

notify pgrst, 'reload schema';
