-- =====================================================================
-- Jubal — Esquema Supabase (migración desde Firebase Realtime Database)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================================
-- Notas:
--  * Los IDs son bigint provistos por el cliente (Date.now()), igual que hoy.
--  * `activities.tiempos` se guarda como JSONB ([{id,name,songs:[songId]}]).
--  * RLS permisivo para `anon` (lectura + escritura) para replicar el acceso
--    abierto actual de Firebase. Endurecer en fase 2 con Supabase Auth.
-- =====================================================================

-- ---------- Tablas ----------

create table if not exists public.songs (
  id      bigint primary key,
  title   text not null default '',
  author  text not null default '',
  key     text not null default '',
  bpm     integer,
  duration integer,
  lyrics  text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.song_types (
  id    bigint primary key,
  name  text not null default ''
);

create table if not exists public.repertoires (
  id    bigint primary key,
  name  text not null default ''
);

create table if not exists public.repertoire_songs (
  repertoire_id bigint not null references public.repertoires(id) on delete cascade,
  song_id       bigint not null references public.songs(id)       on delete cascade,
  position      integer not null default 0,
  primary key (repertoire_id, song_id)
);

create index if not exists repertoire_songs_rep_idx
  on public.repertoire_songs (repertoire_id, position);

create table if not exists public.activities (
  id          bigint primary key,
  title       text not null default '',
  date        text,            -- se conserva el formato de string actual
  time        text,
  description text not null default '',
  tiempos     jsonb not null default '[]'::jsonb
);

create table if not exists public.app_config (
  key   text primary key,
  value text
);

-- Contraseña de líder por defecto (igual que el comportamiento actual)
insert into public.app_config (key, value)
values ('leaderPassword', 'musicman')
on conflict (key) do nothing;

-- ---------- Realtime ----------
-- Publicar cambios para las suscripciones realtime del cliente.
alter publication supabase_realtime add table public.songs;
alter publication supabase_realtime add table public.song_types;
alter publication supabase_realtime add table public.repertoires;
alter publication supabase_realtime add table public.repertoire_songs;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.app_config;

-- ---------- Row Level Security ----------
-- Replica el acceso abierto actual: anon puede leer y escribir.
-- En fase 2, sustituir por políticas basadas en auth.uid()/roles.
alter table public.songs            enable row level security;
alter table public.song_types       enable row level security;
alter table public.repertoires      enable row level security;
alter table public.repertoire_songs enable row level security;
alter table public.activities       enable row level security;
alter table public.app_config       enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'songs','song_types','repertoires','repertoire_songs','activities','app_config'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all', t
    );
  end loop;
end $$;
