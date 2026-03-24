<template>
  <div class="success-toast" :class="{ show: visible }">{{ message }}</div>
</template>

<script setup>
import { useToast } from '../composables/useToast'
const { message, visible } = useToast()
</script>
