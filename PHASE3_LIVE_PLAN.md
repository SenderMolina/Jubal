# Fase 3 — Live Session por secciones (plan)

Sesión en vivo donde un **encargado** va **avanzando por secciones** de la canción
(Intro, Verso, Coro…) y la sección actual se muestra en pantalla a toda la banda.
Coristas ven la letra estilo Spotify; músicos ven letra + acordes.

## 0. Decisiones (según refinamiento del usuario)
- **Progresión por SECCIONES**, no por scroll de píxeles. El encargado "sube" secciones
  y cada una aparece en pantalla.
- **Coristas** → letra de la sección actual, estilo Spotify (grande, resaltada).
- **Músicos** → sección actual con acordes (render estándar).
- **Entradas al live (NO desde el menú de inicio):**
  1. Desde una **actividad → un tiempo**: el setlist = las canciones de ese tiempo
     (todas se van a tocar). Se avanza canción por canción y sección por sección.
  2. Desde el **detalle de una canción** (SongView): sesión de esa sola canción.
- Quitar el botón genérico "En vivo" del POC en Actividades.

## 1. Lo que YA existe a favor
- El parser de letras ([SongView.vue](src/views/SongView.vue)) ya detecta secciones por
  `[Nombre]` **y un tiempo opcional** `[Coro 1:10]` → `secs`. Reutilizable para partir la
  canción en secciones (y, a futuro, auto-avance por tiempo).
- `activities.tiempos` = `[{ id, name, songs:[songId] }]` → el tiempo ya ES el setlist.
- Roles por banda + RLS + Realtime.

## 2. Modelo de progresión

Una canción se parte en **secciones**: cada `[Nombre]` inicia una sección que agrupa sus
líneas hasta el siguiente `[...]`. Estado en vivo = **qué canción y qué sección**:

```
setlist = [songId, …]          (canciones del tiempo, o [una canción])
current_song_index             (índice en el setlist)
current_section_index          (índice de sección dentro de la canción)
```

El encargado avanza: **▶ siguiente sección**; si es la última, pasa a la siguiente canción.
También **◀ anterior**. (Navegación de canción dentro del setlist disponible.)

## 3. Sincronización (más simple que el scroll)

Avanzar de sección es **poco frecuente** → todo va en la tabla `live_sessions`
(**Postgres Changes**). Sin broadcast de alta frecuencia. Beneficios: persistente,
re-sync instantáneo para quien entra tarde, aguanta cortes de red.

```sql
create table live_sessions (
  id            uuid primary key default gen_random_uuid(),
  band_id       uuid not null references bands(id) on delete cascade,
  source        text not null,            -- 'tiempo' | 'song'
  activity_id   bigint,                   -- si viene de una actividad
  tiempo_id     bigint,                   -- el tiempo (setlist)
  song_ids      bigint[] not null,        -- snapshot del setlist
  current_song_index    int not null default 0,
  current_section_index int not null default 0,
  controller_id uuid references auth.users(id),
  is_active     boolean not null default true,
  started_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index one_active_session_per_band on live_sessions(band_id) where is_active;
```

RLS: `SELECT` = `is_band_member(band_id)`; escritura = `is_band_leader(band_id)`.
Añadir a la publicación `supabase_realtime`.

## 4. Vistas

Extraer de `SongView` un **`SongContent.vue`** (parseo en secciones + render por rol),
reutilizado por SongView y la vista en vivo.

- **Controlador (líder)**: sección actual + **◀ / ▶ sección**, indicador "Coro · 3/7",
  nombre de la canción y "siguiente", botón **■ Terminar**.
- **Músico**: sección actual con acordes; opcional ver la siguiente atenuada.
- **Corista**: sección actual en grande, estilo Spotify (resaltada/centrada).

## 5. Entradas (UX)
- **ActividadDetailView** → en cada **tiempo**, botón **"▶ Iniciar en vivo"**
  (setlist = `tiempo.songs`).
- **SongView** → botón **"▶ En vivo"** (setlist = `[esa canción]`).
- **Banner "🔴 En vivo — Unirse"** en el shell cuando hay sesión activa en la banda.
- Quitar el botón "En vivo" del POC en Actividades.

## 6. Auto-avance por tiempo (opcional, fase posterior)
Como `[Coro 1:10]` ya da un tiempo por sección, se puede ofrecer un modo
**"reproducir"**: un timer que avanza solo según esos tiempos. v1 = **avance manual**
del encargado (fiable y como funciona una alabanza real); el timed se suma encima.

## 7. Fases
- **3A — Estado real**: tabla `live_sessions` + RLS + realtime; `stores/live.js`
  (start desde tiempo/canción, next/prev sección y canción, end); **banner** automático.
- **3B — Vista por secciones**: extraer `SongContent`; vista en vivo (control + músico
  + corista) mostrando la sección actual; entradas desde Actividad/tiempo y SongView.
- **3C — Pulido corista (Spotify)**: resaltado/centrado de la sección, transiciones.
- **3D — Extras**: presencia ("quién está en vivo"), auto-avance por tiempo, reconexión.

## 8. Alcance v1
- Controlador = líder; una sesión activa por banda.
- Avance **manual** por secciones (timed = opcional, fase posterior).
- "Estilo Spotify" = sección actual grande/resaltada (no karaoke palabra-por-palabra).
