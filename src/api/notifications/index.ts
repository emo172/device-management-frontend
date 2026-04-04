import request from '@/api/request'

import type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationListQuery,
  NotificationPageResponse,
  NotificationResponse,
  UnreadCountResponse,
} from './types'

export type {
  MarkAllReadResponse,
  MarkReadResponse,
  NotificationListQuery,
  NotificationPageResponse,
  NotificationResponse,
  UnreadCountResponse,
} from './types'

/**
 * 查询通知列表。
 * 对应 `GET /api/notifications`，前端只透传分页参数和可选通知类型，后端固定返回 `{ total, records }` 分页体。
 */
export function getNotificationList(params?: NotificationListQuery) {
  return request.get<NotificationPageResponse>('/notifications', { params })
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
