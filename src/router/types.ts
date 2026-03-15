import type { UserRole } from '@/enums/UserRole'

/**
 * 应用布局键。
 * 路由通过 meta.layout 决定页面外壳，避免业务页自己重复拼装头部、侧栏与认证壳层。
 */
export type AppLayoutKey = 'default' | 'auth' | 'blank'

/**
 * 项目路由元信息。
 * requiresAuth 默认视为 true；roles 只在需要进一步按角色收窄访问范围时填写。
 */
export interface AppRouteMeta {
  title?: string
  requiresAuth?: boolean
  roles?: UserRole[]
  layout?: AppLayoutKey
  hidden?: boolean
}
