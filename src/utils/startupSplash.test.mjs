import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

// Ejecutar el controlador real del HTML, sin Vue ni bundle: el fallo original
// debe tener una salida incluso cuando la aplicación no llega a inicializarse.
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const source = html.match(/<script id="startup-controller">([\s\S]*?)<\/script>/)[1]

function boot({ reducedMotion = false } = {}) {
  let now = 0, nextId = 0, reloads = 0
  const timers = new Map()
  function element() {
    const listeners = new Map(), classes = new Set()
    return {
      hidden: false, dataset: {}, inert: false,
      classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
      setAttribute(name, value) { this[name] = value },
      addEventListener(name, callback) { listeners.set(name, callback) },
      dispatch(name, event = {}) { listeners.get(name)?.(event) },
      focus() { document.activeElement = this },
    }
  }
  const splash = element(), app = element(), status = element(), rhythm = element(), recovery = element(), retry = element()
  recovery.hidden = true
  recovery.querySelector = () => retry
  splash.querySelector = selector => ({
    '.startup-splash__status': status,
    '.startup-splash__rhythm': rhythm,
    '.startup-splash__recovery': recovery,
  })[selector]
  const document = { ...element(), visibilityState: 'visible', getElementById: id => id === 'app' ? app : splash }
  const window = { ...element(), matchMedia: () => ({ matches: reducedMotion }), location: { reload() { reloads++ } } }
  const context = vm.createContext({
    document, window, performance: { now: () => now },
    setTimeout(fn, delay) { timers.set(++nextId, { fn, at: now + delay }); return nextId },
    clearTimeout: id => timers.delete(id),
  })
  vm.runInContext(source, context)
  function advance(ms) {
    const end = now + ms
    for (;;) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (!next) break
      now = next[1].at
      timers.delete(next[0])
      next[1].fn()
    }
    now = end
  }
  return {
    ...window.jubalStartup, splash, app, recovery, retry, window, document, advance,
    get reloads() { return reloads },
    // Simular un navegador suspendido que todavía no ha ejecutado sus timers.
    suspend(ms) { now += ms },
  }
}

test('la animación respeta 1,5 s sin desbloquear controles ocultos', () => {
  const ui = boot()
  ui.advance(200)
  ui.setLoading(false)
  ui.advance(1299)
  assert.equal(ui.app.inert, true)
  assert.equal(ui.splash.classList.contains('startup-splash--leaving'), false)
  ui.advance(1)
  assert.equal(ui.app.inert, false)
  ui.advance(240)
  assert.equal(ui.splash.hidden, true)
  ui.advance(20000)
  assert.equal(ui.recovery.hidden, true)
})

test('una carga lenta termina sin añadir 1,5 s extra', () => {
  const ui = boot()
  ui.advance(5000)
  ui.setLoading(false)
  assert.equal(ui.app.inert, false)
})

test('una sesión o bundle que nunca responde ofrece reintentar a los 12 s', () => {
  const ui = boot()
  ui.advance(8000)
  ui.setLoading(true) // Otro cambio reactivo no debe reiniciar el límite.
  ui.advance(4000)
  assert.equal(ui.splash.dataset.state, 'error')
  assert.equal(ui.recovery.hidden, false)
  assert.equal(ui.app.inert, true) // Nunca revelar una pantalla vacía/incompleta.
  assert.equal(ui.app['aria-busy'], 'false')
  assert.equal(ui.document.activeElement, ui.retry)
  ui.retry.dispatch('click')
  assert.equal(ui.reloads, 1)
})

test('un error cancela la salida pendiente y admite recuperación tardía', () => {
  const ui = boot()
  ui.setLoading(false)
  ui.fail()
  ui.advance(3000)
  assert.equal(ui.splash.hidden, false)
  assert.equal(ui.recovery.hidden, false)
  ui.setLoading(false)
  ui.advance(240)
  assert.equal(ui.splash.hidden, true)
  assert.equal(ui.app.inert, false)
})

test('errores de scripts y chunks ofrecen recuperación sin esperar el límite', () => {
  for (const event of ['error', 'vite:preloadError']) {
    const ui = boot()
    ui.window.dispatch(event, { target: { tagName: 'SCRIPT' } })
    assert.equal(ui.recovery.hidden, false)
  }
  const ui = boot()
  ui.window.dispatch('error', { target: { tagName: 'IMG' } })
  assert.equal(ui.recovery.hidden, true)
})

test('volver tras una suspensión comprueba el tiempo transcurrido', () => {
  const ui = boot()
  ui.suspend(15000)
  ui.document.dispatch('visibilitychange')
  assert.equal(ui.recovery.hidden, false)
})

test('una carga nueva cancela la salida anterior y reinicia el mínimo al reaparecer', () => {
  const ui = boot()
  ui.setLoading(false)
  ui.advance(500)
  ui.setLoading(true)
  ui.advance(1500)
  assert.equal(ui.app.inert, true)
  assert.equal(ui.splash.hidden, false)
  ui.setLoading(false)
  ui.advance(240)
  ui.setLoading(true)
  ui.setLoading(false)
  ui.advance(1499)
  assert.equal(ui.app.inert, true)
  ui.advance(1)
  assert.equal(ui.app.inert, false)
})

test('movimiento reducido omite el mínimo pero mantiene la recuperación', () => {
  const ui = boot({ reducedMotion: true })
  ui.setLoading(false)
  assert.equal(ui.app.inert, false)
  ui.advance(0)
  assert.equal(ui.splash.hidden, true)
  ui.setLoading(true)
  ui.advance(12000)
  assert.equal(ui.recovery.hidden, false)
})
