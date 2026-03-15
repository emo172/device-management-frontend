import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  checkInReservationMock,
  createProxyReservationMock,
  createReservationBatchMock,
  createReservationMock,
  deviceAuditReservationMock,
  getReservationBatchDetailMock,
  manualProcessReservationMock,
  systemAuditReservationMock,
} = vi.hoisted(() => ({
  checkInReservationMock: vi.fn(),
  createProxyReservationMock: vi.fn(),
  createReservationBatchMock: vi.fn(),
  createReservationMock: vi.fn(),
  deviceAuditReservationMock: vi.fn(),
  getReservationBatchDetailMock: vi.fn(),
  manualProcessReservationMock: vi.fn(),
  systemAuditReservationMock: vi.fn(),
}))

vi.mock('@/api/reservations', () => ({
  checkInReservation: checkInReservationMock,
  createProxyReservation: createProxyReservationMock,
  createReservation: createReservationMock,
  createReservationBatch: createReservationBatchMock,
  deviceAuditReservation: deviceAuditReservationMock,
  getReservationBatchDetail: getReservationBatchDetailMock,
  manualProcessReservation: manualProcessReservationMock,
  systemAuditReservation: systemAuditReservationMock,
}))

import { useReservationStore } from '../modules/reservation'

describe('reservation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    checkInReservationMock.mockReset()
    createProxyReservationMock.mockReset()
    createReservationBatchMock.mockReset()
    createReservationMock.mockReset()
    deviceAuditReservationMock.mockReset()
    getReservationBatchDetailMock.mockReset()
    manualProcessReservationMock.mockReset()
    systemAuditReservationMock.mockReset()
  })

  it('creates self reservation and keeps current reservation result', async () => {
    createReservationMock.mockResolvedValue({
      id: 'reservation-1',
      batchId: null,
      userId: 'user-1',
      createdBy: 'user-1',
      reservationMode: 'SELF',
      deviceId: 'device-1',
      status: 'PENDING_DEVICE_APPROVAL',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_ONLY',
      deviceApproverId: null,
      systemApproverId: null,
    })

    const store = useReservationStore()
    await store.createReservation({
      deviceId: 'device-1',
      startTime: '2026-03-15T10:00:00',
      endTime: '2026-03-15T11:00:00',
      purpose: '实验',
      remark: '备注',
    })

    expect(store.currentReservation?.id).toBe('reservation-1')
  })

  it('supports proxy audit, check-in and manual process state handoff', async () => {
    createProxyReservationMock.mockResolvedValue({
      id: 'reservation-2',
      batchId: null,
      userId: 'user-2',
      createdBy: 'admin-1',
      reservationMode: 'ON_BEHALF',
      deviceId: 'device-2',
      status: 'PENDING_SYSTEM_APPROVAL',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
      deviceApproverId: 'device-admin-1',
      systemApproverId: null,
    })
    systemAuditReservationMock.mockResolvedValue({
      id: 'reservation-2',
      batchId: null,
      userId: 'user-2',
      createdBy: 'admin-1',
      reservationMode: 'ON_BEHALF',
      deviceId: 'device-2',
      status: 'APPROVED',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
      deviceApproverId: 'device-admin-1',
      systemApproverId: 'system-admin-1',
    })
    checkInReservationMock.mockResolvedValue({
      id: 'reservation-2',
      batchId: null,
      userId: 'user-2',
      createdBy: 'admin-1',
      reservationMode: 'ON_BEHALF',
      deviceId: 'device-2',
      status: 'APPROVED',
      signStatus: 'CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
      deviceApproverId: 'device-admin-1',
      systemApproverId: 'system-admin-1',
    })
    manualProcessReservationMock.mockResolvedValue({
      id: 'reservation-2',
      batchId: null,
      userId: 'user-2',
      createdBy: 'admin-1',
      reservationMode: 'ON_BEHALF',
      deviceId: 'device-2',
      status: 'APPROVED',
      signStatus: 'CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
      deviceApproverId: 'device-admin-1',
      systemApproverId: 'system-admin-1',
    })

    const store = useReservationStore()
    await store.createProxyReservation({
      targetUserId: 'user-2',
      deviceId: 'device-2',
      startTime: '2026-03-15T12:00:00',
      endTime: '2026-03-15T13:00:00',
      purpose: '代预约',
      remark: '备注',
    })
    await store.systemAuditReservation('reservation-2', { approved: true, remark: '通过' })
    await store.checkInReservation('reservation-2', { checkInTime: '2026-03-15T12:05:00' })
    await store.manualProcessReservation('reservation-2', { approved: true, remark: '已处理' })

    expect(store.currentReservation?.signStatus).toBe('CHECKED_IN')
    expect(systemAuditReservationMock).toHaveBeenCalledWith('reservation-2', {
      approved: true,
      remark: '通过',
    })
  })

  it('tracks batch creation result and batch detail', async () => {
    createReservationBatchMock.mockResolvedValue({
      id: 'batch-1',
      batchNo: 'BATCH-001',
      createdBy: 'user-1',
      reservationCount: 2,
      successCount: 1,
      failedCount: 1,
      status: 'PARTIAL_SUCCESS',
    })
    getReservationBatchDetailMock.mockResolvedValue({
      id: 'batch-1',
      batchNo: 'BATCH-001',
      createdBy: 'user-1',
      reservationCount: 2,
      successCount: 1,
      failedCount: 1,
      status: 'PARTIAL_SUCCESS',
    })

    const store = useReservationStore()
    await store.createReservationBatch({
      targetUserId: null,
      items: [
        {
          deviceId: 'device-1',
          startTime: '2026-03-16T10:00:00',
          endTime: '2026-03-16T11:00:00',
          purpose: '实验',
          remark: '1',
        },
      ],
    })
    await store.fetchReservationBatchDetail('batch-1')

    expect(store.currentBatch?.id).toBe('batch-1')

    store.resetReservationResult()
    expect(store.currentReservation).toBeNull()
    expect(store.currentBatch).toBeNull()
  })
})
