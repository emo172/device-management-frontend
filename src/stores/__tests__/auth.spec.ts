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
  runFatalErrorHandlerMock,
  runUnauthorizedHandlerMock,
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
  runFatalErrorHandlerMock: vi.fn(),
  runUnauthorizedHandlerMock: vi.fn(),
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

vi.mock('../sessionBridge', () => ({
  runFatalErrorHandler: runFatalErrorHandlerMock,
  runUnauthorizedHandler: runUnauthorizedHandlerMock,
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
    runFatalErrorHandlerMock.mockReset()
    runUnauthorizedHandlerMock.mockReset()
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

  it('登录后若远端返回未知角色，不会静默降级成普通用户', async () => {
    localStorage.setItem(
      STORAGE_KEYS.USER_INFO,
      JSON.stringify({
        userId: 'stale-user',
        username: 'stale',
        email: 'stale@example.com',
        realName: '旧用户',
        phone: '13800000000',
        role: UserRole.USER,
      }),
    )

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
      role: 'AUDITOR',
    })

    const store = useAuthStore()

    await expect(store.login({ account: 'demo', password: 'Password123' })).rejects.toThrow(
      '未知的用户角色',
    )

    expect(clearTokensMock).toHaveBeenCalledTimes(1)
    expect(store.currentUser).toBeNull()
    expect(store.userRole).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.USER_INFO)).toBeNull()
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

  it('keeps persisted session but escalates to 500 when initializeAuth hits a non-401 error', async () => {
    const persistedUser = {
      userId: 'user-3',
      username: 'cached-user',
      email: 'cached@example.com',
      realName: '缓存用户',
      phone: '13700000000',
      role: UserRole.USER,
    }

    hasTokenMock.mockReturnValue(true)
    getAccessTokenMock.mockReturnValue('persisted-access')
    getRefreshTokenMock.mockReturnValue('persisted-refresh')
    getCurrentUserMock.mockRejectedValue(new Error('network down'))
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(persistedUser))

    const store = useAuthStore()
    await store.initializeAuth()

    expect(clearTokensMock).not.toHaveBeenCalled()
    expect(runUnauthorizedHandlerMock).not.toHaveBeenCalled()
    expect(runFatalErrorHandlerMock).toHaveBeenCalledTimes(1)
    expect(runFatalErrorHandlerMock).toHaveBeenCalledWith({
      source: 'auth',
      title: '会话恢复失败',
      description: '登录状态校验失败，请稍后重试或重新登录。',
      retryTarget: {
        retryable: false,
      },
    })
    expect(store.initialized).toBe(true)
    expect(store.accessToken).toBe('persisted-access')
    expect(store.refreshToken).toBe('persisted-refresh')
    expect(store.currentUser).toEqual(persistedUser)
  })

  it('delegates 401 session recovery failure to the unified unauthorized chain', async () => {
    const unauthorizedError = {
      response: {
        status: 401,
      },
    }

    hasTokenMock.mockReturnValue(true)
    getAccessTokenMock.mockReturnValue('persisted-access')
    getRefreshTokenMock.mockReturnValue('persisted-refresh')
    getCurrentUserMock.mockRejectedValue(unauthorizedError)
    localStorage.setItem(
      STORAGE_KEYS.USER_INFO,
      JSON.stringify({
        userId: 'user-4',
        username: 'expired-user',
        email: 'expired@example.com',
        realName: '过期用户',
        phone: '13600000000',
        role: UserRole.DEVICE_ADMIN,
      }),
    )

    const store = useAuthStore()
    await store.initializeAuth()

    expect(runUnauthorizedHandlerMock).toHaveBeenCalledTimes(1)
    expect(runUnauthorizedHandlerMock).toHaveBeenCalledWith()
    expect(runFatalErrorHandlerMock).not.toHaveBeenCalled()
    expect(store.initialized).toBe(true)
    expect(store.accessToken).toBe('persisted-access')
    expect(store.refreshToken).toBe('persisted-refresh')
    expect(store.currentUser).toEqual({
      userId: 'user-4',
      username: 'expired-user',
      email: 'expired@example.com',
      realName: '过期用户',
      phone: '13600000000',
      role: UserRole.DEVICE_ADMIN,
    })
  })

  it('会话恢复遇到未知角色时，会按契约异常上报而不是降级成普通用户', async () => {
    localStorage.setItem(
      STORAGE_KEYS.USER_INFO,
      JSON.stringify({
        userId: 'stale-user',
        username: 'stale',
        email: 'stale@example.com',
        realName: '旧用户',
        phone: '13800000000',
        role: UserRole.USER,
      }),
    )

    hasTokenMock.mockReturnValue(true)
    getAccessTokenMock.mockReturnValue('persisted-access')
    getRefreshTokenMock.mockReturnValue('persisted-refresh')
    getCurrentUserMock.mockResolvedValue({
      userId: 'user-5',
      username: 'mystery-user',
      email: 'mystery@example.com',
      realName: '未知角色用户',
      phone: '13500000000',
      role: 'AUDITOR',
    })

    const store = useAuthStore()
    await store.initializeAuth()

    expect(runFatalErrorHandlerMock).toHaveBeenCalledTimes(1)
    expect(runUnauthorizedHandlerMock).not.toHaveBeenCalled()
    expect(store.initialized).toBe(true)
    expect(store.currentUser).toBeNull()
    expect(store.userRole).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.USER_INFO)).toBeNull()
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
