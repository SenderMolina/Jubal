# Jubal

Aplicación web para dirigir el repertorio de una banda y acompañar la práctica
personal de cada músico.

## Funciones principales

- Bandas con líderes, músicos, coristas e invitaciones.
- Biblioteca de canciones con artista, tono, BPM, duración, letra y acordes.
- Audio adjunto por canción con reproductor flotante, barra de progreso y saltos de 10 segundos.
- Repertorios y actividades con setlists por tiempos.
- El modo en vivo (conducción por secciones) está en la rama `en-vivo`.
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
`supabase/phase13_song_audio.sql`. La fase 13 agrega el audio opcional de las
canciones y el bucket privado `song-audio`. Ejecuta esta migración en el SQL
Editor de Supabase antes de usar los adjuntos. Los líderes pueden subir,
reemplazar y quitar audio desde **Editar canción → Detalles**; los miembros
pueden escucharlo. En el espacio personal cada usuario administra su audio.
Se aceptan MP3, M4A, WAV, OGG y WebM de hasta 25 MB; la reproducción depende
de los formatos compatibles con el navegador. El audio requiere conexión.
