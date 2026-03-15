import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiResponse } from '@/types/api'

const { messageErrorMock, routerPushMock } = vi.hoisted(() => ({
  messageErrorMock: vi.fn(),
  routerPushMock: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: messageErrorMock,
  },
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock,
  },
}))

import service from '../request'

describe('request service', () => {
  beforeEach(() => {
    localStorage.clear()
    messageErrorMock.mockReset()
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

    const response = await service.get<ApiResponse<string>>('/devices')
    expect(response.data.data).toBe('Bearer demo-access-token')
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

  it('clears token and redirects to login when response is 401', async () => {
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
    expect(routerPushMock).toHaveBeenCalledWith('/login')
    expect(messageErrorMock).toHaveBeenCalledWith('登录已过期，请重新登录')
  })
})
