# Jubal

Aplicación web para dirigir el repertorio de una banda y acompañar la práctica
personal de cada músico.

## Funciones principales

- Bandas con líderes, músicos, coristas e invitaciones.
- Biblioteca de canciones con artista, tono, BPM, duración, letra y acordes.
- Repertorios, actividades/setlists y conducción en vivo por secciones.
- Skills personales de canción, solo, lick o técnica.
- Canciones convertibles en skills con secciones importadas desde la letra.
- Práctica completa o por parte con metrónomo, tiempo, BPM y calidad.
- Rutinas por días con secciones, descansos y ejecución guiada.
- Progreso, rachas, estadísticas por skill y recomendaciones por sección.

## Stack

Vue 3, Pinia, Vue Router, Vite/PWA y Supabase (Auth, Postgres, RLS y Realtime).

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run build
```

Copia `.env.example` a `.env` y configura las credenciales públicas de Supabase.

## Base de datos

Las migraciones se aplican en orden desde `supabase/schema.sql` hasta
`supabase/phase9_cleanup_unused.sql`. La fase 9 retira funciones que no
llegaron a la interfaz: preparación compartida, asignaciones y XP.
