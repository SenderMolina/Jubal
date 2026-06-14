import { createRouter, createWebHashHistory } from 'vue-router'
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

const routes = [
  { path: '/',                redirect: '/actividades' },
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
  { path: '/cancion/:id',     component: SongView },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
