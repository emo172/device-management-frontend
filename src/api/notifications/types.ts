/**
 * 通知响应 DTO。
 * 对应后端 `NotificationResponse`，当前真实契约不返回时间字段，前端不能擅自假设 `createdAt` 存在。
 */
export interface NotificationResponse {
  id: string
  notificationType: string
  channel: string
  title: string
  content: string
  readFlag: number
}

/**
 * 未读数量响应 DTO。
 * 对应后端 `UnreadCountResponse`，用于头部通知铃铛角标。
 */
export interface UnreadCountResponse {
  unreadCount: number
}

/**
 * 单条标记已读响应 DTO。
 * 对应后端 `MarkReadResponse`，只回传被更新通知的最小结果。
 */
export interface MarkReadResponse {
  notificationId: string
  readFlag: number
}

/**
 * 全部已读响应 DTO。
 * 对应后端 `MarkAllReadResponse`，返回本次实际更新数量。
 */
export interface MarkAllReadResponse {
  updatedCount: number
}
