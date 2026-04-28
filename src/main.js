// 项目入口文件：负责创建 Vue 应用实例并挂载

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.scss'

const app = createApp(App)
const pinia = createPinia()

// 依次挂载 Pinia（状态管理）、Vue Router（路由），最后挂载到 DOM 节点 #app
app.use(pinia).use(router).mount('#app')
