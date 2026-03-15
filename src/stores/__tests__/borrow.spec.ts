import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { confirmBorrowMock, confirmReturnMock, getBorrowRecordDetailMock, getBorrowRecordListMock } =
  vi.hoisted(() => ({
    confirmBorrowMock: vi.fn(),
    confirmReturnMock: vi.fn(),
    getBorrowRecordDetailMock: vi.fn(),
    getBorrowRecordListMock: vi.fn(),
  }))

vi.mock('@/api/borrow-records', () => ({
  confirmBorrow: confirmBorrowMock,
  confirmReturn: confirmReturnMock,
  getBorrowRecordDetail: getBorrowRecordDetailMock,
  getBorrowRecordList: getBorrowRecordListMock,
}))

import { useBorrowStore } from '../modules/borrow'

describe('borrow store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    confirmBorrowMock.mockReset()
    confirmReturnMock.mockReset()
    getBorrowRecordDetailMock.mockReset()
    getBorrowRecordListMock.mockReset()
  })

  it('loads borrow record list and detail', async () => {
    getBorrowRecordListMock.mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'borrow-1',
          reservationId: 'reservation-1',
          deviceId: 'device-1',
          userId: 'user-1',
          borrowTime: null,
          returnTime: null,
          expectedReturnTime: '2026-03-15T18:00:00',
          status: 'BORROWED',
          borrowCheckStatus: null,
          returnCheckStatus: null,
          remark: null,
          operatorId: null,
          returnOperatorId: null,
        },
      ],
    })
    getBorrowRecordDetailMock.mockResolvedValue({
      id: 'borrow-1',
      reservationId: 'reservation-1',
      deviceId: 'device-1',
      userId: 'user-1',
      borrowTime: '2026-03-15T10:00:00',
      returnTime: null,
      expectedReturnTime: '2026-03-15T18:00:00',
      status: 'BORROWED',
      borrowCheckStatus: 'NORMAL',
      returnCheckStatus: null,
      remark: null,
      operatorId: 'device-admin-1',
      returnOperatorId: null,
    })

    const store = useBorrowStore()
    await store.fetchBorrowList({ page: 1, size: 10, status: 'BORROWED' })
    await store.fetchBorrowDetail('borrow-1')

    expect(store.list).toHaveLength(1)
    expect(store.currentRecord?.id).toBe('borrow-1')
  })

  it('updates current record after confirm borrow and return', async () => {
    confirmBorrowMock.mockResolvedValue({
      id: 'borrow-1',
      reservationId: 'reservation-1',
      deviceId: 'device-1',
      userId: 'user-1',
      borrowTime: '2026-03-15T10:00:00',
      returnTime: null,
      expectedReturnTime: '2026-03-15T18:00:00',
      status: 'BORROWED',
      borrowCheckStatus: 'NORMAL',
      returnCheckStatus: null,
      remark: '已借出',
      operatorId: 'device-admin-1',
      returnOperatorId: null,
    })
    confirmReturnMock.mockResolvedValue({
      id: 'borrow-1',
      reservationId: 'reservation-1',
      deviceId: 'device-1',
      userId: 'user-1',
      borrowTime: '2026-03-15T10:00:00',
      returnTime: '2026-03-15T17:00:00',
      expectedReturnTime: '2026-03-15T18:00:00',
      status: 'RETURNED',
      borrowCheckStatus: 'NORMAL',
      returnCheckStatus: 'NORMAL',
      remark: '已归还',
      operatorId: 'device-admin-1',
      returnOperatorId: 'device-admin-1',
    })

    const store = useBorrowStore()
    store.list = [
      {
        id: 'borrow-1',
        reservationId: 'reservation-1',
        deviceId: 'device-1',
        userId: 'user-1',
        borrowTime: null,
        returnTime: null,
        expectedReturnTime: '2026-03-15T18:00:00',
        status: 'BORROWED',
        borrowCheckStatus: null,
        returnCheckStatus: null,
        remark: null,
        operatorId: null,
        returnOperatorId: null,
      },
    ]

    await store.confirmBorrow('reservation-1', { remark: '已借出' })
    await store.confirmReturn('borrow-1', { remark: '已归还' })

    expect(store.currentRecord?.status).toBe('RETURNED')
    expect(store.list[0]?.status).toBe('RETURNED')

    store.resetCurrentRecord()
    expect(store.currentRecord).toBeNull()
  })
})
