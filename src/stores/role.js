// Compatibilidad: el rol ahora proviene de la banda activa (band.js).
// Las vistas siguen usando useRoleStore().isLeader/isMusico/isCantante y
// .changeRole() sin cambios; aquí solo se redirige al store de bandas.
export { useBandStore as useRoleStore } from './band'
