import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { STORAGE_KEYS } from '@/constants'
import { UserRole } from '@/enums/UserRole'

const {
  changePasswordMock,
  clearTokensMock,
  getAccessTokenMock,
  getCurrentUserMock,
  getRefreshTokenMock,
  hasTokenMock,
  loginMock,
  registerMock,
  resetNotificationStateMock,
  resetPasswordMock,
  routerPushMock,
  sendVerificationCodeMock,
  setAccessTokenMock,
  setRefreshTokenMock,
  updateProfileMock,
} = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  clearTokensMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  getRefreshTokenMock: vi.fn(),
  hasTokenMock: vi.fn(),
  loginMock: vi.fn(),
  registerMock: vi.fn(),
  resetNotificationStateMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  routerPushMock: vi.fn(),
  sendVerificationCodeMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
  setRefreshTokenMock: vi.fn(),
  updateProfileMock: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  changePassword: changePasswordMock,
  getCurrentUser: getCurrentUserMock,
  login: loginMock,
  register: registerMock,
  resetPassword: resetPasswordMock,
  sendVerificationCode: sendVerificationCodeMock,
  updateProfile: updateProfileMock,
}))

vi.mock('../modules/notification', () => ({
  useNotificationStore: () => ({
    resetState: resetNotificationStateMock,
  }),
}))

vi.mock('@/utils/token', () => ({
  clearTokens: clearTokensMock,
  getAccessToken: getAccessTokenMock,
  getRefreshToken: getRefreshTokenMock,
  hasToken: hasTokenMock,
  setAccessToken: setAccessTokenMock,
  setRefreshToken: setRefreshTokenMock,
}))

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock,
  },
}))

import { useAuthStore } from '../modules/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()

    changePasswordMock.mockReset()
    clearTokensMock.mockReset()
    getAccessTokenMock.mockReset()
    getCurrentUserMock.mockReset()
    getRefreshTokenMock.mockReset()
    hasTokenMock.mockReset()
    loginMock.mockReset()
    registerMock.mockReset()
    resetNotificationStateMock.mockReset()
    resetPasswordMock.mockReset()
    routerPushMock.mockReset()
    sendVerificationCodeMock.mockReset()
    setAccessTokenMock.mockReset()
    setRefreshTokenMock.mockReset()
    updateProfileMock.mockReset()

    hasTokenMock.mockReturnValue(false)
    getAccessTokenMock.mockReturnValue(null)
    getRefreshTokenMock.mockReturnValue(null)
  })

  it('logs in, persists tokens and loads current user profile', async () => {
    loginMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      role: UserRole.USER,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    })
    getCurrentUserMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      email: 'demo@example.com',
      realName: '测试用户',
      phone: '13800000000',
      role: UserRole.USER,
    })

    const store = useAuthStore()
    await store.login({ account: 'demo', password: 'Password123' })

    expect(loginMock).toHaveBeenCalledWith({ account: 'demo', password: 'Password123' })
    expect(setAccessTokenMock).toHaveBeenCalledWith('access-1')
    expect(setRefreshTokenMock).toHaveBeenCalledWith('refresh-1')
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1)
    expect(store.currentUser?.userId).toBe('user-1')
    expect(store.userRole).toBe(UserRole.USER)
    expect(store.accessToken).toBe('access-1')
    expect(store.isAuthenticated).toBe(true)
  })

  it('rolls back session state when login succeeds but current user hydration fails', async () => {
    loginMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      role: UserRole.USER,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    })
    getCurrentUserMock.mockRejectedValue(new Error('load current user failed'))

    const store = useAuthStore()
    store.currentUser = {
      userId: 'stale-user',
      username: 'stale',
      email: 'stale@example.com',
      realName: '旧用户',
      phone: '13800000000',
      role: UserRole.SYSTEM_ADMIN,
    }
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(store.currentUser))

    await expect(store.login({ account: 'demo', password: 'Password123' })).rejects.toThrow(
      'load current user failed',
    )

    expect(clearTokensMock).toHaveBeenCalledTimes(1)
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.initialized).toBe(false)
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('rolls back session state when register succeeds but current user hydration fails', async () => {
    registerMock.mockResolvedValue({
      userId: 'user-2',
      username: 'new-user',
      role: UserRole.USER,
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    })
    getCurrentUserMock.mockRejectedValue(new Error('load registered user failed'))

    const store = useAuthStore()
    store.currentUser = {
      userId: 'stale-user',
      username: 'stale',
      email: 'stale@example.com',
      realName: '旧用户',
      phone: '13800000000',
      role: UserRole.DEVICE_ADMIN,
    }

    await expect(
      store.register({
        username: 'new-user',
        password: 'Password123',
        email: 'new@example.com',
        realName: '新用户',
        phone: '13900000000',
      }),
    ).rejects.toThrow('load registered user failed')

    expect(clearTokensMock).toHaveBeenCalledTimes(1)
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(store.currentUser).toBeNull()
    expect(store.initialized).toBe(false)
    expect(routerPushMock).not.toHaveBeenCalled()
  })

  it('hydrates auth state from token utilities when session exists', async () => {
    hasTokenMock.mockReturnValue(true)
    getAccessTokenMock.mockReturnValue('persisted-access')
    getRefreshTokenMock.mockReturnValue('persisted-refresh')
    getCurrentUserMock.mockResolvedValue({
      userId: 'user-2',
      username: 'admin',
      email: 'admin@example.com',
      realName: '系统管理员',
      phone: '13900000000',
      role: UserRole.SYSTEM_ADMIN,
    })

    const store = useAuthStore()
    await store.initializeAuth()

    expect(store.initialized).toBe(true)
    expect(store.accessToken).toBe('persisted-access')
    expect(store.refreshToken).toBe('persisted-refresh')
    expect(store.userRole).toBe(UserRole.SYSTEM_ADMIN)
  })

  it('updates profile and security actions through auth endpoints', async () => {
    updateProfileMock.mockResolvedValue({
      userId: 'user-1',
      username: 'demo',
      email: 'demo@example.com',
      realName: '新姓名',
      phone: '13800000001',
      role: UserRole.USER,
    })
    changePasswordMock.mockResolvedValue(undefined)
    sendVerificationCodeMock.mockResolvedValue(undefined)
    resetPasswordMock.mockResolvedValue(undefined)

    const store = useAuthStore()
    store.currentUser = {
      userId: 'user-1',
      username: 'demo',
      email: 'demo@example.com',
      realName: '旧姓名',
      phone: '13800000000',
      role: UserRole.USER,
    }

    await store.updateProfile({ realName: '新姓名', phone: '13800000001' })
    await store.changePassword({ oldPassword: 'old', newPassword: 'new' })
    await store.sendVerificationCode({ email: 'demo@example.com' })
    await store.resetPassword({
      email: 'demo@example.com',
      verificationCode: '123456',
      newPassword: 'Password456',
    })

    expect(store.currentUser?.realName).toBe('新姓名')
    expect(changePasswordMock).toHaveBeenCalledWith({ oldPassword: 'old', newPassword: 'new' })
    expect(sendVerificationCodeMock).toHaveBeenCalledWith({ email: 'demo@example.com' })
    expect(resetPasswordMock).toHaveBeenCalledWith({
      email: 'demo@example.com',
      verificationCode: '123456',
      newPassword: 'Password456',
    })
  })

  it('clears auth state and redirects to login when logging out', async () => {
    const store = useAuthStore()
    store.accessToken = 'access-1'
    store.refreshToken = 'refresh-1'
    store.currentUser = {
      userId: 'user-1',
      username: 'demo',
      email: 'demo@example.com',
      realName: '测试用户',
      phone: '13800000000',
      role: UserRole.DEVICE_ADMIN,
    }

    await store.logout()

    expect(clearTokensMock).toHaveBeenCalledTimes(1)
    expect(resetNotificationStateMock).toHaveBeenCalledTimes(1)
    expect(routerPushMock).toHaveBeenCalledWith('/login')
    expect(store.currentUser).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
