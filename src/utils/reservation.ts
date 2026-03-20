import { ApprovalMode, CheckInStatus, ReservationMode, ReservationStatus } from '@/enums'

import { toLocalDateTime } from './date'

/**
 * 预约动作判断所需的最小快照。
 * 列表卡片和工具函数只依赖状态、签到状态与时间窗口，不强行耦合完整详情 DTO。
 */
type ReservationActionTarget = {
  status: string
  signStatus: string
  startTime: string
  endTime: string
}

/**
 * 签到阶段判断所需快照。
 * 在动作快照基础上额外补 `checkedInAt`，用于区分“已完成签到”和“仅状态码变化”。
 */
type ReservationCheckInTarget = ReservationActionTarget & {
  checkedInAt: string | null
}

/**
 * 预约时间线所需的真实落库字段。
 * 时间线组件只消费后端已经持久化的审批、签到、取消节点，避免前端自己推导伪历史。
 */
type ReservationTimelineSource = {
  status: string
  createdAt: string | null
  deviceApprovedAt: string | null
  deviceApprovalRemark: string | null
  systemApprovedAt: string | null
  systemApprovalRemark: string | null
  checkedInAt: string | null
  cancelTime: string | null
  cancelReason: string | null
}

export interface ReservationTimelineItem {
  key: string
  title: string
  time: string
  remark: string | null
}

export type ReservationCheckInStage = 'normal' | 'late' | 'expired' | 'completed' | 'unavailable'

interface ReservationTimeRange {
  startTime: string
  endTime: string
}

/**
 * 预约工作流标准化快照。
 * API 层只需要这 3 个最容易出现旧别名漂移的字段，就能把前端主口径统一收拢。
 */
type ReservationWorkflowSnapshot = {
  reservationMode?: string
  signStatus?: string
  approvalModeSnapshot?: string
}

const ONE_MINUTE = 60 * 1000
const ONE_HOUR = 60 * ONE_MINUTE
const TWENTY_FOUR_HOURS = 24 * ONE_HOUR
/**
 * 后端当前认定的“用户仍可进入取消判断”的活动预约状态集合。
 * 真正能否取消，还要继续叠加签到状态与开始前 24 小时窗口规则。
 */
const USER_CANCELABLE_RESERVATION_STATUSES = new Set([
  ReservationStatus.PENDING_DEVICE_APPROVAL,
  ReservationStatus.PENDING_SYSTEM_APPROVAL,
  ReservationStatus.PENDING_MANUAL,
  ReservationStatus.APPROVED,
])
const CHECK_IN_PENDING_STATUSES = new Set([CheckInStatus.NOT_CHECKED_IN, 'NOT_SIGNED'])
const CHECK_IN_COMPLETED_STATUSES = new Set([
  CheckInStatus.CHECKED_IN,
  CheckInStatus.CHECKED_IN_TIMEOUT,
  'SIGNED_IN',
  'TIMEOUT',
])

function toDate(dateValue: string): Date {
  return new Date(dateValue)
}

/**
 * 把旧审批模式别名统一收敛到当前主口径，避免页面和 Store 同时维护多套枚举分支。
 */
export function normalizeApprovalMode(mode: string): string {
  if (mode === 'DEVICE_AND_SYSTEM') {
    return ApprovalMode.DEVICE_THEN_SYSTEM
  }

  return mode
}

/**
 * 把历史代预约别名收敛为 `ON_BEHALF`。
 * 这样页面展示和类型推导都能围绕当前真实业务口径工作。
 */
export function normalizeReservationMode(mode: string): string {
  if (mode === 'PROXY') {
    return ReservationMode.ON_BEHALF
  }

  return mode
}

/**
 * 把旧签到状态别名统一映射为标准值，避免旧联调回包把签到按钮与标签判断打散。
 */
export function normalizeCheckInStatus(status: string): string {
  if (status === 'NOT_SIGNED') {
    return CheckInStatus.NOT_CHECKED_IN
  }

  if (status === 'SIGNED_IN') {
    return CheckInStatus.CHECKED_IN
  }

  if (status === 'TIMEOUT') {
    return CheckInStatus.CHECKED_IN_TIMEOUT
  }

  return status
}

/**
 * 统一把前端要发给后端的时间值收敛成秒级 ISO 本地时间。
 * 时间选择器理论上已经输出 `yyyy-MM-ddTHH:mm:ss`，但这里仍做兜底，确保 API 层不会把毫秒或旧格式带入后端。
 */
export function normalizeReservationDateTime(dateValue: string): string {
  const normalizedText = dateValue.trim().replace(' ', 'T')

  if (!normalizedText) {
    return ''
  }

  const exactMatch = normalizedText.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/)

  if (exactMatch) {
    const matchedText = exactMatch[1]

    if (matchedText) {
      return matchedText
    }
  }

  const parsedDate = new Date(normalizedText)

  if (!Number.isNaN(parsedDate.getTime())) {
    return toLocalDateTime(parsedDate)
  }

  return normalizedText
}

/**
 * 统一标准化预约工作流快照字段。
 * API 层把它作为主入口统一收口旧别名；组件只在必要时保留兜底兼容，
 * 避免 Store、页面和组件重复做同一轮标准化后再引入新的口径漂移。
 */
export function normalizeReservationWorkflowRecord<T extends ReservationWorkflowSnapshot>(
  reservation: T,
): T {
  return {
    ...reservation,
    reservationMode: reservation.reservationMode
      ? normalizeReservationMode(reservation.reservationMode)
      : reservation.reservationMode,
    signStatus: reservation.signStatus
      ? normalizeCheckInStatus(reservation.signStatus)
      : reservation.signStatus,
    approvalModeSnapshot: reservation.approvalModeSnapshot
      ? normalizeApprovalMode(reservation.approvalModeSnapshot)
      : reservation.approvalModeSnapshot,
  }
}

/**
 * 批量标准化预约记录集合，供列表接口和本地分页结果复用。
 */
export function normalizeReservationWorkflowRecords<T extends ReservationWorkflowSnapshot>(
  reservations: T[],
): T[] {
  return reservations.map((reservation) => normalizeReservationWorkflowRecord(reservation))
}

/**
 * 创建预约、代预约和批量预约都依赖相同的开始/结束时间契约。
 */
export function normalizeReservationTimeRangePayload<
  T extends {
    startTime: string
    endTime: string
  },
>(payload: T): T {
  return {
    ...payload,
    startTime: normalizeReservationDateTime(payload.startTime),
    endTime: normalizeReservationDateTime(payload.endTime),
  }
}

/**
 * 签到接口允许显式传入签到时间，工具层统一兜底其时间精度与格式。
 */
export function normalizeCheckInPayload<
  T extends {
    checkInTime: string | null
  },
>(payload: T): T {
  return {
    ...payload,
    checkInTime: payload.checkInTime ? normalizeReservationDateTime(payload.checkInTime) : null,
  }
}

function getMinutesInDay(dateValue: string) {
  const date = toDate(dateValue)
  return date.getHours() * 60 + date.getMinutes()
}

/**
 * 创建预约时的本地时间规则校验。
 * 方案 1 没有独立冲突检测接口，因此创建页至少要先把时间窗口、时长和开始/结束先后顺序挡在前端，
 * 避免用户每次都把明显非法的时间段直接提交给后端。
 */
export function validateReservationTimeRange(range: ReservationTimeRange) {
  const warnings: string[] = []

  if (!range.startTime || !range.endTime) {
    warnings.push('请选择完整的预约时间范围')
    return warnings
  }

  const startTime = toDate(range.startTime)
  const endTime = toDate(range.endTime)

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    warnings.push('预约时间格式无效，请重新选择')
    return warnings
  }

  if (endTime.getTime() <= startTime.getTime()) {
    warnings.push('结束时间必须晚于开始时间')
  }

  const startMinutes = getMinutesInDay(range.startTime)
  const endMinutes = getMinutesInDay(range.endTime)

  if (startMinutes < 8 * 60 || endMinutes > 22 * 60) {
    warnings.push('预约时间必须在 08:00-22:00 之间')
  }

  const duration = endTime.getTime() - startTime.getTime()
  if (duration < 30 * 60 * 1000) {
    warnings.push('预约时长不能少于 30 分钟')
  }

  if (duration > 7 * 24 * 60 * 60 * 1000) {
    warnings.push('预约时长不能超过 7 天')
  }

  return warnings
}

/**
 * 预约取消按钮可见性。
 * 用户只能在开始前超过 24 小时时自助取消；24 小时内需要联系管理员处理，开始后不再开放取消入口。
 */
export function canCancelReservation(
  reservation: ReservationActionTarget,
  now: Date = new Date(),
): boolean {
  /**
   * 后端当前把“仍处于活动执行链路中的预约”都视为可取消态：
   * 待设备审批、待系统审批、待人工处理和已批准预约，在开始前超过 24 小时时都允许用户发起自助取消。
   */
  if (!USER_CANCELABLE_RESERVATION_STATUSES.has(reservation.status as ReservationStatus)) {
    return false
  }

  /**
   * 后端取消链路要求“尚未完成签到”。
   * 一旦签到已经落库，哪怕预约还没开始，也必须隐藏取消入口，避免前端放出后端会拒绝的无效动作。
   */
  if (!CHECK_IN_PENDING_STATUSES.has(reservation.signStatus)) {
    return false
  }

  return toDate(reservation.startTime).getTime() - now.getTime() > TWENTY_FOUR_HOURS
}

/**
 * 取消窗口提示。
 * 只有在“还没开始但已进入 24 小时内”时才提示联系管理员，避免用户对已开始或已关闭的预约产生错误预期。
 */
export function shouldShowCancelWindowHint(
  reservation: ReservationActionTarget,
  now: Date = new Date(),
): boolean {
  /**
   * 与取消按钮共用同一组活动预约状态，避免列表页和卡片页对“待审批也能进入管理员处理取消窗口”产生分叉判断。
   */
  if (!USER_CANCELABLE_RESERVATION_STATUSES.has(reservation.status as ReservationStatus)) {
    return false
  }

  /**
   * 已签到预约已经进入借还主链，不应再提示“联系管理员取消”，否则会把用户导向不存在的处理路径。
   */
  if (!CHECK_IN_PENDING_STATUSES.has(reservation.signStatus)) {
    return false
  }

  const startTime = toDate(reservation.startTime).getTime()
  const diff = startTime - now.getTime()

  return diff > 0 && diff <= TWENTY_FOUR_HOURS
}

/**
 * 签到按钮可见性。
 * 只有已批准且尚未签到的预约，才允许在开始前 30 分钟到开始后 60 分钟之间展示签到动作。
 */
export function canCheckInReservation(
  reservation: ReservationActionTarget,
  now: Date = new Date(),
): boolean {
  if (reservation.status !== ReservationStatus.APPROVED) {
    return false
  }

  /**
   * 后端真实代码当前返回 `NOT_CHECKED_IN`，但这里保留对旧差异表别名 `NOT_SIGNED` 的兼容，
   * 避免联调环境枚举尚未统一时把本应可签到的预约错误隐藏掉。
   */
  if (!CHECK_IN_PENDING_STATUSES.has(reservation.signStatus)) {
    return false
  }

  const startTime = toDate(reservation.startTime).getTime()
  const diff = now.getTime() - startTime

  return diff >= -30 * ONE_MINUTE && diff <= ONE_HOUR
}

/**
 * 预约时间线生成。
 * 详情页必须基于后端已落库的真实时间字段展示关键节点，避免前端根据当前状态“猜测”审批历史。
 */
export function buildReservationTimelineItems(
  reservation: ReservationTimelineSource,
): ReservationTimelineItem[] {
  const items: ReservationTimelineItem[] = []

  if (reservation.createdAt) {
    items.push({
      key: 'created',
      title: '提交预约',
      time: reservation.createdAt,
      remark: null,
    })
  }

  if (reservation.deviceApprovedAt) {
    /**
     * 设备侧时间字段同时承载“设备审批通过”和“设备审批拒绝”的真实发生时间；
     * 当预约最终停在 REJECTED 且不存在系统审批时间时，说明链路在设备侧被驳回。
     */
    items.push({
      key: 'device-approved',
      title:
        reservation.status === ReservationStatus.REJECTED && !reservation.systemApprovedAt
          ? '设备审批拒绝'
          : '设备审批通过',
      time: reservation.deviceApprovedAt,
      remark: reservation.deviceApprovalRemark,
    })
  }

  if (reservation.systemApprovedAt) {
    /**
     * 一旦存在系统审批时间，说明预约已进入第二审；
     * 此时若最终状态是 REJECTED，应明确告诉前端这是“系统审批拒绝”，而不是继续沿用通过文案误导用户。
     */
    items.push({
      key: 'system-approved',
      title:
        reservation.status === ReservationStatus.REJECTED ? '系统审批拒绝' : '系统审批通过',
      time: reservation.systemApprovedAt,
      remark: reservation.systemApprovalRemark,
    })
  }

  if (reservation.checkedInAt) {
    items.push({
      key: 'checked-in',
      title: '完成签到',
      time: reservation.checkedInAt,
      remark: null,
    })
  }

  if (reservation.cancelTime) {
    items.push({
      key: 'cancelled',
      title: '取消预约',
      time: reservation.cancelTime,
      remark: reservation.cancelReason,
    })
  }

  return items
}

/**
 * 签到阶段判定。
 * 签到页需要把“正常签到 / 超时签到 / 已过期”直接映射为明确反馈文案，避免用户只看到按钮消失却不知道原因。
 */
export function getReservationCheckInStage(
  reservation: ReservationCheckInTarget,
  now: Date = new Date(),
): ReservationCheckInStage {
  if (reservation.checkedInAt || CHECK_IN_COMPLETED_STATUSES.has(reservation.signStatus)) {
    return 'completed'
  }

  if (!canCheckInReservation(reservation, now)) {
    const startTime = toDate(reservation.startTime).getTime()
    const diff = now.getTime() - startTime

    return diff > ONE_HOUR ? 'expired' : 'unavailable'
  }

  const startTime = toDate(reservation.startTime).getTime()
  const diff = now.getTime() - startTime

  if (diff <= 30 * ONE_MINUTE) {
    return 'normal'
  }

  return 'late'
}
