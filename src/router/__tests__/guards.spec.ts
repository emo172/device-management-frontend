import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setActivePinia } from 'pinia'

import { createAppPinia } from '@/stores'
import { useAuthStore } from '@/stores/modules/auth'
import { setAccessToken, setRefreshToken } from '@/utils/token'
import { UserRole } from '@/enums/UserRole'

import { setupRouterGuards } from '../guards'
import { routes } from '../routes'

const { getCurrentUserMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
}))

const { runFatalErrorHandlerMock, runUnauthorizedHandlerMock } = vi.hoisted(() => ({
  runFatalErrorHandlerMock: vi.fn(),
  runUnauthorizedHandlerMock: vi.fn(),
}))

vi.mock('nprogress', () => ({
  default: {
    configure: vi.fn(),
    done: vi.fn(),
    start: vi.fn(),
  },
}))

vi.mock('@/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/api/auth')>('@/api/auth')

  return {
    ...actual,
    getCurrentUser: getCurrentUserMock,
  }
})

vi.mock('@/stores/sessionBridge', () => ({
  runFatalErrorHandler: runFatalErrorHandlerMock,
  runUnauthorizedHandler: runUnauthorizedHandlerMock,
}))

function createGuardedRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  setupRouterGuards(router)

  return router
}

describe('router guards', () => {
  beforeEach(() => {
    localStorage.clear()
    getCurrentUserMock.mockReset()
    runFatalErrorHandlerMock.mockReset()
    runUnauthorizedHandlerMock.mockReset()
    setActivePinia(createAppPinia())
  })

  it('未登录访问受保护路由时跳回登录页并保留 redirect', async () => {
    const router = createGuardedRouter()

    await router.push('/dashboard')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('已登录用户访问认证页时重定向到仪表盘', async () => {
    setAccessToken('access-token')
    setRefreshToken('refresh-token')

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const router = createGuardedRouter()
    await router.push('/login')

    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('有 token 但用户资料补拉临时失败时，允许回到登录页避免导航锁死', async () => {
    setAccessToken('access-token')
    setRefreshToken('refresh-token')
    getCurrentUserMock.mockRejectedValue({ response: { status: 500 } })

    const router = createGuardedRouter()

    await router.push('/login')

    const authStore = useAuthStore()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1)
    expect(authStore.accessToken).toBe('access-token')
  })

  it('有 token 但用户资料已失效时，允许进入登录页并走统一未授权处理', async () => {
    setAccessToken('expired-access-token')
    setRefreshToken('expired-refresh-token')
    getCurrentUserMock.mockRejectedValue({ response: { status: 401 } })

    const router = createGuardedRouter()

    await router.push('/login')

    const authStore = useAuthStore()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(authStore.accessToken).toBe('expired-access-token')
    expect(authStore.refreshToken).toBe('expired-refresh-token')
    expect(runUnauthorizedHandlerMock).toHaveBeenCalledTimes(1)
  })

  it('存在令牌但缺少当前用户时，会先补拉用户资料再放行', async () => {
    setAccessToken('access-token')
    setRefreshToken('refresh-token')
    getCurrentUserMock.mockResolvedValue({
      email: 'admin@example.com',
      phone: '13800138000',
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      userId: 'admin-1',
      username: 'admin',
    })

    const router = createGuardedRouter()

    await router.push('/statistics')

    expect(getCurrentUserMock).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/statistics')
  })

  it('受保护路由补拉用户遇到 401 时，走统一未授权链并保留目标 redirect', async () => {
    setAccessToken('access-token')
    setRefreshToken('refresh-token')
    getCurrentUserMock.mockRejectedValue({ response: { status: 401 } })

    const router = createGuardedRouter()

    await router.push('/statistics')

    expect(runUnauthorizedHandlerMock).toHaveBeenCalledTimes(1)
    expect(runUnauthorizedHandlerMock).toHaveBeenCalledWith({ redirect: '/statistics' })
    expect(runFatalErrorHandlerMock).not.toHaveBeenCalled()
  })

  it('受保护路由补拉用户遇到非 401 失败时，写入 fatal error 并跳到 500', async () => {
    setAccessToken('access-token')
    setRefreshToken('refresh-token')
    getCurrentUserMock.mockRejectedValue({ response: { status: 500 } })

    const router = createGuardedRouter()

    await router.push('/statistics')

    expect(runFatalErrorHandlerMock).toHaveBeenCalledTimes(1)
    expect(runFatalErrorHandlerMock).toHaveBeenCalledWith({
      source: 'auth',
      title: '页面鉴权失败',
      description: '进入目标页面前无法确认当前登录身份，请稍后重试。',
      retryTarget: {
        path: '/statistics',
        retryable: true,
      },
    })
    expect(runUnauthorizedHandlerMock).not.toHaveBeenCalled()
  })

  it('角色不匹配时跳转到 403 页面', async () => {
    setAccessToken('access-token')
    setRefreshToken('refresh-token')

    const authStore = useAuthStore()
    authStore.setCurrentUser({
      email: 'user@example.com',
      phone: '13800138000',
      realName: '普通用户',
      role: UserRole.USER,
      userId: 'user-1',
      username: 'user',
    })

    const router = createGuardedRouter()

    await router.push('/statistics')

    expect(router.currentRoute.value.path).toBe('/403')
  })
})
