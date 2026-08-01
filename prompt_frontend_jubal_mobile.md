# Prompt de diseño frontend para Jubal

## Objetivo

Diseña y desarrolla el frontend de **Jubal**, una aplicación móvil para organizar repertorios, canciones, actividades y tiempos musicales de grupos cristianos.

La interfaz debe estar optimizada principalmente para celulares y debe utilizar un estilo visual inspirado en aplicaciones educativas gamificadas modernas: juvenil, dinámico, amigable, colorido y fácil de entender, sin copiar personajes, ilustraciones, marcas, distribuciones exactas ni elementos protegidos de otras aplicaciones.

El resultado debe sentirse como una aplicación musical gamificada, no como un panel administrativo tradicional.

---

## Concepto visual general

Utiliza un estilo:

- Cartoon 2.5D.
- Game-like mobile UI.
- Soft plastic UI.
- Ilustración vectorial con volumen.
- Skeuomorfismo simplificado.
- Iconografía tipo sticker.
- Interfaz basada en tarjetas, nodos, progreso y recompensas visuales.

La interfaz no debe ser completamente plana. Debe utilizar profundidad mediante:

- Sombras inferiores rígidas.
- Sombras suaves externas.
- Reflejos en la parte superior.
- Capas internas.
- Bordes redondeados.
- Degradados moderados.
- Estados visuales claramente diferenciados.

Evita:

- Neón.
- Realismo.
- Glassmorphism excesivo.
- Neumorfismo puro.
- Interfaces corporativas frías.
- Saturación de elementos.
- Sombras exageradas.
- Gradientes muy complejos.
- Detalles pequeños que desaparezcan en celular.

---

## Identidad visual de Jubal

Utiliza como base la siguiente paleta:

```css
:root {
  --jubal-navy: #023047;
  --jubal-navy-dark: #011f2d;
  --jubal-blue: #219ebc;
  --jubal-blue-light: #8ecae6;
  --jubal-orange: #fb8500;
  --jubal-yellow: #ffb703;

  --jubal-success: #19c89d;
  --jubal-success-dark: #0b8f72;
  --jubal-danger: #ef526f;

  --jubal-surface: #0f252d;
  --jubal-surface-raised: #17343e;
  --jubal-text: #ffffff;
  --jubal-text-muted: rgba(255, 255, 255, 0.72);
}
```

Los colores principales deben ser:

- Azul navy para fondos y navegación.
- Azul celeste para selección, información y progreso.
- Naranja para acciones principales.
- Amarillo para logros, destacados y elementos musicales.
- Verde turquesa para estados completados.
- Rojo rosado para alertas o notificaciones.

No utilices todos los colores con la misma intensidad al mismo tiempo. Cada pantalla debe tener un color dominante y uno o dos colores de apoyo.

---

## Tipografía

Utiliza una tipografía redondeada, moderna y legible.

Opciones recomendadas:

```css
font-family: "Nunito", "Fredoka", "Baloo 2", system-ui, sans-serif;
```

Preferencia principal:

```css
font-family: "Nunito", system-ui, sans-serif;
```

Jerarquía sugerida:

```css
.page-title {
  font-size: clamp(1.5rem, 5vw, 2rem);
  line-height: 1.15;
  font-weight: 900;
}

.section-title {
  font-size: 1.125rem;
  line-height: 1.3;
  font-weight: 800;
}

.body-text {
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 600;
}

.caption {
  font-size: 0.8125rem;
  line-height: 1.35;
  font-weight: 700;
}
```

Evita textos demasiado pequeños. El tamaño mínimo para contenido normal debe ser aproximadamente `14px`.

---

## Optimización mobile-first

Diseña primero para pantallas de:

- 320 px.
- 360 px.
- 390 px.
- 412 px.
- 430 px.

Después adapta el diseño para tablet y escritorio.

Utiliza:

```css
* {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--jubal-surface);
  color: var(--jubal-text);
  font-family: "Nunito", system-ui, sans-serif;
}
```

Contenedor principal:

```css
.app-shell {
  width: 100%;
  max-width: 480px;
  min-height: 100dvh;
  margin-inline: auto;
  padding:
    max(16px, env(safe-area-inset-top))
    16px
    calc(96px + env(safe-area-inset-bottom));
}
```

En escritorio, no estires la interfaz móvil indefinidamente. Mantén un ancho máximo razonable o crea una composición específica para pantallas grandes.

---

## Sistema de espaciado

Utiliza una escala consistente:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
}
```

Evita valores arbitrarios repetidos.

---

## Bordes y radios

Utiliza formas suaves y redondeadas:

```css
:root {
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-xl: 30px;
  --radius-pill: 999px;
}
```

Los botones circulares, avatares y nodos deben usar:

```css
border-radius: 50%;
```

---

## Estilo de iconos

Los iconos deben verse como piezas plásticas o stickers 2.5D.

Características:

- Silueta compacta.
- Formas redondeadas.
- Pocos detalles internos.
- Colores saturados, pero no neón.
- Reflejo superior izquierdo.
- Sombra inferior.
- Contornos suaves.
- Buena lectura entre 24 y 56 px.
- Uso preferente de SVG.
- Ilustraciones complejas en SVG, WebP o PNG.
- Animaciones con CSS, Rive o Lottie cuando sea necesario.

Los SVG deben utilizar:

```css
.icon {
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
}

.icon path,
.icon circle,
.icon rect {
  stroke-linecap: round;
  stroke-linejoin: round;
}
```

No dibujes personajes o ilustraciones complejas únicamente con CSS. Utiliza recursos gráficos apropiados.

---

## Botones principales

Los botones deben sentirse presionables y físicos.

```css
.game-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  min-height: 52px;
  padding: 12px 20px;

  border: 0;
  border-radius: 18px;

  color: #fff;
  background: var(--jubal-orange);

  font: inherit;
  font-weight: 900;

  box-shadow:
    0 6px 0 #c86400,
    0 10px 18px rgb(0 0 0 / 20%);

  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    filter 120ms ease;
}
```

Estado presionado:

```css
.game-button:active {
  transform: translateY(4px);

  box-shadow:
    0 2px 0 #c86400,
    0 5px 10px rgb(0 0 0 / 18%);
}
```

Estado deshabilitado:

```css
.game-button:disabled {
  color: rgba(255, 255, 255, 0.45);
  background: #52646a;

  box-shadow:
    0 5px 0 #39494e;

  cursor: not-allowed;
  filter: saturate(0.4);
}
```

El botón no debe depender únicamente del color para comunicar su estado.

---

## Nodos circulares de progreso

Para actividades, canciones aprendidas, ensayos o etapas, utiliza nodos circulares grandes.

```css
.progress-node {
  position: relative;
  width: clamp(76px, 23vw, 104px);
  aspect-ratio: 1;
  padding: 0;

  border: 0;
  border-radius: 50%;

  background: var(--jubal-success-dark);

  box-shadow:
    0 8px 0 #076c58,
    0 13px 20px rgb(0 0 0 / 24%);
}
```

Cara superior:

```css
.progress-node__face {
  position: absolute;
  inset: 4px 4px 11px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  background:
    radial-gradient(
      circle at 32% 22%,
      rgb(255 255 255 / 32%),
      transparent 24%
    ),
    linear-gradient(
      145deg,
      #28dfb7,
      #0fc89f
    );

  box-shadow:
    inset 0 3px 0 rgb(255 255 255 / 20%),
    inset 0 -6px 0 rgb(0 89 70 / 16%);
}
```

Nodo activo:

```css
.progress-node--active {
  box-shadow:
    0 0 0 5px var(--jubal-navy-dark),
    0 0 0 10px var(--jubal-blue),
    0 8px 0 #076c58,
    0 14px 22px rgb(0 0 0 / 28%);
}
```

Nodo bloqueado:

```css
.progress-node--locked {
  background: #394b50;
  box-shadow:
    0 7px 0 #28383d,
    0 11px 16px rgb(0 0 0 / 16%);
  filter: saturate(0.25) brightness(0.78);
}
```

No utilices únicamente `opacity` sobre todo el elemento bloqueado, porque también debilita sus sombras y reduce la claridad.

---

## Tarjetas

Las tarjetas deben tener volumen, jerarquía y separación clara.

```css
.game-card {
  padding: 18px;

  border-radius: 24px;
  background: var(--jubal-surface-raised);

  box-shadow:
    0 6px 0 #0b2028,
    0 10px 22px rgb(0 0 0 / 18%);
}
```

Tarjeta destacada:

```css
.game-card--featured {
  background:
    radial-gradient(
      circle at 15% 10%,
      rgb(255 255 255 / 12%),
      transparent 30%
    ),
    linear-gradient(
      145deg,
      #27b5d5,
      var(--jubal-blue)
    );

  box-shadow:
    0 7px 0 #167992,
    0 12px 22px rgb(0 0 0 / 20%);
}
```

Las tarjetas deben tener títulos claros, máximo dos acciones principales y suficiente espacio táctil.

---

## Barra de navegación inferior

Utiliza navegación inferior fija para las secciones principales:

- Inicio.
- Actividades.
- Repertorio.
- Canciones.
- Tiempos.
- Perfil o configuración.

```css
.bottom-nav {
  position: fixed;
  z-index: 100;
  right: 0;
  bottom: 0;
  left: 0;

  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  align-items: center;

  min-height: 76px;
  padding:
    8px
    max(10px, env(safe-area-inset-right))
    calc(8px + env(safe-area-inset-bottom))
    max(10px, env(safe-area-inset-left));

  background: rgba(11, 29, 36, 0.98);
  border-top: 2px solid rgba(142, 202, 230, 0.2);
}
```

Cada opción:

```css
.bottom-nav__item {
  position: relative;

  display: grid;
  place-items: center;

  width: 52px;
  min-height: 52px;
  margin-inline: auto;

  border: 0;
  border-radius: 16px;

  color: rgba(255, 255, 255, 0.62);
  background: transparent;
}
```

Elemento activo:

```css
.bottom-nav__item[aria-current="page"] {
  color: #fff;
  background: rgba(33, 158, 188, 0.18);
  box-shadow: inset 0 0 0 3px rgba(142, 202, 230, 0.65);
}
```

No dependas solo del color. El elemento activo también debe cambiar fondo, borde, forma o escala.

---

## Accesibilidad táctil

Todas las áreas interactivas deben medir al menos:

```css
min-width: 44px;
min-height: 44px;
```

Recomendado para acciones principales:

```css
min-height: 48px;
```

Incluye estados:

```css
:focus-visible {
  outline: 3px solid var(--jubal-yellow);
  outline-offset: 3px;
}
```

No elimines el `outline` sin reemplazarlo.

---

## Animaciones

Las animaciones deben ser cortas y funcionales.

Permitidas:

- Rebote leve al completar una canción.
- Pulsación suave en el nodo actual.
- Desplazamiento vertical al presionar botones.
- Aparición de tarjetas.
- Progreso animado.
- Confeti limitado para logros relevantes.
- Microanimación en iconos musicales.

Ejemplo:

```css
@keyframes soft-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.04);
  }
}

.progress-node--current {
  animation: soft-pulse 1.8s ease-in-out infinite;
}
```

Respeta preferencias del sistema:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Estructura funcional de Jubal

La aplicación maneja:

```text
Actividad
└── Tiempos
    └── Canciones
```

Una actividad representa un evento musical.

Cada actividad puede contener varios tiempos, por ejemplo:

- Apertura.
- Alabanza.
- Adoración.
- Ofrenda.
- Especial.
- Cierre.

Cada tiempo contiene canciones.

Las pantallas principales deben ser:

### Inicio

Mostrar:

- Próxima actividad.
- Fecha y hora.
- Progreso del repertorio.
- Canciones pendientes.
- Acceso rápido para continuar organizando.
- Actividades recientes.
- Indicador visual de preparación.

### Actividades

Mostrar las actividades como tarjetas o nodos.

Cada actividad debe indicar:

- Nombre.
- Fecha.
- Estado.
- Número de canciones.
- Progreso.
- Participantes o grupo asignado.

### Repertorio

Mostrar las canciones agrupadas por tiempo.

Debe permitir:

- Agregar canciones.
- Eliminar canciones.
- Reordenar mediante drag and drop.
- Cambiar tonalidad.
- Marcar como ensayada.
- Ver progreso por tiempo.
- Diferenciar canciones listas y pendientes.

### Lista de canciones

Mostrar:

- Título.
- Autor.
- Tonalidad.
- BPM.
- Estado de aprendizaje.
- Favoritos.
- Búsqueda.
- Filtros.
- Botón visible para agregar al repertorio.

### Tiempos

Permitir:

- Crear tiempos.
- Editar nombres.
- Reordenar.
- Asignar colores o iconos.
- Consultar cuántas canciones contiene cada uno.

### Detalle de canción

Mostrar:

- Título.
- Autor.
- Tonalidad.
- BPM.
- Letra.
- Acordes alineados.
- Controles para transponer por semitonos.
- Reproductor o referencia de audio, si existe.
- Estado de aprendizaje.
- Notas del grupo.

---

## Patrones de interacción

No escondas las acciones principales dentro de menús innecesarios.

La acción más importante de cada pantalla debe estar visible.

Ejemplos:

- En canciones: botón `+` para agregar.
- En repertorio: botón para agregar canción.
- En actividad: botón para continuar organizando.
- En canción: controles de transposición visibles.
- En tiempos: botón para crear un nuevo tiempo.

Usa menús secundarios solo para acciones menos frecuentes, como eliminar, duplicar o editar configuraciones avanzadas.

---

## Componentes recomendados

Crea componentes reutilizables:

```text
AppShell
TopHeader
BottomNavigation
GameCard
PrimaryButton
SecondaryButton
IconButton
ProgressNode
ProgressBar
SongCard
ActivityCard
TimeSection
EmptyState
AchievementBadge
StatusChip
SearchInput
FloatingActionButton
ModalSheet
Toast
SkeletonLoader
```

Cada componente debe soportar:

- Estado normal.
- Hover cuando corresponda.
- Focus.
- Active.
- Disabled.
- Loading.
- Error cuando aplique.

---

## Barras de progreso

Las barras deben tener aspecto amigable y volumétrico.

```css
.progress {
  height: 14px;
  overflow: hidden;

  border-radius: 999px;
  background: #0b2028;

  box-shadow:
    inset 0 2px 4px rgb(0 0 0 / 30%),
    0 1px 0 rgb(255 255 255 / 8%);
}

.progress__value {
  height: 100%;
  border-radius: inherit;

  background:
    linear-gradient(
      180deg,
      #ffd15c,
      var(--jubal-yellow)
    );

  box-shadow:
    inset 0 2px 0 rgb(255 255 255 / 30%),
    inset 0 -2px 0 rgb(174 102 0 / 18%);
}
```

Incluye texto o valor numérico para que el progreso no dependa solo del color.

---

## Estados vacíos

Los estados vacíos no deben mostrar pantallas frías.

Incluye:

- Una ilustración musical simple.
- Un mensaje breve.
- Una explicación concreta.
- Una acción visible.

Ejemplo:

```text
Todavía no hay canciones en este tiempo.
Agrega la primera canción para comenzar a preparar el repertorio.
[Agregar canción]
```

---

## Rendimiento

Optimiza para celulares de gama media.

Requisitos:

- Evitar imágenes demasiado pesadas.
- Utilizar WebP o AVIF cuando sea compatible.
- Utilizar SVG para iconos.
- Cargar ilustraciones de forma diferida.
- Evitar blur grande y filtros costosos.
- Evitar animar `box-shadow`, `filter`, `width` o `height` continuamente.
- Priorizar animaciones con `transform` y `opacity`.
- Reducir dependencias.
- Dividir el código por rutas.
- Evitar renderizados innecesarios.
- Mantener una navegación fluida incluso con conexiones lentas.

Imágenes:

```html
<img
  src="/images/activity.webp"
  width="320"
  height="220"
  loading="lazy"
  decoding="async"
  alt="Descripción de la actividad"
/>
```

---

## Responsive

Para tablet:

```css
@media (min-width: 768px) {
  .app-shell {
    max-width: 760px;
    padding-inline: 24px;
  }
}
```

Para escritorio:

```css
@media (min-width: 1024px) {
  .app-shell {
    max-width: 1180px;
  }

  .dashboard-layout {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 24px;
  }

  .bottom-nav {
    position: sticky;
    top: 0;
    bottom: auto;
  }
}
```

En escritorio puede cambiar la composición, pero debe conservar la misma identidad visual.

---

## Reglas de usabilidad

- No mostrar más de una acción primaria dominante por sección.
- No usar iconos sin texto cuando su significado pueda ser ambiguo.
- No colocar botones importantes cerca del borde inferior sin respetar safe areas.
- No saturar una tarjeta con demasiada información.
- Evitar carruseles para contenido esencial.
- Mantener contraste suficiente.
- Permitir uso con una sola mano.
- Mantener las acciones frecuentes en la mitad inferior de la pantalla.
- Mostrar confirmación antes de eliminar información importante.
- Usar drag and drop solo como opción, no como único mecanismo de reordenamiento.
- Proporcionar botones alternativos para subir o bajar elementos.

---

## Accesibilidad

La aplicación debe cumplir buenas prácticas de accesibilidad:

- HTML semántico.
- Contraste suficiente.
- Etiquetas en formularios.
- Texto alternativo.
- Navegación por teclado.
- Estados de foco visibles.
- Compatibilidad con lectores de pantalla.
- No usar color como único indicador.
- Botones con nombres accesibles.
- Mensajes de error asociados a sus campos.
- Soporte para reducción de movimiento.

Ejemplo:

```html
<button
  type="button"
  class="icon-button"
  aria-label="Agregar canción al repertorio"
>
  <svg aria-hidden="true">...</svg>
</button>
```

---

## Resultado esperado

Genera una interfaz completa y coherente para Jubal que:

1. Se sienta juvenil, musical y gamificada.
2. Sea claramente diferente de una aplicación empresarial tradicional.
3. Sea rápida y cómoda en celulares.
4. Utilice iconos e ilustraciones cartoon 2.5D.
5. Mantenga la paleta de Jubal.
6. Muestre profundidad mediante capas, sombras y reflejos moderados.
7. Tenga componentes reutilizables.
8. Sea accesible.
9. Sea responsive.
10. Mantenga una jerarquía visual clara.
11. No copie directamente la interfaz, personajes o recursos de ninguna aplicación existente.

---

## Instrucción final para generación

Antes de escribir el código:

1. Define la arquitectura de pantallas.
2. Define los componentes reutilizables.
3. Define los estados de cada componente.
4. Diseña primero la versión de 390 px de ancho.
5. Revisa la experiencia en 320 px.
6. Adapta a tablet y escritorio.
7. Mantén consistencia en sombras, radios, espaciado e iconografía.
8. Justifica brevemente las decisiones importantes de UX.
9. Entrega código limpio, organizado y preparado para producción.
10. No uses contenido de relleno genérico cuando pueda utilizarse contenido relacionado con música, repertorios, ensayos, tonalidades, BPM y actividades.
