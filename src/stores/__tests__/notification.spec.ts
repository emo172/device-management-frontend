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

function createNotification(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    notificationType: 'OVERDUE_WARNING',
    channel: 'IN_APP',
    title: `通知${id}`,
    content: `内容${id}`,
    status: 'STATUS_PLACEHOLDER',
    readFlag: 0,
    readAt: null,
    templateVars: null,
    retryCount: 0,
    relatedId: `related-${id}`,
    relatedType: 'BORROW_RECORD',
    sentAt: '2026-03-16T08:00:00',
    createdAt: '2026-03-16T08:00:00',
    ...overrides,
  }
}

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

  it('loads paged notification list, saves current query and unread count', async () => {
    const query = {
      page: 2,
      size: 20,
      notificationType: 'OVERDUE_WARNING',
    }

    getNotificationListMock.mockResolvedValue({
      total: 21,
      records: [
        createNotification('notice-1', {
          templateVars: '{"deviceName":"热像仪"}',
          relatedId: 'borrow-1',
        }),
      ],
    })
    getUnreadNotificationCountMock.mockResolvedValue({ unreadCount: 3 })

    const store = useNotificationStore()
    await store.fetchNotificationList(query)
    await store.fetchUnreadCount()

    expect(getNotificationListMock).toHaveBeenCalledWith(query)
    expect(store.list).toHaveLength(1)
    expect(store.list[0]?.createdAt).toBe('2026-03-16T08:00:00')
    expect(store.list[0]?.status).toBe('STATUS_PLACEHOLDER')
    expect(store.total).toBe(21)
    expect(store.query).toEqual(query)
    expect(store.unreadCount).toBe(3)
  })

  it('marks one notification as read and only updates the current page row', async () => {
    markNotificationReadMock.mockResolvedValue({
      notificationId: 'notice-1',
      readFlag: 1,
      readAt: '2026-03-16T08:30:00',
      unreadCount: 0,
    })

    const store = useNotificationStore()
    store.list = [
      createNotification('notice-1', { relatedId: 'borrow-1' }),
      createNotification('notice-2', {
        relatedId: 'borrow-2',
        readFlag: 1,
        readAt: '2026-03-16T07:00:00',
      }),
    ]
    store.unreadCount = 1

    await store.markAsRead('notice-1')

    expect(markNotificationReadMock).toHaveBeenCalledWith('notice-1')
    expect(store.list[0]?.readFlag).toBe(1)
    expect(store.list[0]?.readAt).toBe('2026-03-16T08:30:00')
    expect(store.list[1]?.readFlag).toBe(1)
    expect(store.list[1]?.readAt).toBe('2026-03-16T07:00:00')
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
    store.list = [
      createNotification('notice-1', {
        title: '站内信通知',
        content: '站内信内容',
        relatedId: 'borrow-1',
      }),
      createNotification('notice-2', {
        notificationType: 'RESERVATION_REMINDER',
        channel: 'EMAIL',
        title: '邮件通知',
        content: '邮件内容',
        relatedId: 'reservation-1',
        relatedType: 'RESERVATION',
        sentAt: '2026-03-16T09:00:00',
        createdAt: '2026-03-16T09:00:00',
      }),
      createNotification('notice-3', {
        notificationType: 'FIRST_APPROVAL_TODO',
        title: '另一条站内信',
        content: '另一条站内信内容',
        relatedId: 'reservation-2',
        relatedType: 'RESERVATION',
        sentAt: '2026-03-16T10:00:00',
        createdAt: '2026-03-16T10:00:00',
      }),
    ]
    store.unreadCount = 2

    await store.markAsRead('notice-1')

    expect(store.unreadCount).toBe(1)
    expect(store.list[0]?.readAt).toBe('2026-03-16T08:30:00')
  })

  it('reloads the current page after marking all notifications as read', async () => {
    markAllNotificationsReadMock.mockResolvedValue({
      updatedCount: 1,
      readAt: '2026-03-16T09:00:00',
      unreadCount: 0,
    })
    getNotificationListMock.mockResolvedValue({
      total: 2,
      records: [
        createNotification('notice-1', {
          readFlag: 1,
          readAt: '2026-03-16T09:00:00',
        }),
        createNotification('notice-2', {
          notificationType: 'RESERVATION_REMINDER',
          channel: 'EMAIL',
          sentAt: '2026-03-16T09:00:00',
          createdAt: '2026-03-16T09:00:00',
        }),
      ],
    })

    const store = useNotificationStore()
    store.list = [
      createNotification('notice-1', { relatedId: 'borrow-1' }),
      createNotification('notice-2', {
        notificationType: 'RESERVATION_REMINDER',
        channel: 'EMAIL',
        relatedId: 'reservation-1',
        relatedType: 'RESERVATION',
        sentAt: '2026-03-16T09:00:00',
        createdAt: '2026-03-16T09:00:00',
      }),
    ]
    store.query = {
      page: 3,
      size: 5,
      notificationType: 'OVERDUE_WARNING',
    }
    store.unreadCount = 2

    await store.markAllAsRead()

    expect(markAllNotificationsReadMock).toHaveBeenCalledTimes(1)
    expect(getNotificationListMock).toHaveBeenCalledWith(store.query)
    expect(store.unreadCount).toBe(0)
    expect(store.list[0]?.readFlag).toBe(1)
    expect(store.list[0]?.readAt).toBe('2026-03-16T09:00:00')
    expect(store.list[1]?.readFlag).toBe(0)
    expect(store.list[1]?.readAt).toBeNull()
    expect(store.total).toBe(2)
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
