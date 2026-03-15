import request from '@/api/request'

import type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationResponse,
  UnreadCountResponse,
} from './types'

export type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationResponse,
  UnreadCountResponse,
} from './types'

/**
 * 查询通知列表。
 * 对应 `GET /api/notifications`，当前后端只返回当前登录人的通知集合，不支持额外筛选参数。
 */
export function getNotificationList() {
  return request.get<NotificationResponse[]>('/notifications')
}

/**
 * 查询未读通知数量。
 * 对应 `GET /api/notifications/unread-count`，供头部角标轮询刷新使用。
 */
export function getUnreadNotificationCount() {
  return request.get<UnreadCountResponse>('/notifications/unread-count')
}

/**
 * 标记单条通知已读。
 * 对应 `PUT /api/notifications/{id}/read`，已读能力仅作用于站内信记录。
 */
export function markNotificationRead(notificationId: string) {
  return request.put<MarkReadResponse>(`/notifications/${notificationId}/read`)
}

/**
 * 标记全部通知已读。
 * 对应 `PUT /api/notifications/read-all`，不需要请求体。
 */
export function markAllNotificationsRead() {
  return request.put<MarkAllReadResponse>('/notifications/read-all')
}
