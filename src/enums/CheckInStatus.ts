/**
 * 签到状态枚举。
 * 当前依据 ReservationServiceImpl 与 01_schema.sql，
 * 后端真实口径仍是 NOT_CHECKED_IN / CHECKED_IN / CHECKED_IN_TIMEOUT。
 */
export enum CheckInStatus {
  NOT_CHECKED_IN = 'NOT_CHECKED_IN',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_IN_TIMEOUT = 'CHECKED_IN_TIMEOUT',
}

export const CheckInStatusLabel: Record<CheckInStatus, string> = {
  [CheckInStatus.NOT_CHECKED_IN]: '未签到',
  [CheckInStatus.CHECKED_IN]: '已签到',
  [CheckInStatus.CHECKED_IN_TIMEOUT]: '超时签到',
}

export const CheckInStatusTagType: Record<CheckInStatus, StatusTagType> = {
  [CheckInStatus.NOT_CHECKED_IN]: 'warning',
  [CheckInStatus.CHECKED_IN]: 'success',
  [CheckInStatus.CHECKED_IN_TIMEOUT]: 'danger',
}
