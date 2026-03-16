import type { PageParams } from '@/types/api'

/**
 * 审批模式。
 * 当前以后端真实值为准：`DEVICE_ONLY | DEVICE_THEN_SYSTEM`；
 * 同时兼容旧差异表中曾出现过的 `DEVICE_AND_SYSTEM`，避免联调环境口径尚未统一时直接触发类型报错。
 */
export type ApprovalMode = 'DEVICE_ONLY' | 'DEVICE_THEN_SYSTEM' | 'DEVICE_AND_SYSTEM'

/**
 * 预约模式。
 * 当前以后端真实值为准：`SELF | ON_BEHALF`；
 * 同时兼容历史差异记录中的 `PROXY`，避免详情页和列表页在联调环境回包未统一时退化为裸状态码。
 */
export type ReservationMode = 'SELF' | 'ON_BEHALF' | 'PROXY'

/**
 * 签到状态。
 * 当前以后端真实值为准，同时兼容旧差异表中的 `NOT_SIGNED / SIGNED_IN / TIMEOUT`，
 * 避免前后端在联调切换期因为别名问题让签到按钮与标签展示失真。
 */
export type CheckInStatus =
  | 'NOT_CHECKED_IN'
  | 'CHECKED_IN'
  | 'CHECKED_IN_TIMEOUT'
  | 'NOT_SIGNED'
  | 'SIGNED_IN'
  | 'TIMEOUT'

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
 * 预约响应。
 * 对应后端 `ReservationResponse`，保留审批快照与签到状态字段供详情/列表统一消费。
 */
export interface ReservationResponse {
  id: string
  batchId: string | null
  userId: string
  createdBy: string
  reservationMode: ReservationMode
  deviceId: string
  status: string
  signStatus: CheckInStatus
  approvalModeSnapshot: ApprovalMode
  deviceApproverId: string | null
  systemApproverId: string | null
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
 * 预约分页响应。
 * 对应后端 `ReservationPageResponse`，请求层已经解包统一响应壳，这里只保留分页体本身。
 */
export interface ReservationPageResponse {
  total: number
  records: ReservationListItemResponse[]
}
