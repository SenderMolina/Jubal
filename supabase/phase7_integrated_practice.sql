-- =====================================================================
-- Jubal — Fase 7: canción ↔ práctica ↔ preparación compartida
-- Ejecutar después de phase6_guided_practice.sql
-- =====================================================================

alter table public.skills
  add column if not exists share_with_band boolean not null default false;

alter table public.skill_parts
  add column if not exists source_section_index int;

alter table public.routine_items
  add column if not exists part_id uuid references public.skill_parts(id) on delete set null;

alter table public.practice_run_items
  add column if not exists part_id uuid references public.skill_parts(id) on delete set null,
  add column if not exists part_name text;

do $$ begin
  alter table public.skill_parts
    add constraint skill_parts_source_section_check
    check (source_section_index is null or source_section_index >= 0);
exception when duplicate_object then null; end $$;

create table if not exists public.song_readiness (
  id                 uuid primary key default gen_random_uuid(),
  skill_id           uuid not null unique references public.skills(id) on delete cascade,
  song_id            bigint not null references public.songs(id) on delete cascade,
  band_id            uuid not null references public.bands(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  status             public.skill_status not null default 'learning',
  progress           int not null default 0 check (progress between 0 and 100),
  current_bpm        int,
  target_bpm         int,
  total_seconds      int not null default 0 check (total_seconds >= 0),
  last_practiced_at  timestamptz,
  updated_at         timestamptz not null default now(),
  unique (song_id, user_id)
);

create index if not exists song_readiness_band_song_idx
  on public.song_readiness(band_id, song_id);

create table if not exists public.band_song_assignments (
  id             uuid primary key default gen_random_uuid(),
  band_id        uuid not null references public.bands(id) on delete cascade,
  song_id        bigint not null references public.songs(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  responsibility text not null default 'Instrumento',
  notes          text,
  assigned_by    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (song_id, user_id, responsibility)
);

create index if not exists band_song_assignments_band_song_idx
  on public.band_song_assignments(band_id, song_id);

alter table public.song_readiness enable row level security;
alter table public.band_song_assignments enable row level security;

drop policy if exists song_readiness_band_select on public.song_readiness;
create policy song_readiness_band_select on public.song_readiness
  for select to authenticated using (public.is_band_member(band_id));

drop policy if exists song_readiness_own on public.song_readiness;
create policy song_readiness_own on public.song_readiness
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists band_song_assignments_select on public.band_song_assignments;
create policy band_song_assignments_select on public.band_song_assignments
  for select to authenticated using (public.is_band_member(band_id));

drop policy if exists band_song_assignments_manage on public.band_song_assignments;
create policy band_song_assignments_manage on public.band_song_assignments
  for all to authenticated
  using (public.is_band_leader(band_id))
  with check (public.is_band_leader(band_id));

-- Deriva una fila pequeña y compartible de los datos privados de práctica.
-- La fila solo existe mientras el músico tenga activado share_with_band.
create or replace function public.refresh_song_readiness(p_skill_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_skill public.skills;
  target_band uuid;
  parts_score numeric;
  tempo_score numeric;
  calculated_progress int;
  practiced_seconds int;
  practiced_at timestamptz;
begin
  select * into target_skill from public.skills where id = p_skill_id;

  if target_skill.id is null then
    delete from public.song_readiness where skill_id = p_skill_id;
    return;
  end if;

  select band_id into target_band from public.songs where id = target_skill.song_id;
  if target_skill.song_id is null or target_band is null or not target_skill.share_with_band then
    delete from public.song_readiness where skill_id = p_skill_id;
    return;
  end if;

  select avg(progress) into parts_score
  from public.skill_parts where skill_id = p_skill_id;

  tempo_score := case when target_skill.target_bpm is not null and target_skill.target_bpm > 0
    then least(100, coalesce(target_skill.current_bpm, 0)::numeric / target_skill.target_bpm * 100)
    else null end;

  calculated_progress := case
    when target_skill.status = 'mastered' then 100
    when parts_score is not null and tempo_score is not null then round((parts_score + tempo_score) / 2)::int
    when parts_score is not null then round(parts_score)::int
    when tempo_score is not null then round(tempo_score)::int
    when target_skill.status = 'practicing' then 25
    else 0 end;

  select coalesce(sum(duration_seconds), 0), max(practiced_at)
    into practiced_seconds, practiced_at
  from public.practice_sessions where skill_id = p_skill_id;

  -- Permite relinkear una skill y resuelve datos antiguos duplicados dejando
  -- una única preparación compartida por músico/canción.
  delete from public.song_readiness where skill_id = p_skill_id;

  insert into public.song_readiness (
    skill_id, song_id, band_id, user_id, status, progress,
    current_bpm, target_bpm, total_seconds, last_practiced_at, updated_at
  ) values (
    p_skill_id, target_skill.song_id, target_band, target_skill.user_id,
    target_skill.status, calculated_progress, target_skill.current_bpm,
    target_skill.target_bpm, practiced_seconds, practiced_at, now()
  )
  on conflict (song_id, user_id) do update set
    skill_id = excluded.skill_id,
    song_id = excluded.song_id,
    band_id = excluded.band_id,
    user_id = excluded.user_id,
    status = excluded.status,
    progress = excluded.progress,
    current_bpm = excluded.current_bpm,
    target_bpm = excluded.target_bpm,
    total_seconds = excluded.total_seconds,
    last_practiced_at = excluded.last_practiced_at,
    updated_at = now();
end;
$$;

create or replace function public.refresh_readiness_from_skill()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_song_readiness(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_readiness_from_part()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_song_readiness(coalesce(new.skill_id, old.skill_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_readiness_from_session()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.skill_id, old.skill_id) is not null then
    perform public.refresh_song_readiness(coalesce(new.skill_id, old.skill_id));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists skills_refresh_readiness on public.skills;
create trigger skills_refresh_readiness
after insert or update of song_id, status, current_bpm, target_bpm, share_with_band
on public.skills for each row execute function public.refresh_readiness_from_skill();

drop trigger if exists skill_parts_refresh_readiness on public.skill_parts;
create trigger skill_parts_refresh_readiness
after insert or update of progress or delete
on public.skill_parts for each row execute function public.refresh_readiness_from_part();

drop trigger if exists practice_sessions_refresh_readiness on public.practice_sessions;
create trigger practice_sessions_refresh_readiness
after insert or update or delete
on public.practice_sessions for each row execute function public.refresh_readiness_from_session();

revoke execute on function public.refresh_song_readiness(uuid),
  public.refresh_readiness_from_skill(), public.refresh_readiness_from_part(),
  public.refresh_readiness_from_session() from public, anon, authenticated;

-- Reemplaza el orden de un repertorio en una sola transacción. Si una canción
-- no es válida, PostgreSQL revierte el delete y conserva el orden anterior.
create or replace function public.replace_repertoire_songs(
  p_repertoire_id bigint,
  p_song_ids bigint[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from public.repertoires where id = p_repertoire_id) then
    raise exception 'Repertorio no disponible';
  end if;

  delete from public.repertoire_songs where repertoire_id = p_repertoire_id;
  insert into public.repertoire_songs(repertoire_id, song_id, position)
  select p_repertoire_id, song_id, (ordinality - 1)::int
  from unnest(coalesce(p_song_ids, '{}'::bigint[])) with ordinality as ordered(song_id, ordinality);
end;
$$;

revoke execute on function public.replace_repertoire_songs(bigint, bigint[]) from public, anon;
grant execute on function public.replace_repertoire_songs(bigint, bigint[]) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.song_readiness;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.band_song_assignments;
exception when duplicate_object then null; end $$;

-- Crear inmediatamente las filas de quienes ya habían optado por compartir.
select public.refresh_song_readiness(id)
from public.skills where share_with_band and song_id is not null;

notify pgrst, 'reload schema';
