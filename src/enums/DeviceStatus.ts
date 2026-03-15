/**
 * 设备状态枚举。
 * 这里以后端代码与 01_schema.sql 现状为准，当前正式口径不包含 RETIRED。
 */
export enum DeviceStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  MAINTENANCE = 'MAINTENANCE',
  DISABLED = 'DISABLED',
  DELETED = 'DELETED',
}

export const DeviceStatusLabel: Record<DeviceStatus, string> = {
  [DeviceStatus.AVAILABLE]: '可用',
  [DeviceStatus.BORROWED]: '已借出',
  [DeviceStatus.MAINTENANCE]: '维修中',
  [DeviceStatus.DISABLED]: '已停用',
  [DeviceStatus.DELETED]: '已删除',
}

export const DeviceStatusTagType: Record<DeviceStatus, StatusTagType> = {
  [DeviceStatus.AVAILABLE]: 'success',
  [DeviceStatus.BORROWED]: 'warning',
  [DeviceStatus.MAINTENANCE]: 'info',
  [DeviceStatus.DISABLED]: 'danger',
  [DeviceStatus.DELETED]: 'info',
}
