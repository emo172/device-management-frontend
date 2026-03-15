/**
 * 逾期处理状态枚举。
 * 对应 overdue_record.processing_status，用于区分待处理与已处理记录。
 */
export enum OverdueProcessingStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
}

export const OverdueProcessingStatusLabel: Record<OverdueProcessingStatus, string> = {
  [OverdueProcessingStatus.PENDING]: '待处理',
  [OverdueProcessingStatus.PROCESSED]: '已处理',
}

export const OverdueProcessingStatusTagType: Record<OverdueProcessingStatus, StatusTagType> = {
  [OverdueProcessingStatus.PENDING]: 'warning',
  [OverdueProcessingStatus.PROCESSED]: 'success',
}
