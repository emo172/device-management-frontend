import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import type { ReservationDetailResponse } from '@/api/reservations'
import { UserRole } from '@/enums'

const {
  cancelReservationMock,
  checkInReservationMock,
  createProxyReservationMock,
  createReservationBatchMock,
  createReservationMock,
  deviceAuditReservationMock,
  getReservationDetailMock,
  getReservationListMock,
  getReservationBatchDetailMock,
  manualProcessReservationMock,
  systemAuditReservationMock,
} = vi.hoisted(() => ({
  cancelReservationMock: vi.fn(),
  checkInReservationMock: vi.fn(),
  createProxyReservationMock: vi.fn(),
  createReservationBatchMock: vi.fn(),
  createReservationMock: vi.fn(),
  deviceAuditReservationMock: vi.fn(),
  getReservationDetailMock: vi.fn(),
  getReservationListMock: vi.fn(),
  getReservationBatchDetailMock: vi.fn(),
  manualProcessReservationMock: vi.fn(),
  systemAuditReservationMock: vi.fn(),
}))

vi.mock('@/api/reservations', () => ({
  cancelReservation: cancelReservationMock,
  checkInReservation: checkInReservationMock,
  createProxyReservation: createProxyReservationMock,
  createReservation: createReservationMock,
  createReservationBatch: createReservationBatchMock,
  deviceAuditReservation: deviceAuditReservationMock,
  getReservationDetail: getReservationDetailMock,
  getReservationList: getReservationListMock,
  getReservationBatchDetail: getReservationBatchDetailMock,
  manualProcessReservation: manualProcessReservationMock,
  systemAuditReservation: systemAuditReservationMock,
}))

import { useReservationStore } from '../modules/reservation'

describe('reservation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    cancelReservationMock.mockReset()
    checkInReservationMock.mockReset()
    createProxyReservationMock.mockReset()
    createReservationBatchMock.mockReset()
    createReservationMock.mockReset()
    deviceAuditReservationMock.mockReset()
    getReservationDetailMock.mockReset()
    getReservationListMock.mockReset()
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

  it('签到后保留当前详情上下文，避免签到页丢失设备与审批展示字段', async () => {
    checkInReservationMock.mockResolvedValue({
      id: 'reservation-3',
      batchId: null,
      userId: 'user-3',
      createdBy: 'user-3',
      reservationMode: 'SELF',
      deviceId: 'device-3',
      status: 'APPROVED',
      signStatus: 'CHECKED_IN_TIMEOUT',
      approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
      deviceApproverId: 'device-admin-1',
      systemApproverId: 'system-admin-1',
    })

    const store = useReservationStore()
    store.currentReservation = {
      id: 'reservation-3',
      batchId: null,
      userId: 'user-3',
      userName: 'demo-user',
      createdBy: 'user-3',
      createdByName: 'demo-user',
      reservationMode: 'SELF',
      deviceId: 'device-3',
      deviceName: '频谱分析仪',
      deviceNumber: 'DEV-003',
      deviceStatus: 'AVAILABLE',
      startTime: '2026-03-18T10:00:00',
      endTime: '2026-03-18T11:00:00',
      purpose: '课程实验',
      remark: '请提前到场',
      status: 'APPROVED',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
      deviceApproverId: 'device-admin-1',
      deviceApproverName: '设备管理员',
      deviceApprovedAt: '2026-03-18T08:20:00',
      deviceApprovalRemark: '设备同意',
      systemApproverId: 'system-admin-1',
      systemApproverName: '系统管理员',
      systemApprovedAt: '2026-03-18T08:40:00',
      systemApprovalRemark: '系统同意',
      cancelReason: null,
      cancelTime: null,
      checkedInAt: null,
      createdAt: '2026-03-18T08:00:00',
      updatedAt: '2026-03-18T08:40:00',
    }

    await store.checkInReservation('reservation-3', { checkInTime: '2026-03-18T10:40:00' })

    expect(store.currentReservation?.signStatus).toBe('CHECKED_IN_TIMEOUT')
    expect((store.currentReservation as ReservationDetailResponse | null)?.deviceName).toBe(
      '频谱分析仪',
    )
    expect((store.currentReservation as ReservationDetailResponse | null)?.systemApproverName).toBe(
      '系统管理员',
    )
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

  it('loads reservation list and keeps pagination query in sync', async () => {
    getReservationListMock.mockResolvedValue({
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
          status: 'PENDING_DEVICE_APPROVAL',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_ONLY',
          cancelReason: null,
          cancelTime: null,
        },
      ],
    })

    const store = useReservationStore()
    await store.fetchReservationList({ page: 1, size: 5 })

    expect(getReservationListMock).toHaveBeenCalledWith({ page: 1, size: 5 })
    expect(store.query).toEqual({ page: 1, size: 5 })
    expect(store.total).toBe(2)
    expect(store.list).toHaveLength(1)
    expect(store.list[0]?.signStatus).toBe('NOT_CHECKED_IN')
  })

  it('builds device admin pending page from unfiltered backend pages', async () => {
    getReservationListMock
      .mockResolvedValueOnce({
        total: 4,
        records: [
          {
            id: 'reservation-1',
            batchId: null,
            userId: 'user-1',
            userName: '普通用户',
            createdBy: 'user-1',
            createdByName: '普通用户',
            reservationMode: 'SELF',
            deviceId: 'device-1',
            deviceName: '示波器',
            deviceNumber: 'DEV-001',
            startTime: '2026-03-20T09:00:00',
            endTime: '2026-03-20T10:00:00',
            purpose: '实验',
            status: 'PENDING_DEVICE_APPROVAL',
            signStatus: 'NOT_CHECKED_IN',
            approvalModeSnapshot: 'DEVICE_ONLY',
            cancelReason: null,
            cancelTime: null,
          },
          {
            id: 'reservation-2',
            batchId: null,
            userId: 'user-2',
            userName: '普通用户2',
            createdBy: 'user-2',
            createdByName: '普通用户2',
            reservationMode: 'SELF',
            deviceId: 'device-2',
            deviceName: '频谱仪',
            deviceNumber: 'DEV-002',
            startTime: '2026-03-20T10:00:00',
            endTime: '2026-03-20T11:00:00',
            purpose: '实验',
            status: 'APPROVED',
            signStatus: 'NOT_CHECKED_IN',
            approvalModeSnapshot: 'DEVICE_ONLY',
            cancelReason: null,
            cancelTime: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        total: 4,
        records: [
          {
            id: 'reservation-3',
            batchId: null,
            userId: 'user-3',
            userName: '普通用户3',
            createdBy: 'user-3',
            createdByName: '普通用户3',
            reservationMode: 'SELF',
            deviceId: 'device-3',
            deviceName: '逻辑分析仪',
            deviceNumber: 'DEV-003',
            startTime: '2026-03-20T11:00:00',
            endTime: '2026-03-20T12:00:00',
            purpose: '实验',
            status: 'PENDING_MANUAL',
            signStatus: 'CHECKED_IN',
            approvalModeSnapshot: 'DEVICE_ONLY',
            cancelReason: null,
            cancelTime: null,
          },
          {
            id: 'reservation-4',
            batchId: null,
            userId: 'user-4',
            userName: '普通用户4',
            createdBy: 'user-4',
            createdByName: '普通用户4',
            reservationMode: 'SELF',
            deviceId: 'device-4',
            deviceName: '信号源',
            deviceNumber: 'DEV-004',
            startTime: '2026-03-20T13:00:00',
            endTime: '2026-03-20T14:00:00',
            purpose: '实验',
            status: 'REJECTED',
            signStatus: 'NOT_CHECKED_IN',
            approvalModeSnapshot: 'DEVICE_ONLY',
            cancelReason: null,
            cancelTime: null,
          },
        ],
      })

    const store = useReservationStore()
    const managedPageAction = (
      store as typeof store & {
        fetchManagedReservationPage?: (payload: {
          role: UserRole
          view: 'pending' | 'history'
          page: number
          size: number
        }) => Promise<{ total: number; records: { id: string }[] }>
      }
    ).fetchManagedReservationPage

    expect(typeof managedPageAction).toBe('function')

    if (!managedPageAction) {
      return
    }

    const result = await managedPageAction({
      role: UserRole.DEVICE_ADMIN,
      view: 'pending',
      page: 1,
      size: 10,
    })

    expect(getReservationListMock).toHaveBeenNthCalledWith(1, { page: 1, size: 50 })
    expect(getReservationListMock).toHaveBeenNthCalledWith(2, { page: 2, size: 50 })
    expect(result.total).toBe(2)
    expect(result.records.map((item) => item.id)).toEqual(['reservation-1', 'reservation-3'])
    expect(store.list.map((item) => item.id)).toEqual(['reservation-1', 'reservation-3'])
  })

  it('builds system admin history page from local status grouping result', async () => {
    getReservationListMock.mockResolvedValue({
      total: 5,
      records: [
        {
          id: 'reservation-1',
          batchId: null,
          userId: 'user-1',
          userName: '普通用户',
          createdBy: 'user-1',
          createdByName: '普通用户',
          reservationMode: 'SELF',
          deviceId: 'device-1',
          deviceName: '示波器',
          deviceNumber: 'DEV-001',
          startTime: '2026-03-20T09:00:00',
          endTime: '2026-03-20T10:00:00',
          purpose: '实验',
          status: 'PENDING_SYSTEM_APPROVAL',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
          cancelReason: null,
          cancelTime: null,
        },
        {
          id: 'reservation-2',
          batchId: null,
          userId: 'user-2',
          userName: '普通用户2',
          createdBy: 'user-2',
          createdByName: '普通用户2',
          reservationMode: 'SELF',
          deviceId: 'device-2',
          deviceName: '频谱仪',
          deviceNumber: 'DEV-002',
          startTime: '2026-03-20T10:00:00',
          endTime: '2026-03-20T11:00:00',
          purpose: '实验',
          status: 'APPROVED',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
          cancelReason: null,
          cancelTime: null,
        },
        {
          id: 'reservation-3',
          batchId: null,
          userId: 'user-3',
          userName: '普通用户3',
          createdBy: 'user-3',
          createdByName: '普通用户3',
          reservationMode: 'SELF',
          deviceId: 'device-3',
          deviceName: '逻辑分析仪',
          deviceNumber: 'DEV-003',
          startTime: '2026-03-20T11:00:00',
          endTime: '2026-03-20T12:00:00',
          purpose: '实验',
          status: 'REJECTED',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
          cancelReason: null,
          cancelTime: null,
        },
        {
          id: 'reservation-4',
          batchId: null,
          userId: 'user-4',
          userName: '普通用户4',
          createdBy: 'user-4',
          createdByName: '普通用户4',
          reservationMode: 'SELF',
          deviceId: 'device-4',
          deviceName: '信号源',
          deviceNumber: 'DEV-004',
          startTime: '2026-03-20T13:00:00',
          endTime: '2026-03-20T14:00:00',
          purpose: '实验',
          status: 'CANCELLED',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
          cancelReason: '课程调整',
          cancelTime: '2026-03-19T08:00:00',
        },
        {
          id: 'reservation-5',
          batchId: null,
          userId: 'user-5',
          userName: '普通用户5',
          createdBy: 'user-5',
          createdByName: '普通用户5',
          reservationMode: 'SELF',
          deviceId: 'device-5',
          deviceName: '测温仪',
          deviceNumber: 'DEV-005',
          startTime: '2026-03-20T15:00:00',
          endTime: '2026-03-20T16:00:00',
          purpose: '实验',
          status: 'EXPIRED',
          signStatus: 'CHECKED_IN_TIMEOUT',
          approvalModeSnapshot: 'DEVICE_THEN_SYSTEM',
          cancelReason: null,
          cancelTime: null,
        },
      ],
    })

    const store = useReservationStore()
    const managedPageAction = (
      store as typeof store & {
        fetchManagedReservationPage?: (payload: {
          role: UserRole
          view: 'pending' | 'history'
          page: number
          size: number
        }) => Promise<{ total: number; records: { id: string }[] }>
      }
    ).fetchManagedReservationPage

    expect(typeof managedPageAction).toBe('function')

    if (!managedPageAction) {
      return
    }

    const result = await managedPageAction({
      role: UserRole.SYSTEM_ADMIN,
      view: 'history',
      page: 1,
      size: 2,
    })

    expect(result.total).toBe(4)
    expect(result.records.map((item) => item.id)).toEqual(['reservation-2', 'reservation-3'])
    expect(store.total).toBe(4)
    expect(store.query).toEqual({ page: 1, size: 2 })
  })

  it('supports detail fetch and cancellation result backfill for reservation list page', async () => {
    const detail: ReservationDetailResponse = {
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
      deviceStatus: 'AVAILABLE',
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '课程实验',
      remark: '请提前准备',
      status: 'APPROVED',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_ONLY',
      deviceApproverId: null,
      deviceApproverName: null,
      deviceApprovedAt: null,
      deviceApprovalRemark: null,
      systemApproverId: null,
      systemApproverName: null,
      systemApprovedAt: null,
      systemApprovalRemark: null,
      cancelReason: null,
      cancelTime: null,
      checkedInAt: null,
      createdAt: '2026-03-16T08:00:00',
      updatedAt: '2026-03-16T08:00:00',
    }

    const cancelledReservation = {
      ...detail,
      status: 'CANCELLED',
      cancelReason: '课程调整',
      cancelTime: '2026-03-16T08:00:00',
    }

    getReservationDetailMock.mockResolvedValue(detail)
    cancelReservationMock.mockResolvedValue(cancelledReservation)

    const store = useReservationStore()
    store.list = [detail]
    store.total = 1

    const fetchDetailAction = (
      store as typeof store & {
        fetchReservationDetail?: (reservationId: string) => Promise<unknown>
      }
    ).fetchReservationDetail
    const cancelAction = (
      store as typeof store & {
        cancelReservation?: (reservationId: string, payload: { reason: string }) => Promise<unknown>
      }
    ).cancelReservation

    expect(typeof fetchDetailAction).toBe('function')
    expect(typeof cancelAction).toBe('function')

    if (!fetchDetailAction || !cancelAction) {
      return
    }

    await fetchDetailAction('reservation-1')
    await cancelAction('reservation-1', { reason: '课程调整' })

    expect(getReservationDetailMock).toHaveBeenCalledWith('reservation-1')
    expect(cancelReservationMock).toHaveBeenCalledWith('reservation-1', { reason: '课程调整' })
    expect(store.currentReservation?.status).toBe('CANCELLED')
    expect(store.list[0]?.cancelReason).toBe('课程调整')
  })

  it('ignores stale reservation detail responses when a newer route request finishes first', async () => {
    const detailA: ReservationDetailResponse = {
      id: 'reservation-a',
      batchId: null,
      userId: 'user-1',
      userName: 'demo-user',
      createdBy: 'user-1',
      createdByName: 'demo-user',
      reservationMode: 'SELF',
      deviceId: 'device-a',
      deviceName: '旧预约',
      deviceNumber: 'DEV-A',
      deviceStatus: 'AVAILABLE',
      startTime: '2026-03-18T09:00:00',
      endTime: '2026-03-18T10:00:00',
      purpose: '旧请求',
      remark: null,
      status: 'APPROVED',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_ONLY',
      deviceApproverId: null,
      deviceApproverName: null,
      deviceApprovedAt: null,
      deviceApprovalRemark: null,
      systemApproverId: null,
      systemApproverName: null,
      systemApprovedAt: null,
      systemApprovalRemark: null,
      cancelReason: null,
      cancelTime: null,
      checkedInAt: null,
      createdAt: '2026-03-16T08:00:00',
      updatedAt: '2026-03-16T08:00:00',
    }
    const detailB: ReservationDetailResponse = {
      ...detailA,
      id: 'reservation-b',
      deviceId: 'device-b',
      deviceName: '当前预约',
      deviceNumber: 'DEV-B',
      purpose: '当前请求',
    }

    const pendingRequest = {
      resolve: null as ((value: ReservationDetailResponse) => void) | null,
    }
    getReservationDetailMock.mockImplementation((reservationId: string) => {
      if (reservationId === 'reservation-a') {
        return new Promise<ReservationDetailResponse>((resolve) => {
          pendingRequest.resolve = resolve
        })
      }

      return Promise.resolve(detailB)
    })

    const store = useReservationStore()
    const requestA = store.fetchReservationDetail('reservation-a')
    const requestB = store.fetchReservationDetail('reservation-b')

    await requestB
    expect(store.currentReservation?.id).toBe('reservation-b')

    if (pendingRequest.resolve) {
      pendingRequest.resolve(detailA)
    }
    await requestA
    expect(store.currentReservation?.id).toBe('reservation-b')
  })

  it('stops managed reservation paging when backend pages stop yielding new records', async () => {
    getReservationListMock
      .mockResolvedValueOnce({
        total: 3,
        records: [
          {
            id: 'reservation-1',
            batchId: null,
            userId: 'user-1',
            userName: '普通用户',
            createdBy: 'user-1',
            createdByName: '普通用户',
            reservationMode: 'SELF',
            deviceId: 'device-1',
            deviceName: '示波器',
            deviceNumber: 'DEV-001',
            startTime: '2026-03-20T09:00:00',
            endTime: '2026-03-20T10:00:00',
            purpose: '实验',
            status: 'PENDING_DEVICE_APPROVAL',
            signStatus: 'NOT_CHECKED_IN',
            approvalModeSnapshot: 'DEVICE_ONLY',
            cancelReason: null,
            cancelTime: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        total: 3,
        records: [],
      })

    const store = useReservationStore()
    const result = await store.fetchManagedReservationPage({
      role: UserRole.DEVICE_ADMIN,
      view: 'pending',
      page: 1,
      size: 10,
    })

    expect(getReservationListMock).toHaveBeenCalledTimes(2)
    expect(result.total).toBe(1)
    expect(result.records).toHaveLength(1)
  })

  it('filters history view to approved or terminal reservation statuses only', async () => {
    getReservationListMock.mockResolvedValue({
      total: 4,
      records: [
        {
          id: 'reservation-approved',
          batchId: null,
          userId: 'user-1',
          userName: '普通用户',
          createdBy: 'user-1',
          createdByName: '普通用户',
          reservationMode: 'SELF',
          deviceId: 'device-1',
          deviceName: '示波器',
          deviceNumber: 'DEV-001',
          startTime: '2026-03-20T09:00:00',
          endTime: '2026-03-20T10:00:00',
          purpose: '实验',
          status: 'APPROVED',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_ONLY',
          cancelReason: null,
          cancelTime: null,
        },
        {
          id: 'reservation-rejected',
          batchId: null,
          userId: 'user-2',
          userName: '普通用户2',
          createdBy: 'user-2',
          createdByName: '普通用户2',
          reservationMode: 'SELF',
          deviceId: 'device-2',
          deviceName: '频谱仪',
          deviceNumber: 'DEV-002',
          startTime: '2026-03-20T10:00:00',
          endTime: '2026-03-20T11:00:00',
          purpose: '实验',
          status: 'REJECTED',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_ONLY',
          cancelReason: null,
          cancelTime: null,
        },
        {
          id: 'reservation-expired',
          batchId: null,
          userId: 'user-3',
          userName: '普通用户3',
          createdBy: 'user-3',
          createdByName: '普通用户3',
          reservationMode: 'SELF',
          deviceId: 'device-3',
          deviceName: '热像仪',
          deviceNumber: 'DEV-003',
          startTime: '2026-03-20T11:00:00',
          endTime: '2026-03-20T12:00:00',
          purpose: '实验',
          status: 'EXPIRED',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_ONLY',
          cancelReason: null,
          cancelTime: null,
        },
        {
          id: 'reservation-pending',
          batchId: null,
          userId: 'user-4',
          userName: '普通用户4',
          createdBy: 'user-4',
          createdByName: '普通用户4',
          reservationMode: 'SELF',
          deviceId: 'device-4',
          deviceName: '逻辑分析仪',
          deviceNumber: 'DEV-004',
          startTime: '2026-03-20T13:00:00',
          endTime: '2026-03-20T14:00:00',
          purpose: '实验',
          status: 'PENDING_SYSTEM_APPROVAL',
          signStatus: 'NOT_CHECKED_IN',
          approvalModeSnapshot: 'DEVICE_ONLY',
          cancelReason: null,
          cancelTime: null,
        },
      ],
    })

    const store = useReservationStore()
    const result = await store.fetchManagedReservationPage({
      role: UserRole.SYSTEM_ADMIN,
      view: 'history',
      page: 1,
      size: 10,
    })

    expect(result.records.map((item) => item.id)).toEqual([
      'reservation-approved',
      'reservation-rejected',
      'reservation-expired',
    ])
  })

  it('stops managed reservation paging when next page only returns duplicate records', async () => {
    const repeatedRecord = {
      id: 'reservation-1',
      batchId: null,
      userId: 'user-1',
      userName: '普通用户',
      createdBy: 'user-1',
      createdByName: '普通用户',
      reservationMode: 'SELF',
      deviceId: 'device-1',
      deviceName: '示波器',
      deviceNumber: 'DEV-001',
      startTime: '2026-03-20T09:00:00',
      endTime: '2026-03-20T10:00:00',
      purpose: '实验',
      status: 'PENDING_DEVICE_APPROVAL',
      signStatus: 'NOT_CHECKED_IN',
      approvalModeSnapshot: 'DEVICE_ONLY',
      cancelReason: null,
      cancelTime: null,
    }

    getReservationListMock
      .mockResolvedValueOnce({
        total: 3,
        records: [repeatedRecord],
      })
      .mockResolvedValueOnce({
        total: 3,
        records: [repeatedRecord],
      })

    const store = useReservationStore()
    const result = await store.fetchManagedReservationPage({
      role: UserRole.DEVICE_ADMIN,
      view: 'pending',
      page: 1,
      size: 10,
    })

    expect(getReservationListMock).toHaveBeenCalledTimes(2)
    expect(result.total).toBe(1)
    expect(result.records).toHaveLength(1)
  })
})
