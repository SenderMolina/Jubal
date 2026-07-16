-- =====================================================================
-- Jubal — Fase 8: tempo por parte + XP de dominio no reversible
-- Ejecutar después de phase7_integrated_practice.sql
-- =====================================================================

-- Cada parte (frase de un solo, sección de una canción) tiene su propio
-- tempo de trabajo; la skill conserva el suyo como valor global.
alter table public.skill_parts
  add column if not exists target_bpm int,
  add column if not exists current_bpm int;

-- Ledger mínimo de XP: los hitos ganados no se pierden aunque el registro
-- que los originó se borre (sin FK a skills a propósito).
create table if not exists public.xp_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount     int not null check (amount > 0),
  reason     text not null,
  ref_id     uuid,
  ref_name   text,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_user_idx on public.xp_events(user_id);

-- Un mismo hito no se paga dos veces (p. ej. dominar, desmarcar y volver a dominar).
create unique index if not exists xp_events_once_per_ref
  on public.xp_events(user_id, reason, ref_id) where ref_id is not null;

alter table public.xp_events enable row level security;

drop policy if exists xp_events_own_select on public.xp_events;
create policy xp_events_own_select on public.xp_events
  for select to authenticated using (user_id = (select auth.uid()));
-- Sin policy de insert/update/delete: solo escribe el trigger (security definer).

create or replace function public.award_mastery_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'mastered' and (tg_op = 'INSERT' or old.status is distinct from 'mastered') then
    insert into public.xp_events (user_id, amount, reason, ref_id, ref_name)
    values (new.user_id, 100, 'skill_mastered', new.id, new.name)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists skills_award_mastery on public.skills;
create trigger skills_award_mastery
after insert or update of status on public.skills
for each row execute function public.award_mastery_xp();

revoke execute on function public.award_mastery_xp() from public, anon, authenticated;

-- Backfill: las skills ya dominadas ganan su hito.
insert into public.xp_events (user_id, amount, reason, ref_id, ref_name)
select user_id, 100, 'skill_mastered', id, name
from public.skills where status = 'mastered'
on conflict do nothing;

notify pgrst, 'reload schema';
