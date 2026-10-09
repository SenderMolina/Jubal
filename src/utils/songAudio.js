export const AUDIO_BUCKET = 'song-audio'
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024
export const AUDIO_ACCEPT = '.mp3,.m4a,.wav,.ogg,.webm'
const MIME_TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', webm: 'audio/webm' }

export function validateAudioFile(file) {
  const extension = file?.name?.split('.').pop().toLowerCase()
  if (!MIME_TYPES[extension] || (file.type && !file.type.startsWith('audio/') && !['application/ogg', 'application/octet-stream'].includes(file.type))) {
    throw new Error('Elige un audio MP3, M4A, WAV, OGG o WebM.')
  }
  if (!file.size) throw new Error('El archivo de audio está vacío.')
  if (file.size > MAX_AUDIO_BYTES) throw new Error('El audio debe pesar como máximo 25 MB.')
  return { extension, contentType: MIME_TYPES[extension] }
}

export async function uploadSongAudio(client, file, { bandId, userId }) {
  const { extension, contentType } = validateAudioFile(file)
  if (!bandId && !userId) throw new Error('Inicia sesión para adjuntar audio.')
  const folder = bandId ? `band/${bandId}` : `personal/${userId}`
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from(AUDIO_BUCKET).upload(path, file, { contentType, upsert: false })
  if (error) {
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error('El almacenamiento de audio aún no está habilitado. Pide al administrador que complete su configuración.')
    }
    throw error
  }
  return { audio_path: path, audio_name: file.name }
}

// El audio anterior permanece intacto hasta que la canción se haya guardado.
export async function saveWithSongAudio(fields, previous, { upload, save, remove }) {
  const { audioFile, removeAudio, ...values } = fields
  const cleanup = async path => {
    try { await remove(path) } catch (error) { console.warn('No se pudo limpiar el audio anterior.', error) }
  }
  let uploaded = null
  try {
    if (audioFile) {
      uploaded = await upload(audioFile)
      Object.assign(values, uploaded)
    } else if (removeAudio) {
      Object.assign(values, { audio_path: null, audio_name: null })
    }
    const song = await save(values)
    if (previous?.audio_path && (uploaded || removeAudio)) await cleanup(previous.audio_path)
    return song
  } catch (error) {
    if (uploaded) await cleanup(uploaded.audio_path)
    throw error
  }
}
