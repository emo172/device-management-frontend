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
        notificationType: 'OVERDUE_WARNING',
        channel: 'IN_APP',
        title: '通知标题',
        content: '通知内容',
        status: 'STATUS_PLACEHOLDER',
        readFlag: 0,
        readAt: null,
        templateVars: '{"deviceName":"热像仪"}',
        retryCount: 0,
        relatedId: 'borrow-1',
        relatedType: 'BORROW_RECORD',
        sentAt: '2026-03-16T08:00:00',
        createdAt: '2026-03-16T08:00:00',
      },
    ])
    getUnreadNotificationCountMock.mockResolvedValue({ unreadCount: 3 })

    const store = useNotificationStore()
    await store.fetchNotificationList()
    await store.fetchUnreadCount()

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]?.createdAt).toBe('2026-03-16T08:00:00')
    expect(store.notifications[0]?.status).toBe('STATUS_PLACEHOLDER')
    expect(store.unreadCount).toBe(3)
  })

  it('marks one notification as read and keeps unread count in sync', async () => {
    markNotificationReadMock.mockResolvedValue({ notificationId: 'notice-1', readFlag: 1 })

    const store = useNotificationStore()
    store.notifications = [
      {
        id: 'notice-1',
        notificationType: 'OVERDUE_WARNING',
        channel: 'IN_APP',
        title: '通知标题',
        content: '通知内容',
        status: 'STATUS_PLACEHOLDER',
        readFlag: 0,
        readAt: null,
        templateVars: null,
        retryCount: 0,
        relatedId: 'borrow-1',
        relatedType: 'BORROW_RECORD',
        sentAt: '2026-03-16T08:00:00',
        createdAt: '2026-03-16T08:00:00',
      },
    ]
    store.unreadCount = 1

    await store.markAsRead('notice-1')

    expect(markNotificationReadMock).toHaveBeenCalledWith('notice-1')
    expect(store.notifications[0]?.readFlag).toBe(1)
    expect(store.unreadCount).toBe(0)
  })

  it('counts only in-app unread notifications after marking one as read in mixed channels', async () => {
    markNotificationReadMock.mockResolvedValue({ notificationId: 'notice-1', readFlag: 1 })

    const store = useNotificationStore()
    store.notifications = [
      {
        id: 'notice-1',
        notificationType: 'OVERDUE_WARNING',
        channel: 'IN_APP',
        title: '站内信通知',
        content: '站内信内容',
        status: 'STATUS_PLACEHOLDER',
        readFlag: 0,
        readAt: null,
        templateVars: null,
        retryCount: 0,
        relatedId: 'borrow-1',
        relatedType: 'BORROW_RECORD',
        sentAt: '2026-03-16T08:00:00',
        createdAt: '2026-03-16T08:00:00',
      },
      {
        id: 'notice-2',
        notificationType: 'RESERVATION_REMINDER',
        channel: 'EMAIL',
        title: '邮件通知',
        content: '邮件内容',
        status: 'STATUS_PLACEHOLDER',
        readFlag: 0,
        readAt: null,
        templateVars: null,
        retryCount: 0,
        relatedId: 'reservation-1',
        relatedType: 'RESERVATION',
        sentAt: '2026-03-16T09:00:00',
        createdAt: '2026-03-16T09:00:00',
      },
      {
        id: 'notice-3',
        notificationType: 'FIRST_APPROVAL_TODO',
        channel: 'IN_APP',
        title: '另一条站内信',
        content: '另一条站内信内容',
        status: 'STATUS_PLACEHOLDER',
        readFlag: 0,
        readAt: null,
        templateVars: null,
        retryCount: 0,
        relatedId: 'reservation-2',
        relatedType: 'RESERVATION',
        sentAt: '2026-03-16T10:00:00',
        createdAt: '2026-03-16T10:00:00',
      },
    ]
    store.unreadCount = 2

    await store.markAsRead('notice-1')

    expect(store.unreadCount).toBe(1)
  })

  it('marks only in-app notifications as read when bulk action succeeds', async () => {
    markAllNotificationsReadMock.mockResolvedValue({ updatedCount: 1 })

    const store = useNotificationStore()
    store.notifications = [
      {
        id: 'notice-1',
        notificationType: 'OVERDUE_WARNING',
        channel: 'IN_APP',
        title: '通知标题1',
        content: '通知内容1',
        status: 'STATUS_PLACEHOLDER',
        readFlag: 0,
        readAt: null,
        templateVars: null,
        retryCount: 0,
        relatedId: 'borrow-1',
        relatedType: 'BORROW_RECORD',
        sentAt: '2026-03-16T08:00:00',
        createdAt: '2026-03-16T08:00:00',
      },
      {
        id: 'notice-2',
        notificationType: 'RESERVATION_REMINDER',
        channel: 'EMAIL',
        title: '通知标题2',
        content: '通知内容2',
        status: 'STATUS_PLACEHOLDER',
        readFlag: 0,
        readAt: null,
        templateVars: null,
        retryCount: 0,
        relatedId: 'reservation-1',
        relatedType: 'RESERVATION',
        sentAt: '2026-03-16T09:00:00',
        createdAt: '2026-03-16T09:00:00',
      },
    ]
    store.unreadCount = 2

    await store.markAllAsRead()

    expect(store.unreadCount).toBe(0)
    expect(store.notifications[0]?.readFlag).toBe(1)
    expect(store.notifications[1]?.readFlag).toBe(0)
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

  it('suppresses polling request errors and keeps subsequent polling alive', async () => {
    getUnreadNotificationCountMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ unreadCount: 2 })

    const store = useNotificationStore()
    store.startPolling()

    await vi.advanceTimersByTimeAsync(30000)
    await vi.advanceTimersByTimeAsync(30000)

    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(2)
    expect(store.unreadCount).toBe(2)
  })
})
