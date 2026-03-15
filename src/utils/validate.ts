/**
 * 验证邮箱格式。
 */
export function isEmail(value: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
}

/**
 * 验证密码复杂度。
 * 当前与项目约定保持一致：至少 8 位，且同时包含字母与数字。
 */
export function isValidPassword(value: string): boolean {
  return value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value)
}

/**
 * 验证中国大陆手机号格式。
 */
export function isPhone(value: string): boolean {
  return /^1[3-9]\d{9}$/.test(value)
}
