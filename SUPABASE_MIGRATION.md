# Migración de Firebase → Supabase (Jubal)

Plan y guía de ejecución para mover la app del **Firebase Realtime Database** a
**Supabase (Postgres + Realtime)**, conservando el comportamiento actual y dejando
la base lista para mejoras futuras.

## 1. Resumen de la decisión

| Tema | Decisión |
|------|----------|
| Modelo de datos | **Relacional normalizado** (tablas + tabla puente para repertorios) |
| `activities.tiempos` | Columna **JSONB** (objeto-valor anidado, siempre editado en bloque) |
| Autenticación | **Contraseña simple por ahora** (tabla `app_config` + rol en `sessionStorage`) |
| IDs | **`bigint` provistos por el cliente** (`Date.now()`), preservan IDs existentes |
| API del store | Se mantiene igual (`songs`, `activities`, `songTypes`, `repertoires`, `saveX()`) → las vistas **no cambian** |

## 2. Mapeo de datos

| Firebase RTDB | Supabase |
|---------------|----------|
| `songs` | tabla `songs (id, title, author, key, bpm, lyrics)` |
| `songTypes` | tabla `song_types (id, name)` |
| `repertoires` | tabla `repertoires (id, name)` + `repertoire_songs (repertoire_id, song_id, position)` |
| `activities` | tabla `activities (id, title, date, time, description, tiempos jsonb)` |
| `config/leaderPassword` | tabla `app_config (key, value)` → fila `('leaderPassword', 'musicman')` |

> `repertoire.songs` (array ordenado de IDs) se reconstruye al leer y se sincroniza
> en `saveRepertoires()` contra la tabla puente. `tiempos` viaja completo en JSONB.

## 3. Pasos de ejecución

### 3.1 Crear proyecto Supabase
1. Crear proyecto en https://supabase.com (región más cercana).
2. Copiar **Project URL** y **anon public key** (Settings → API).

### 3.2 Crear el esquema
Ejecutar [`supabase/schema.sql`](supabase/schema.sql) en el **SQL Editor** de Supabase.

### 3.3 Migrar los datos existentes
1. En la consola de Firebase → Realtime Database → **Exportar JSON**, guardar como
   `firebase-export.json` en la raíz del proyecto.
2. Configurar credenciales con permisos de escritura (usar la **service_role key**
   solo localmente, nunca en el cliente):
   ```bash
   export SUPABASE_URL="https://xxxx.supabase.co"
   export SUPABASE_SERVICE_KEY="eyJ..."   # service_role (solo local)
   node scripts/migrate-firebase-to-supabase.mjs firebase-export.json
   ```
3. Verificar en el **Table Editor** que los conteos coinciden.

### 3.4 Cambiar la capa de datos en el código
- Nuevo cliente: [`src/supabase.js`](src/supabase.js).
- Stores reescritos: [`src/stores/app.js`](src/stores/app.js), [`src/stores/role.js`](src/stores/role.js).
- `firebase` se puede desinstalar una vez verificado todo (`npm remove firebase`).

### 3.5 Variables de entorno
Reemplazar las `VITE_FIREBASE_*` por:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
Actualizar en: `.env.development`, `.env.production`, y los **secrets** del repo
(GitHub → Settings → Secrets → Actions). El workflow `.github/workflows/deploy.yml`
ya queda actualizado.

### 3.6 Verificación
- `npm run dev`, probar como líder y como músico.
- Confirmar realtime: abrir dos pestañas, editar en una y ver el cambio en la otra.
- Validar repertorios (orden), tiempos de actividades, y la contraseña de líder.

### 3.7 Decomisionar Firebase
Cuando todo funcione en producción durante unos días: bajar reglas de RTDB a
solo-lectura y luego eliminar la base.

## 4. Seguridad (estado actual y futuro)

- Hoy Firebase está **abierto** (sin auth). El esquema replica eso con RLS
  permisivo para el rol `anon` (lectura + escritura), de modo que la app pública
  en GitHub Pages siga funcionando con la `anon key`.
- **Mejora recomendada** (fase 2): adoptar Supabase Auth, mover la escritura
  detrás de políticas RLS por rol y dejar `anon` solo-lectura. Ver sección 5.

## 5. Mejoras habilitadas tras la migración (fase 2)

- Auth real (magic link / email) y roles por usuario con RLS.
- Operaciones por fila (insert/update/delete) en vez de reescribir arrays completos.
- Storage de Supabase para PDFs/partituras/audio por canción.
- Historial de servicios y reportes (consultas SQL sobre `activities`).
- Búsqueda full-text en `songs.lyrics`.

## 6. Constructor avanzado de rutinas

Para habilitar múltiples rutinas, secciones y descansos entre ejercicios, ejecutar
[`supabase/phase5_routine_builder.sql`](supabase/phase5_routine_builder.sql) en el
SQL Editor después de `phase4_skills.sql`. La migración conserva los ejercicios
existentes y los mueve a una sección inicial llamada “Entrenamiento”.

## 7. Ejecución guiada y progreso verificable

Después de la fase 5, ejecutar
[`supabase/phase6_guided_practice.sql`](supabase/phase6_guided_practice.sql).
Esta migración agrega las partidas de rutina, resultados por habilidad, recuperación
de sesiones interrumpidas y cálculo de XP de misión dentro de la base de datos.

## 8. Integración de repertorio y práctica

Después de la fase 6, ejecutar
[`supabase/phase7_integrated_practice.sql`](supabase/phase7_integrated_practice.sql).
Esta migración:

- vincula las partes practicables con las secciones importadas de una canción;
- permite elegir una parte concreta dentro de una rutina;
- agrega preparación compartida opcional sin exponer sesiones privadas;
- agrega responsabilidades de músicos por canción;
- sincroniza los resúmenes de preparación mediante triggers;
- reemplaza el orden de cada repertorio dentro de una transacción.
