/**
 * 账户冻结状态枚举。
 * 预约入口是否禁用、需要展示何种风险提示，都依赖这里的正式口径。
 */
export enum FreezeStatus {
  NORMAL = 'NORMAL',
  RESTRICTED = 'RESTRICTED',
  FROZEN = 'FROZEN',
}

export const FreezeStatusLabel: Record<FreezeStatus, string> = {
  [FreezeStatus.NORMAL]: '正常',
  [FreezeStatus.RESTRICTED]: '受限',
  [FreezeStatus.FROZEN]: '冻结',
}

export const FreezeStatusTagType: Record<FreezeStatus, StatusTagType> = {
  [FreezeStatus.NORMAL]: 'success',
  [FreezeStatus.RESTRICTED]: 'warning',
  [FreezeStatus.FROZEN]: 'danger',
}
