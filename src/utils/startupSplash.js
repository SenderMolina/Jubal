// El mismo elemento acompaña la descarga inicial y la restauración de sesión,
// sin reiniciar la animación al montar Vue.
let hideTimer

export function setStartupLoading(loading) {
  const splash = document.getElementById('startup-splash')
  const app = document.getElementById('app')
  if (!splash || !app) return

  clearTimeout(hideTimer)
  app.inert = loading
  app.setAttribute('aria-busy', String(loading))
  if (loading) {
    splash.hidden = false
    splash.classList.remove('startup-splash--leaving')
  } else {
    splash.classList.add('startup-splash--leaving')
    // Ocultarlo también detiene las animaciones cuando la app ya está lista.
    hideTimer = setTimeout(() => { splash.hidden = true }, 240)
  }
}
