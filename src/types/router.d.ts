import 'vue-router'

import type { AppRouteMeta } from '@/router/types'

declare module 'vue-router' {
  /**
   * 为 Vue Router 补充项目级元信息类型，确保守卫、布局和菜单都使用同一套字段口径。
   */
  interface RouteMeta extends AppRouteMeta {}
}

export {}
