import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  authStoreMock,
  appMock,
  clearAuthStateMock,
  createAppMock,
  fetchCurrentUserMock,
  initializeAuthMock,
  installElementPlusMock,
  piniaMock,
  registeredFatalErrorHandlerRef,
  registerDirectivesMock,
  registerFatalErrorHandlerMock,
  registeredSessionResetHandlerRef,
  registerSessionResetHandlerMock,
  registeredUnauthorizedHandlerRef,
  registerUnauthorizedHandlerMock,
  resetAppStateMock,
  resetNotificationStateMock,
  routerInstallEffectRef,
  routerInstallMock,
  runFatalErrorHandlerMock,
  setFatalErrorMock,
  routerMock,
  routerPushMock,
} = vi.hoisted(() => {
  const app = {
    config: {} as Record<string, unknown>,
    use: vi.fn(),
    mount: vi.fn(),
  }

  app.use.mockImplementation((dependency: { id?: string; install?: () => void | Promise<void> }) => {
    void dependency?.install?.()
    return app
  })

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

  return {
    authStoreMock: authStore,
    appMock: app,
    clearAuthStateMock: clearAuthState,
    createAppMock: vi.fn(() => app),
    fetchCurrentUserMock: fetchCurrentUser,
    initializeAuthMock: initializeAuth,
    installElementPlusMock: vi.fn(),
    piniaMock: { id: 'pinia' },
    registeredFatalErrorHandlerRef: { current: null as null | ((error: unknown) => Promise<void>) },
    registerDirectivesMock: vi.fn(),
    registerFatalErrorHandlerMock: vi.fn(),
    registeredSessionResetHandlerRef: { current: null as null | (() => Promise<void>) },
    registeredUnauthorizedHandlerRef: {
      current: null as null | ((context: { redirect?: string }) => Promise<void>),
    },
    registerSessionResetHandlerMock: vi.fn(),
    registerUnauthorizedHandlerMock: vi.fn(),
    resetAppStateMock: vi.fn(),
    resetNotificationStateMock: vi.fn(),
    routerInstallEffectRef: { current: null as null | (() => void | Promise<void>) },
    routerInstallMock: vi.fn(),
    runFatalErrorHandlerMock: vi.fn(),
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
    currentRoute: {
      value: {
        fullPath: '/devices/device-1',
        path: '/devices/device-1',
      },
    },
    resolve: vi.fn((to: string | { path?: string }) => {
      const path = typeof to === 'string' ? (to.split('?')[0] ?? to) : (to.path ?? '/')

      return { path }
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

describe('main bootstrap', () => {
  beforeEach(() => {
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
    registerFatalErrorHandlerMock.mockReset()
    registerSessionResetHandlerMock.mockReset()
    registerUnauthorizedHandlerMock.mockReset()
    registeredFatalErrorHandlerRef.current = null
    registeredSessionResetHandlerRef.current = null
    registeredUnauthorizedHandlerRef.current = null
    resetAppStateMock.mockReset()
    resetNotificationStateMock.mockReset()
    routerInstallEffectRef.current = null
    routerInstallMock.mockImplementation(() => routerInstallEffectRef.current?.())
    routerInstallMock.mockClear()
    routerPushMock.mockReset()
    runFatalErrorHandlerMock.mockReset()
    setFatalErrorMock.mockReset()
  })

  it('waits for auth initialization before mounting the app', async () => {
    let resolveInitialize: (() => void) | undefined

    initializeAuthMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInitialize = resolve
        }),
    )

    await import('../main')

    expect(createAppMock).toHaveBeenCalledTimes(1)
    expect(initializeAuthMock).toHaveBeenCalledTimes(1)
    expect(installElementPlusMock).not.toHaveBeenCalled()
    expect(registerDirectivesMock).not.toHaveBeenCalled()
    expect(registerSessionResetHandlerMock).toHaveBeenCalledTimes(1)
    expect(registerUnauthorizedHandlerMock).toHaveBeenCalledTimes(1)
    expect(registerFatalErrorHandlerMock).toHaveBeenCalledTimes(1)
    expect(appMock.mount).not.toHaveBeenCalled()

    resolveInitialize?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(installElementPlusMock).toHaveBeenCalledTimes(1)
    expect(registerDirectivesMock).toHaveBeenCalledTimes(1)
    expect(registerDirectivesMock).toHaveBeenCalledWith(appMock)
    expect(appMock.mount).toHaveBeenCalledWith('#app')
  })

  it('registers session bridge handlers before router installation starts navigation', async () => {
    await import('../main')

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

    await import('../main')
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

    await import('../main')
    await Promise.resolve()
    await Promise.resolve()

    expect(routerPushMock).toHaveBeenCalledTimes(1)
    expect(routerPushMock).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/statistics' },
    })
  })

  it('normalizes redirect in unauthorized handler and resets stores through the registered bridge', async () => {
    await import('../main')

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

  it('writes fatal error snapshot and avoids duplicate /500 navigation when already there', async () => {
    await import('../main')

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
    ;((await import('../router')).default.currentRoute as { value: unknown }).value = {
      fullPath: '/500',
      path: '/500',
    }

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

    await import('../main')

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

    addEventListenerSpy.mockRestore()
  })
})
