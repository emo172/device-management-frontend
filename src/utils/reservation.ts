import { CheckInStatus, ReservationStatus } from '@/enums'

type ReservationActionTarget = {
  status: string
  signStatus: string
  startTime: string
  endTime: string
}

type ReservationCheckInTarget = ReservationActionTarget & {
  checkedInAt: string | null
}

type ReservationTimelineSource = {
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

const ONE_MINUTE = 60 * 1000
const ONE_HOUR = 60 * ONE_MINUTE
const TWENTY_FOUR_HOURS = 24 * ONE_HOUR
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
  if (reservation.status !== ReservationStatus.APPROVED) {
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
  if (reservation.status !== ReservationStatus.APPROVED) {
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
    items.push({
      key: 'device-approved',
      title: '设备审批通过',
      time: reservation.deviceApprovedAt,
      remark: reservation.deviceApprovalRemark,
    })
  }

  if (reservation.systemApprovedAt) {
    items.push({
      key: 'system-approved',
      title: '系统审批通过',
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
