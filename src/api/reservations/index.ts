import request from '@/api/request'
import {
  normalizeCheckInPayload,
  normalizeReservationTimeRangePayload,
  normalizeReservationWorkflowRecord,
  normalizeReservationWorkflowRecords,
} from '@/utils'

import type {
  AuditReservationRequest,
  BlockingDeviceResponse,
  BlockingDeviceReasonCode,
  CancelReservationRequest,
  CheckInRequest,
  CreateReservationBatchRequest,
  CreateReservationRequest,
  ManualProcessRequest,
  MultiReservationConflictResponse,
  ProxyReservationRequest,
  ReservationBatchResponse,
  ReservationCreateActionResponse,
  ReservationDetailResponse,
  ReservationDeviceSummary,
  ReservationListQuery,
  ReservationListItemResponse,
  ReservationPageResponse,
  ReservationResponse,
} from './types'

export type {
  ApprovalMode,
  AuditReservationRequest,
  BlockingDeviceReasonCode,
  BlockingDeviceResponse,
  CancelReservationRequest,
  CheckInRequest,
  CheckInStatus,
  CreateReservationBatchRequest,
  CreateReservationRequest,
  ManualProcessRequest,
  MultiReservationConflictResponse,
  ProxyReservationRequest,
  ReservationBatchItem,
  ReservationBatchResponse,
  ReservationCreateActionResponse,
  ReservationDetailResponse,
  ReservationDeviceSummary,
  ReservationListItemResponse,
  ReservationListQuery,
  ReservationPageResponse,
  ReservationMode,
  ReservationResponse,
} from './types'

function normalizeCreatedReservation(result: ReservationCreateActionResponse) {
  const reservation = normalizeReservationWorkflowRecord(result.reservation)

  return {
    ...reservation,
    deviceCount: reservation.deviceCount ?? result.deviceCount,
  }
}

function isBlockingDeviceReasonCode(value: unknown): value is BlockingDeviceReasonCode {
  return [
    'DEVICE_DUPLICATED',
    'DEVICE_LIMIT_EXCEEDED',
    'DEVICE_NOT_FOUND',
    'DEVICE_NOT_RESERVABLE',
    'DEVICE_TIME_CONFLICT',
    'DEVICE_PERMISSION_DENIED',
  ].includes(String(value))
}

export function extractReservationBlockingDevices(error: unknown): BlockingDeviceResponse[] {
  const blockingDevices = (
    error as {
      response?: {
        data?: {
          data?: MultiReservationConflictResponse
        }
      }
    }
  )?.response?.data?.data?.blockingDevices

  if (!Array.isArray(blockingDevices)) {
    return []
  }

  return blockingDevices
    .filter(
      (device): device is BlockingDeviceResponse =>
        !!device &&
        typeof device.deviceId === 'string' &&
        isBlockingDeviceReasonCode(device.reasonCode) &&
        typeof device.reasonMessage === 'string',
    )
    .map((device) => ({
      deviceId: device.deviceId,
      deviceName: typeof device.deviceName === 'string' ? device.deviceName : null,
      reasonCode: device.reasonCode,
      reasonMessage: device.reasonMessage,
    }))
}

/**
 * 查询预约分页列表。
 * 对应 `GET /api/reservations?page&size`，后端当前不支持额外筛选字段，因此这里只透传最小分页参数。
 */
export function getReservationList(params: ReservationListQuery) {
  return request.get<ReservationPageResponse>('/reservations', { params }).then((result) => ({
    ...result,
    records: normalizeReservationWorkflowRecords(result.records),
  }))
}

/**
 * 查询预约详情。
 * 对应 `GET /api/reservations/{id}`，Task 22 只用于列表页详情跳转预留与取消后回填最新详情口径。
 */
export function getReservationDetail(reservationId: string) {
  return request
    .get<ReservationDetailResponse>(`/reservations/${reservationId}`)
    .then((result) => normalizeReservationWorkflowRecord(result))
}

/**
 * 创建多设备本人预约。
 * 对应真实接口 `POST /api/reservations/multi`。
 * 中文口径：普通用户按本人语义提交时走统一多设备创建接口，请求中不得携带 `targetUserId`，
 * 后端会把当前登录用户作为预约归属人。
 */
export function createReservation(data: CreateReservationRequest) {
  return request
    .post<ReservationCreateActionResponse, CreateReservationRequest>(
      '/reservations/multi',
      normalizeReservationTimeRangePayload(data),
    )
    .then((result) => normalizeCreatedReservation(result))
}

/**
 * 创建多设备代预约。
 * 对应真实接口 `POST /api/reservations/multi`。
 * 中文口径：系统管理员代 USER 提交时仍复用统一多设备创建接口，但必须额外携带 `targetUserId`，
 * 后端会据此判定代预约语义并校验目标角色是否合法。
 */
export function createProxyReservation(data: ProxyReservationRequest) {
  return request
    .post<ReservationCreateActionResponse, ProxyReservationRequest>(
      '/reservations/multi',
      normalizeReservationTimeRangePayload(data),
    )
    .then((result) => normalizeCreatedReservation(result))
}

/**
 * 设备管理员一审。
 * 对应 `POST /api/reservations/{id}/audit`，接口路径本身区分审批阶段。
 */
export function deviceAuditReservation(reservationId: string, data: AuditReservationRequest) {
  return request
    .post<
      ReservationResponse,
      AuditReservationRequest
    >(`/reservations/${reservationId}/audit`, data)
    .then((result) => normalizeReservationWorkflowRecord(result))
}

/**
 * 系统管理员二审。
 * 对应 `POST /api/reservations/{id}/system-audit`，避免把二审错误复用为一审接口。
 */
export function systemAuditReservation(reservationId: string, data: AuditReservationRequest) {
  return request
    .post<
      ReservationResponse,
      AuditReservationRequest
    >(`/reservations/${reservationId}/system-audit`, data)
    .then((result) => normalizeReservationWorkflowRecord(result))
}

/**
 * 预约签到。
 * 对应 `POST /api/reservations/{id}/check-in`，签到时间交由调用方按窗口规则传入。
 */
export function checkInReservation(reservationId: string, data: CheckInRequest) {
  return request
    .post<
      ReservationResponse,
      CheckInRequest
    >(`/reservations/${reservationId}/check-in`, normalizeCheckInPayload(data))
    .then((result) => normalizeReservationWorkflowRecord(result))
}

/**
 * 取消预约。
 * 对应 `POST /api/reservations/{id}/cancel`，后端要求提交取消原因，且只在开始前超过 24 小时的用户自助取消场景开放。
 */
export function cancelReservation(reservationId: string, data: CancelReservationRequest) {
  return request
    .post<
      ReservationDetailResponse,
      CancelReservationRequest
    >(`/reservations/${reservationId}/cancel`, data)
    .then((result) => normalizeReservationWorkflowRecord(result))
}

/**
 * 人工处理预约。
 * 对应 `PUT /api/reservations/{id}/manual-process`，仅在预约进入人工处理状态后使用。
 */
export function manualProcessReservation(reservationId: string, data: ManualProcessRequest) {
  return request
    .put<
      ReservationResponse,
      ManualProcessRequest
    >(`/reservations/${reservationId}/manual-process`, data)
    .then((result) => normalizeReservationWorkflowRecord(result))
}

/**
 * 创建批量预约。
 * 对应 `POST /api/reservation-batches`，批次由后端汇总成功数与失败数。
 */
export function createReservationBatch(data: CreateReservationBatchRequest) {
  const normalizedPayload = {
    ...data,
    items: data.items.map((item) => normalizeReservationTimeRangePayload(item)),
  }

  return request.post<ReservationBatchResponse, CreateReservationBatchRequest>(
    '/reservation-batches',
    normalizedPayload,
  )
}

/**
 * 查询预约批次详情。
 * 对应 `GET /api/reservation-batches/{id}`，用于批量预约结果页按批次回显统计信息。
 */
export function getReservationBatchDetail(batchId: string) {
  return request.get<ReservationBatchResponse>(`/reservation-batches/${batchId}`)
}
