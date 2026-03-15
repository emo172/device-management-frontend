/**
 * 统一封装 localStorage 字符串读写。
 * 令牌、用户资料和后续页面缓存都会走这里，方便后续统一处理异常与序列化策略。
 */
export function getStorageString(key: string): string | null {
  return localStorage.getItem(key)
}

/**
 * 写入字符串值。
 * 当上层传入空字符串时仍保留原值，避免把合法的空字符串误删。
 */
export function setStorageString(key: string, value: string): void {
  localStorage.setItem(key, value)
}

/**
 * 读取 JSON 对象。
 * 若历史缓存损坏则返回 null，避免初始化阶段因解析异常阻断页面加载。
 */
export function getStorageObject<T>(key: string): T | null {
  const rawValue = localStorage.getItem(key)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return null
  }
}

/**
 * 写入对象值。
 * 统一由基础设施层序列化，避免业务代码重复 JSON.stringify。
 */
export function setStorageObject<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/**
 * 删除单个缓存项。
 */
export function removeStorageItem(key: string): void {
  localStorage.removeItem(key)
}

/**
 * 清理指定缓存键。
 * 这里要求显式传入键名，避免基础设施层误删后续 Pinia 持久化或用户偏好缓存。
 */
export function clearStorageItems(keys: readonly string[]): void {
  keys.forEach((key) => removeStorageItem(key))
}
