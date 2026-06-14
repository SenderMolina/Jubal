# Fase 3 — Live Session (plan)

Sesión en vivo donde un **encargado (líder)** controla qué canción/sección se ve, y
**todos los miembros conectados** siguen en tiempo real: coristas ven la letra grande
(estilo Spotify), músicos ven letra + acordes (estándar actual).

## 0. Qué ya tenemos a favor
- **Supabase Realtime** (Postgres Changes + Broadcast + Presence) — ya en uso.
- **Roles por banda** (`leader`/`musician`/`singer`) con RLS.
- **`activities.tiempos`** = `[{ id, name, songs:[songId] }]` → ya es el "setlist por secciones".
- **`SongView`** ya parsea acordes/letra (`renderedLines`, `chordRegex`) y **oculta acordes
  para coristas**; además soporta embeds por rol (`embedCantante`/`embedMusico`).

## 1. Concepto y flujo

```
Líder abre una actividad → "▶ Iniciar en vivo"
   └─ crea live_session (canción/sección inicial)
Resto de miembros → ven banner "🔴 En vivo — Unirse"
   └─ entran a la vista en vivo, sincronizada por rol
Líder navega canción/sección y hace scroll
   └─ todos siguen en tiempo real
Líder "■ Terminar" → la sesión se cierra para todos
```

## 2. Estrategia de sincronización (clave)

Híbrido, para latencia baja sin saturar la base:

| Qué | Frecuencia | Canal | Por qué |
|-----|-----------|-------|---------|
| Canción / sección / play-pause actual | baja | **tabla `live_sessions`** (Postgres Changes) | Persistente → quien entra tarde se sincroniza solo |
| Posición de scroll / línea actual | alta | **Broadcast** (efímero) | No escribe en la base en cada tick; barato y rápido |
| Quién está conectado | — | **Presence** | Mostrar "5 en vivo" + avatares |

> El scroll se transmite como **proporción 0–1** (`scrollTop/scrollHeight`), no en píxeles,
> para que cuadre entre celulares con distinto tamaño de letra/pantalla.

## 3. Modelo de datos

```sql
create table live_sessions (
  id              uuid primary key default gen_random_uuid(),
  band_id         uuid not null references bands(id) on delete cascade,
  activity_id     bigint,                 -- opcional: sesión basada en una actividad
  controller_id   uuid references auth.users(id),
  current_song_id   bigint,
  current_tiempo_id bigint,               -- sección/tiempo actual del setlist
  is_playing      boolean not null default false,
  is_active       boolean not null default true,
  started_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Una sola sesión activa por banda
create unique index one_active_session_per_band
  on live_sessions(band_id) where is_active;
```

RLS:
- `SELECT`: `is_band_member(band_id)` (todos los miembros ven/siguen la sesión).
- `INSERT/UPDATE/DELETE`: `is_band_leader(band_id)` (solo el líder controla).
- Añadir `live_sessions` a la publicación `supabase_realtime`.

## 4. Reutilización de código (refactor previo)

Extraer de `SongView` un componente **`SongContent.vue`** que reciba `:song` y
`:hideChords` y renderice `renderedLines`/embeds. Así lo usan **igual** `SongView`
(detalle normal) y `LiveView` (en vivo), sin duplicar el parseo de acordes.

## 5. Piezas de cliente

- **`stores/live.js`**: estado de la sesión + suscripciones.
  - State: `session` (fila activa), `presence` (conectados), `isController`, `following` (scroll sincronizado on/off).
  - Acciones líder: `start(activityId?)`, `end()`, `setSong(id)`, `setTiempo(id)`, `togglePlay()`, `broadcastScroll(ratio)`.
  - Acciones miembro: `join()`, `leave()`, `applyScroll(ratio)`, `detach()/reattach()`.
  - Suscribe: Postgres Changes de `live_sessions` (su banda) + canal Broadcast `live:<band_id>` + Presence.
- **`views/LiveView.vue`** (ruta `/live`): adapta por rol.
  - Líder → panel de control (canción anterior/siguiente, secciones del setlist, play/pausa, "terminar") + su scroll manda.
  - Músico → `SongContent` con acordes, auto-scroll siguiendo al líder (con botón "🔓 scroll libre").
  - Corista → letra grande sin acordes, sección actual resaltada, auto-scroll.
- **`components/LiveBanner.vue`**: barra "🔴 En vivo — Unirse" en el shell de la app cuando hay sesión activa en la banda y no estás dentro. (Se alimenta de la suscripción a `live_sessions`.)
- **Presence**: lista/contador de quién está en vivo en el panel del líder.

## 6. Detalles de UX
- **Entrar tarde**: al unirse, se lee la fila `live_sessions` → salta a la canción/sección actual y luego sigue los broadcasts.
- **Reconexión**: al reconectar, re-leer la fila para resincronizar.
- **Scroll libre**: el seguidor puede soltarse para mirar otra parte; botón "Volver a sincronizar" para re-enganchar.
- **Solo el líder transmite scroll**: los seguidores ignoran mensajes que no vengan de `controller_id`.

## 7. Fases de implementación
- **3A — Estado de sesión**: tabla `live_sessions` + RLS + realtime; `stores/live.js` con `start/end/setSong/setTiempo`; `LiveBanner`. (Sin scroll sync aún: cambiar de canción/sección ya sincroniza a todos.)
- **3B — Vista en vivo por rol**: extraer `SongContent`; `LiveView` que sigue `current_song_id`/`current_tiempo_id`; panel de control del líder.
- **3C — Scroll estilo Spotify**: Broadcast de scroll (proporción) + auto-scroll en seguidores + "scroll libre"; vista corista con sección resaltada.
- **3D — Presencia y pulido**: Presence ("quién está en vivo"), play/pausa, transiciones, manejo de reconexión.

## 8. Alcance / expectativas (importante)
- **"Estilo Spotify" v1 = scroll suave dirigido por el líder + sección resaltada**, NO karaoke
  palabra-por-palabra. El resaltado por línea con tiempos (tipo LRC) exigiría **cronometrar
  cada canción** — gran esfuerzo de contenido; queda para una fase futura.
- **Controlador = líder** en v1. "Pasar el control" a otro miembro → futuro.
- **Una sesión activa por banda** (índice único). Suficiente para un equipo.

## 9. Costo / rendimiento
- Broadcast no toca la base → barato. Throttle del scroll (~5–10 msg/s).
- Conexiones concurrentes de Realtime holgadas para una banda (decenas) en el plan actual.

## 10. Prototipo sugerido (de-risk)
Antes de construir toda la pantalla: un POC mínimo de **3A+3C** — líder moviendo
canción/scroll y un seguidor actualizándose — para validar latencia y la sincronización
de scroll por proporción en dos celulares distintos.
