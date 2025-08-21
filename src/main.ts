import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { router } from './router'
import AppLayout from './components/AppLayout.vue'
import './index.css'

const app = createApp(AppLayout)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')