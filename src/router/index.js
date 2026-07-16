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
import RoutinePlayView       from '../views/RoutinePlayView.vue'
import MetronomoView         from '../views/MetronomoView.vue'
import HomeView              from '../views/HomeView.vue'

const routes = [
  { path: '/',                redirect: '/inicio' },
  { path: '/inicio',          component: HomeView },
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
  { path: '/rutina/jugar/:id', component: RoutinePlayView },
  { path: '/metronomo',       component: MetronomoView },
  { path: '/cancion/:id',     component: SongView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Rutas exclusivas de banda: sin banda activa, al perfil.
// (canciones/repertorios NO están aquí: existen también en el espacio personal)
const BAND_ONLY = ['/actividad', '/banda', '/live']
// Rutas exclusivas del espacio personal: activan el modo personal
// (ej. recarga o re-login directo en /entrenar).
const PERSONAL_ONLY = ['/entrenar', '/skill', '/estadisticas', '/rutina', '/metronomo']

router.beforeEach((to) => {
  const band = useBandStore()
  if (BAND_ONLY.some(p => to.path.startsWith(p)) && !band.currentBandId) {
    return '/perfil'
  }
  if (PERSONAL_ONLY.some(p => to.path.startsWith(p)) && !band.personalMode) {
    band.enterPersonal()
  }
  // Canciones/repertorios necesitan algún ámbito: sin banda ni personal, al perfil.
  if (!band.currentBandId && !band.personalMode && to.path !== '/perfil') {
    return '/perfil'
  }
})

export default router
