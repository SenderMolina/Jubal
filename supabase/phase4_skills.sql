-- =====================================================================
-- Jubal — Fase 4: Skills + práctica personal (por usuario, no por banda)
-- Ejecutar en: Supabase Dashboard → SQL Editor (o vía MCP)
-- =====================================================================

-- Enums (idempotente)
do $$ begin
  create type public.skill_type as enum ('lick','solo','technique','song');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.skill_status as enum ('learning','practicing','mastered');
exception when duplicate_object then null; end $$;

-- Skills del músico
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  type        public.skill_type not null,
  song_id     bigint references public.songs(id) on delete set null, -- songs.id es bigint
  target_bpm  int,
  current_bpm int,
  status      public.skill_status not null default 'learning',
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists skills_user_idx on public.skills(user_id);

-- Partes de una skill (secciones de una canción por aprender)
create table if not exists public.skill_parts (
  id       uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  name     text not null,
  progress int not null default 0 check (progress between 0 and 100),
  position int not null default 0
);
create index if not exists skill_parts_skill_idx on public.skill_parts(skill_id);

-- Registro de avances (lo escribe el metrónomo al terminar una sesión)
create table if not exists public.practice_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  skill_id         uuid references public.skills(id) on delete set null,
  part_id          uuid references public.skill_parts(id) on delete set null,
  bpm              int,
  duration_seconds int not null,
  practiced_at     timestamptz not null default now()
);
create index if not exists practice_sessions_user_idx  on public.practice_sessions(user_id);
create index if not exists practice_sessions_skill_idx on public.practice_sessions(skill_id);

-- Rutina personal de ensayo
create table if not exists public.routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default 'Mi rutina',
  days       int[] not null default '{}',  -- 0=Dom..6=Sáb
  start_time time
);
create index if not exists routines_user_idx on public.routines(user_id);

create table if not exists public.routine_items (
  id              uuid primary key default gen_random_uuid(),
  routine_id      uuid not null references public.routines(id) on delete cascade,
  skill_id        uuid not null references public.skills(id) on delete cascade,
  planned_minutes int,
  target_bpm      int,
  position        int not null default 0
);
create index if not exists routine_items_routine_idx on public.routine_items(routine_id);

-- RLS: cada quien lo suyo
alter table public.skills            enable row level security;
alter table public.skill_parts       enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_items     enable row level security;

drop policy if exists skills_own on public.skills;
create policy skills_own on public.skills for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists skill_parts_own on public.skill_parts;
create policy skill_parts_own on public.skill_parts for all to authenticated
  using (exists (select 1 from public.skills s where s.id = skill_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.skills s where s.id = skill_id and s.user_id = auth.uid()));

drop policy if exists practice_sessions_own on public.practice_sessions;
create policy practice_sessions_own on public.practice_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists routines_own on public.routines;
create policy routines_own on public.routines for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists routine_items_own on public.routine_items;
create policy routine_items_own on public.routine_items for all to authenticated
  using (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));

-- =====================================================================
-- Pendiente (paso 5 del plan): repertorio personal
--   alter table songs/repertoires add user_id + policies band_id is null
-- =====================================================================
