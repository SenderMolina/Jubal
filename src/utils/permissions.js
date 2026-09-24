// Qué puede hacer el usuario en la interfaz. Refleja las políticas RLS, que son
// las que protegen de verdad: escribir en la banda = líder; datos y borrado de
// la banda = dueño; en el espacio personal cada quien es dueño de lo suyo.
export function permissionsFor({ role = null, personalMode = false, isOwner = false } = {}) {
  const leader = role === 'leader'
  return {
    editLibrary: leader || personalMode, // canciones, repertorios y tipos
    manageActivities: leader,            // agenda y setlists
    manageBand: leader,                  // integrantes, invitaciones, configuración
    editBand: isOwner,                   // nombre, imagen y eliminar la banda
    seeChords: role !== 'singer',        // a las coristas se les ocultan
  }
}
