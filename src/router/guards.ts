import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import type { Router } from 'vue-router'

import type { UserRole } from '@/enums/UserRole'
import { runFatalErrorHandler, runUnauthorizedHandler } from '@/stores/sessionBridge'
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
          await authStore.fetchCurrentUser({ skipUnauthorizedHandler: true })
          return { path: '/dashboard' }
        } catch (error) {
          /**
           * 对认证页而言，非 401 的补拉失败更适合放行到登录页，避免用户被卡在“有 token 但无法进入认证页”的死循环里。
           */
          if (isUnauthorizedError(error)) {
            await runUnauthorizedHandler()
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
        await authStore.fetchCurrentUser({ skipUnauthorizedHandler: true })
      } catch (error) {
        /**
         * 受保护路由在进入前必须确认远端身份。
         * 401 说明会话确实失效，需要把目标页作为 redirect 带回登录页；
         * 非 401 则属于“身份校验链路本身不可恢复”，此时继续回落到 403 只会掩盖真实故障，应升级为 500。
         */
        if (isUnauthorizedError(error)) {
          await runUnauthorizedHandler({ redirect: to.fullPath })
          return false
        }

        await runFatalErrorHandler({
          source: 'auth',
          title: '页面鉴权失败',
          description: '进入目标页面前无法确认当前登录身份，请稍后重试。',
          retryTarget: {
            path: to.fullPath,
            retryable: true,
          },
        })

        return false
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

  router.onError((error) => {
    NProgress.done()

    void runFatalErrorHandler({
      source: 'router',
      title: '页面加载失败',
      description:
        error instanceof Error
          ? `路由资源加载失败：${error.message}`
          : '目标页面资源加载失败，请稍后重试。',
      retryTarget: {
        retryable: false,
      },
    })
  })
}
