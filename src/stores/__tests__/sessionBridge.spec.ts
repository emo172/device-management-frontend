import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clearTokensMock, messageErrorMock } = vi.hoisted(() => ({
  clearTokensMock: vi.fn(),
  messageErrorMock: vi.fn(),
}))

vi.mock('@/utils/token', () => ({
  clearTokens: clearTokensMock,
}))

vi.mock('element-plus/es/components/message/index.mjs', () => ({
  ElMessage: {
    error: messageErrorMock,
  },
}))

import {
  registerFatalErrorHandler,
  registerSessionResetHandler,
  registerUnauthorizedHandler,
  runFatalErrorHandler,
  runUnauthorizedHandler,
} from '../sessionBridge'

describe('session bridge', () => {
  beforeEach(() => {
    clearTokensMock.mockReset()
    messageErrorMock.mockReset()
    registerSessionResetHandler(async () => {})
    registerUnauthorizedHandler(async () => {})
    registerFatalErrorHandler(async () => {})
  })

  it('coalesces concurrent unauthorized handling into a single reset and navigation', async () => {
    const resetCalls: string[] = []
    const navigationCalls: Array<{ redirect?: string }> = []

    registerSessionResetHandler(async () => {
      resetCalls.push('reset')
      await Promise.resolve()
    })

    registerUnauthorizedHandler(async (context) => {
      navigationCalls.push(context)
      await Promise.resolve()
    })

    await Promise.all([
      runUnauthorizedHandler({ redirect: '/devices' }),
      runUnauthorizedHandler({ redirect: '/statistics' }),
      runUnauthorizedHandler({ redirect: '/login?redirect=/devices' }),
    ])

    expect(clearTokensMock).toHaveBeenCalledTimes(1)
    expect(resetCalls).toEqual(['reset'])
    expect(messageErrorMock).toHaveBeenCalledTimes(1)
    expect(navigationCalls).toEqual([{ redirect: '/devices' }])
  })

  it('coalesces concurrent fatal errors so the first snapshot wins during processing', async () => {
    const handledErrors: Array<{ title: string; description: string }> = []

    registerFatalErrorHandler(async (error) => {
      handledErrors.push({ title: error.title, description: error.description })
      await Promise.resolve()
    })

    await Promise.all([
      runFatalErrorHandler({
        source: 'auth',
        title: '首个致命错误',
        description: '首次上报应被保留。',
        retryTarget: { retryable: false },
      }),
      runFatalErrorHandler({
        source: 'router',
        title: '后续致命错误',
        description: '同一处理窗口内不应覆盖首个快照。',
        retryTarget: { retryable: false },
      }),
    ])

    expect(handledErrors).toEqual([
      {
        title: '首个致命错误',
        description: '首次上报应被保留。',
      },
    ])
  })
})
