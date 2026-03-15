import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import type { Router } from 'vue-router'

import type { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { hasToken } from '@/utils/token'

const appTitle = import.meta.env.VITE_APP_TITLE || '智能设备管理系统'
const authEntryPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password'])

NProgress.configure({ showSpinner: false })

function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return false
  }

  const response = (error as { response?: { status?: number } }).response
  return response?.status === 401
}

/**
 * 装配全局路由守卫。
 * 守卫统一负责标题更新、会话恢复兜底和角色权限校验，避免每个页面各自判断登录状态后出现跳转口径不一致。
 */
export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    NProgress.start()

    document.title = to.meta.title ? `${to.meta.title} - ${appTitle}` : appTitle

    const authStore = useAuthStore()
    const requiresAuth = to.meta.requiresAuth !== false

    if (!requiresAuth) {
      if (hasToken() && authEntryPaths.has(to.path)) {
        if (authStore.currentUser) {
          return { path: '/dashboard' }
        }

        try {
          /**
           * 认证公开页不能只凭本地 token 就一律跳仪表盘。
           * 当刷新后 Store 尚未恢复用户资料时，这里先补拉一次当前用户；只有确认会话有效后，才拦截登录页回到仪表盘。
           */
          await authStore.fetchCurrentUser()
          return { path: '/dashboard' }
        } catch (error) {
          /**
           * 对认证页而言，非 401 的补拉失败更适合放行到登录页，避免用户被卡在“有 token 但无法进入认证页”的死循环里。
           */
          if (isUnauthorizedError(error)) {
            authStore.clearAuthState()
          }

          return true
        }
      }

      return true
    }

    if (!hasToken()) {
      return {
        path: '/login',
        query: { redirect: to.fullPath },
      }
    }

    if (!authStore.currentUser) {
      try {
        await authStore.fetchCurrentUser()
      } catch (error) {
        /**
         * 只有 401 才代表令牌失效。
         * 若只是 `/auth/me` 临时失败，不应立即清空会话并把用户踢回登录页，否则会与认证 Store 的会话恢复口径冲突。
         * 但也不能直接放行受限页面，后续仍需继续走角色校验，让缺失角色信息的场景回落到 403。
         */
        if (isUnauthorizedError(error)) {
          authStore.clearAuthState()

          return {
            path: '/login',
            query: { redirect: to.fullPath },
          }
        }
      }
    }

    const requiredRoles = (Array.isArray(to.meta.roles) ? to.meta.roles : undefined) as
      | UserRole[]
      | undefined

    if (
      requiredRoles?.length &&
      (!authStore.userRole || !requiredRoles.includes(authStore.userRole))
    ) {
      return { path: '/403' }
    }

    return true
  })

  router.afterEach(() => {
    NProgress.done()
  })

  router.onError(() => {
    NProgress.done()
  })
}
