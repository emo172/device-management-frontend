import { beforeEach, describe, expect, it, vi } from 'vitest'

const { appMock, createAppMock, initializeAuthMock, piniaMock, routerMock } = vi.hoisted(() => {
  const app = {
    use: vi.fn(),
    mount: vi.fn(),
  }

  app.use.mockReturnValue(app)

  return {
    appMock: app,
    createAppMock: vi.fn(() => app),
    initializeAuthMock: vi.fn(),
    piniaMock: { id: 'pinia' },
    routerMock: { id: 'router' },
  }
})

vi.mock('vue', () => ({
  createApp: createAppMock,
}))

vi.mock('element-plus', () => ({
  default: { install: vi.fn() },
}))

vi.mock('element-plus/es/locale/lang/zh-cn', () => ({
  default: {},
}))

vi.mock('element-plus/dist/index.css', () => ({}))
vi.mock('@/assets/styles/index.scss', () => ({}))

vi.mock('../App.vue', () => ({
  default: {},
}))

vi.mock('../router', () => ({
  default: routerMock,
}))

vi.mock('../stores', () => ({
  pinia: piniaMock,
  useAuthStore: vi.fn(() => ({
    initializeAuth: initializeAuthMock,
  })),
}))

describe('main bootstrap', () => {
  beforeEach(() => {
    vi.resetModules()
    appMock.use.mockClear()
    appMock.mount.mockClear()
    createAppMock.mockClear()
    initializeAuthMock.mockReset()
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
    expect(appMock.mount).not.toHaveBeenCalled()

    resolveInitialize?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(appMock.mount).toHaveBeenCalledWith('#app')
  })
})
