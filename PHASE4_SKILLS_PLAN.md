# Fase 4 — Espacio personal del músico: Skills + Práctica (plan)

Pivote de concepto: además del ámbito de banda (repertorio compartido,
actividades, live), la app gana un **espacio personal** donde el músico
gestiona su mejora: skills a dominar, rutina de ensayo y registro de avances,
con un **metrónomo integrado** que mide el tiempo de práctica.

## 0. Decisiones (propuestas)

| Tema | Decisión |
|------|----------|
| Ámbito | Todo lo de esta fase es **por usuario** (`user_id`), no por banda |
| Repertorio personal | Reusar `songs`/`repertoires` con `band_id NULL` + `user_id` dueño (mismas vistas, sin código nuevo de canciones) |
| Tipos de skill | `lick` · `solo` · `technique` · `song` (enum, ampliable) |
| Partes | Cualquier skill puede tener partes; en la práctica solo las canciones las usan |
| Skill dominada | Meta = `target_bpm`. Al registrar una sesión con `bpm >= target_bpm` se marca `mastered` automático; el usuario también puede cambiar el estado a mano |
| Metrónomo | Web Audio API (oscilador), **sin dependencias**. Cronometra la sesión mientras suena |

## 1. Visión del flujo

```
[ /entrenar ]  Mis skills (agrupadas por estado: aprendiendo · practicando · dominada)
     │
     ▼
[ /skill/:id ]  Detalle: partes + progreso, BPM actual vs meta, historial de sesiones
     │  "Practicar"
     ▼
[ Metrónomo ]  BPM ajustable · play/stop · timer corriendo
     │  stop / guardar
     ▼
practice_sessions ← (skill, parte?, bpm alcanzado, duración)
     └─ si bpm ≥ target_bpm → skill pasa a "mastered" 🎉

[ /rutina ]  Días + horario + lista ordenada de skills con minutos y tempo objetivo
```

## 2. Modelo de datos

```sql
create type skill_type   as enum ('lick','solo','technique','song');
create type skill_status as enum ('learning','practicing','mastered');

create table skills (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  type        skill_type not null,
  song_id     uuid references songs on delete set null, -- opcional: liga a canción existente
  target_bpm  int,                -- meta; null = sin meta de tempo
  current_bpm int,                -- último bpm registrado
  status      skill_status not null default 'learning',
  notes       text,
  created_at  timestamptz default now()
);

-- Partes de una skill (secciones de una canción por aprender)
create table skill_parts (
  id        uuid primary key default gen_random_uuid(),
  skill_id  uuid not null references skills on delete cascade,
  name      text not null,          -- "Intro", "Solo", "Puente"...
  progress  int not null default 0, -- 0..100
  position  int not null default 0
);

-- Registro de avances: lo escribe el metrónomo al terminar
create table practice_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  skill_id         uuid references skills on delete set null,
  part_id          uuid references skill_parts on delete set null,
  bpm              int,
  duration_seconds int not null,
  practiced_at     timestamptz default now()
);

-- Rutina personal de ensayo
create table routines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null default 'Mi rutina',
  days       int[] not null default '{}',  -- 0=Dom..6=Sáb
  start_time time
);

create table routine_items (
  id              uuid primary key default gen_random_uuid(),
  routine_id      uuid not null references routines on delete cascade,
  skill_id        uuid not null references skills on delete cascade,
  planned_minutes int,
  target_bpm      int,     -- tempo de trabajo para esa sesión (puede < meta)
  position        int not null default 0
);
```

RLS en todas: `user_id = auth.uid()` (en `skill_parts`/`routine_items`, vía
join a la tabla padre). Mismo patrón que las policies de fase 2.

**Repertorio personal:** `alter table songs add column user_id uuid`,
ídem `repertoires`; policy extra: visible/editable si `user_id = auth.uid()`
y `band_id is null`. Las vistas actuales de canciones sirven tal cual con un
filtro "Personal | Banda".

## 3. Metrónomo (composable `useMetronome.js`)

- Web Audio API: `OscillatorNode` corto por tick, acento en el 1 (frecuencia
  más aguda). Scheduling con lookahead (`setInterval` 25ms + `audioContext.currentTime`)
  para que no se desfase — patrón estándar, ~60 líneas.
- Estado: `bpm`, `beatsPerBar`, `isRunning`, `elapsedSeconds`.
- El timer solo corre mientras suena. Al detener, si hay skill activa se
  ofrece guardar la sesión (`practice_sessions`) con el bpm y la duración.
- Si `bpm >= skill.target_bpm` al guardar → `status = 'mastered'`,
  `current_bpm = bpm`.

## 4. UI

| Ruta | Vista | Contenido |
|------|-------|-----------|
| `/entrenar` | `SkillsView` | Lista de skills con chip de tipo, barra de progreso (partes o bpm/meta), agrupadas por estado. FAB para crear |
| `/skill/:id` | `SkillDetailView` | Partes con slider de progreso · bpm actual vs meta · botón **Practicar** (abre metrónomo con la skill cargada) · historial de sesiones (lista simple: fecha, bpm, duración) |
| `/rutina` | `RoutineView` | Días de la semana + hora + items ordenables con minutos/tempo |
| — | `MetronomePanel` | Bottom-sheet reutilizable (como el player actual): bpm ± / tap tempo, play/stop, timer, skill activa |

Store nuevo: `stores/practice.js` (skills, parts, sessions, routines + realtime
opcional — para datos personales ni hace falta realtime, basta fetch).

Nav: añadir "Entrenar" al tab bar; el switch Personal/Banda ya existe
conceptualmente con la banda activa (banda activa = null → modo personal).

## 5. Orden de implementación

1. **SQL** (`phase4_skills.sql`): tablas + RLS + `user_id` en songs/repertoires.
2. **Store + SkillsView + SkillDetailView**: CRUD de skills y partes con progreso.
3. **Metrónomo**: composable + panel, guardado de sesiones, auto-mastered.
4. **Rutina**: RoutineView.
5. **Repertorio personal**: filtro Personal/Banda en vistas existentes.

Cada paso es usable por sí solo; se puede parar en cualquiera.

## Fuera de alcance (por ahora)

- Gráficas de progreso (el historial en lista cubre "registro de avances";
  gráfica cuando haya datos que la ameriten).
- Recordatorios/notificaciones de rutina (la PWA ya existe; push es otra fase).
- Compartir skills entre miembros de banda.
