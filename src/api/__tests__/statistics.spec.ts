import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
  },
}))

import {
  getBorrowStatistics,
  getCategoryUtilization,
  getDeviceRanking,
  getDeviceUtilization,
  getHotTimeSlots,
  getOverdueStatistics,
  getStatisticsOverview,
  getUserRanking,
} from '../statistics'

describe('statistics api', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('uses all backend statistics endpoints with the optional date query only', async () => {
    const response = { ok: true }
    getMock.mockResolvedValue(response)

    const date = '2026-03-16'

    await expect(getStatisticsOverview({ date })).resolves.toBe(response)
    await expect(getDeviceUtilization()).resolves.toBe(response)
    await expect(getCategoryUtilization({ date })).resolves.toBe(response)
    await expect(getBorrowStatistics({ date })).resolves.toBe(response)
    await expect(getOverdueStatistics()).resolves.toBe(response)
    await expect(getHotTimeSlots({ date })).resolves.toBe(response)
    await expect(getDeviceRanking({ date })).resolves.toBe(response)
    await expect(getUserRanking()).resolves.toBe(response)

    expect(getMock).toHaveBeenNthCalledWith(1, '/statistics/overview', { params: { date } })
    expect(getMock).toHaveBeenNthCalledWith(2, '/statistics/device-utilization', {
      params: undefined,
    })
    expect(getMock).toHaveBeenNthCalledWith(3, '/statistics/category-utilization', {
      params: { date },
    })
    expect(getMock).toHaveBeenNthCalledWith(4, '/statistics/borrow', { params: { date } })
    expect(getMock).toHaveBeenNthCalledWith(5, '/statistics/overdue', { params: undefined })
    expect(getMock).toHaveBeenNthCalledWith(6, '/statistics/hot-time-slots', { params: { date } })
    expect(getMock).toHaveBeenNthCalledWith(7, '/statistics/device-ranking', { params: { date } })
    expect(getMock).toHaveBeenNthCalledWith(8, '/statistics/user-ranking', { params: undefined })
  })
})
