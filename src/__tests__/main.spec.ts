import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type MainModule = typeof import('../main')

const DEFAULT_ROUTE = {
  fullPath: '/devices/device-1',
  path: '/devices/device-1',
}

const indexHtmlContent = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8')
const indexThemeBootstrapScript =
  indexHtmlContent.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1] ?? ''

const {
  authStoreMock,
  appMock,
  applyResolvedThemeMock,
  clearAuthStateMock,
  createAppMock,
  fetchCurrentUserMock,
  initializeAuthMock,
  installElementPlusMock,
  registerResolvedThemeDomSyncMock,
  registerSystemThemeListenerMock,
  piniaMock,
  registeredFatalErrorHandlerRef,
  registeredResolvedThemeSyncRef,
  registerDirectivesMock,
  registerFatalErrorHandlerMock,
  registeredSessionResetHandlerRef,
  registerSessionResetHandlerMock,
  registeredUnauthorizedHandlerRef,
  registerUnauthorizedHandlerMock,
  refreshResolvedThemeMock,
  resetAppStateMock,
  resetNotificationStateMock,
  resetThemeListenerMock,
  registeredSystemThemeListenerRef,
  routerInstallEffectRef,
  routerInstallMock,
  runFatalErrorHandlerMock,
  initializeThemeStateMock,
  setFatalErrorMock,
  routerMock,
  routerPushMock,
} = vi.hoisted(() => {
  const app = {
    config: {} as Record<string, unknown>,
    use: vi.fn(),
    mount: vi.fn(),
  }

  app.use.mockImplementation(
    (dependency: { id?: string; install?: () => void | Promise<void> }) => {
      void dependency?.install?.()
      return app
    },
  )

  const clearAuthState = vi.fn()
  const fetchCurrentUser = vi.fn()
  const initializeAuth = vi.fn()
  const authStore = {
    clearAuthState,
    currentUser: null as null | Record<string, unknown>,
    fetchCurrentUser,
    initializeAuth,
    initialized: false,
  }

  const resetThemeListener = vi.fn()
  const registeredResolvedThemeSync = { current: null as null | (() => 'light' | 'dark') }
  const registeredSystemThemeListener = { current: null as null | ((matches: boolean) => void) }

  return {
    authStoreMock: authStore,
    appMock: app,
    applyResolvedThemeMock: vi.fn(),
    clearAuthStateMock: clearAuthState,
    createAppMock: vi.fn(() => app),
    fetchCurrentUserMock: fetchCurrentUser,
    initializeAuthMock: initializeAuth,
    installElementPlusMock: vi.fn(),
    registerResolvedThemeDomSyncMock: vi.fn((themeSource: () => 'light' | 'dark') => {
      registeredResolvedThemeSync.current = themeSource
      applyResolvedThemeMock(themeSource())

      return () => {
        registeredResolvedThemeSync.current = null
      }
    }),
    registerSystemThemeListenerMock: vi.fn((handler: (matches: boolean) => void) => {
      registeredSystemThemeListener.current = handler
      return resetThemeListener
    }),
    piniaMock: { id: 'pinia' },
    registeredFatalErrorHandlerRef: { current: null as null | ((error: unknown) => Promise<void>) },
    registeredResolvedThemeSyncRef: registeredResolvedThemeSync,
    registerDirectivesMock: vi.fn(),
    registerFatalErrorHandlerMock: vi.fn(),
    registeredSessionResetHandlerRef: { current: null as null | (() => Promise<void>) },
    registeredUnauthorizedHandlerRef: {
      current: null as null | ((context: { redirect?: string }) => Promise<void>),
    },
    registerSessionResetHandlerMock: vi.fn(),
    registerUnauthorizedHandlerMock: vi.fn(),
    refreshResolvedThemeMock: vi.fn(),
    resetAppStateMock: vi.fn(),
    resetNotificationStateMock: vi.fn(),
    resetThemeListenerMock: resetThemeListener,
    registeredSystemThemeListenerRef: registeredSystemThemeListener,
    routerInstallEffectRef: { current: null as null | (() => void | Promise<void>) },
    routerInstallMock: vi.fn(),
    runFatalErrorHandlerMock: vi.fn(),
    initializeThemeStateMock: vi.fn(),
    setFatalErrorMock: vi.fn(),
    routerMock: { id: 'router' },
    routerPushMock: vi.fn(),
  }
})

vi.mock('vue', () => ({
  createApp: createAppMock,
}))

vi.mock('../plugins/elementPlus', () => ({
  installElementPlus: installElementPlusMock,
}))

vi.mock('../directives', () => ({
  registerDirectives: registerDirectivesMock,
}))

vi.mock('element-plus/dist/index.css', () => ({}))
vi.mock('@/assets/styles/index.scss', () => ({}))

vi.mock('../App.vue', () => ({
  default: {},
}))

vi.mock('../router', () => ({
  default: {
    ...routerMock,
    install: routerInstallMock,
    options: {
      history: {
        base: '/base/',
      },
    },
    currentRoute: {
      value: { ...DEFAULT_ROUTE },
    },
    resolve: vi.fn((to: string | { path?: string }) => {
      const raw = typeof to === 'string' ? to : (to.path ?? '/')
      const [rawPathWithQuery = '/', hash = ''] = raw.split('#')
      const [rawPathname = '/', query = ''] = rawPathWithQuery.split('?')
      const pathname = rawPathname || '/'
      const fullPath = `${pathname}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`

      return { path: pathname, fullPath }
    }),
    push: routerPushMock,
  },
}))

vi.mock('../stores/pinia', () => ({
  pinia: piniaMock,
}))

vi.mock('../stores/modules/auth', () => ({
  useAuthStore: vi.fn(() => authStoreMock),
}))

vi.mock('../stores/modules/app', () => ({
  useAppStore: vi.fn(() => ({
    initializeThemeState: initializeThemeStateMock,
    refreshResolvedTheme: refreshResolvedThemeMock,
    resolvedTheme: 'dark',
    resetState: resetAppStateMock,
    setFatalError: setFatalErrorMock,
  })),
}))

vi.mock('../stores/modules/notification', () => ({
  useNotificationStore: vi.fn(() => ({
    resetState: resetNotificationStateMock,
  })),
}))

vi.mock('../stores/sessionBridge', () => ({
  registerFatalErrorHandler: vi.fn((handler: (error: unknown) => Promise<void>) => {
    registeredFatalErrorHandlerRef.current = handler
    registerFatalErrorHandlerMock(handler)
  }),
  registerSessionResetHandler: vi.fn((handler: () => Promise<void>) => {
    registeredSessionResetHandlerRef.current = handler
    registerSessionResetHandlerMock(handler)
  }),
  registerUnauthorizedHandler: vi.fn(
    (handler: (context: { redirect?: string }) => Promise<void>) => {
      registeredUnauthorizedHandlerRef.current = handler
      registerUnauthorizedHandlerMock(handler)
    },
  ),
  runFatalErrorHandler: runFatalErrorHandlerMock,
}))

vi.mock('../utils/themeMode', () => ({
  applyResolvedTheme: applyResolvedThemeMock,
  registerResolvedThemeDomSync: registerResolvedThemeDomSyncMock,
  registerSystemThemeListener: registerSystemThemeListenerMock,
}))

describe('main bootstrap', () => {
  let cleanupBootstrap: (() => void) | undefined
  const originalMatchMedia = window.matchMedia

  async function resetRouterCurrentRoute(route = DEFAULT_ROUTE) {
    ;((await import('../router')).default.currentRoute as { value: unknown }).value = { ...route }
  }

  function runIndexThemeBootstrapScript() {
    const executeScript = new Function(indexThemeBootstrapScript)
    executeScript()
  }

  async function bootstrapMainForTest() {
    const mainModule = (await import('../main')) as MainModule
    cleanupBootstrap = await mainModule.bootstrapApp()

    return mainModule
  }

  beforeEach(async () => {
    vi.resetModules()
    appMock.config = {}
    appMock.use.mockClear()
    appMock.mount.mockClear()
    authStoreMock.currentUser = null
    authStoreMock.initialized = false
    clearAuthStateMock.mockReset()
    createAppMock.mockClear()
    fetchCurrentUserMock.mockReset()
    initializeAuthMock.mockReset()
    installElementPlusMock.mockReset()
    applyResolvedThemeMock.mockReset()
    registerResolvedThemeDomSyncMock.mockClear()
    registerFatalErrorHandlerMock.mockReset()
    registerSystemThemeListenerMock.mockReset()
    registerSessionResetHandlerMock.mockReset()
    registerUnauthorizedHandlerMock.mockReset()
    registeredFatalErrorHandlerRef.current = null
    registeredResolvedThemeSyncRef.current = null
    registeredSessionResetHandlerRef.current = null
    registeredUnauthorizedHandlerRef.current = null
    registeredSystemThemeListenerRef.current = null
    resetAppStateMock.mockReset()
    resetNotificationStateMock.mockReset()
    resetThemeListenerMock.mockReset()
    routerInstallEffectRef.current = null
    routerInstallMock.mockImplementation(() => routerInstallEffectRef.current?.())
    routerInstallMock.mockClear()
    routerPushMock.mockReset()
    runFatalErrorHandlerMock.mockReset()
    initializeThemeStateMock.mockReset()
    refreshResolvedThemeMock.mockReset()
    refreshResolvedThemeMock.mockImplementation(() => {
      const currentThemeSource = registeredResolvedThemeSyncRef.current

      if (currentThemeSource) {
        applyResolvedThemeMock(currentThemeSource())
      }
    })
    setFatalErrorMock.mockReset()
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
    window.matchMedia = originalMatchMedia
    await resetRouterCurrentRoute()
  })

  afterEach(async () => {
    cleanupBootstrap?.()
    cleanupBootstrap = undefined
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
    window.matchMedia = originalMatchMedia
    await resetRouterCurrentRoute()
  })

  it('falls back to light when index preload script matchMedia throws', () => {
    window.localStorage.setItem('theme_preference', 'system')
    window.matchMedia = vi.fn(() => {
      throw new Error('matchMedia blocked')
    }) as unknown as typeof window.matchMedia

    expect(() => runIndexThemeBootstrapScript()).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('restores browser history and mocked router route before each test', async () => {
    expect(window.location.pathname).toBe('/')
    expect(
      ((await import('../router')).default.currentRoute as { value: typeof DEFAULT_ROUTE }).value,
    ).toEqual(DEFAULT_ROUTE)
  })

  it('initializes theme state and takes over dom theme sync during bootstrap', async () => {
    await bootstrapMainForTest()
    await Promise.resolve()
    await Promise.resolve()

    expect(initializeThemeStateMock).toHaveBeenCalledTimes(1)
    expect(applyResolvedThemeMock).toHaveBeenCalledWith('dark')
    expect(registerSystemThemeListenerMock).toHaveBeenCalledTimes(1)
  })

  it('re-applies resolved theme when system theme listener reports a change', async () => {
    await bootstrapMainForTest()
    await Promise.resolve()
    await Promise.resolve()

    registeredSystemThemeListenerRef.current?.(true)

    expect(refreshResolvedThemeMock).toHaveBeenCalledWith(true)
    expect(applyResolvedThemeMock).toHaveBeenLastCalledWith('dark')
  })

  it('waits for auth initialization before mounting the app', async () => {
    let resolveInitialize: (() => void) | undefined

    initializeAuthMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInitialize = resolve
        }),
    )

    const mainModule = (await import('../main')) as MainModule
    const bootstrapPromise = mainModule.bootstrapApp()

    expect(createAppMock).toHaveBeenCalledTimes(1)
    expect(initializeAuthMock).toHaveBeenCalledTimes(1)
    expect(installElementPlusMock).not.toHaveBeenCalled()
    expect(registerSessionResetHandlerMock).toHaveBeenCalledTimes(1)
    expect(registerUnauthorizedHandlerMock).toHaveBeenCalledTimes(1)
    expect(registerFatalErrorHandlerMock).toHaveBeenCalledTimes(1)
    expect(appMock.mount).not.toHaveBeenCalled()

    resolveInitialize?.()
    cleanupBootstrap = await bootstrapPromise
    await Promise.resolve()
    await Promise.resolve()

    expect(installElementPlusMock).toHaveBeenCalledTimes(1)
    expect(registerDirectivesMock).toHaveBeenCalledWith(appMock)
    expect(appMock.mount).toHaveBeenCalledWith('#app')
  })

  it('registers session bridge handlers before router installation starts navigation', async () => {
    await bootstrapMainForTest()

    const routerUseCallOrder = appMock.use.mock.calls
      .map((args, index) => ({
        dependency: args[0] as { id?: string },
        callOrder: appMock.use.mock.invocationCallOrder[index],
      }))
      .find(({ dependency }) => dependency?.id === 'router')?.callOrder

    expect(routerUseCallOrder).toBeDefined()
    expect(registerSessionResetHandlerMock.mock.invocationCallOrder[0]).toBeLessThan(
      routerUseCallOrder!,
    )
    expect(registerUnauthorizedHandlerMock.mock.invocationCallOrder[0]).toBeLessThan(
      routerUseCallOrder!,
    )
    expect(registerFatalErrorHandlerMock.mock.invocationCallOrder[0]).toBeLessThan(
      routerUseCallOrder!,
    )
  })

  it('首屏带 token 和缓存用户时，只会完成一次当前用户远端校验', async () => {
    authStoreMock.currentUser = {
      userId: 'user-1',
      username: 'cached-user',
    }

    routerInstallEffectRef.current = async () => {
      if (!authStoreMock.initialized && authStoreMock.currentUser) {
        await fetchCurrentUserMock({ skipUnauthorizedHandler: true })
      }
    }

    initializeAuthMock.mockImplementation(async () => {
      await fetchCurrentUserMock({ skipUnauthorizedHandler: true })
      authStoreMock.initialized = true
    })

    await bootstrapMainForTest()
    await Promise.resolve()
    await Promise.resolve()

    expect(fetchCurrentUserMock).toHaveBeenCalledTimes(1)
  })

  it('首屏 401 时，只会触发一次未授权登录导航', async () => {
    authStoreMock.currentUser = {
      userId: 'user-1',
      username: 'cached-user',
    }

    routerInstallEffectRef.current = async () => {
      if (!authStoreMock.initialized && authStoreMock.currentUser) {
        await registeredUnauthorizedHandlerRef.current?.({ redirect: '/statistics' })
      }
    }

    initializeAuthMock.mockImplementation(async () => {
      await registeredUnauthorizedHandlerRef.current?.({ redirect: '/statistics' })
      authStoreMock.initialized = true
    })

    await bootstrapMainForTest()
    await Promise.resolve()
    await Promise.resolve()

    expect(routerPushMock).toHaveBeenCalledTimes(1)
    expect(routerPushMock).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/statistics' },
    })
  })

  it('normalizes redirect in unauthorized handler and resets stores through the registered bridge', async () => {
    await bootstrapMainForTest()

    await registeredSessionResetHandlerRef.current?.()

    expect(resetAppStateMock).toHaveBeenCalledTimes(1)
    expect(resetNotificationStateMock).toHaveBeenCalledTimes(1)

    await registeredUnauthorizedHandlerRef.current?.({ redirect: '/login?redirect=/devices' })
    await registeredUnauthorizedHandlerRef.current?.({ redirect: '/statistics?tab=usage' })

    expect(routerPushMock).toHaveBeenNthCalledWith(1, { path: '/login' })
    expect(routerPushMock).toHaveBeenNthCalledWith(2, {
      path: '/login',
      query: { redirect: '/statistics?tab=usage' },
    })
  })

  /**
   * 首屏 401 若发生在 router 安装之前，仍应保留浏览器真实地址作为 redirect。
   * 该断言用于防止 bootstrap 阶段把目标页错误回退成 `/`。
   */
  it('preserves browser location as redirect when bootstrap 401 happens before router install', async () => {
    window.history.replaceState({}, '', '/statistics?tab=usage')
    await resetRouterCurrentRoute({
      fullPath: '/',
      path: '/',
    })

    await bootstrapMainForTest()

    await registeredUnauthorizedHandlerRef.current?.({})

    expect(routerPushMock).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/statistics?tab=usage' },
    })
  })

  /**
   * 部署在子路径时，浏览器地址会带上 BASE_URL；
   * 登录 redirect 必须归一化回路由内部路径，不能把基路径重复塞进后续导航。
   */
  it('normalizes base-prefixed browser location before using it as bootstrap redirect', async () => {
    window.history.replaceState({}, '', '/base/statistics?tab=usage')
    await resetRouterCurrentRoute({
      fullPath: '/',
      path: '/',
    })

    await bootstrapMainForTest()

    await registeredUnauthorizedHandlerRef.current?.({})

    expect(routerPushMock).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/statistics?tab=usage' },
    })
  })

  it('writes fatal error snapshot and avoids duplicate /500 navigation when already there', async () => {
    await bootstrapMainForTest()

    await registeredFatalErrorHandlerRef.current?.({
      source: 'auth',
      title: '会话恢复失败',
      description: '登录状态校验失败。',
      retryTarget: { retryable: false },
    })

    expect(setFatalErrorMock).toHaveBeenCalledWith({
      source: 'auth',
      title: '会话恢复失败',
      description: '登录状态校验失败。',
      retryTarget: { retryable: false },
    })
    expect(routerPushMock).toHaveBeenCalledWith('/500')

    routerPushMock.mockClear()
    setFatalErrorMock.mockClear()
    await resetRouterCurrentRoute({
      fullPath: '/500',
      path: '/500',
    })

    await registeredFatalErrorHandlerRef.current?.({
      source: 'router',
      title: '页面加载失败',
      description: '重复上报时只刷新快照。',
      retryTarget: { retryable: false },
    })

    expect(setFatalErrorMock).toHaveBeenCalledTimes(1)
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('registers runtime error handlers that delegate to the fatal error bridge', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    await bootstrapMainForTest()

    expect(typeof appMock.config.errorHandler).toBe('function')
    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))

    const appErrorHandler = appMock.config.errorHandler as (
      error: Error,
      instance: unknown,
      info: string,
    ) => void

    appErrorHandler(new Error('boom'), null, 'render')
    expect(runFatalErrorHandlerMock).toHaveBeenCalledTimes(1)

    const windowErrorHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'error',
    )?.[1] as ((event: ErrorEvent) => void) | undefined
    const rejectionHandler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'unhandledrejection',
    )?.[1] as ((event: PromiseRejectionEvent) => void) | undefined

    windowErrorHandler?.(new ErrorEvent('error', { error: new Error('window boom') }))
    rejectionHandler?.({ reason: new Error('reject boom') } as PromiseRejectionEvent)

    expect(runFatalErrorHandlerMock).toHaveBeenCalledTimes(3)

    cleanupBootstrap?.()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})
