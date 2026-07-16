-- =====================================================================
-- Jubal — Fase 6: ejecución guiada y control personal de rutinas
-- Ejecutar después de phase5_routine_builder.sql
-- =====================================================================

create table if not exists public.practice_runs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  routine_id         uuid references public.routines(id) on delete set null,
  routine_name       text not null,
  scheduled_date     date not null default current_date,
  status             text not null default 'active' check (status in ('active','completed','abandoned')),
  current_item_index int not null default 0 check (current_item_index >= 0),
  planned_seconds    int not null default 0 check (planned_seconds >= 0),
  actual_seconds     int not null default 0 check (actual_seconds >= 0),
  completed_items    int not null default 0 check (completed_items >= 0),
  total_items        int not null default 0 check (total_items >= 0),
  completion_percent int not null default 0 check (completion_percent between 0 and 100),
  xp_earned          int not null default 0 check (xp_earned >= 0),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);

create unique index if not exists practice_runs_one_active_routine
  on public.practice_runs(user_id, routine_id) where status = 'active';
create index if not exists practice_runs_user_date_idx
  on public.practice_runs(user_id, scheduled_date desc);

create table if not exists public.practice_run_items (
  id                   uuid primary key default gen_random_uuid(),
  run_id               uuid not null references public.practice_runs(id) on delete cascade,
  routine_item_id      uuid references public.routine_items(id) on delete set null,
  skill_id             uuid references public.skills(id) on delete set null,
  section_name         text not null,
  skill_name           text not null,
  position             int not null,
  planned_seconds      int not null check (planned_seconds > 0),
  actual_seconds       int not null default 0 check (actual_seconds >= 0),
  target_bpm           int,
  achieved_bpm         int,
  break_seconds        int not null default 0 check (break_seconds >= 0),
  break_actual_seconds int not null default 0 check (break_actual_seconds >= 0),
  quality              int check (quality between 1 and 5),
  status               text not null default 'pending' check (status in ('pending','active','completed','skipped')),
  completed_at         timestamptz,
  unique(run_id, position)
);

create index if not exists practice_run_items_run_idx
  on public.practice_run_items(run_id, position);

alter table public.practice_sessions
  add column if not exists routine_run_item_id uuid references public.practice_run_items(id) on delete set null,
  add column if not exists quality int check (quality between 1 and 5);

create unique index if not exists practice_sessions_run_item_unique
  on public.practice_sessions(routine_run_item_id)
  where routine_run_item_id is not null;

alter table public.practice_runs enable row level security;
alter table public.practice_run_items enable row level security;

drop policy if exists practice_runs_own on public.practice_runs;
create policy practice_runs_own on public.practice_runs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists practice_run_items_own on public.practice_run_items;
create policy practice_run_items_own on public.practice_run_items for all to authenticated
  using (exists (
    select 1 from public.practice_runs run
    where run.id = public.practice_run_items.run_id
      and run.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.practice_runs run
    where run.id = public.practice_run_items.run_id
      and run.user_id = (select auth.uid())
  ));

-- El XP de una misión se calcula en la base de datos. No se premia crear
-- muchas sesiones pequeñas: cuentan tiempo útil, pasos completados y cierre.
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
    new.xp_earned := floor(useful_seconds / 60.0)::int * 3
      + completed_count * 8
      + case when total_count > 0 and completed_count = total_count then 30 else 0 end;
  end if;
  return new;
end;
$$;

drop trigger if exists practice_runs_score on public.practice_runs;
create trigger practice_runs_score
before update of status on public.practice_runs
for each row execute function public.score_practice_run();

notify pgrst, 'reload schema';
