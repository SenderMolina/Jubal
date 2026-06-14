-- =====================================================================
-- Jubal — Fase 3: sesiones en vivo por secciones
-- Ejecutar en: Supabase Dashboard → SQL Editor (ya aplicado vía MCP)
-- =====================================================================

create table if not exists public.live_sessions (
  id                    uuid primary key default gen_random_uuid(),
  band_id               uuid not null references public.bands(id) on delete cascade,
  source                text not null default 'song',     -- 'tiempo' | 'song'
  activity_id           bigint,
  tiempo_id             bigint,
  song_ids              bigint[] not null default '{}',    -- setlist (snapshot)
  current_song_index    integer not null default 0,
  current_section_index integer not null default 0,
  is_playing            boolean not null default false,
  controller_id         uuid references auth.users(id) on delete set null,
  is_active             boolean not null default true,
  started_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Una sola sesión activa por banda
create unique index if not exists one_active_session_per_band
  on public.live_sessions(band_id) where is_active;

alter table public.live_sessions enable row level security;

drop policy if exists live_sessions_select on public.live_sessions;
create policy live_sessions_select on public.live_sessions
  for select to authenticated using (public.is_band_member(band_id));

drop policy if exists live_sessions_write on public.live_sessions;
create policy live_sessions_write on public.live_sessions
  for all to authenticated
  using (public.is_band_leader(band_id))
  with check (public.is_band_leader(band_id));

alter publication supabase_realtime add table public.live_sessions;
