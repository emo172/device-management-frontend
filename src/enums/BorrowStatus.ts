/**
 * 借还状态枚举。
 * 该状态集属于借还域，展示文案不能与设备状态中的 BORROWED 混用。
 */
export enum BorrowStatus {
  BORROWED = 'BORROWED',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}

export const BorrowStatusLabel: Record<BorrowStatus, string> = {
  [BorrowStatus.BORROWED]: '借用中',
  [BorrowStatus.RETURNED]: '已归还',
  [BorrowStatus.OVERDUE]: '已逾期',
}

export const BorrowStatusTagType: Record<BorrowStatus, StatusTagType> = {
  [BorrowStatus.BORROWED]: 'warning',
  [BorrowStatus.RETURNED]: 'success',
  [BorrowStatus.OVERDUE]: 'danger',
}
