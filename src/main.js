import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'

// Capturar invitación (#/join/TOKEN) antes de que el router procese la ruta.
const inviteMatch = window.location.hash.match(/^#\/join\/([^/?#]+)/)
if (inviteMatch) {
  localStorage.setItem('pendingInvite', inviteMatch[1])
  window.location.hash = '#/'
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
