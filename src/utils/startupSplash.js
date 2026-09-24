// El mismo elemento acompaña la descarga inicial y la restauración de sesión,
// sin reiniciar la animación al montar Vue.
let hideTimer
let readyTimer
const MIN_VISIBLE_MS = 1500

export function setStartupLoading(loading) {
  const splash = document.getElementById('startup-splash')
  const app = document.getElementById('app')
  if (!splash || !app) return

  clearTimeout(hideTimer)
  clearTimeout(readyTimer)
  if (loading) {
    if (splash.hidden) splash.dataset.startedAt = performance.now()
    app.inert = true
    app.setAttribute('aria-busy', 'true')
    splash.hidden = false
    splash.classList.remove('startup-splash--leaving')
  } else {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const elapsed = performance.now() - Number(splash.dataset.startedAt || 0)
    const remaining = reducedMotion ? 0 : Math.max(0, MIN_VISIBLE_MS - elapsed)
    const dismiss = () => {
      app.inert = false
      app.setAttribute('aria-busy', 'false')
      splash.classList.add('startup-splash--leaving')
      // Ocultarlo también detiene las animaciones cuando la app ya está lista.
      hideTimer = setTimeout(() => { splash.hidden = true }, reducedMotion ? 0 : 240)
    }
    // El mínimo incluye el tiempo de carga; nunca suma 1,5 s a una carga lenta.
    if (remaining > 0) readyTimer = setTimeout(dismiss, remaining)
    else dismiss()
  }
}
