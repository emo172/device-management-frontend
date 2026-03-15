/**
 * 预约模式用于区分本人预约与代人预约。
 * 当前依据 ReservationServiceImpl / ReservationBatchServiceImpl 与 01_schema.sql，
 * 后端真实口径仍是 SELF / ON_BEHALF。
 */
export enum ReservationMode {
  SELF = 'SELF',
  ON_BEHALF = 'ON_BEHALF',
}

export const ReservationModeLabel: Record<ReservationMode, string> = {
  [ReservationMode.SELF]: '本人预约',
  [ReservationMode.ON_BEHALF]: '代人预约',
}

export const ReservationModeTagType: Record<ReservationMode, StatusTagType> = {
  [ReservationMode.SELF]: 'success',
  [ReservationMode.ON_BEHALF]: 'warning',
}
