-- =====================================================================
-- Jubal — Fase 9: retira funciones sin interfaz
-- Ejecutar después de phase8_part_tempo_xp.sql
--  1. Preparación compartida y asignaciones (phase7): song_readiness,
--     band_song_assignments, skills.share_with_band.
--  2. XP (phase6/phase8): xp_events, award_mastery_xp y practice_runs.xp_earned.
--     score_practice_run se conserva: sigue calculando tiempo útil y avance.
-- =====================================================================

-- 1. Preparación compartida y asignaciones
drop trigger if exists skills_refresh_readiness on public.skills;
drop trigger if exists skill_parts_refresh_readiness on public.skill_parts;
drop trigger if exists practice_sessions_refresh_readiness on public.practice_sessions;

drop function if exists public.refresh_readiness_from_skill();
drop function if exists public.refresh_readiness_from_part();
drop function if exists public.refresh_readiness_from_session();
drop function if exists public.refresh_song_readiness(uuid);

-- drop table también las saca de la publicación supabase_realtime.
drop table if exists public.song_readiness;
drop table if exists public.band_song_assignments;

alter table public.skills drop column if exists share_with_band;

-- 2. XP
drop trigger if exists skills_award_mastery on public.skills;
drop function if exists public.award_mastery_xp();
drop table if exists public.xp_events;

create or replace function public.score_practice_run()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  completed_count int;
  total_count int;
  useful_seconds int;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    select
      count(*) filter (where status = 'completed'),
      count(*),
      coalesce(sum(least(actual_seconds, planned_seconds)), 0)
    into completed_count, total_count, useful_seconds
    from public.practice_run_items
    where run_id = new.id;

    new.actual_seconds := useful_seconds;
    new.completed_items := completed_count;
    new.total_items := total_count;
    new.completion_percent := case when total_count > 0
      then round((completed_count::numeric / total_count) * 100)::int else 0 end;
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  return new;
end;
$$;

alter table public.practice_runs drop column if exists xp_earned;

notify pgrst, 'reload schema';
