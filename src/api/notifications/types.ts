/**
 * 通知响应 DTO。
 * 对应后端 `NotificationResponse`。
 * 通知中心需要依赖 `createdAt` 排序和回放问题排查，因此这里必须完整对齐后端真实字段，不能继续沿用缺字段的旧口径。
 */
export interface NotificationResponse {
  id: string
  notificationType: string
  channel: string
  title: string
  content: string
  status: string
  readFlag: number
  readAt: string | null
  templateVars: string | null
  retryCount: number
  relatedId: string | null
  relatedType: string | null
  sentAt: string | null
  createdAt: string | null
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
  readAt: string | null
  unreadCount: number
}

/**
 * 全部已读响应 DTO。
 * 对应后端 `MarkAllReadResponse`，返回本次实际更新数量。
 */
export interface MarkAllReadResponse {
  updatedCount: number
  readAt: string | null
  unreadCount: number
}
