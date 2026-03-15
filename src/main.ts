import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import '@/assets/styles/index.scss'

const app = createApp(App)
const pinia = createPinia()

// 认证令牌与用户偏好后续都会落在 Pinia 持久化插件上，这里先在入口统一装配。
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 图标库依赖已经接入，但基础设施阶段不做全量注册，
// 避免入口包体被一次性放大；后续业务组件按需引入即可。

app.mount('#app')
