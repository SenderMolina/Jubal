<template>
  <div class="role-screen">
    <div class="config-error">
      <h1>Falta configurar Supabase</h1>
      <p>
        Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>
        para iniciar Jubal.
      </p>
      <p class="config-error__hint">
        Para probar localmente la PWA puedes construir con el modo development,
        o completar esas variables en <code>.env.production</code>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.config-error {
  width: min(420px, 92vw);
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: left;
}

.config-error h1 {
  margin: 0 0 10px;
  color: var(--text);
  font-size: 1.25rem;
}

.config-error p {
  margin: 0;
  color: var(--text-mid);
  font-size: 0.92rem;
  line-height: 1.45;
}

.config-error code {
  color: var(--accent);
  font-weight: 700;
}

.config-error__hint {
  margin-top: 12px;
  color: var(--text-muted);
}
</style>
