/**
 * 预约状态枚举。
 * 前端展示必须明确区分一审、二审与人工处理，不能用模糊的 PENDING 统称。
 */
export enum ReservationStatus {
  PENDING_DEVICE_APPROVAL = 'PENDING_DEVICE_APPROVAL',
  PENDING_SYSTEM_APPROVAL = 'PENDING_SYSTEM_APPROVAL',
  PENDING_MANUAL = 'PENDING_MANUAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export const ReservationStatusLabel: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING_DEVICE_APPROVAL]: '待设备审批',
  [ReservationStatus.PENDING_SYSTEM_APPROVAL]: '待系统审批',
  [ReservationStatus.PENDING_MANUAL]: '待人工处理',
  [ReservationStatus.APPROVED]: '已批准',
  [ReservationStatus.REJECTED]: '已拒绝',
  [ReservationStatus.CANCELLED]: '已取消',
  [ReservationStatus.EXPIRED]: '已过期',
}

export const ReservationStatusTagType: Record<ReservationStatus, StatusTagType> = {
  [ReservationStatus.PENDING_DEVICE_APPROVAL]: 'warning',
  [ReservationStatus.PENDING_SYSTEM_APPROVAL]: 'warning',
  [ReservationStatus.PENDING_MANUAL]: 'danger',
  [ReservationStatus.APPROVED]: 'success',
  [ReservationStatus.REJECTED]: 'danger',
  [ReservationStatus.CANCELLED]: 'info',
  [ReservationStatus.EXPIRED]: 'info',
}
