# Proyecto: App de Repertorio de Alabanzas

## Descripción
App web para un grupo de alabanza pequeño (3-10 personas), construida en HTML/CSS/JS puro (un solo archivo `index.html`). El líder selecciona canciones para el servicio del día y los músicos las ven con letra y acordes en tiempo real.

## Roles
- **Líder de alabanza** — puede agregar, editar, eliminar canciones y armar el setlist del día
- **Músicos** — ven el setlist con letra y acordes (vista de solo lectura)

## Funciones actuales
- Repertorio de alabanzas con título, autor, tono (key), BPM y letra+acordes
- Setlist del día — el líder selecciona qué canciones se tocan
- Vista de letra y acordes por canción (detecta líneas de acordes automáticamente)
- Búsqueda en el repertorio
- Agregar y eliminar canciones con formulario
- Los datos se guardan en `localStorage` (solo local, sin sincronización)
- 5 canciones de ejemplo precargadas
- Diseño oscuro, minimalista, responsive (funciona en celular)

## Stack
- HTML + CSS + JavaScript puro (vanilla), sin frameworks
- Un solo archivo: `index.html`
- Fuentes: DM Serif Display + DM Sans (Google Fonts)
- Almacenamiento actual: `localStorage`

## Próximos pasos (pendientes)
1. **Conectar Firebase Realtime Database** para que el setlist y el repertorio se sincronicen en tiempo real entre todos los usuarios
2. **Publicar en GitHub Pages** como `usuario.github.io/alabanzas-iglesia`
3. Considerar roles con autenticación (líder vs músico) en el futuro

## Estructura del proyecto
```
alabanzas-iglesia/
├── index.html       # App completa (único archivo por ahora)
└── CONTEXTO.md      # Este archivo
```

## Notas importantes
- Al conectar Firebase, reemplazar `localStorage` por Firebase Realtime Database
- El setlist debe actualizarse en tiempo real para todos los usuarios conectados
- Mantener el diseño actual (oscuro, minimalista) al agregar nuevas funciones
- El proyecto debe seguir siendo lo más simple posible (sin frameworks pesados si no es necesario)
