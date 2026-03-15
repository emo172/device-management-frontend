import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * 全局 Pinia 实例。
 * 统一在这里装配持久化插件，避免入口文件和测试环境各自重复拼装状态基础设施。
 */
export const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

/**
 * 为极少数需要隔离状态容器的场景提供工厂方法。
 * 当前主要用于后续 SSR 或独立挂载测试，默认业务仍直接复用共享实例。
 */
export function createAppPinia() {
  const appPinia = createPinia()
  appPinia.use(piniaPluginPersistedstate)
  return appPinia
}

export * from './modules/ai'
export * from './modules/app'
export * from './modules/auth'
export * from './modules/borrow'
export * from './modules/device'
export * from './modules/notification'
export * from './modules/overdue'
export * from './modules/reservation'
export * from './modules/statistics'
export * from './modules/user'
