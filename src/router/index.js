import { createRouter, createWebHashHistory } from 'vue-router'
import { useBandStore } from '../stores/band'

// Cada pantalla se carga al entrar en su ruta. Reduce el arranque de la PWA y
// evita enviar de una vez los editores, estadísticas y modo en vivo.
const ActividadesView = () => import('../views/ActividadesView.vue')
const ActividadDetailView = () => import('../views/ActividadDetailView.vue')
const CancionesView = () => import('../views/CancionesView.vue')
const AgregarView = () => import('../views/AgregarView.vue')
const TiposView = () => import('../views/TiposView.vue')
const SongView = () => import('../views/SongView.vue')
const RepertorioView = () => import('../views/RepertorioView.vue')
const RepertorioDetailView = () => import('../views/RepertorioDetailView.vue')
const BandManageView = () => import('../views/BandManageView.vue')
const LiveView = () => import('../views/LiveView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const EntrenarView = () => import('../views/EntrenarView.vue')
const SkillDetailView = () => import('../views/SkillDetailView.vue')
const EstadisticasView = () => import('../views/EstadisticasView.vue')
const RoutineView = () => import('../views/RoutineView.vue')
const RoutinePlayView = () => import('../views/RoutinePlayView.vue')
const MetronomoView = () => import('../views/MetronomoView.vue')
const HomeView = () => import('../views/HomeView.vue')
const BandDashboardView = () => import('../views/BandDashboardView.vue')

const routes = [
  { path: '/',                redirect: '/inicio' },
  { path: '/inicio',          component: BandDashboardView },
  { path: '/practica',        component: HomeView },
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

// Rutas exclusivas de banda: sin banda activa, al dashboard de práctica.
// (canciones/repertorios NO están aquí: existen también en el espacio personal)
const BAND_ONLY = ['/inicio', '/actividad', '/banda', '/live']
// Rutas exclusivas del espacio personal: activan el modo personal
// (ej. recarga o re-login directo en /entrenar).
const PERSONAL_ONLY = ['/practica', '/entrenar', '/skill', '/estadisticas', '/rutina', '/metronomo']

router.beforeEach((to) => {
  const band = useBandStore()
  // Durante la restauración App.vue mantiene las vistas ocultas; esperamos a
  // conocer las membresías antes de decidir entre banda y práctica.
  if (!band.ready) {
    return
  }
  if (BAND_ONLY.some(p => to.path.startsWith(p)) && !band.currentBandId) {
    return '/practica'
  }
  if (PERSONAL_ONLY.some(p => to.path.startsWith(p)) && !band.personalMode) {
    band.enterPersonal()
  }
  // Canciones/repertorios necesitan algún ámbito: sin banda ni personal, al perfil.
  if (!band.currentBandId && !band.personalMode && to.path !== '/perfil' && to.path !== '/practica') {
    return '/perfil'
  }
})

export default router
