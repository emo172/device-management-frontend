import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import { pinia, useAuthStore } from './stores'
import '@/assets/styles/index.scss'

async function bootstrapApp() {
  const app = createApp(App)

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  // 应用首次挂载前先恢复认证状态，避免刷新后受保护页面先按旧本地缓存渲染，
  // 再在异步校验完成后被强制打回登录页，造成明显的菜单闪烁与权限竞态。
  const authStore = useAuthStore(pinia)
  await authStore.initializeAuth()

  // 图标库依赖已经接入，但基础设施阶段不做全量注册，
  // 避免入口包体被一次性放大；后续业务组件按需引入即可。

  app.mount('#app')
}

void bootstrapApp()
