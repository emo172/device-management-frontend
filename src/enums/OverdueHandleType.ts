/**
 * 逾期处理方式枚举。
 * 与 processing_method 一一对应，用于说明管理员最终采取的处理动作。
 */
export enum OverdueHandleType {
  WARNING = 'WARNING',
  COMPENSATION = 'COMPENSATION',
  CONTINUE = 'CONTINUE',
}

export const OverdueHandleTypeLabel: Record<OverdueHandleType, string> = {
  [OverdueHandleType.WARNING]: '警告',
  [OverdueHandleType.COMPENSATION]: '赔偿',
  [OverdueHandleType.CONTINUE]: '继续使用',
}

export const OverdueHandleTypeTagType: Record<OverdueHandleType, StatusTagType> = {
  [OverdueHandleType.WARNING]: 'warning',
  [OverdueHandleType.COMPENSATION]: 'danger',
  [OverdueHandleType.CONTINUE]: 'info',
}
