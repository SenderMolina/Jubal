<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal">
      <div class="modal-title">{{ title }}</div>
      <div class="modal-sub">{{ subtitle }}</div>
      <p style="font-size:0.85rem; color:var(--text-mid);">Esta acción no se puede deshacer.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" @click="close(false)">Cancelar</button>
        <button class="btn btn-danger" @click="close(true)">Eliminar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useConfirm } from '../composables/useConfirm'
const { isOpen, title, subtitle, close } = useConfirm()
</script>
