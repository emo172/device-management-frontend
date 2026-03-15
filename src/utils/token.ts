import { STORAGE_KEYS } from '@/constants'
import { clearStorageItems, getStorageString, setStorageString } from '@/utils/storage'

/**
 * 读取 Access Token。
 * 请求拦截器只依赖这里，避免后续令牌来源变化时需要全局替换。
 */
export function getAccessToken(): string | null {
  return getStorageString(STORAGE_KEYS.ACCESS_TOKEN)
}

/**
 * 持久化 Access Token。
 */
export function setAccessToken(token: string): void {
  setStorageString(STORAGE_KEYS.ACCESS_TOKEN, token)
}

/**
 * 读取 Refresh Token。
 */
export function getRefreshToken(): string | null {
  return getStorageString(STORAGE_KEYS.REFRESH_TOKEN)
}

/**
 * 持久化 Refresh Token。
 */
export function setRefreshToken(token: string): void {
  setStorageString(STORAGE_KEYS.REFRESH_TOKEN, token)
}

/**
 * 清理认证令牌。
 * 401 失效与主动退出登录都需要走统一清理入口，避免残留旧令牌。
 */
export function clearTokens(): void {
  clearStorageItems([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN])
}

/**
 * 判断当前是否已持有 Access Token。
 */
export function hasToken(): boolean {
  return Boolean(getAccessToken())
}
