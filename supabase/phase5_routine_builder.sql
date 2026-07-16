-- =====================================================================
-- Jubal — Constructor de rutinas: múltiples rutinas, secciones y pausas
-- Ejecutar después de phase4_skills.sql
-- =====================================================================

create table if not exists public.routine_sections (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  name       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists routine_sections_routine_idx on public.routine_sections(routine_id);
create unique index if not exists routine_sections_id_routine_unique on public.routine_sections(id, routine_id);

alter table public.routine_items
  add column if not exists section_id uuid references public.routine_sections(id) on delete cascade,
  add column if not exists break_after_minutes int not null default 0;

do $$ begin
  alter table public.routine_items
    add constraint routine_items_break_minutes_check
    check (break_after_minutes between 0 and 60);
exception when duplicate_object then null; end $$;

create index if not exists routine_items_section_idx on public.routine_items(section_id);

-- Cada rutina existente recibe una sección inicial. Los ejercicios previos
-- se conservan y quedan asociados a ella.
insert into public.routine_sections (routine_id, name, position)
select r.id, 'Entrenamiento', 0
from public.routines r
where not exists (
  select 1 from public.routine_sections s where s.routine_id = r.id
);

update public.routine_items item
set section_id = (
  select s.id
  from public.routine_sections s
  where s.routine_id = item.routine_id
  order by s.position, s.created_at
  limit 1
)
where item.section_id is null;

do $$ begin
  alter table public.routine_items
    add constraint routine_items_section_routine_fk
    foreign key (section_id, routine_id)
    references public.routine_sections(id, routine_id)
    on delete cascade;
exception when duplicate_object then null; end $$;

alter table public.routine_sections enable row level security;

drop policy if exists routine_sections_own on public.routine_sections;
create policy routine_sections_own on public.routine_sections for all to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = public.routine_sections.routine_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.routines r
    where r.id = public.routine_sections.routine_id and r.user_id = (select auth.uid())
  ));

-- La sección y la rutina del ejercicio deben pertenecer al mismo usuario.
drop policy if exists routine_items_own on public.routine_items;
create policy routine_items_own on public.routine_items for all to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = public.routine_items.routine_id and r.user_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.routines r
      where r.id = public.routine_items.routine_id and r.user_id = (select auth.uid())
    )
    and (
      public.routine_items.section_id is null or exists (
        select 1 from public.routine_sections s
        where s.id = public.routine_items.section_id
          and s.routine_id = public.routine_items.routine_id
      )
    )
  );

-- PostgREST puede conservar el esquema anterior durante algunos minutos.
-- Esta notificación hace visible inmediatamente la nueva relación/tablas.
notify pgrst, 'reload schema';
