/**
 * 通知类型枚举。
 * 该枚举直接对齐 notification_record.notification_type 约束，保证通知中心与业务触发口径一致。
 */
export enum NotificationType {
  VERIFY_CODE = 'VERIFY_CODE',
  FIRST_APPROVAL_TODO = 'FIRST_APPROVAL_TODO',
  SECOND_APPROVAL_TODO = 'SECOND_APPROVAL_TODO',
  APPROVAL_PASSED = 'APPROVAL_PASSED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  APPROVAL_EXPIRED = 'APPROVAL_EXPIRED',
  RESERVATION_REMINDER = 'RESERVATION_REMINDER',
  CHECKIN_TIMEOUT_WARNING = 'CHECKIN_TIMEOUT_WARNING',
  BORROW_CONFIRM_WARNING = 'BORROW_CONFIRM_WARNING',
  OVERDUE_WARNING = 'OVERDUE_WARNING',
  REVIEW_TIMEOUT_WARNING = 'REVIEW_TIMEOUT_WARNING',
  RESERVATION_CANCELLED = 'RESERVATION_CANCELLED',
  BATCH_RESERVATION_RESULT = 'BATCH_RESERVATION_RESULT',
  ON_BEHALF_CREATED = 'ON_BEHALF_CREATED',
  PENDING_MANUAL_NOTICE = 'PENDING_MANUAL_NOTICE',
  ACCOUNT_FREEZE_UNFREEZE = 'ACCOUNT_FREEZE_UNFREEZE',
  DEVICE_MAINTENANCE_NOTICE = 'DEVICE_MAINTENANCE_NOTICE',
}

export const NotificationTypeLabel: Record<NotificationType, string> = {
  [NotificationType.VERIFY_CODE]: '验证码通知',
  [NotificationType.FIRST_APPROVAL_TODO]: '待设备审批',
  [NotificationType.SECOND_APPROVAL_TODO]: '待系统审批',
  [NotificationType.APPROVAL_PASSED]: '审批通过',
  [NotificationType.APPROVAL_REJECTED]: '审批拒绝',
  [NotificationType.APPROVAL_EXPIRED]: '审批超时',
  [NotificationType.RESERVATION_REMINDER]: '预约提醒',
  [NotificationType.CHECKIN_TIMEOUT_WARNING]: '签到超时',
  [NotificationType.BORROW_CONFIRM_WARNING]: '借用确认提醒',
  [NotificationType.OVERDUE_WARNING]: '逾期提醒',
  [NotificationType.REVIEW_TIMEOUT_WARNING]: '审核超时提醒',
  [NotificationType.RESERVATION_CANCELLED]: '预约取消',
  [NotificationType.BATCH_RESERVATION_RESULT]: '批量预约结果',
  [NotificationType.ON_BEHALF_CREATED]: '代预约创建',
  [NotificationType.PENDING_MANUAL_NOTICE]: '待人工处理通知',
  [NotificationType.ACCOUNT_FREEZE_UNFREEZE]: '账户冻结变更',
  [NotificationType.DEVICE_MAINTENANCE_NOTICE]: '设备维护通知',
}

export const NotificationTypeTagType: Record<NotificationType, StatusTagType> = {
  [NotificationType.VERIFY_CODE]: 'info',
  [NotificationType.FIRST_APPROVAL_TODO]: 'warning',
  [NotificationType.SECOND_APPROVAL_TODO]: 'warning',
  [NotificationType.APPROVAL_PASSED]: 'success',
  [NotificationType.APPROVAL_REJECTED]: 'danger',
  [NotificationType.APPROVAL_EXPIRED]: 'warning',
  [NotificationType.RESERVATION_REMINDER]: 'info',
  [NotificationType.CHECKIN_TIMEOUT_WARNING]: 'danger',
  [NotificationType.BORROW_CONFIRM_WARNING]: 'warning',
  [NotificationType.OVERDUE_WARNING]: 'danger',
  [NotificationType.REVIEW_TIMEOUT_WARNING]: 'warning',
  [NotificationType.RESERVATION_CANCELLED]: 'info',
  [NotificationType.BATCH_RESERVATION_RESULT]: 'info',
  [NotificationType.ON_BEHALF_CREATED]: 'primary',
  [NotificationType.PENDING_MANUAL_NOTICE]: 'warning',
  [NotificationType.ACCOUNT_FREEZE_UNFREEZE]: 'danger',
  [NotificationType.DEVICE_MAINTENANCE_NOTICE]: 'info',
}
