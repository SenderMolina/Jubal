<template>
  <svg class="jubal-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'home'"><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-8h6v8"/></template>
    <template v-else-if="name === 'activities'"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5 2 2 5-4"/></template>
    <template v-else-if="name === 'repertoire'"><rect x="7" y="3" width="14" height="17" rx="2"/><path d="M3 7v12a4 4 0 0 0 4 4m4-15h6m-6 4h6m-6 4h3"/></template>
    <template v-else-if="name === 'songs'"><path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="16" rx="3" ry="3"/></template>
    <template v-else-if="name === 'band'"><circle cx="9" cy="7" r="3"/><path d="M2 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3m0-17a3 3 0 0 1 0 6m3 4a5 5 0 0 1 3 4v3"/></template>
    <template v-else-if="name === 'tracker'"><circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-9m-4 0h4v4"/></template>
    <template v-else-if="name === 'metronome'"><path d="M8 3h8l5 18H3zM12 16l5-10M8 17h8"/><path d="M9 7h2m-3 4h2"/></template>
    <template v-else-if="name === 'stats'"><path d="M4 20V10m8 10V4m8 16v-7"/></template>
    <template v-else-if="name === 'more'"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></template>
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, required: true } })
</script>

<style scoped>
.jubal-nav-icon { display: block; width: 24px; height: 24px; flex-shrink: 0; }
</style>
