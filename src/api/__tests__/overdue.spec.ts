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

import { getOverdueRecordDetail, getOverdueRecordList, processOverdueRecord } from '../overdue'

describe('overdue api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('uses list and detail endpoints for overdue records', async () => {
    const pageResponse = { total: 2, records: [{ id: 'overdue-1' }] }
    const detailResponse = { id: 'overdue-1', processingStatus: 'PENDING' }
    getMock.mockResolvedValueOnce(pageResponse)
    getMock.mockResolvedValueOnce(detailResponse)

    const query = { page: 2, size: 20, processingStatus: 'PENDING' }

    await expect(getOverdueRecordList(query)).resolves.toBe(pageResponse)
    await expect(getOverdueRecordDetail('overdue-1')).resolves.toBe(detailResponse)

    expect(getMock).toHaveBeenNthCalledWith(1, '/overdue-records', { params: query })
    expect(getMock).toHaveBeenNthCalledWith(2, '/overdue-records/overdue-1')
  })

  it('posts processing payload with backend field names', async () => {
    const response = { id: 'overdue-1', processingStatus: 'PROCESSED' }
    postMock.mockResolvedValue(response)

    const payload = {
      processingMethod: 'COMPENSATION',
      remark: '已赔偿处理',
      compensationAmount: '300.00',
    }

    await expect(processOverdueRecord('overdue-1', payload)).resolves.toBe(response)
    expect(postMock).toHaveBeenCalledWith('/overdue-records/overdue-1/process', payload)
  })
})
