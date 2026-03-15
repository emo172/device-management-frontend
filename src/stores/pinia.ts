import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * 全局 Pinia 实例。
 * 单独拆到独立入口后，请求层可以按需只动态导入状态容器本身，避免与 stores 聚合入口形成静态/动态混用告警。
 */
export const pinia = createPinia()

pinia.use(piniaPluginPersistedstate)

/**
 * 为测试和隔离挂载场景提供独立的 Pinia 工厂。
 */
export function createAppPinia() {
  const appPinia = createPinia()
  appPinia.use(piniaPluginPersistedstate)
  return appPinia
}
