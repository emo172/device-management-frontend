import type { App } from 'vue'

import { permissionDirective } from './permission'

/**
 * 统一注册自定义指令，避免入口文件散落多个 `app.directive` 调用后难以追踪权限基础设施是否已接入。
 */
export function registerDirectives(app: App) {
  app.directive('permission', permissionDirective)
}

export { permissionDirective } from './permission'
