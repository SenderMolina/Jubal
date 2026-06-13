-- =====================================================================
-- Jubal — Fase 2C: aislar datos por banda (band_id + RLS real)
-- Ejecutar en: Supabase Dashboard → SQL Editor (ya aplicado vía MCP)
-- =====================================================================

-- 1) Columna band_id (nullable → datos actuales quedan huérfanos/invisibles)
alter table public.songs       add column if not exists band_id uuid references public.bands(id) on delete cascade;
alter table public.song_types  add column if not exists band_id uuid references public.bands(id) on delete cascade;
alter table public.repertoires add column if not exists band_id uuid references public.bands(id) on delete cascade;
alter table public.activities  add column if not exists band_id uuid references public.bands(id) on delete cascade;

create index if not exists songs_band_idx      on public.songs(band_id);
create index if not exists song_types_band_idx on public.song_types(band_id);
create index if not exists repertoires_band_idx on public.repertoires(band_id);
create index if not exists activities_band_idx  on public.activities(band_id);

-- 2) RLS por banda: miembro lee, líder escribe
-- songs
drop policy if exists songs_all on public.songs;
drop policy if exists songs_select on public.songs;
drop policy if exists songs_write on public.songs;
create policy songs_select on public.songs for select to authenticated
  using (public.is_band_member(band_id));
create policy songs_write on public.songs for all to authenticated
  using (public.is_band_leader(band_id)) with check (public.is_band_leader(band_id));

-- song_types
drop policy if exists song_types_all on public.song_types;
drop policy if exists song_types_select on public.song_types;
drop policy if exists song_types_write on public.song_types;
create policy song_types_select on public.song_types for select to authenticated
  using (public.is_band_member(band_id));
create policy song_types_write on public.song_types for all to authenticated
  using (public.is_band_leader(band_id)) with check (public.is_band_leader(band_id));

-- repertoires
drop policy if exists repertoires_all on public.repertoires;
drop policy if exists repertoires_select on public.repertoires;
drop policy if exists repertoires_write on public.repertoires;
create policy repertoires_select on public.repertoires for select to authenticated
  using (public.is_band_member(band_id));
create policy repertoires_write on public.repertoires for all to authenticated
  using (public.is_band_leader(band_id)) with check (public.is_band_leader(band_id));

-- activities
drop policy if exists activities_all on public.activities;
drop policy if exists activities_select on public.activities;
drop policy if exists activities_write on public.activities;
create policy activities_select on public.activities for select to authenticated
  using (public.is_band_member(band_id));
create policy activities_write on public.activities for all to authenticated
  using (public.is_band_leader(band_id)) with check (public.is_band_leader(band_id));

-- repertoire_songs: acotado vía el repertorio padre
drop policy if exists repertoire_songs_all on public.repertoire_songs;
drop policy if exists repertoire_songs_select on public.repertoire_songs;
drop policy if exists repertoire_songs_write on public.repertoire_songs;
create policy repertoire_songs_select on public.repertoire_songs for select to authenticated
  using (exists (select 1 from public.repertoires r
                 where r.id = repertoire_id and public.is_band_member(r.band_id)));
create policy repertoire_songs_write on public.repertoire_songs for all to authenticated
  using (exists (select 1 from public.repertoires r
                 where r.id = repertoire_id and public.is_band_leader(r.band_id)))
  with check (exists (select 1 from public.repertoires r
                 where r.id = repertoire_id and public.is_band_leader(r.band_id)));

-- 3) app_config (contraseña de líder quemada) quedó obsoleto
drop table if exists public.app_config;

-- =====================================================================
-- Cuando definas la banda raíz, reclamar los datos huérfanos:
--   update public.songs       set band_id = '<BAND_UUID>' where band_id is null;
--   update public.song_types  set band_id = '<BAND_UUID>' where band_id is null;
--   update public.repertoires set band_id = '<BAND_UUID>' where band_id is null;
--   update public.activities  set band_id = '<BAND_UUID>' where band_id is null;
-- =====================================================================
