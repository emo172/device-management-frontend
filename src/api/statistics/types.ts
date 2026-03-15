/**
 * 统计接口公共查询参数。
 * 后端 8 个统计接口都只接受单个可选 `date` 参数，前端不得附带额外筛选字段以免触发 400。
 */
export interface StatisticsDateQuery {
  date?: string
}

/**
 * 统计总览响应 DTO。
 * 对应后端 `StatisticsOverviewResponse`，用于管理端首页统计卡片。
 */
export interface StatisticsOverviewResponse {
  statDate: string
  totalReservations: number
  approvedReservations: number
  rejectedReservations: number
  cancelledReservations: number
  expiredReservations: number
  totalBorrows: number
  totalReturns: number
  totalOverdue: number
  totalOverdueHours: number
  utilizationRate: number
}

/**
 * 设备利用率响应 DTO。
 * 对应后端 `DeviceUtilizationResponse`，用于设备维度图表。
 */
export interface DeviceUtilizationResponse {
  deviceId: string
  deviceName: string
  categoryId: string
  categoryName: string
  totalReservations: number
  totalBorrows: number
  totalReturns: number
  totalOverdue: number
  utilizationRate: number
}

/**
 * 分类利用率响应 DTO。
 * 对应后端 `CategoryUtilizationResponse`，用于分类维度图表。
 */
export interface CategoryUtilizationResponse {
  categoryId: string
  categoryName: string
  totalReservations: number
  totalBorrows: number
  totalReturns: number
  totalOverdue: number
  utilizationRate: number
}

/**
 * 借用统计响应 DTO。
 * 对应后端 `BorrowStatisticsResponse`，用于借出与归还趋势概览。
 */
export interface BorrowStatisticsResponse {
  statDate: string
  totalBorrows: number
  totalReturns: number
}

/**
 * 逾期统计响应 DTO。
 * 对应后端 `OverdueStatisticsResponse`，用于逾期总量与总时长卡片。
 */
export interface OverdueStatisticsResponse {
  statDate: string
  totalOverdue: number
  totalOverdueHours: number
}

/**
 * 热门时段统计响应 DTO。
 * 对应后端 `TimeSlotStatisticsResponse`，时段固定为字符串而不是数字，便于前端原样展示。
 */
export interface TimeSlotStatisticsResponse {
  timeSlot: string
  totalReservations: number
  approvedReservations: number
}

/**
 * 设备排行榜响应 DTO。
 * 对应后端 `DeviceRankingResponse`，用于热门设备排行。
 */
export interface DeviceRankingResponse {
  deviceId: string
  deviceName: string
  totalBorrows: number
  utilizationRate: number
}

/**
 * 用户排行榜响应 DTO。
 * 对应后端 `UserRankingResponse`，用于高频借用用户排行。
 */
export interface UserRankingResponse {
  userId: string
  username: string
  realName: string
  totalBorrows: number
}
