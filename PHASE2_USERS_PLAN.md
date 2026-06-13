# Fase 2 — Usuarios, Bandas y Roles (plan)

Plan para añadir **autenticación real, bandas multi-tenant, roles por banda e
invitaciones por link**, reemplazando la contraseña quemada y el rol en
`sessionStorage`. Deja la base lista para la **Fase 3 (Live Session)**.

## 0. Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Login | Email/contraseña **+ Google OAuth** (Supabase Auth) |
| Datos actuales | Quedan **huérfanos** (`band_id NULL`) hasta reclamarlos a la banda raíz |
| Administración | **Dueño + varios líderes**; músico/corista solo lectura |
| Roles por banda | `leader` · `musician` · `singer` (mapean a isLeader/isMusico/isCantante) |

> ⚠️ Con RLS por banda, los registros huérfanos (`band_id NULL`) **no son visibles**
> para ningún cliente hasta que se reclamen. Quedan seguros en la base.

## 1. Visión del flujo

```
[ /login ]  email+pass / Google
     │ (sesión iniciada)
     ▼
[ /bandas ]  Mis bandas (con mi rol) · Crear banda · Unirme con código
     │ (elijo / creo banda → banda activa)
     ▼
[ App ]  vista filtrada por mi rol en esa banda
     · leader  → gestiona canciones raíz, repertorios, actividades, miembros
     · musician→ ve letra + acordes (estándar actual)
     · singer  → ve solo letras (base para vista estilo Spotify)
```

## 2. Modelo de datos

### 2.1 Tablas nuevas
```sql
-- Perfil público espejo de auth.users (poblado por trigger al registrarse)
profiles(id uuid PK = auth.users.id, display_name, email, avatar_url, created_at)

-- Bandas (tenant)
bands(id uuid PK, name, owner_id uuid → auth.users, created_at)

-- Membresía + rol por banda
band_role = enum('leader','musician','singer')
band_members(band_id → bands, user_id → auth.users, role band_role,
             joined_at, PK(band_id,user_id))

-- Invitaciones por link
invitations(id uuid PK, band_id → bands, token text unique, role band_role,
            created_by, expires_at, max_uses int, uses int, created_at)
```

### 2.2 Cambios a tablas existentes
Añadir `band_id uuid references bands(id)` a **songs, song_types, repertoires,
activities** (nullable al inicio → datos huérfanos). Índice por `band_id`.
`repertoire_songs` se mantiene acotado vía su repertorio.

## 3. Seguridad (RLS)

Funciones helper (security definer):
```sql
is_band_member(b uuid) -> bool   -- existe band_members(b, auth.uid())
is_band_leader(b uuid) -> bool   -- rol 'leader' en b, o owner de b
```

Políticas:
- **songs / song_types / repertoires / activities**
  - `SELECT`  → `is_band_member(band_id)`
  - `INSERT/UPDATE/DELETE` → `is_band_leader(band_id)`
- **bands**: SELECT si miembro · INSERT cualquier autenticado · UPDATE/DELETE solo owner
- **band_members**: SELECT si miembro · gestión (INSERT/UPDATE/DELETE) solo leader
- **invitations**: gestión solo leader; el canje va por RPC (abajo)

`app_config.leaderPassword` queda **obsoleto** y se elimina.

## 4. Flujo de invitación

1. Líder pulsa "Invitar" → elige rol → se crea `invitations(token, role, expires_at)`.
   Link: `https://<app>/#/join/<token>`.
2. Invitado abre el link:
   - Sin sesión → /login (se preserva el token y se retoma tras autenticar).
   - Con sesión → se llama RPC **`redeem_invitation(token)`**.
3. `redeem_invitation` (security definer) valida token/expiración/usos, inserta en
   `band_members` con el rol, incrementa `uses`, y devuelve la banda. Redirige a ella.

> Se usa RPC porque el invitado aún no es miembro y RLS no le permitiría insertarse;
> la función con privilegios elevados hace la validación de forma segura.

## 5. Cambios en el cliente (Vue)

### 5.1 Stores nuevos / cambios
- **`stores/auth.js`** (nuevo): `user`, `session`, `signInWithPassword`, `signUp`,
  `signInWithGoogle`, `signOut`; reactivo vía `supabase.auth.onAuthStateChange`.
- **`stores/band.js`** (nuevo): `bands` (las del usuario), `currentBand`, y
  **computed `isLeader` / `isMusico` / `isCantante`** derivados del rol en la banda
  activa. ⇒ las ~20 vistas que usan `roleStore.isLeader/isMusico/isCantante`
  casi no cambian (solo el import del store). `leader→isLeader`,
  `musician→isMusico`, `singer→isCantante`.
- **`stores/role.js`**: se elimina (su API la asume `band.js`).
- **`stores/app.js`**: todas las queries/inserts/realtime se filtran por
  `band_id = currentBand`. Al cambiar de banda → recargar datos.

### 5.2 Routing / guards
- Guard global: sin sesión → `/login`; con sesión sin banda activa → `/bandas`.
- Rutas nuevas: `/login`, `/bandas`, `/join/:token`.

### 5.3 Nueva pantalla de inicio (la "mejora del menú")
- **/login**: branding + "Continuar con Google" + form email/contraseña (tabs).
- **/bandas**: tarjetas de bandas con el rol del usuario · "Crear banda" ·
  "Unirme con código". Estilo móvil-primero consistente con la UI actual.
- **Header**: el botón "cambiar rol" pasa a **"cambiar de banda / cerrar sesión"**.
- **Gestión de miembros** (solo líder): lista de miembros, cambiar rol, quitar,
  generar link de invitación.

## 6. Reclamar los datos huérfanos
Cuando definas la banda raíz, una acción (botón solo-dueño o script
`scripts/claim-orphan-data.mjs`) ejecuta:
```sql
update songs       set band_id = :banda where band_id is null;
update song_types  set band_id = :banda where band_id is null;
update repertoires set band_id = :banda where band_id is null;
update activities  set band_id = :banda where band_id is null;
```

## 7. Configuración de Google OAuth (resumen)
1. Google Cloud Console → crear OAuth consent screen + OAuth Client (Web).
2. Authorized redirect URI: `https://<proyecto>.supabase.co/auth/v1/callback`.
3. Pegar Client ID/Secret en Supabase → Authentication → Providers → Google.
(Guía detallada al implementar.)

## 8. Orden de implementación (v1 = solo gestión de usuarios)

- **2A. Auth básico** — Email+Google en Supabase, `auth.js`, `/login`, guard, trigger `profiles`.
- **2B. Bandas** — tablas + RLS + helpers, `band.js`, pantalla `/bandas`.
- **2C. Aislar datos** — `band_id` en tablas existentes, RLS por banda, `app.js` adaptado, reclamar huérfanos.
- **2D. Invitaciones** — RPC `redeem_invitation`, UI de link + `/join/:token`, gestión de miembros.
- **2E. Pulir inicio** — rediseño home + header.

## 9. Fase 3 — Live Session (solo diseño, no en v1)
```sql
live_sessions(id, band_id, activity_id, controller_id,
              current_song_id, current_tiempo_id,
              is_playing bool, scroll_position float, updated_at)
```
- El encargado (controller) actualiza la canción/scroll; **realtime** lo propaga a
  todos los miembros conectados.
- **Corista** → letra grande sin acordes, scroll sincronizado (estilo Spotify).
- **Músico** → estándar actual con acordes.
- Encaja con lo ya existente: realtime, roles, y `SongView` ya oculta acordes para
  el rol cantante (`hideChords`). Solo falta el "estado de sesión compartido".
```
