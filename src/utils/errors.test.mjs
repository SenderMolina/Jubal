import assert from 'node:assert/strict'
import { errorMessage } from './errors.js'

const fallback = 'No se pudo guardar.'
assert.equal(errorMessage(new TypeError('Failed to fetch'), fallback), 'Sin conexión. Revisa tu internet e intenta de nuevo.')
assert.equal(errorMessage({ code: '42501', message: 'new row violates row-level security policy' }, fallback), 'No tienes permiso para hacer esto.')
assert.equal(errorMessage({ code: '23505', message: 'duplicate key' }, fallback), 'Ya existe un registro igual.')
assert.equal(errorMessage({ code: 'P0001', message: 'Invitación expirada' }, fallback), 'Invitación expirada')
// Errores técnicos de PostgREST no se muestran en inglés
assert.equal(errorMessage({ code: 'PGRST116', message: 'JSON object requested, multiple rows returned' }, fallback), fallback)
assert.equal(errorMessage(new Error('Debes conservar al menos una rutina'), fallback), 'Debes conservar al menos una rutina')
assert.equal(errorMessage(null, fallback), fallback)

console.log('errors: ok')
