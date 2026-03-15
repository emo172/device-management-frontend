/**
 * 把空值收口成统一占位文案。
 * 列表、详情和表单回显都会遇到 null / undefined / 空字符串，统一处理能减少模板分支判断。
 */
export function formatEmptyValue(
  value: string | number | null | undefined,
  fallback = '-',
): string {
  if (value === null || value === undefined) {
    return fallback
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    return trimmedValue ? trimmedValue : fallback
  }

  return String(value)
}

/**
 * 把字符串数组格式化为可读文本。
 * 后续通知模板变量、标签集合等场景可直接复用，避免页面层重复 join 判空。
 */
export function formatTextList(values: string[] | null | undefined, separator = ' / '): string {
  if (!values || values.length === 0) {
    return '-'
  }

  return (
    values
      .map((item) => item.trim())
      .filter(Boolean)
      .join(separator) || '-'
  )
}
