import { defineStore } from 'pinia'

import * as authApi from '@/api/auth'
import { STORAGE_KEYS } from '@/constants'
import { UserRole } from '@/enums/UserRole'
import router from '@/router'
import { useNotificationStore } from '@/stores/modules/notification'
import { getStorageObject, setStorageObject } from '@/utils/storage'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasToken,
  setAccessToken,
  setRefreshToken,
} from '@/utils/token'

type AuthUser = authApi.CurrentUserResponse & { role: UserRole }

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  currentUser: AuthUser | null
  initialized: boolean
  loading: boolean
}

function normalizeUserRole(role: string): UserRole {
  if (role === UserRole.DEVICE_ADMIN) {
    return UserRole.DEVICE_ADMIN
  }

  if (role === UserRole.SYSTEM_ADMIN) {
    return UserRole.SYSTEM_ADMIN
  }

  return UserRole.USER
}

function normalizeCurrentUser(user: authApi.CurrentUserResponse): AuthUser {
  return {
    ...user,
    role: normalizeUserRole(user.role),
  }
}

function getPersistedUser(): AuthUser | null {
  return getStorageObject<AuthUser>(STORAGE_KEYS.USER_INFO)
}

function createDefaultState(): AuthState {
  return {
    accessToken: getAccessToken(),
    refreshToken: getRefreshToken(),
    currentUser: getPersistedUser(),
    initialized: false,
    loading: false,
  }
}

/**
 * 认证域状态。
 * 该 Store 负责令牌、当前用户身份与登录跳转契约，所有会话恢复和退出都必须从这里收口，避免请求层与页面层各自维护半套状态。
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => createDefaultState(),

  getters: {
    /**
     * 访问令牌存在即可视为有会话，具体权限仍以后续 `/auth/me` 回填的角色资料为准。
     */
    isAuthenticated: (state) => Boolean(state.accessToken),

    /**
     * 角色从当前用户资料统一导出，避免页面直接解析后端原始字符串。
     */
    userRole: (state): UserRole | null => state.currentUser?.role ?? null,
  },

  actions: {
    /**
     * 统一保存令牌并同步到请求层依赖的 token 工具，保证登录后后续请求立即带上 Bearer Token。
     */
    applyAuthResult(result: authApi.AuthResult) {
      this.accessToken = result.accessToken
      this.refreshToken = result.refreshToken
      setAccessToken(result.accessToken)
      setRefreshToken(result.refreshToken)
    },

    /**
     * 当前用户资料既服务页面渲染，也写入本地缓存，便于刷新后先恢复基础身份再做远端校验。
     */
    setCurrentUser(user: authApi.CurrentUserResponse | null) {
      this.currentUser = user ? normalizeCurrentUser(user) : null

      if (this.currentUser) {
        setStorageObject(STORAGE_KEYS.USER_INFO, this.currentUser)
      }
    },

    /**
     * 清空会话状态。
     * 401 失效与主动退出登录都走这里，避免出现页面角色已清空但请求头仍残留旧 token 的不一致状态。
     */
    clearAuthState() {
      clearTokens()
      this.accessToken = null
      this.refreshToken = null
      this.currentUser = null
    },

    /**
     * 加载远端当前用户资料。
     * 登录与刷新恢复都复用该动作，保证权限口径始终以后端 `/api/auth/me` 为准。
     */
    async fetchCurrentUser() {
      const user = await authApi.getCurrentUser()
      this.setCurrentUser(user)
      return this.currentUser
    },

    /**
     * 登录后必须先保存令牌，再查询当前用户详情，避免仅凭登录返回的最小字段驱动后续页面权限判断。
     */
    async finalizeAuthenticatedSession(result: authApi.AuthResult) {
      this.applyAuthResult(result)

      try {
        await this.fetchCurrentUser()
        this.initialized = true
        return result
      } catch (error) {
        // 若令牌已落地但 `/auth/me` 回填失败，必须立即回滚本地会话，
        // 否则会留下“新 token + 旧用户资料”的混合状态，后续菜单与鉴权判断都会失真。
        this.clearAuthState()
        throw error
      }
    },

    /**
     * 登录后必须先保存令牌，再查询当前用户详情，避免仅凭登录返回的最小字段驱动后续页面权限判断。
     */
    async login(payload: authApi.LoginRequest) {
      this.loading = true

      try {
        const result = await authApi.login(payload)
        return await this.finalizeAuthenticatedSession(result)
      } finally {
        this.loading = false
      }
    },

    /**
     * 注册成功同样立即进入已登录状态，因此与登录共享令牌落地和资料回填流程。
     */
    async register(payload: authApi.RegisterRequest) {
      this.loading = true

      try {
        const result = await authApi.register(payload)
        return await this.finalizeAuthenticatedSession(result)
      } finally {
        this.loading = false
      }
    },

    /**
     * 会话恢复以 token 工具为准。
     * 若本地有 token 但远端资料获取失败，则按失效会话处理并跳回登录页，保持与请求层 401 跳转契约一致。
     */
    async initializeAuth() {
      this.accessToken = getAccessToken()
      this.refreshToken = getRefreshToken()
      this.currentUser = getPersistedUser()

      if (!hasToken()) {
        this.initialized = true
        return
      }

      try {
        await this.fetchCurrentUser()
      } catch {
        this.clearAuthState()
        await router.push('/login')
      } finally {
        this.initialized = true
      }
    },

    /**
     * 个人中心资料更新后直接覆盖当前用户缓存，避免菜单昵称与资料页展示不一致。
     */
    async updateProfile(payload: authApi.UpdateProfileRequest) {
      const user = await authApi.updateProfile(payload)
      this.setCurrentUser(user)
      return this.currentUser
    },

    /**
     * 密码修改只透传结果，不在前端本地重算会话，避免误改令牌状态。
     */
    async changePassword(payload: authApi.ChangePasswordRequest) {
      await authApi.changePassword(payload)
    },

    /**
     * 验证码发送与密码重置都属于认证辅助动作，仍收敛到认证 Store 统一调用。
     */
    async sendVerificationCode(payload: authApi.SendVerificationCodeRequest) {
      await authApi.sendVerificationCode(payload)
    },

    /**
     * 重置密码不自动登录，遵循后端现有能力边界，只负责透传请求成功结果。
     */
    async resetPassword(payload: authApi.ResetPasswordRequest) {
      await authApi.resetPassword(payload)
    },

    /**
     * 主动退出登录只做前端会话清理。
     * 后端当前没有 `logout` 接口，因此这里必须停止通知轮询并清空本地会话，避免额外打到不存在的接口。
     */
    async logout() {
      const notificationStore = useNotificationStore()

      notificationStore.resetState()
      this.clearAuthState()
      this.initialized = true
      await router.push('/login')
    },
  },
})
