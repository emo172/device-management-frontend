import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import '@/assets/styles/index.scss'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

// 图标库依赖已经接入，但基础设施阶段不做全量注册，
// 避免入口包体被一次性放大；后续业务组件按需引入即可。

app.mount('#app')
