import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  getNotificationListMock,
  getUnreadNotificationCountMock,
  markAllNotificationsReadMock,
  markNotificationReadMock,
} = vi.hoisted(() => ({
  getNotificationListMock: vi.fn(),
  getUnreadNotificationCountMock: vi.fn(),
  markAllNotificationsReadMock: vi.fn(),
  markNotificationReadMock: vi.fn(),
}))

vi.mock('@/api/notifications', () => ({
  getNotificationList: getNotificationListMock,
  getUnreadNotificationCount: getUnreadNotificationCountMock,
  markAllNotificationsRead: markAllNotificationsReadMock,
  markNotificationRead: markNotificationReadMock,
}))

import { useNotificationStore } from '../modules/notification'

describe('notification store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())

    getNotificationListMock.mockReset()
    getUnreadNotificationCountMock.mockReset()
    markAllNotificationsReadMock.mockReset()
    markNotificationReadMock.mockReset()
  })

  it('loads notification list and unread count', async () => {
    getNotificationListMock.mockResolvedValue([
      {
        id: 'notice-1',
        notificationType: 'SYSTEM_ALERT',
        channel: 'IN_APP',
        title: '通知标题',
        content: '通知内容',
        readFlag: 0,
      },
    ])
    getUnreadNotificationCountMock.mockResolvedValue({ unreadCount: 3 })

    const store = useNotificationStore()
    await store.fetchNotificationList()
    await store.fetchUnreadCount()

    expect(store.notifications).toHaveLength(1)
    expect(store.unreadCount).toBe(3)
  })

  it('marks one notification as read and keeps unread count in sync', async () => {
    markNotificationReadMock.mockResolvedValue({ notificationId: 'notice-1', readFlag: 1 })

    const store = useNotificationStore()
    store.notifications = [
      {
        id: 'notice-1',
        notificationType: 'SYSTEM_ALERT',
        channel: 'IN_APP',
        title: '通知标题',
        content: '通知内容',
        readFlag: 0,
      },
    ]
    store.unreadCount = 1

    await store.markAsRead('notice-1')

    expect(markNotificationReadMock).toHaveBeenCalledWith('notice-1')
    expect(store.notifications[0]?.readFlag).toBe(1)
    expect(store.unreadCount).toBe(0)
  })

  it('marks all notifications as read', async () => {
    markAllNotificationsReadMock.mockResolvedValue({ updatedCount: 2 })

    const store = useNotificationStore()
    store.notifications = [
      {
        id: 'notice-1',
        notificationType: 'SYSTEM_ALERT',
        channel: 'IN_APP',
        title: '通知标题1',
        content: '通知内容1',
        readFlag: 0,
      },
      {
        id: 'notice-2',
        notificationType: 'SYSTEM_ALERT',
        channel: 'IN_APP',
        title: '通知标题2',
        content: '通知内容2',
        readFlag: 0,
      },
    ]
    store.unreadCount = 2

    await store.markAllAsRead()

    expect(store.unreadCount).toBe(0)
    expect(store.notifications.every((item: { readFlag: number }) => item.readFlag === 1)).toBe(
      true,
    )
  })

  it('starts and stops unread count polling without duplicate timers', async () => {
    getUnreadNotificationCountMock.mockResolvedValue({ unreadCount: 5 })

    const store = useNotificationStore()
    store.startPolling()
    store.startPolling()

    await vi.advanceTimersByTimeAsync(30000)
    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(1)

    store.stopPolling()
    await vi.advanceTimersByTimeAsync(30000)
    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(1)
  })
})
