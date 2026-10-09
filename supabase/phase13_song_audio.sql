-- Audio de práctica: miembros escuchan; líderes escriben; personales solo su dueño.
begin;

alter table public.songs
  add column if not exists audio_path text,
  add column if not exists audio_name text;

alter table public.songs drop constraint if exists songs_audio_scope;
alter table public.songs add constraint songs_audio_scope check (
  (audio_path is null and audio_name is null)
  or (
    audio_path is not null and audio_name is not null
    and length(audio_name) > 0
    and (
      (band_id is not null and starts_with(audio_path, 'band/' || band_id::text || '/'))
      or (band_id is null and user_id is not null and starts_with(audio_path, 'personal/' || user_id::text || '/'))
    )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('song-audio', 'song-audio', false, 26214400,
  array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists song_audio_select on storage.objects;
create policy song_audio_select on storage.objects for select to authenticated
using (
  bucket_id = 'song-audio'
  and (
    ((storage.foldername(name))[1] = 'personal' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or ((storage.foldername(name))[1] = 'band' and exists (
      select 1 from public.bands b
      where b.id::text = (storage.foldername(name))[2] and public.is_band_member(b.id)
    ))
  )
);

drop policy if exists song_audio_insert on storage.objects;
create policy song_audio_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'song-audio'
  and (
    ((storage.foldername(name))[1] = 'personal' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or ((storage.foldername(name))[1] = 'band' and exists (
      select 1 from public.bands b
      where b.id::text = (storage.foldername(name))[2] and public.is_band_leader(b.id)
    ))
  )
);

-- Reemplazar crea un objeto nuevo; no se requiere permiso UPDATE/upsert.
drop policy if exists song_audio_delete on storage.objects;
create policy song_audio_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'song-audio'
  and (
    ((storage.foldername(name))[1] = 'personal' and (storage.foldername(name))[2] = (select auth.uid())::text)
    or ((storage.foldername(name))[1] = 'band' and exists (
      select 1 from public.bands b
      where b.id::text = (storage.foldername(name))[2] and public.is_band_leader(b.id)
    ))
  )
);

commit;
