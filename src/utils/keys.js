export const KEYS = ['A', 'A#/Bb', 'B', 'C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab']

// "A#/Bb" -> "A♯". Mismo lenguaje visual del tono en listas, setlists y formulario.
export function fmtKey(key) {
  return ((key || '').split('/')[0] || '').replace('#', '♯').replace('b', '♭')
}
