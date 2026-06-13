-- =====================================================================
-- Jubal — Fase 2A: Autenticación (tabla profiles + alta automática)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================================

-- Perfil público espejo de auth.users
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email        text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Por ahora cada usuario ve y edita solo su propio perfil.
-- (En la fase de bandas se permitirá ver el perfil de los compañeros de banda.)
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_upsert_own on public.profiles;
create policy profiles_upsert_own on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Crear el perfil automáticamente al registrarse (email o Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- handle_new_user solo debe correr desde el trigger, no vía API RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
