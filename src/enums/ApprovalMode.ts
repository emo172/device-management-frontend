/**
 * 审批模式决定预约会停留在哪个待审阶段。
 * 当前依据 ReservationValidator / ReservationServiceImpl 与 01_schema.sql，
 * 后端真实口径仍是 DEVICE_ONLY / DEVICE_THEN_SYSTEM。
 */
export enum ApprovalMode {
  DEVICE_ONLY = 'DEVICE_ONLY',
  DEVICE_THEN_SYSTEM = 'DEVICE_THEN_SYSTEM',
}

export const ApprovalModeLabel: Record<ApprovalMode, string> = {
  [ApprovalMode.DEVICE_ONLY]: '仅设备审批',
  [ApprovalMode.DEVICE_THEN_SYSTEM]: '设备后系统审批',
}

export const ApprovalModeTagType: Record<ApprovalMode, StatusTagType> = {
  [ApprovalMode.DEVICE_ONLY]: 'success',
  [ApprovalMode.DEVICE_THEN_SYSTEM]: 'warning',
}
