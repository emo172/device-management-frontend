import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
  putMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
    put: putMock,
  },
}))

import {
  checkInReservation,
  createReservation,
  createReservationBatch,
  createProxyReservation,
  deviceAuditReservation,
  getReservationList,
  getReservationBatchDetail,
  manualProcessReservation,
  systemAuditReservation,
} from '../reservations'

describe('reservations api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
    putMock.mockReset()
  })

  it('creates self reservation and proxy reservation with backend routes', async () => {
    const reservation = { id: 'reservation-1', reservationMode: 'SELF' }
    const proxyReservation = { id: 'reservation-2', reservationMode: 'ON_BEHALF' }
    postMock.mockResolvedValueOnce(reservation)
    postMock.mockResolvedValueOnce(proxyReservation)

    const createPayload = {
      deviceId: 'device-1',
      startTime: '2026-03-16T09:00:00',
      endTime: '2026-03-16T10:00:00',
      purpose: '课程实验',
      remark: '请提前准备',
    }
    const proxyPayload = {
      targetUserId: 'user-2',
      ...createPayload,
    }

    await expect(createReservation(createPayload)).resolves.toBe(reservation)
    await expect(createProxyReservation(proxyPayload)).resolves.toBe(proxyReservation)

    expect(postMock).toHaveBeenNthCalledWith(1, '/reservations', createPayload)
    expect(postMock).toHaveBeenNthCalledWith(2, '/reservations/proxy', proxyPayload)
  })

  it('uses dedicated audit and check-in endpoints for reservation workflow', async () => {
    const auditPayload = { approved: true, remark: '审批通过' }
    const checkInPayload = { checkInTime: '2026-03-16T09:05:00' }

    postMock.mockResolvedValue({ id: 'reservation-1', status: 'APPROVED' })

    await deviceAuditReservation('reservation-1', auditPayload)
    await systemAuditReservation('reservation-1', auditPayload)
    await checkInReservation('reservation-1', checkInPayload)

    expect(postMock).toHaveBeenNthCalledWith(1, '/reservations/reservation-1/audit', auditPayload)
    expect(postMock).toHaveBeenNthCalledWith(
      2,
      '/reservations/reservation-1/system-audit',
      auditPayload,
    )
    expect(postMock).toHaveBeenNthCalledWith(
      3,
      '/reservations/reservation-1/check-in',
      checkInPayload,
    )
  })

  it('uses put endpoint for manual process action', async () => {
    const response = { id: 'reservation-1', status: 'APPROVED' }
    putMock.mockResolvedValue(response)

    const payload = { approved: true, remark: '人工确认' }
    await expect(manualProcessReservation('reservation-1', payload)).resolves.toBe(response)

    expect(putMock).toHaveBeenCalledWith('/reservations/reservation-1/manual-process', payload)
  })

  it('handles reservation batch create and detail endpoints', async () => {
    const batch = { id: 'batch-1', successCount: 2 }
    postMock.mockResolvedValueOnce(batch)
    getMock.mockResolvedValueOnce(batch)

    const payload = {
      targetUserId: 'user-2',
      items: [
        {
          deviceId: 'device-1',
          startTime: '2026-03-16T09:00:00',
          endTime: '2026-03-16T10:00:00',
          purpose: '课程实验',
          remark: '第一台',
        },
      ],
    }

    await expect(createReservationBatch(payload)).resolves.toBe(batch)
    await expect(getReservationBatchDetail('batch-1')).resolves.toBe(batch)

    expect(postMock).toHaveBeenCalledWith('/reservation-batches', payload)
    expect(getMock).toHaveBeenCalledWith('/reservation-batches/batch-1')
  })

  it('queries reservation list with page and size params only', async () => {
    const pageResponse = {
      total: 2,
      records: [
        {
          id: 'reservation-1',
          batchId: null,
          userId: 'user-1',
          userName: 'demo-user',
          createdBy: 'user-1',
          createdByName: 'demo-user',
          reservationMode: 'SELF',
          deviceId: 'device-1',
          deviceName: '示波器',
          deviceNumber: 'DEV-001',
          startTime: '2026-03-16T09:00:00',
          endTime: '2026-03-16T10:00:00',
          purpose: '课程实验',
          status: 'APPROVED',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
          cancelReason: null,
          cancelTime: null,
        },
      ],
    }
    getMock.mockResolvedValue(pageResponse)

    await expect(getReservationList({ page: 2, size: 5 })).resolves.toBe(pageResponse)

    expect(getMock).toHaveBeenCalledWith('/reservations', {
      params: {
        page: 2,
        size: 5,
      },
    })
  })
})
