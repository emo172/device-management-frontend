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

import * as reservationApi from '../reservations'

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

    await expect(reservationApi.createReservation(createPayload)).resolves.toMatchObject(reservation)
    await expect(reservationApi.createProxyReservation(proxyPayload)).resolves.toMatchObject(
      proxyReservation,
    )

    expect(postMock).toHaveBeenNthCalledWith(1, '/reservations', createPayload)
    expect(postMock).toHaveBeenNthCalledWith(2, '/reservations/proxy', proxyPayload)
  })

  it('uses dedicated audit and check-in endpoints for reservation workflow', async () => {
    const auditPayload = { approved: true, remark: '审批通过' }
    const checkInPayload = { checkInTime: '2026-03-16T09:05:00' }

    postMock.mockResolvedValue({ id: 'reservation-1', status: 'APPROVED' })

    await reservationApi.deviceAuditReservation('reservation-1', auditPayload)
    await reservationApi.systemAuditReservation('reservation-1', auditPayload)
    await reservationApi.checkInReservation('reservation-1', checkInPayload)

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
    await expect(
      reservationApi.manualProcessReservation('reservation-1', payload),
    ).resolves.toMatchObject(response)

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

    await expect(reservationApi.createReservationBatch(payload)).resolves.toBe(batch)
    await expect(reservationApi.getReservationBatchDetail('batch-1')).resolves.toBe(batch)

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

    await expect(reservationApi.getReservationList({ page: 2, size: 5 })).resolves.toEqual(
      pageResponse,
    )

    expect(getMock).toHaveBeenCalledWith('/reservations', {
      params: {
        page: 2,
        size: 5,
      },
    })
  })

  it('标准化预约请求时间，并把旧别名响应归一到主展示口径', async () => {
    postMock.mockResolvedValue({
      id: 'reservation-legacy',
      batchId: null,
      userId: 'user-2',
      createdBy: 'admin-1',
      reservationMode: 'PROXY',
      deviceId: 'device-1',
      status: 'PENDING_SYSTEM_APPROVAL',
      signStatus: 'NOT_SIGNED',
      approvalModeSnapshot: 'DEVICE_AND_SYSTEM',
      deviceApproverId: 'device-admin-1',
      systemApproverId: null,
    })
    getMock.mockResolvedValue({
      total: 1,
      records: [
        {
          id: 'reservation-legacy',
          batchId: null,
          userId: 'user-2',
          userName: 'demo-user',
          createdBy: 'admin-1',
          createdByName: 'demo-admin',
          reservationMode: 'PROXY',
          deviceId: 'device-1',
          deviceName: '示波器',
          deviceNumber: 'DEV-001',
          startTime: '2026-03-16T09:00:00',
          endTime: '2026-03-16T10:00:00',
          purpose: '课程实验',
          status: 'PENDING_SYSTEM_APPROVAL',
          signStatus: 'NOT_SIGNED',
          approvalModeSnapshot: 'DEVICE_AND_SYSTEM',
          cancelReason: null,
          cancelTime: null,
        },
      ],
    })

    await expect(
      reservationApi.createProxyReservation({
        targetUserId: 'user-2',
        deviceId: 'device-1',
        startTime: '2026-03-16T09:00:00.987',
        endTime: '2026-03-16T10:00:00.456',
        purpose: '课程实验',
        remark: '请准时到场',
      }),
    ).resolves.toMatchObject({
      reservationMode: 'ON_BEHALF',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
    })

    await expect(reservationApi.getReservationList({ page: 1, size: 10 })).resolves.toMatchObject({
      total: 1,
      records: [
        expect.objectContaining({
          reservationMode: 'ON_BEHALF',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
        }),
      ],
    })

    expect(postMock).toHaveBeenCalledWith('/reservations/proxy', {
      targetUserId: 'user-2',
      deviceId: 'device-1',
      startTime: '2026-03-16T09:00:00',
      endTime: '2026-03-16T10:00:00',
      purpose: '课程实验',
      remark: '请准时到场',
    })
  })

  it('uses dedicated detail and cancel endpoints for reservation list actions', async () => {
    const detail = {
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
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '课程实验',
      remark: '请提前准备',
      status: 'APPROVED',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_ONLY',
      cancelReason: null,
      cancelTime: null,
    }

    getMock.mockResolvedValue(detail)
    postMock.mockResolvedValue({
      ...detail,
      status: 'CANCELLED',
      cancelReason: '课程调整',
      cancelTime: '2026-03-16T08:00:00',
    })

    expect(typeof reservationApi.getReservationDetail).toBe('function')
    expect(typeof reservationApi.cancelReservation).toBe('function')

    if (!reservationApi.getReservationDetail || !reservationApi.cancelReservation) {
      return
    }

    await expect(reservationApi.getReservationDetail('reservation-1')).resolves.toEqual(detail)
    await expect(
      reservationApi.cancelReservation('reservation-1', { reason: '课程调整' }),
    ).resolves.toEqual({
      ...detail,
      status: 'CANCELLED',
      cancelReason: '课程调整',
      cancelTime: '2026-03-16T08:00:00',
    })

    expect(getMock).toHaveBeenCalledWith('/reservations/reservation-1')
    expect(postMock).toHaveBeenCalledWith('/reservations/reservation-1/cancel', {
      reason: '课程调整',
    })
  })
})
