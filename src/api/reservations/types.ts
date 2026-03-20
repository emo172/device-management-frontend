import type { PageParams } from '@/types/api'

/**
 * 审批模式。
 * 前端主口径统一收敛到后端当前真实值，旧别名只允许在工具层做兼容解析，不继续向页面和 Store 扩散。
 */
export type ApprovalMode = 'DEVICE_ONLY' | 'DEVICE_THEN_SYSTEM'

/**
 * 预约模式。
 * 前端主口径统一使用 `SELF | ON_BEHALF`，旧别名由归一化工具兜底处理。
 */
export type ReservationMode = 'SELF' | 'ON_BEHALF'

/**
 * 签到状态。
 * 前端主口径统一使用标准签到状态，旧别名只在 API/Store/组件适配层内做兼容解析。
 */
export type CheckInStatus = 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_IN_TIMEOUT'

/**
 * 单条预约创建请求。
 * 对应后端 `CreateReservationRequest`，时间字段必须是 ISO 格式字符串。
 */
export interface CreateReservationRequest {
  deviceId: string
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

/**
 * 代预约请求。
 * 对应后端 `ProxyReservationRequest`，仅 SYSTEM_ADMIN 允许携带 `targetUserId` 发起。
 */
export interface ProxyReservationRequest extends CreateReservationRequest {
  targetUserId: string
}

/**
 * 审核请求。
 * 一审与二审共用同一 DTO，由接口路径区分设备审批与系统审批。
 */
export interface AuditReservationRequest {
  approved: boolean
  remark: string
}

/**
 * 签到请求。
 * `checkInTime` 允许显式传入，便于测试签到窗口边界。
 */
export interface CheckInRequest {
  checkInTime: string | null
}

/**
 * 取消预约请求。
 * 对应后端 `CancelReservationRequest`，列表页必须显式填写取消原因，便于管理员后续追溯窗口内取消诉求。
 */
export interface CancelReservationRequest {
  reason: string
}

/**
 * 人工处理请求。
 * 仅在预约进入 `PENDING_MANUAL` 后使用，`approved=false` 表示人工取消。
 */
export interface ManualProcessRequest {
  approved: boolean
  remark: string
}

/**
 * 批量预约中的单条条目。
 * 对应后端 `CreateReservationBatchRequest.BatchReservationItem`。
 */
export interface ReservationBatchItem {
  deviceId: string
  startTime: string
  endTime: string
  purpose: string
  remark: string
}

/**
 * 批量预约创建请求。
 * USER 可不传 `targetUserId`，SYSTEM_ADMIN 代预约时再按后端约定携带目标用户 ID。
 */
export interface CreateReservationBatchRequest {
  targetUserId: string | null
  items: ReservationBatchItem[]
}

/**
 * 批量预约结果。
 * 对应后端 `ReservationBatchResponse`，供页面展示批次成功/失败汇总。
 */
export interface ReservationBatchResponse {
  id: string
  batchNo: string
  createdBy: string
  reservationCount: number
  successCount: number
  failedCount: number
  status: string
}

/**
 * 预约列表查询参数。
 * 对应后端 `ReservationController#list`，真实契约当前只支持 `page` 与 `size` 两个分页字段。
 */
export interface ReservationListQuery extends PageParams {}

/**
 * 预约列表单项响应。
 * 对应后端 `ReservationListItemResponse`；本工作树以终审确认口径为准，
 * 这里直接收敛到真实预约/签到枚举，避免测试样板和页面展示继续漂移。
 */
export interface ReservationListItemResponse {
  id: string
  batchId: string | null
  userId: string
  userName: string
  createdBy: string
  createdByName: string
  reservationMode: ReservationMode
  deviceId: string
  deviceName: string
  deviceNumber: string
  startTime: string
  endTime: string
  purpose: string
  status: string
  signStatus: CheckInStatus
  approvalModeSnapshot: ApprovalMode
  cancelReason: string | null
  cancelTime: string | null
}

/**
 * 预约详情响应。
 * 对应后端 `ReservationDetailResponse`，详情页与签到页都依赖这些扩展字段展示审批流、设备状态与关键时间节点。
 */
export interface ReservationDetailResponse extends ReservationListItemResponse {
  deviceStatus: string
  remark: string | null
  deviceApproverId: string | null
  deviceApproverName: string | null
  deviceApprovedAt: string | null
  deviceApprovalRemark: string | null
  systemApproverId: string | null
  systemApproverName: string | null
  systemApprovedAt: string | null
  systemApprovalRemark: string | null
  checkedInAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

/**
 * 预约动作响应。
 * 对应后端 `ReservationResponse`；当前后端已经把创建、审批、签到动作回包扩展为可直接继续渲染页面的完整上下文，
 * 因此前端类型直接与详情口径对齐，避免 Store 和页面再维护一套更轻的旧结构。
 */
export interface ReservationResponse extends ReservationDetailResponse {}

/**
 * 预约分页响应。
 * 对应后端 `ReservationPageResponse`，请求层已经解包统一响应壳，这里只保留分页体本身。
 */
export interface ReservationPageResponse {
  total: number
  records: ReservationListItemResponse[]
}
