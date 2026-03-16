import request from '@/api/request'

import type {
  AuditReservationRequest,
  CancelReservationRequest,
  CheckInRequest,
  CreateReservationBatchRequest,
  CreateReservationRequest,
  ManualProcessRequest,
  ProxyReservationRequest,
  ReservationBatchResponse,
  ReservationDetailResponse,
  ReservationListQuery,
  ReservationListItemResponse,
  ReservationPageResponse,
  ReservationResponse,
} from './types'

export type {
  ApprovalMode,
  AuditReservationRequest,
  CancelReservationRequest,
  CheckInRequest,
  CheckInStatus,
  CreateReservationBatchRequest,
  CreateReservationRequest,
  ManualProcessRequest,
  ProxyReservationRequest,
  ReservationBatchItem,
  ReservationBatchResponse,
  ReservationDetailResponse,
  ReservationListItemResponse,
  ReservationListQuery,
  ReservationPageResponse,
  ReservationMode,
  ReservationResponse,
} from './types'

/**
 * 查询预约分页列表。
 * 对应 `GET /api/reservations?page&size`，后端当前不支持额外筛选字段，因此这里只透传最小分页参数。
 */
export function getReservationList(params: ReservationListQuery) {
  return request.get<ReservationPageResponse>('/reservations', { params })
}

/**
 * 查询预约详情。
 * 对应 `GET /api/reservations/{id}`，Task 22 只用于列表页详情跳转预留与取消后回填最新详情口径。
 */
export function getReservationDetail(reservationId: string) {
  return request.get<ReservationDetailResponse>(`/reservations/${reservationId}`)
}

/**
 * 创建本人预约。
 * 对应 `POST /api/reservations`，普通用户预约与本人场景统一走该接口。
 */
export function createReservation(data: CreateReservationRequest) {
  return request.post<ReservationResponse, CreateReservationRequest>('/reservations', data)
}

/**
 * 创建代预约。
 * 对应 `POST /api/reservations/proxy`，只有代预约场景才允许提交 `targetUserId`。
 */
export function createProxyReservation(data: ProxyReservationRequest) {
  return request.post<ReservationResponse, ProxyReservationRequest>('/reservations/proxy', data)
}

/**
 * 设备管理员一审。
 * 对应 `POST /api/reservations/{id}/audit`，接口路径本身区分审批阶段。
 */
export function deviceAuditReservation(reservationId: string, data: AuditReservationRequest) {
  return request.post<ReservationResponse, AuditReservationRequest>(
    `/reservations/${reservationId}/audit`,
    data,
  )
}

/**
 * 系统管理员二审。
 * 对应 `POST /api/reservations/{id}/system-audit`，避免把二审错误复用为一审接口。
 */
export function systemAuditReservation(reservationId: string, data: AuditReservationRequest) {
  return request.post<ReservationResponse, AuditReservationRequest>(
    `/reservations/${reservationId}/system-audit`,
    data,
  )
}

/**
 * 预约签到。
 * 对应 `POST /api/reservations/{id}/check-in`，签到时间交由调用方按窗口规则传入。
 */
export function checkInReservation(reservationId: string, data: CheckInRequest) {
  return request.post<ReservationResponse, CheckInRequest>(
    `/reservations/${reservationId}/check-in`,
    data,
  )
}

/**
 * 取消预约。
 * 对应 `POST /api/reservations/{id}/cancel`，后端要求提交取消原因，且只在开始前超过 24 小时的用户自助取消场景开放。
 */
export function cancelReservation(reservationId: string, data: CancelReservationRequest) {
  return request.post<ReservationDetailResponse, CancelReservationRequest>(
    `/reservations/${reservationId}/cancel`,
    data,
  )
}

/**
 * 人工处理预约。
 * 对应 `PUT /api/reservations/{id}/manual-process`，仅在预约进入人工处理状态后使用。
 */
export function manualProcessReservation(reservationId: string, data: ManualProcessRequest) {
  return request.put<ReservationResponse, ManualProcessRequest>(
    `/reservations/${reservationId}/manual-process`,
    data,
  )
}

/**
 * 创建批量预约。
 * 对应 `POST /api/reservation-batches`，批次由后端汇总成功数与失败数。
 */
export function createReservationBatch(data: CreateReservationBatchRequest) {
  return request.post<ReservationBatchResponse, CreateReservationBatchRequest>(
    '/reservation-batches',
    data,
  )
}

/**
 * 查询预约批次详情。
 * 对应 `GET /api/reservation-batches/{id}`，用于批量预约结果页按批次回显统计信息。
 */
export function getReservationBatchDetail(batchId: string) {
  return request.get<ReservationBatchResponse>(`/reservation-batches/${batchId}`)
}
