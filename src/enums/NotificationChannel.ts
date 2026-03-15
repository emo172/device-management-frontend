/**
 * 通知渠道枚举。
 * 当前已读能力只对 IN_APP 生效，但展示层仍需统一维护三种渠道口径。
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export const NotificationChannelLabel: Record<NotificationChannel, string> = {
  [NotificationChannel.IN_APP]: '站内信',
  [NotificationChannel.EMAIL]: '邮件',
  [NotificationChannel.SMS]: '短信',
}

export const NotificationChannelTagType: Record<NotificationChannel, StatusTagType> = {
  [NotificationChannel.IN_APP]: 'primary',
  [NotificationChannel.EMAIL]: 'success',
  [NotificationChannel.SMS]: 'warning',
}
