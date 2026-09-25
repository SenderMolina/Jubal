-- =====================================================================
-- Jubal — Fase 12: catálogo personal de fuentes y técnicas
-- Ejecutar después de phase11_skill_lifecycle.sql
-- Reemplaza el texto libre (skills.source / skills.tags) por un catálogo
-- administrable: renombrar una fuente o técnica se refleja en todos sus
-- ejercicios. Técnicas como arreglo de ids, igual que songs.types (sin FK:
-- la UI ignora ids de técnicas borradas).
-- =====================================================================

create table if not exists public.practice_catalog (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('source', 'technique')),
  name       text not null check (length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

alter table public.practice_catalog enable row level security;
drop policy if exists practice_catalog_own on public.practice_catalog;
create policy practice_catalog_own on public.practice_catalog for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.skills
  add column if not exists source_id     uuid references public.practice_catalog(id) on delete set null,
  add column if not exists technique_ids uuid[] not null default '{}';
create index if not exists skills_source_id_idx on public.skills(source_id);

-- Columnas de texto libre de la fase 11 (sin datos al momento de migrar).
alter table public.skills drop column if exists source, drop column if exists tags;

notify pgrst, 'reload schema';
