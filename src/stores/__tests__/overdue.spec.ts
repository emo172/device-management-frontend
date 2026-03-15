import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { getOverdueRecordDetailMock, getOverdueRecordListMock, processOverdueRecordMock } =
  vi.hoisted(() => ({
    getOverdueRecordDetailMock: vi.fn(),
    getOverdueRecordListMock: vi.fn(),
    processOverdueRecordMock: vi.fn(),
  }))

vi.mock('@/api/overdue', () => ({
  getOverdueRecordDetail: getOverdueRecordDetailMock,
  getOverdueRecordList: getOverdueRecordListMock,
  processOverdueRecord: processOverdueRecordMock,
}))

import { useOverdueStore } from '../modules/overdue'

describe('overdue store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getOverdueRecordDetailMock.mockReset()
    getOverdueRecordListMock.mockReset()
    processOverdueRecordMock.mockReset()
  })

  it('loads overdue list and detail with current query', async () => {
    getOverdueRecordListMock.mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'overdue-1',
          borrowRecordId: 'borrow-1',
          userId: 'user-1',
          deviceId: 'device-1',
          overdueHours: 5,
          overdueDays: 1,
          processingStatus: 'PENDING',
          processingMethod: null,
          processingRemark: null,
          processorId: null,
          processingTime: null,
          compensationAmount: null,
          notificationSent: 1,
          createdAt: '2026-03-15T10:00:00',
        },
      ],
    })
    getOverdueRecordDetailMock.mockResolvedValue({
      id: 'overdue-1',
      borrowRecordId: 'borrow-1',
      userId: 'user-1',
      deviceId: 'device-1',
      overdueHours: 5,
      overdueDays: 1,
      processingStatus: 'PENDING',
      processingMethod: null,
      processingRemark: null,
      processorId: null,
      processingTime: null,
      compensationAmount: null,
      notificationSent: 1,
      createdAt: '2026-03-15T10:00:00',
    })

    const store = useOverdueStore()
    await store.fetchOverdueList({ page: 1, size: 10, processingStatus: 'PENDING' })
    await store.fetchOverdueDetail('overdue-1')

    expect(store.list).toHaveLength(1)
    expect(store.currentRecord?.id).toBe('overdue-1')
    expect(store.query.processingStatus).toBe('PENDING')
  })

  it('updates record state after processing overdue item', async () => {
    processOverdueRecordMock.mockResolvedValue({
      id: 'overdue-1',
      borrowRecordId: 'borrow-1',
      userId: 'user-1',
      deviceId: 'device-1',
      overdueHours: 5,
      overdueDays: 1,
      processingStatus: 'PROCESSED',
      processingMethod: 'WARNING',
      processingRemark: '已警告',
      processorId: 'device-admin-1',
      processingTime: '2026-03-15T11:00:00',
      compensationAmount: null,
      notificationSent: 1,
      createdAt: '2026-03-15T10:00:00',
    })

    const store = useOverdueStore()
    store.list = [
      {
        id: 'overdue-1',
        borrowRecordId: 'borrow-1',
        userId: 'user-1',
        deviceId: 'device-1',
        overdueHours: 5,
        overdueDays: 1,
        processingStatus: 'PENDING',
        processingMethod: null,
        processingRemark: null,
        processorId: null,
        processingTime: null,
        compensationAmount: null,
        notificationSent: 1,
        createdAt: '2026-03-15T10:00:00',
      },
    ]

    await store.processRecord('overdue-1', {
      processingMethod: 'WARNING',
      remark: '已警告',
      compensationAmount: null,
    })

    expect(store.currentRecord?.processingStatus).toBe('PROCESSED')
    expect(store.list[0]?.processingStatus).toBe('PROCESSED')
  })
})
