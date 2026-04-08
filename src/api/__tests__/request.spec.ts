import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ApiResponse } from '@/types/api'

const { messageErrorMock, runFatalErrorHandlerMock, runUnauthorizedHandlerMock } = vi.hoisted(
  () => ({
    messageErrorMock: vi.fn(),
    runFatalErrorHandlerMock: vi.fn(),
    runUnauthorizedHandlerMock: vi.fn(),
  }),
)

vi.mock('element-plus/es/components/message/index', () => ({
  ElMessage: {
    error: messageErrorMock,
  },
}))

vi.mock('@/stores/sessionBridge', () => ({
  runFatalErrorHandler: runFatalErrorHandlerMock,
  runUnauthorizedHandler: runUnauthorizedHandlerMock,
}))

import service from '../request'

describe('request service', () => {
  beforeEach(() => {
    localStorage.clear()
    messageErrorMock.mockReset()
    runFatalErrorHandlerMock.mockReset()
    runUnauthorizedHandlerMock.mockReset()
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

  it('returns blob payload directly for protected binary endpoints', async () => {
    const audioBlob = new Blob(['audio'], { type: 'audio/mpeg' })

    service.defaults.adapter = async (config) => ({
      data: audioBlob,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    })

    await expect(service.get<Blob>('/files/demo-audio', { responseType: 'blob' })).resolves.toBe(audioBlob)
  })

  it('parses blob business errors into stable message text', async () => {
    service.defaults.adapter = async () => {
      return Promise.reject({
        config: {
          responseType: 'blob',
        },
        response: {
          status: 400,
          data: new Blob([JSON.stringify({ message: '二进制下载失败，请稍后重试' })], {
            type: 'application/json',
          }),
        },
      })
    }

    await expect(
      service.get<Blob>('/files/demo-audio', { responseType: 'blob' }),
    ).rejects.toThrow('二进制下载失败，请稍后重试')
    expect(messageErrorMock).toHaveBeenCalledWith('二进制下载失败，请稍后重试')
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

  it('only runs unauthorized handler when request layer receives 401', async () => {
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

    expect(runUnauthorizedHandlerMock).toHaveBeenCalledTimes(1)
    expect(runUnauthorizedHandlerMock).toHaveBeenCalledWith()
    expect(runFatalErrorHandlerMock).not.toHaveBeenCalled()
  })

  it('keeps business page in place when a single 5xx request fails', async () => {
    service.defaults.adapter = async () => {
      return Promise.reject({
        response: {
          status: 500,
          data: {
            message: '服务器繁忙',
          },
        },
      })
    }

    await expect(service.get('/devices')).rejects.toMatchObject({
      response: {
        status: 500,
      },
    })

    expect(messageErrorMock).toHaveBeenCalledWith('服务器繁忙')
    expect(runUnauthorizedHandlerMock).not.toHaveBeenCalled()
    expect(runFatalErrorHandlerMock).not.toHaveBeenCalled()
  })
})
