-- Perfil visual y administración de bandas.
alter table public.bands
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'band-images',
  'band-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists band_images_insert on storage.objects;
create policy band_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'band-images'
    and exists (
      select 1 from public.bands
      where id::text = (storage.foldername(name))[1]
        and owner_id = auth.uid()
    )
  );

drop policy if exists band_images_update on storage.objects;
create policy band_images_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'band-images'
    and exists (
      select 1 from public.bands
      where id::text = (storage.foldername(name))[1]
        and owner_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'band-images'
    and exists (
      select 1 from public.bands
      where id::text = (storage.foldername(name))[1]
        and owner_id = auth.uid()
    )
  );

drop policy if exists band_images_delete on storage.objects;
create policy band_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'band-images'
    and exists (
      select 1 from public.bands
      where id::text = (storage.foldername(name))[1]
        and owner_id = auth.uid()
    )
  );
