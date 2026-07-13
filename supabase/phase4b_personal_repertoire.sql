-- =====================================================================
-- Jubal — Fase 4B: repertorio personal (canciones/tipos/repertorios propios)
-- Filas con band_id NULL + user_id = dueño. Conviven con las de banda.
-- =====================================================================

alter table public.songs       add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.song_types  add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.repertoires add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists songs_user_idx       on public.songs(user_id);
create index if not exists song_types_user_idx  on public.song_types(user_id);
create index if not exists repertoires_user_idx on public.repertoires(user_id);

-- Policies personales (se suman a las de banda; permisivas = OR).
-- Los datos huérfanos de la fase 2 (band_id NULL, user_id NULL) siguen
-- invisibles: exigen user_id = auth.uid().
drop policy if exists songs_own on public.songs;
create policy songs_own on public.songs for all to authenticated
  using (band_id is null and user_id = (select auth.uid()))
  with check (band_id is null and user_id = (select auth.uid()));

drop policy if exists song_types_own on public.song_types;
create policy song_types_own on public.song_types for all to authenticated
  using (band_id is null and user_id = (select auth.uid()))
  with check (band_id is null and user_id = (select auth.uid()));

drop policy if exists repertoires_own on public.repertoires;
create policy repertoires_own on public.repertoires for all to authenticated
  using (band_id is null and user_id = (select auth.uid()))
  with check (band_id is null and user_id = (select auth.uid()));

-- repertoire_songs: acotado vía el repertorio padre personal
drop policy if exists repertoire_songs_own on public.repertoire_songs;
create policy repertoire_songs_own on public.repertoire_songs for all to authenticated
  using (exists (select 1 from public.repertoires r
                 where r.id = repertoire_id and r.band_id is null
                   and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.repertoires r
                 where r.id = repertoire_id and r.band_id is null
                   and r.user_id = (select auth.uid())));
