import { createRouter, createWebHashHistory } from 'vue-router'
import ActividadesView     from '../views/ActividadesView.vue'
import ActividadDetailView from '../views/ActividadDetailView.vue'
import CancionesView       from '../views/CancionesView.vue'
import AgregarView         from '../views/AgregarView.vue'
import TiposView           from '../views/TiposView.vue'
import SongView            from '../views/SongView.vue'

const routes = [
  { path: '/',              component: ActividadesView },
  { path: '/actividad/:id', component: ActividadDetailView },
  { path: '/canciones',     component: CancionesView },
  { path: '/agregar',       component: AgregarView },
  { path: '/tipos',         component: TiposView },
  { path: '/cancion/:id',   component: SongView },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
