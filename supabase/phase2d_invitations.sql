-- =====================================================================
-- Jubal — Fase 2D: invitaciones por link + ver compañeros de banda
-- Ejecutar en: Supabase Dashboard → SQL Editor (ya aplicado vía MCP)
-- =====================================================================

-- 1) Invitaciones
create table if not exists public.invitations (
  id         uuid primary key default gen_random_uuid(),
  band_id    uuid not null references public.bands(id) on delete cascade,
  token      text not null unique default replace(gen_random_uuid()::text, '-', ''),
  role       public.band_role not null default 'musician',
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expires_at timestamptz,
  revoked    boolean not null default false,
  uses       integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invitations_band_idx on public.invitations(band_id);

alter table public.invitations enable row level security;

drop policy if exists invitations_manage on public.invitations;
create policy invitations_manage on public.invitations
  for all to authenticated
  using (public.is_band_leader(band_id))
  with check (public.is_band_leader(band_id));

-- 2) Ver el perfil de los compañeros de banda (no solo el propio)
create or replace function public.shares_band_with(other uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from public.band_members a
    join public.band_members b on b.band_id = a.band_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;
revoke execute on function public.shares_band_with(uuid) from public, anon;
grant   execute on function public.shares_band_with(uuid) to authenticated;

drop policy if exists profiles_select_bandmates on public.profiles;
create policy profiles_select_bandmates on public.profiles
  for select to authenticated using (public.shares_band_with(id));

-- 3) Canjear una invitación (el invitado aún no es miembro → security definer)
-- Las columnas de salida usan prefijo out_ para no chocar con band_id/role (ambigüedad).
drop function if exists public.redeem_invitation(text);
create function public.redeem_invitation(p_token text)
returns table(out_band_id uuid, out_band_name text, out_role public.band_role)
language plpgsql security definer set search_path = public as $$
declare inv public.invitations;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into inv from public.invitations where token = p_token;
  if inv.id is null      then raise exception 'Invitación inválida'; end if;
  if inv.revoked         then raise exception 'Invitación revocada'; end if;
  if inv.expires_at is not null and inv.expires_at < now()
                         then raise exception 'Invitación expirada'; end if;

  insert into public.band_members(band_id, user_id, role)
    values (inv.band_id, auth.uid(), inv.role)
    on conflict (band_id, user_id) do nothing;

  update public.invitations set uses = uses + 1 where id = inv.id;

  return query
    select inv.band_id, b.name, inv.role from public.bands b where b.id = inv.band_id;
end $$;

revoke execute on function public.redeem_invitation(text) from public, anon;
grant   execute on function public.redeem_invitation(text) to authenticated;
