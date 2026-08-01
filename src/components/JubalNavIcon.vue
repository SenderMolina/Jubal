<template>
  <svg
    class="jubal-nav-icon"
    :class="`jubal-nav-icon--${name}`"
    viewBox="0 0 64 64"
    role="presentation"
    aria-hidden="true"
  >
    <rect class="icon-shell-shadow" x="6" y="10" width="52" height="48" rx="16" />
    <rect class="icon-shell" x="6" y="6" width="52" height="48" rx="16" />
    <path class="icon-shell-gloss" d="M14 10h30c5.5 0 10 4.5 10 10v2c-9.5-4-28.5-5.1-44 1.5V20c0-5.5 4.5-10 10-10Z" />

    <g v-if="name === 'home'" class="icon-symbol">
      <path class="icon-depth" d="m14 33 18-13 18 13-4 5-14-10-14 10Z" />
      <path class="icon-accent" d="m14 29 18-13 18 13-4 5-14-10-14 10Z" />
      <path class="icon-paper" d="M20 31.5 32 23l12 8.5V47H20Z" />
      <rect class="icon-ink" x="29" y="36" width="7" height="11" rx="2" />
      <path class="icon-shine" d="m19 28 13-9 7 5-2.5 1.8-4.5-3.2-11.2 8Z" />
    </g>

    <g v-else-if="name === 'activities'" class="icon-symbol">
      <rect class="icon-depth" x="16" y="20" width="34" height="30" rx="6" />
      <rect class="icon-paper" x="14" y="17" width="34" height="30" rx="6" />
      <path class="icon-accent" d="M14 23a6 6 0 0 1 6-6h22a6 6 0 0 1 6 6v5H14Z" />
      <path class="icon-ink-stroke" d="M22 14v7M40 14v7M20 33h8M20 39h5" />
      <path class="icon-success-stroke" d="m32 38 3.2 3.2 7-8" />
      <path class="icon-shine" d="M19 20h18a2 2 0 0 1 2 2v1H18v-1a2 2 0 0 1 1-2Z" />
    </g>

    <g v-else-if="name === 'repertoire'" class="icon-symbol">
      <rect class="icon-depth" x="17" y="17" width="31" height="35" rx="6" transform="rotate(-5 17 17)" />
      <rect class="icon-secondary" x="15" y="15" width="31" height="35" rx="6" transform="rotate(-5 15 15)" />
      <rect class="icon-depth" x="21" y="16" width="29" height="36" rx="6" />
      <rect class="icon-paper" x="19" y="13" width="29" height="36" rx="6" />
      <path class="icon-accent" d="M19 19a6 6 0 0 1 6-6h17a6 6 0 0 1 6 6v4H19Z" />
      <path class="icon-ink-stroke" d="M27 29h13M27 35h8M27 41h10" />
      <circle class="icon-success" cx="24" cy="29" r="2" />
      <circle class="icon-success" cx="24" cy="35" r="2" />
      <circle class="icon-success" cx="24" cy="41" r="2" />
      <path class="icon-shine" d="M24 16h14a3 3 0 0 1 3 3v1H23v-1a3 3 0 0 1 1-3Z" />
    </g>

    <g v-else-if="name === 'songs'" class="icon-symbol">
      <path class="icon-depth" d="M18 15h22l9 9v27H18Z" />
      <path class="icon-paper" d="M16 12h22l9 9v27H16Z" />
      <path class="icon-secondary" d="M38 12v9h9Z" />
      <path class="icon-accent-stroke" d="M23 28h16M23 34h12M23 41h16" />
      <path class="icon-ink" d="M36 26v10.2a4.8 4.8 0 1 1-2.8-4.4V24l8-1.7v4Z" />
      <path class="icon-shine" d="M20 16h14v3H20Z" />
    </g>

    <g v-else-if="name === 'band'" class="icon-symbol">
      <circle class="icon-depth" cx="22" cy="30" r="8" />
      <circle class="icon-paper" cx="21" cy="27" r="8" />
      <circle class="icon-depth" cx="43" cy="30" r="8" />
      <circle class="icon-accent" cx="42" cy="27" r="8" />
      <path class="icon-depth" d="M10 48c0-8 5-13 12-13s12 5 12 13Z" />
      <path class="icon-secondary" d="M9 45c0-8 5-13 12-13s12 5 12 13Z" />
      <path class="icon-depth" d="M31 48c0-8 5-13 12-13s12 5 12 13Z" />
      <path class="icon-success" d="M30 45c0-8 5-13 12-13s12 5 12 13Z" />
      <path class="icon-ink-stroke" d="M27 18c3-5 8-6 13-3M32 13v9M41 11v8" />
      <circle class="icon-accent" cx="32" cy="22" r="3" />
      <circle class="icon-accent" cx="41" cy="19" r="3" />
      <path class="icon-shine" d="M16 24c1.5-3 4-4.5 7-4M37 24c1.2-2.6 3.3-4 6-4" />
    </g>

    <g v-else-if="name === 'tracker'" class="icon-symbol">
      <circle class="icon-depth" cx="32" cy="34" r="17" />
      <circle class="icon-paper" cx="32" cy="30" r="17" />
      <circle class="icon-secondary" cx="32" cy="30" r="11" />
      <circle class="icon-accent" cx="32" cy="30" r="5" />
      <path class="icon-ink-stroke" d="M39 23 49 13M43 13h6v6" />
      <path class="icon-success-stroke" d="m22 39 5 5 11-12" />
      <path class="icon-shine" d="M21 25c2.5-6 8-9 14-8" />
    </g>

    <g v-else-if="name === 'metronome'" class="icon-symbol">
      <path class="icon-depth" d="M21 16h22l9 36H12Z" />
      <path class="icon-paper" d="M21 12h22l9 36H12Z" />
      <path class="icon-secondary" d="M27 17h10l5 24H22Z" />
      <path class="icon-ink-stroke" d="m32 37 7-17M24 42h16" />
      <circle class="icon-accent" cx="39" cy="20" r="4" />
      <path class="icon-accent-stroke" d="M27 23h5M25.5 29h5M24 35h5" />
      <path class="icon-shine" d="M24 15h8l-.8 3h-6.5Z" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
.jubal-nav-icon {
  --icon-face: #219ebc;
  --icon-face-dark: #07556a;
  --icon-secondary: #8eddf0;
  display: block;
  overflow: visible;
  transition: transform 180ms ease, filter 180ms ease;
}

.jubal-nav-icon--home {
  --icon-face: #0b5365;
  --icon-face-dark: #032f3b;
  --icon-secondary: #ffcf48;
}

.jubal-nav-icon--activities {
  --icon-face: #219ebc;
  --icon-face-dark: #08677d;
  --icon-secondary: #8eddf0;
}

.jubal-nav-icon--repertoire {
  --icon-face: #148c88;
  --icon-face-dark: #075c59;
  --icon-secondary: #64d2cf;
}

.jubal-nav-icon--songs {
  --icon-face: #f4b229;
  --icon-face-dark: #a96000;
  --icon-secondary: #ffe39a;
}

.jubal-nav-icon--band {
  --icon-face: #168f84;
  --icon-face-dark: #07584f;
  --icon-secondary: #7bdad0;
}

.jubal-nav-icon--tracker {
  --icon-face: #ff8a1f;
  --icon-face-dark: #a94600;
  --icon-secondary: #ffd166;
}

.jubal-nav-icon--metronome {
  --icon-face: #d96820;
  --icon-face-dark: #85350c;
  --icon-secondary: #ffc15a;
}

.icon-shell-shadow,
.icon-depth {
  fill: var(--icon-face-dark);
}

.icon-shell {
  fill: var(--icon-face);
  stroke: #011f2d;
  stroke-width: 2.4;
}

.icon-shell-gloss {
  fill: rgba(255, 255, 255, 0.18);
}

.icon-paper {
  fill: #fff8e8;
  stroke: #011f2d;
  stroke-width: 2.2;
  stroke-linejoin: round;
}

.icon-secondary {
  fill: var(--icon-secondary);
  stroke: #011f2d;
  stroke-width: 2;
  stroke-linejoin: round;
}

.icon-accent {
  fill: #ffb703;
  stroke: #011f2d;
  stroke-width: 2;
  stroke-linejoin: round;
}

.icon-success {
  fill: #22c55e;
  stroke: #011f2d;
  stroke-width: 1.5;
}

.icon-ink {
  fill: #011f2d;
}

.icon-ink-stroke,
.icon-accent-stroke,
.icon-success-stroke,
.icon-shine {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-ink-stroke {
  stroke: #011f2d;
  stroke-width: 3;
}

.icon-accent-stroke {
  stroke: #f08a00;
  stroke-width: 3;
}

.icon-success-stroke {
  stroke: #22c55e;
  stroke-width: 3.5;
}

.icon-shine {
  stroke: rgba(255, 255, 255, 0.72);
  stroke-width: 2.4;
}
</style>
