# Contexto de Jubal

Jubal sirve a dos ámbitos conectados:

1. **Banda:** el líder administra canciones, repertorios, actividades, miembros,
   responsabilidades y sesiones en vivo. Los integrantes consultan el contenido
   y pueden compartir voluntariamente su preparación.
2. **Práctica personal:** cada músico gestiona canciones, solos, licks y técnicas,
   los divide en partes, crea rutinas y registra tiempo, BPM y calidad.

La canción es el puente entre ambos ámbitos. Desde su ficha puede crearse una
skill personal; las marcas `[Intro]`, `[Verso]`, `[Coro]`, `[Solo]`, etc. generan
partes practicables. Las sesiones se mantienen privadas. Solo se comparte con la
banda un resumen cuando el músico activa esa opción.

## Arquitectura actual

- Vue 3 + Pinia + Vue Router.
- Vite con soporte PWA.
- Supabase Auth, Postgres, Row Level Security y Realtime.
- Datos de banda aislados por `band_id`.
- Datos personales aislados por `user_id`.

## Migraciones

Aplicar los archivos de `supabase/` en orden. La última requerida es
`phase8_part_tempo_xp.sql` (tempo por parte + ledger de XP `xp_events`).

## Principios de producto

- El estado de aprendizaje pertenece al músico, no a la canción compartida.
- Compartir preparación es opcional y no revela el historial privado.
- Una sección o parte debe poder practicarse y medirse por separado.
- El progreso se apoya en sesiones, tiempo, calidad y BPM; el ajuste manual se
  conserva para casos excepcionales.
- El líder organiza el repertorio y responsabilidades, pero cada músico controla
  su práctica personal.
