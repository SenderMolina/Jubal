import assert from 'node:assert/strict'
import { permissionsFor } from './permissions.js'

const leader = permissionsFor({ role: 'leader' })
assert.deepEqual(leader, { editLibrary: true, manageActivities: true, conductLive: true, manageBand: true, editBand: false, seeChords: true })
assert.equal(permissionsFor({ role: 'leader', isOwner: true }).editBand, true)

const musician = permissionsFor({ role: 'musician' })
assert.deepEqual(musician, { editLibrary: false, manageActivities: false, conductLive: false, manageBand: false, editBand: false, seeChords: true })

const singer = permissionsFor({ role: 'singer' })
assert.equal(singer.seeChords, false)
assert.equal(singer.editLibrary, false)

// Espacio personal: su biblioteca es suya, pero no hay banda que dirigir.
const personal = permissionsFor({ personalMode: true })
assert.deepEqual(personal, { editLibrary: true, manageActivities: false, conductLive: false, manageBand: false, editBand: false, seeChords: true })

console.log('permissions: ok')
