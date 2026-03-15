function padDateUnit(value: number): string {
  return String(value).padStart(2, '0')
}

function toValidDate(dateValue: string | null | undefined): Date | null {
  if (!dateValue) {
    return null
  }

  const date = new Date(dateValue)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * 把 ISO 时间格式化为页面统一展示的 YYYY-MM-DD HH:mm:ss。
 * 后端返回 LocalDateTime 字符串，前端先在基础工具层收敛展示格式，避免每个页面自己拼时间。
 */
export function formatDateTime(dateValue: string | null | undefined): string {
  const date = toValidDate(dateValue)

  if (!date) {
    return '-'
  }

  return (
    [date.getFullYear(), padDateUnit(date.getMonth() + 1), padDateUnit(date.getDate())].join('-') +
    ` ${padDateUnit(date.getHours())}:${padDateUnit(date.getMinutes())}:${padDateUnit(date.getSeconds())}`
  )
}

/**
 * 把 ISO 时间格式化为 YYYY-MM-DD，供列表与筛选条件复用。
 */
export function formatDate(dateValue: string | null | undefined): string {
  const date = toValidDate(dateValue)

  if (!date) {
    return '-'
  }

  return [date.getFullYear(), padDateUnit(date.getMonth() + 1), padDateUnit(date.getDate())].join(
    '-',
  )
}

/**
 * 把浏览器 Date 对象转成后端 LocalDateTime 接口要求的 YYYY-MM-DDTHH:mm:ss。
 */
export function toLocalDateTime(date: Date): string {
  return (
    [date.getFullYear(), padDateUnit(date.getMonth() + 1), padDateUnit(date.getDate())].join('-') +
    `T${padDateUnit(date.getHours())}:${padDateUnit(date.getMinutes())}:${padDateUnit(date.getSeconds())}`
  )
}
