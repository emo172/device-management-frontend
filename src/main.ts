import { createApp } from 'vue'
import 'element-plus/dist/index.css'

import App from './App.vue'
import { installElementPlus } from './plugins/elementPlus'
import router from './router'
import { useNotificationStore } from './stores/modules/notification'
import { useAuthStore } from './stores/modules/auth'
import { pinia } from './stores/pinia'
import { registerSessionResetHandler } from './stores/sessionBridge'
import '@/assets/styles/index.scss'

async function bootstrapApp() {
  const app = createApp(App)

  app.use(pinia)
  app.use(router)
  installElementPlus(app)

  // 应用首次挂载前先恢复认证状态，避免刷新后受保护页面先按旧本地缓存渲染，
  // 再在异步校验完成后被强制打回登录页，造成明显的菜单闪烁与权限竞态。
  const authStore = useAuthStore(pinia)
  const notificationStore = useNotificationStore(pinia)

  registerSessionResetHandler(() => {
    authStore.clearAuthState()
    notificationStore.resetState()
  })

  await authStore.initializeAuth()

  // 图标库依赖已经接入，但基础设施阶段不做全量注册，
  // 避免入口包体被一次性放大；后续业务组件按需引入即可。

  app.mount('#app')
}

void bootstrapApp()
