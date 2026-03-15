import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  appMock,
  createAppMock,
  initializeAuthMock,
  installElementPlusMock,
  piniaMock,
  registerSessionResetHandlerMock,
  resetNotificationStateMock,
  routerMock,
} = vi.hoisted(() => {
  const app = {
    use: vi.fn(),
    mount: vi.fn(),
  }

  app.use.mockReturnValue(app)

  return {
    appMock: app,
    createAppMock: vi.fn(() => app),
    initializeAuthMock: vi.fn(),
    installElementPlusMock: vi.fn(),
    piniaMock: { id: 'pinia' },
    registerSessionResetHandlerMock: vi.fn(),
    resetNotificationStateMock: vi.fn(),
    routerMock: { id: 'router' },
  }
})

vi.mock('vue', () => ({
  createApp: createAppMock,
}))

vi.mock('../plugins/elementPlus', () => ({
  installElementPlus: installElementPlusMock,
}))

vi.mock('element-plus/dist/index.css', () => ({}))
vi.mock('@/assets/styles/index.scss', () => ({}))

vi.mock('../App.vue', () => ({
  default: {},
}))

vi.mock('../router', () => ({
  default: routerMock,
}))

vi.mock('../stores/pinia', () => ({
  pinia: piniaMock,
}))

vi.mock('../stores/modules/auth', () => ({
  useAuthStore: vi.fn(() => ({
    clearAuthState: vi.fn(),
    initializeAuth: initializeAuthMock,
  })),
}))

vi.mock('../stores/modules/notification', () => ({
  useNotificationStore: vi.fn(() => ({
    resetState: resetNotificationStateMock,
  })),
}))

vi.mock('../stores/sessionBridge', () => ({
  registerSessionResetHandler: registerSessionResetHandlerMock,
}))

describe('main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    appMock.use.mockClear()
    appMock.mount.mockClear()
    createAppMock.mockClear()
    initializeAuthMock.mockReset()
    installElementPlusMock.mockReset()
    registerSessionResetHandlerMock.mockReset()
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
    expect(installElementPlusMock).toHaveBeenCalledTimes(1)
    expect(registerSessionResetHandlerMock).toHaveBeenCalledTimes(1)
    expect(appMock.mount).not.toHaveBeenCalled()

    resolveInitialize?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(appMock.mount).toHaveBeenCalledWith('#app')
  })
})
