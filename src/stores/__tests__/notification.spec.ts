import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
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
    markNotificationReadMock.mockResolvedValue({
      notificationId: 'notice-1',
      readFlag: 1,
      readAt: '2026-03-16T08:30:00',
      unreadCount: 0,
    })

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
    expect(store.notifications[0]?.readAt).toBe('2026-03-16T08:30:00')
    expect(store.unreadCount).toBe(0)
  })

  it('counts only in-app unread notifications after marking one as read in mixed channels', async () => {
    markNotificationReadMock.mockResolvedValue({
      notificationId: 'notice-1',
      readFlag: 1,
      readAt: '2026-03-16T08:30:00',
      unreadCount: 1,
    })

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
    expect(store.notifications[0]?.readAt).toBe('2026-03-16T08:30:00')
  })

  it('marks only in-app notifications as read when bulk action succeeds', async () => {
    markAllNotificationsReadMock.mockResolvedValue({
      updatedCount: 1,
      readAt: '2026-03-16T09:00:00',
      unreadCount: 0,
    })

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
    expect(store.notifications[0]?.readAt).toBe('2026-03-16T09:00:00')
    expect(store.notifications[1]?.readFlag).toBe(0)
    expect(store.notifications[1]?.readAt).toBeNull()
  })

  it('starts and stops unread count polling with a stable single timer handle', async () => {
    getUnreadNotificationCountMock.mockResolvedValue({ unreadCount: 5 })

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const store = useNotificationStore()
    store.startPolling()
    const firstTimer = store.pollingTimer
    store.startPolling()

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(store.pollingTimer).toBe(firstTimer)

    await vi.advanceTimersByTimeAsync(30000)
    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(1)
    expect(store.pollingTimer).toBe(firstTimer)

    store.stopPolling()
    expect(store.pollingTimer).toBeNull()

    await vi.advanceTimersByTimeAsync(30000)
    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the same polling timer alive after failures and ignores repeated restarts', async () => {
    getUnreadNotificationCountMock
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ unreadCount: 2 })

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')
    const store = useNotificationStore()
    store.startPolling()
    const firstTimer = store.pollingTimer

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(store.pollingTimer).toBe(firstTimer)

    await vi.advanceTimersByTimeAsync(30000)

    store.startPolling()

    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    expect(store.pollingTimer).toBe(firstTimer)

    await vi.advanceTimersByTimeAsync(30000)

    expect(getUnreadNotificationCountMock).toHaveBeenCalledTimes(2)
    expect(store.unreadCount).toBe(2)
    expect(store.pollingTimer).toBe(firstTimer)
  })
})
