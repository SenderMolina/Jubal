-- =====================================================================
-- Jubal — Fase 2B: bandas, membresías y roles
-- Ejecutar en: Supabase Dashboard → SQL Editor (ya aplicado vía MCP)
-- =====================================================================

-- Rol dentro de una banda
do $$ begin
  create type public.band_role as enum ('leader','musician','singer');
exception when duplicate_object then null; end $$;

-- Bandas (tenant)
create table if not exists public.bands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Membresía + rol por banda
create table if not exists public.band_members (
  band_id   uuid not null references public.bands(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      public.band_role not null default 'musician',
  joined_at timestamptz not null default now(),
  primary key (band_id, user_id)
);
create index if not exists band_members_user_idx on public.band_members(user_id);

-- ---------- Helpers (security definer para evitar recursión en RLS) ----------
create or replace function public.is_band_member(b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.band_members
                where band_id = b and user_id = auth.uid());
$$;

create or replace function public.is_band_leader(b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.band_members
                where band_id = b and user_id = auth.uid() and role = 'leader')
      or exists(select 1 from public.bands
                where id = b and owner_id = auth.uid());
$$;

revoke execute on function public.is_band_member(uuid), public.is_band_leader(uuid) from public, anon;
grant   execute on function public.is_band_member(uuid), public.is_band_leader(uuid) to authenticated;

-- ---------- RLS ----------
alter table public.bands        enable row level security;
alter table public.band_members enable row level security;

drop policy if exists bands_select on public.bands;
create policy bands_select on public.bands
  for select to authenticated
  using (public.is_band_member(id) or owner_id = auth.uid());

drop policy if exists bands_insert on public.bands;
create policy bands_insert on public.bands
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists bands_modify on public.bands;
create policy bands_modify on public.bands
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists bands_delete on public.bands;
create policy bands_delete on public.bands
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists band_members_select on public.band_members;
create policy band_members_select on public.band_members
  for select to authenticated using (public.is_band_member(band_id));

drop policy if exists band_members_manage on public.band_members;
create policy band_members_manage on public.band_members
  for all to authenticated
  using (public.is_band_leader(band_id))
  with check (public.is_band_leader(band_id));

-- ---------- RPC: crear banda + auto-membresía de líder (atómico) ----------
create or replace function public.create_band(p_name text)
returns public.bands language plpgsql security definer set search_path = public as $$
declare b public.bands;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  insert into public.bands(name, owner_id)
    values (coalesce(nullif(trim(p_name), ''), 'Mi banda'), auth.uid())
    returning * into b;
  insert into public.band_members(band_id, user_id, role)
    values (b.id, auth.uid(), 'leader');
  return b;
end $$;

revoke execute on function public.create_band(text) from public, anon;
grant   execute on function public.create_band(text) to authenticated;
