import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}))

import {
  confirmBorrow,
  confirmReturn,
  getBorrowRecordDetail,
  getBorrowRecordList,
} from '../borrow-records'

describe('borrow-records api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('uses list and detail endpoints for borrow records', async () => {
    const pageResponse = { total: 1, records: [{ id: 'borrow-1' }] }
    const detailResponse = { id: 'borrow-1', reservationId: 'reservation-1' }
    getMock.mockResolvedValueOnce(pageResponse)
    getMock.mockResolvedValueOnce(detailResponse)

    const query = { page: 1, size: 10, status: 'BORROWED' }

    await expect(getBorrowRecordList(query)).resolves.toBe(pageResponse)
    await expect(getBorrowRecordDetail('borrow-1')).resolves.toBe(detailResponse)

    expect(getMock).toHaveBeenNthCalledWith(1, '/borrow-records', { params: query })
    expect(getMock).toHaveBeenNthCalledWith(2, '/borrow-records/borrow-1')
  })

  it('uses optional request bodies for confirm borrow and confirm return', async () => {
    const response = { id: 'borrow-1', status: 'BORROWED' }
    postMock.mockResolvedValue(response)

    const confirmBorrowPayload = {
      borrowTime: '2026-03-16T09:05:00',
      borrowCheckStatus: '设备外观正常',
      remark: '现场借出',
    }
    const confirmReturnPayload = {
      returnTime: '2026-03-16T11:30:00',
      returnCheckStatus: '设备归还正常',
      remark: '已归还',
    }

    await expect(confirmBorrow('reservation-1', confirmBorrowPayload)).resolves.toBe(response)
    await expect(confirmReturn('borrow-1', confirmReturnPayload)).resolves.toBe(response)
    await confirmBorrow('reservation-2')
    await confirmReturn('borrow-2')

    expect(postMock).toHaveBeenNthCalledWith(
      1,
      '/borrow-records/reservation-1/confirm-borrow',
      confirmBorrowPayload,
    )
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/borrow-records/borrow-1/confirm-return',
      confirmReturnPayload,
    )
    expect(postMock).toHaveBeenNthCalledWith(
      3,
      '/borrow-records/reservation-2/confirm-borrow',
      undefined,
    )
    expect(postMock).toHaveBeenNthCalledWith(
      4,
      '/borrow-records/borrow-2/confirm-return',
      undefined,
    )
  })
})
