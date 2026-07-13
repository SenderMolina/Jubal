import { createRouter, createWebHashHistory } from 'vue-router'
import { useBandStore } from '../stores/band'
import ActividadesView       from '../views/ActividadesView.vue'
import ActividadDetailView   from '../views/ActividadDetailView.vue'
import CancionesView         from '../views/CancionesView.vue'
import AgregarView           from '../views/AgregarView.vue'
import TiposView             from '../views/TiposView.vue'
import SongView              from '../views/SongView.vue'
import RepertorioView        from '../views/RepertorioView.vue'
import RepertorioDetailView  from '../views/RepertorioDetailView.vue'
import BandManageView        from '../views/BandManageView.vue'
import LiveView              from '../views/LiveView.vue'
import ProfileView           from '../views/ProfileView.vue'
import EntrenarView          from '../views/EntrenarView.vue'
import SkillDetailView       from '../views/SkillDetailView.vue'
import EstadisticasView      from '../views/EstadisticasView.vue'
import RoutineView           from '../views/RoutineView.vue'

const routes = [
  { path: '/',                redirect: '/perfil' },
  { path: '/actividades',     component: ActividadesView },
  { path: '/actividad/:id',   component: ActividadDetailView },
  { path: '/repertorio',      component: RepertorioView },
  { path: '/repertorio/:id',  component: RepertorioDetailView },
  { path: '/canciones',       component: CancionesView },
  { path: '/agregar',         component: AgregarView },
  { path: '/tipos',           component: TiposView },
  { path: '/banda',           component: BandManageView },
  { path: '/live',            component: LiveView },
  { path: '/perfil',          component: ProfileView },
  { path: '/entrenar',        component: EntrenarView },
  { path: '/skill/:id',       component: SkillDetailView },
  { path: '/estadisticas',    component: EstadisticasView },
  { path: '/rutina',          component: RoutineView },
  { path: '/cancion/:id',     component: SongView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Las rutas de banda requieren banda activa; sin ella, al perfil.
// (cubre /actividades, /actividad/:id, /canciones, /cancion/:id, etc.)
const BAND_PREFIXES = ['/actividad', '/repertorio', '/cancion', '/agregar', '/tipos', '/banda', '/live']
// Las rutas personales activan el modo personal (ej. recarga o re-login directo en /entrenar).
const PERSONAL_PREFIXES = ['/entrenar', '/skill', '/estadisticas', '/rutina']

router.beforeEach((to) => {
  if (BAND_PREFIXES.some(p => to.path.startsWith(p)) && !sessionStorage.getItem('bandId')) {
    return '/perfil'
  }
  if (PERSONAL_PREFIXES.some(p => to.path.startsWith(p))) {
    const band = useBandStore()
    if (!band.personalMode) band.enterPersonal()
  }
})

export default router
