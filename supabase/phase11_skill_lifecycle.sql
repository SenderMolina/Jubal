-- =====================================================================
-- Jubal — Fase 11: ciclo de vida de las skills
-- Ejecutar después de phase10_song_types.sql
-- Estados: Deseo (wishlist) → Aprendiendo (learning) → Practicando
-- (practicing) → Concluido (mastered, lo marca el músico, nunca automático).
-- Etiquetas libres (técnicas), fuente (manual, YouTube, un solo…) y fecha
-- meta para llegar al BPM meta. Cada sesión guarda la fase en que se hizo
-- para saber cuánto tiempo tomó aprender vs. pulir.
-- =====================================================================

-- 1) Postgres no deja usar un valor de enum en la misma transacción que lo
--    crea: correr este bloque solo, antes del resto.
alter type public.skill_status add value if not exists 'wishlist' before 'learning';

-- 2) Resto de la migración
-- Hasta ahora 'learning' se mostraba como "lista de deseos".
update public.skills set status = 'wishlist' where status = 'learning';
alter table public.skills alter column status set default 'wishlist';

alter table public.skills
  add column if not exists tags         text[] not null default '{}',
  add column if not exists source       text,
  add column if not exists target_date  date,
  add column if not exists completed_at timestamptz;

-- Sesiones previas quedan sin fase (cuentan en el total, no en el desglose).
alter table public.practice_sessions
  add column if not exists phase public.skill_status;

notify pgrst, 'reload schema';
