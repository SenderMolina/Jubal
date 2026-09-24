// El controlador nace en index.html para funcionar incluso si el bundle falla.
export function setStartupLoading(loading) {
  window.jubalStartup?.setLoading(loading)
}

export function showStartupError(error) {
  console.error('No se pudo iniciar Jubal:', error)
  window.jubalStartup?.fail()
}
