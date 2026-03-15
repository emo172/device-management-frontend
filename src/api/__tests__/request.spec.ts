import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiResponse } from '@/types/api'

const {
  authStoreClearAuthStateMock,
  messageErrorMock,
  notificationStoreResetStateMock,
  routerPushMock,
} = vi.hoisted(() => ({
  authStoreClearAuthStateMock: vi.fn(),
  messageErrorMock: vi.fn(),
  notificationStoreResetStateMock: vi.fn(),
  routerPushMock: vi.fn(),
}))

vi.mock('element-plus/es/components/message/index', () => ({
  ElMessage: {
    error: messageErrorMock,
  },
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock,
  },
}))

vi.mock('@/stores/sessionBridge', () => ({
  runSessionResetHandler: vi.fn(async () => {
    authStoreClearAuthStateMock()
    notificationStoreResetStateMock()
  }),
}))

import service from '../request'

describe('request service', () => {
  beforeEach(() => {
    localStorage.clear()
    authStoreClearAuthStateMock.mockReset()
    messageErrorMock.mockReset()
    notificationStoreResetStateMock.mockReset()
    routerPushMock.mockReset()
  })

  it('injects bearer token into request headers', async () => {
    localStorage.setItem('access_token', 'demo-access-token')

    service.defaults.adapter = async (config) => ({
      data: {
        code: 0,
        message: 'success',
        data: config.headers.Authorization,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })

    const response = await service.get<string>('/devices')
    expect(response).toBe('Bearer demo-access-token')
  })

  it('does not force json content type for form data upload', async () => {
    let capturedContentType: unknown

    service.defaults.adapter = async (config) => {
      capturedContentType =
        typeof config.headers.getContentType === 'function'
          ? config.headers.getContentType()
          : config.headers['Content-Type']

      return {
        data: {
          code: 0,
          message: 'success',
          data: 'ok',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }

    const formData = new FormData()
    formData.append('file', new Blob(['demo']), 'demo.txt')

    await service.post<string, FormData>('/devices/device-1/image', formData)

    expect(String(capturedContentType)).not.toBe('application/json')
  })

  it('rejects business error and shows message', async () => {
    service.defaults.adapter = async (config) => ({
      data: {
        code: 1,
        message: '业务失败',
        data: null,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })

    await expect(service.get('/devices')).rejects.toThrow('业务失败')
    expect(messageErrorMock).toHaveBeenCalledWith('业务失败')
  })

  it('clears store state and redirects to login when response is 401', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'expired-refresh-token')

    service.defaults.adapter = async () => {
      return Promise.reject({
        response: {
          status: 401,
          data: {
            message: 'token expired',
          },
        },
      })
    }

    await expect(service.get('/profile')).rejects.toMatchObject({
      response: {
        status: 401,
      },
    })

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(authStoreClearAuthStateMock).toHaveBeenCalledTimes(1)
    expect(notificationStoreResetStateMock).toHaveBeenCalledTimes(1)
    expect(routerPushMock).toHaveBeenCalledWith('/login')
    expect(messageErrorMock).toHaveBeenCalledWith('登录已过期，请重新登录')
  })
})
