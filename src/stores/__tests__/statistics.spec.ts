import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  getBorrowStatisticsMock,
  getCategoryUtilizationMock,
  getDeviceRankingMock,
  getDeviceUtilizationMock,
  getHotTimeSlotsMock,
  getOverdueStatisticsMock,
  getStatisticsOverviewMock,
  getUserRankingMock,
} = vi.hoisted(() => ({
  getBorrowStatisticsMock: vi.fn(),
  getCategoryUtilizationMock: vi.fn(),
  getDeviceRankingMock: vi.fn(),
  getDeviceUtilizationMock: vi.fn(),
  getHotTimeSlotsMock: vi.fn(),
  getOverdueStatisticsMock: vi.fn(),
  getStatisticsOverviewMock: vi.fn(),
  getUserRankingMock: vi.fn(),
}))

vi.mock('@/api/statistics', () => ({
  getBorrowStatistics: getBorrowStatisticsMock,
  getCategoryUtilization: getCategoryUtilizationMock,
  getDeviceRanking: getDeviceRankingMock,
  getDeviceUtilization: getDeviceUtilizationMock,
  getHotTimeSlots: getHotTimeSlotsMock,
  getOverdueStatistics: getOverdueStatisticsMock,
  getStatisticsOverview: getStatisticsOverviewMock,
  getUserRanking: getUserRankingMock,
}))

import { useStatisticsStore } from '../modules/statistics'

function createDeferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}

describe('statistics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getBorrowStatisticsMock.mockReset()
    getCategoryUtilizationMock.mockReset()
    getDeviceRankingMock.mockReset()
    getDeviceUtilizationMock.mockReset()
    getHotTimeSlotsMock.mockReset()
    getOverdueStatisticsMock.mockReset()
    getStatisticsOverviewMock.mockReset()
    getUserRankingMock.mockReset()
  })

  it('loads all statistics views with one shared date query', async () => {
    getStatisticsOverviewMock.mockResolvedValue({
      statDate: '2026-03-15',
      totalReservations: 10,
      approvedReservations: 8,
      rejectedReservations: 1,
      cancelledReservations: 1,
      expiredReservations: 0,
      totalBorrows: 5,
      totalReturns: 4,
      totalOverdue: 1,
      totalOverdueHours: 5,
      utilizationRate: 0.8,
    })
    getDeviceUtilizationMock.mockResolvedValue([])
    getCategoryUtilizationMock.mockResolvedValue([])
    getBorrowStatisticsMock.mockResolvedValue({
      statDate: '2026-03-15',
      totalBorrows: 5,
      totalReturns: 4,
    })
    getOverdueStatisticsMock.mockResolvedValue({
      statDate: '2026-03-15',
      totalOverdue: 1,
      totalOverdueHours: 5,
    })
    getHotTimeSlotsMock.mockResolvedValue([])
    getDeviceRankingMock.mockResolvedValue([])
    getUserRankingMock.mockResolvedValue([])

    const store = useStatisticsStore()
    await store.fetchAll({ date: '2026-03-15' })

    expect(getStatisticsOverviewMock).toHaveBeenCalledWith({ date: '2026-03-15' })
    expect(getDeviceUtilizationMock).toHaveBeenCalledWith({ date: '2026-03-15' })
    expect(store.overview?.totalReservations).toBe(10)
    expect(store.query.date).toBe('2026-03-15')
  })

  it('resets loaded statistics state', () => {
    const store = useStatisticsStore()
    store.query = { date: '2026-03-15' }
    store.overview = {
      statDate: '2026-03-15',
      totalReservations: 1,
      approvedReservations: 1,
      rejectedReservations: 0,
      cancelledReservations: 0,
      expiredReservations: 0,
      totalBorrows: 1,
      totalReturns: 1,
      totalOverdue: 0,
      totalOverdueHours: 0,
      utilizationRate: 1,
    }

    store.resetState()

    expect(store.query.date).toBeUndefined()
    expect(store.overview).toBeNull()
  })

  it('ignores stale fetchAll results when users switch dates quickly', async () => {
    const firstOverviewPayload = {
      statDate: '2026-03-15',
      totalReservations: 10,
      approvedReservations: 8,
      rejectedReservations: 1,
      cancelledReservations: 1,
      expiredReservations: 0,
      totalBorrows: 5,
      totalReturns: 4,
      totalOverdue: 1,
      totalOverdueHours: 5,
      utilizationRate: 0.8,
    }
    const secondOverviewPayload = {
      statDate: '2026-03-16',
      totalReservations: 20,
      approvedReservations: 18,
      rejectedReservations: 1,
      cancelledReservations: 1,
      expiredReservations: 0,
      totalBorrows: 12,
      totalReturns: 10,
      totalOverdue: 2,
      totalOverdueHours: 6,
      utilizationRate: 0.9,
    }
    const firstOverview = createDeferred<typeof firstOverviewPayload>()
    const secondOverview = createDeferred<typeof secondOverviewPayload>()

    getStatisticsOverviewMock
      .mockImplementationOnce(() => firstOverview.promise)
      .mockImplementationOnce(() => secondOverview.promise)
    getDeviceUtilizationMock.mockResolvedValue([])
    getCategoryUtilizationMock.mockResolvedValue([])
    getBorrowStatisticsMock.mockResolvedValue({
      statDate: '2026-03-16',
      totalBorrows: 12,
      totalReturns: 10,
    })
    getOverdueStatisticsMock.mockResolvedValue({
      statDate: '2026-03-16',
      totalOverdue: 2,
      totalOverdueHours: 6,
    })
    getHotTimeSlotsMock.mockResolvedValue([])
    getDeviceRankingMock.mockResolvedValue([])
    getUserRankingMock.mockResolvedValue([])

    const store = useStatisticsStore()
    const firstPromise = store.fetchAll({ date: '2026-03-15' })
    const secondPromise = store.fetchAll({ date: '2026-03-16' })

    secondOverview.resolve(secondOverviewPayload)
    await secondPromise

    expect(store.overview?.statDate).toBe('2026-03-16')
    expect(store.query.date).toBe('2026-03-16')

    firstOverview.resolve(firstOverviewPayload)
    await firstPromise

    expect(store.overview?.statDate).toBe('2026-03-16')
    expect(store.query.date).toBe('2026-03-16')
  })
})
