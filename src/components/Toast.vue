<template>
  <div
    class="success-toast"
    :class="{ show: visible, 'success-toast--error': tone === 'error' }"
    :role="tone === 'error' ? 'alert' : 'status'"
    aria-live="polite"
  >{{ message }}</div>
</template>

<script setup>
import { useToast } from '../composables/useToast'
const { message, visible, tone } = useToast()
</script>
