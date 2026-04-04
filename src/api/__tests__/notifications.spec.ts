import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    put: putMock,
  },
}))

import {
  getNotificationList,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../notifications'

describe('notifications api', () => {
  beforeEach(() => {
    getMock.mockReset()
    putMock.mockReset()
  })

  it('loads paged notification list with query params and unread count', async () => {
    const query = {
      page: 2,
      size: 20,
      notificationType: 'OVERDUE_WARNING',
    }
    const listResponse = {
      total: 35,
      records: [{ id: 'notification-1', readFlag: 0 }],
    }
    const countResponse = { unreadCount: 3 }
    getMock.mockResolvedValueOnce(listResponse)
    getMock.mockResolvedValueOnce(countResponse)

    await expect(getNotificationList(query)).resolves.toBe(listResponse)
    await expect(getUnreadNotificationCount()).resolves.toBe(countResponse)

    expect(getMock).toHaveBeenNthCalledWith(1, '/notifications', { params: query })
    expect(getMock).toHaveBeenNthCalledWith(2, '/notifications/unread-count')
  })

  it('uses dedicated endpoints for single and bulk read actions', async () => {
    const markReadResponse = { notificationId: 'notification-1', readFlag: 1 }
    const markAllResponse = { updatedCount: 5 }
    putMock.mockResolvedValueOnce(markReadResponse)
    putMock.mockResolvedValueOnce(markAllResponse)

    await expect(markNotificationRead('notification-1')).resolves.toBe(markReadResponse)
    await expect(markAllNotificationsRead()).resolves.toBe(markAllResponse)

    expect(putMock).toHaveBeenNthCalledWith(1, '/notifications/notification-1/read')
    expect(putMock).toHaveBeenNthCalledWith(2, '/notifications/read-all')
  })
})
