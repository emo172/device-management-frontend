import { createApp } from 'vue'
import 'element-plus/dist/index.css'

import App from './App.vue'
import { registerDirectives } from './directives'
import { installElementPlus } from './plugins/elementPlus'
import router from './router'
import { useAppStore } from './stores/modules/app'
import { useNotificationStore } from './stores/modules/notification'
import { useAuthStore } from './stores/modules/auth'
import { pinia } from './stores/pinia'
import {
  registerFatalErrorHandler,
  registerSessionResetHandler,
  registerUnauthorizedHandler,
  runFatalErrorHandler,
} from './stores/sessionBridge'
import '@/assets/styles/index.scss'

const authEntryPaths = new Set(['/login', '/register', '/forgot-password', '/reset-password'])

/**
 * 在 router 尚未完成安装前，首屏 401 仍然可能先于首个受保护路由导航发生。
 * 这里直接读取浏览器地址栏的真实路径，确保 bootstrap 阶段也能拿到用户刚刚刷新的目标页。
 */
function resolveBrowserFullPath() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

/**
 * 登录回跳只需要应用内部路由，不应把部署基路径重复写进 redirect。
 * 这里基于 `BASE_URL` 显式裁掉浏览器地址中的部署前缀，避免子路径部署时出现 `/base/base/...` 双前缀跳转。
 */
function stripBaseUrl(path: string) {
  const baseUrl =
    ((router as { options?: { history?: { base?: string } } }).options?.history?.base as
      | string
      | undefined) || import.meta.env.BASE_URL || '/'
  const normalizedBasePath = baseUrl === '/' ? '' : baseUrl.replace(/\/$/, '')

  if (!normalizedBasePath) {
    return path
  }

  if (path === normalizedBasePath) {
    return '/'
  }

  if (path.startsWith(`${normalizedBasePath}/`)) {
    return path.slice(normalizedBasePath.length)
  }

  return path
}

/**
 * 登录 redirect 默认回到当前路由，但公开认证页与 500 页本身不能再作为 redirect，
 * 否则登录成功后会回到无意义入口甚至形成“登录页 -> 登录页”的回环。
 * 若浏览器当前运行在子路径下，这里还要通过 `router.resolve()` 折算回路由内部使用的相对 fullPath，
 * 避免把部署基路径重复拼进 redirect，导致登录成功后出现双前缀跳转。
 */
function resolveLoginRedirect(explicitRedirect?: string) {
  const redirect = stripBaseUrl(
    explicitRedirect ?? resolveBrowserFullPath() ?? router.currentRoute.value.fullPath,
  )

  if (!redirect) {
    return undefined
  }

  const resolvedLocation = router.resolve(redirect)
  const resolvedPath = resolvedLocation.path

  if (authEntryPaths.has(resolvedPath) || resolvedPath === '/500') {
    return undefined
  }

  return resolvedLocation.fullPath || redirect
}

/**
 * 入口层统一兜住未捕获异常与 Promise 拒绝。
 * 这些错误已经越过业务请求边界，继续停留在原页面通常只会留下半渲染状态，因此要直接上报到 500 链路。
 */
function createMainFatalErrorSnapshot(description: string) {
  const currentPath = router.currentRoute.value.path

  return {
    source: 'main' as const,
    title: '应用运行异常',
    description,
    retryTarget:
      currentPath && currentPath !== '/500'
        ? {
            path: router.currentRoute.value.fullPath,
            retryable: true as const,
          }
        : {
            retryable: false as const,
          },
  }
}

async function bootstrapApp() {
  const app = createApp(App)

  app.use(pinia)

  // 应用首次挂载前先恢复认证状态，避免刷新后受保护页面先按旧本地缓存渲染，
  // 再在异步校验完成后被强制打回登录页，造成明显的菜单闪烁与权限竞态。
  const appStore = useAppStore(pinia)
  const authStore = useAuthStore(pinia)
  const notificationStore = useNotificationStore(pinia)

  // 首屏导航守卫与 router.onError 会在路由安装阶段立即参与流程，
  // 因此必须先装配 bridge，避免首个 401 或首个路由异常发生时没有统一收口。
  registerSessionResetHandler(() => {
    appStore.resetState()
    authStore.clearAuthState()
    notificationStore.resetState()
  })

  registerUnauthorizedHandler(async ({ redirect }) => {
    const normalizedRedirect = resolveLoginRedirect(redirect)

    await router.push(
      normalizedRedirect
        ? {
            path: '/login',
            query: {
              redirect: normalizedRedirect,
            },
          }
        : { path: '/login' },
    )
  })

  registerFatalErrorHandler(async (fatalError) => {
    appStore.setFatalError(fatalError)

    if (router.currentRoute.value.path === '/500') {
      return
    }

    await router.push('/500')
  })

  app.config.errorHandler = (error, _instance, info) => {
    void runFatalErrorHandler(
      createMainFatalErrorSnapshot(
        `页面运行时发生未捕获异常（${info}），请稍后重试或重新进入当前模块。`,
      ),
    )
  }

  window.addEventListener('error', (event) => {
    const message =
      event.error instanceof Error ? event.error.message : '页面运行时发生未捕获异常。'

    void runFatalErrorHandler(createMainFatalErrorSnapshot(`页面运行异常：${message}`))
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : '存在未处理的异步异常。'

    void runFatalErrorHandler(createMainFatalErrorSnapshot(`异步任务执行失败：${reason}`))
  })

  /**
   * 首屏认证恢复必须发生在 router 安装之前。
   * 因为 `app.use(router)` 会立刻触发首屏导航守卫；若此时仍是 `initialized = false`，
   * 守卫会为了兜底再次补拉 `/auth/me`，从而与 `initializeAuth()` 自身形成重复校验甚至重复登录导航。
   */
  await authStore.initializeAuth()

  app.use(router)
  installElementPlus(app)
  registerDirectives(app)

  // 图标库依赖已经接入，但基础设施阶段不做全量注册，
  // 避免入口包体被一次性放大；后续业务组件按需引入即可。

  app.mount('#app')
}

void bootstrapApp()
