/**
 * 本地存储键常量。
 * 先在基础设施层统一命名，避免后续 Store、拦截器和业务页面各自写硬编码键名。
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
} as const
