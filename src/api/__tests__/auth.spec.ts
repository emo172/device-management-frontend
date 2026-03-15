import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
    put: putMock,
  },
}))

import * as authApi from '../auth'
import {
  changePassword,
  getCurrentUser,
  login,
  register,
  resetPassword,
  sendVerificationCode,
  updateProfile,
} from '../auth'

describe('auth api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    putMock.mockReset()
  })

  it('uses backend auth endpoints and returns business data directly', async () => {
    const response = { userId: 'user-1', accessToken: 'access-token' }
    postMock.mockResolvedValue(response)

    const payload = { account: 'demo', password: 'Password123' }
    const result = await login(payload)

    expect(postMock).toHaveBeenCalledWith('/auth/login', payload)
    expect(result).toBe(response)
  })

  it('submits registration payload to register endpoint', async () => {
    const response = { userId: 'user-2', accessToken: 'register-token' }
    postMock.mockResolvedValue(response)

    const payload = {
      username: 'new-user',
      password: 'Password123',
      email: 'demo@example.com',
      realName: '测试用户',
      phone: '13800000000',
    }

    await expect(register(payload)).resolves.toBe(response)
    expect(postMock).toHaveBeenCalledWith('/auth/register', payload)
  })

  it('loads and updates current user profile with dedicated endpoints', async () => {
    const currentUser = { userId: 'user-1', username: 'demo' }
    const updatedProfile = { userId: 'user-1', realName: '新姓名' }
    getMock.mockResolvedValueOnce(currentUser)
    putMock.mockResolvedValueOnce(updatedProfile)

    const updatePayload = { realName: '新姓名', phone: '13800000000' }

    await expect(getCurrentUser()).resolves.toBe(currentUser)
    await expect(updateProfile(updatePayload)).resolves.toBe(updatedProfile)

    expect(getMock).toHaveBeenCalledWith('/auth/me')
    expect(putMock).toHaveBeenCalledWith('/auth/profile', updatePayload)
  })

  it('posts password management actions to their dedicated endpoints', async () => {
    postMock.mockResolvedValue(undefined)

    const changePayload = { oldPassword: 'old-password', newPassword: 'new-password' }
    const verificationPayload = { email: 'demo@example.com' }
    const resetPayload = {
      email: 'demo@example.com',
      verificationCode: '123456',
      newPassword: 'Password456',
    }

    await changePassword(changePayload)
    await sendVerificationCode(verificationPayload)
    await resetPassword(resetPayload)

    expect(postMock).toHaveBeenNthCalledWith(1, '/auth/change-password', changePayload)
    expect(postMock).toHaveBeenNthCalledWith(2, '/auth/verification-code', verificationPayload)
    expect(postMock).toHaveBeenNthCalledWith(3, '/auth/reset-password', resetPayload)
  })

  it('does not expose a fake logout endpoint that backend does not implement', () => {
    expect(authApi).not.toHaveProperty('logout')
  })
})
