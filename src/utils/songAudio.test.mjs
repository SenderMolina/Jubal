import assert from 'node:assert/strict'
import { MAX_AUDIO_BYTES, saveWithSongAudio, uploadSongAudio, validateAudioFile } from './songAudio.js'

const file = { name: 'Ensayo.MP3', type: 'audio/mpeg', size: 100 }
assert.equal(validateAudioFile(file).contentType, 'audio/mpeg')
assert.equal(validateAudioFile({ ...file, name: 'ensayo.m4a', type: 'audio/x-m4a' }).contentType, 'audio/mp4')
assert.throws(() => validateAudioFile({ ...file, size: 0 }), /vacío/)
assert.throws(() => validateAudioFile({ ...file, size: MAX_AUDIO_BYTES + 1 }), /25 MB/)
assert.throws(() => validateAudioFile({ ...file, name: 'letra.pdf', type: 'application/pdf' }), /Elige un audio/)

const uploads = []
const client = { storage: { from: bucket => ({ upload: async (...args) => { uploads.push([bucket, ...args]); return { error: null } } }) } }
const attached = await uploadSongAudio(client, file, { bandId: 'band-id' })
assert.match(attached.audio_path, /^band\/band-id\/.+\.mp3$/)
assert.equal(attached.audio_name, file.name)
assert.equal(uploads[0][0], 'song-audio')
assert.equal(uploads[0][3].upsert, false)
const personal = await uploadSongAudio(client, file, { userId: 'user-id' })
assert.match(personal.audio_path, /^personal\/user-id\//)
await assert.rejects(() => uploadSongAudio(client, file, {}), /Inicia sesión/)
const unavailableStorage = { storage: { from: () => ({ upload: async () => ({ error: { message: 'Bucket not found', status: 400 } }) }) } }
await assert.rejects(() => uploadSongAudio(unavailableStorage, file, { bandId: 'band-id' }), /almacenamiento de audio aún no está habilitado/)
const deniedStorage = { storage: { from: () => ({ upload: async () => ({ error: { message: 'new row violates row-level security policy', status: 403 } }) }) } }
await assert.rejects(() => uploadSongAudio(deniedStorage, file, { bandId: 'band-id' }), error => error.status === 403 && /row-level security/.test(error.message))

const previous = { audio_path: 'old', audio_name: 'old.mp3' }
let events = []
const dependencies = {
  upload: async () => { events.push('upload'); return { audio_path: 'new', audio_name: file.name } },
  save: async values => { events.push(['save', values]); return { id: 1, ...values } },
  remove: async path => { events.push(['remove', path]) },
}
await saveWithSongAudio({ title: 'Yellow', audioFile: file }, previous, dependencies)
assert.deepEqual(events, ['upload', ['save', { title: 'Yellow', audio_path: 'new', audio_name: file.name }], ['remove', 'old']])

events = []
await assert.rejects(() => saveWithSongAudio({ audioFile: file }, previous, {
  ...dependencies, save: async () => { throw new Error('DB failure') },
}), /DB failure/)
assert.deepEqual(events, ['upload', ['remove', 'new']])

events = []
await assert.rejects(() => saveWithSongAudio({ audioFile: file }, previous, {
  ...dependencies, upload: async () => { throw new Error('upload failure') },
}), /upload failure/)
assert.deepEqual(events, [])

events = []
await assert.rejects(() => saveWithSongAudio({ removeAudio: true }, previous, {
  ...dependencies, save: async () => { throw new Error('DB failure') },
}), /DB failure/)
assert.deepEqual(events, [])

events = []
await saveWithSongAudio({ title: 'Yellow' }, previous, dependencies)
assert.deepEqual(events, [['save', { title: 'Yellow' }]])

events = []
await saveWithSongAudio({ removeAudio: true }, previous, dependencies)
assert.deepEqual(events, [['save', { audio_path: null, audio_name: null }], ['remove', 'old']])

events = []
const warn = console.warn
console.warn = () => {}
try {
  const result = await saveWithSongAudio({ audioFile: file }, previous, {
    ...dependencies, remove: async path => { events.push(['remove', path]); throw new Error('cleanup failure') },
  })
  assert.equal(result.audio_path, 'new')
  assert.deepEqual(events.at(-1), ['remove', 'old'])
  assert.equal(events.filter(event => Array.isArray(event) && event[0] === 'remove').length, 1)
} finally { console.warn = warn }
console.log('songAudio: OK')
