import request from '@/api/request'

import type {
  BorrowStatisticsResponse,
  CategoryUtilizationResponse,
  DeviceRankingResponse,
  DeviceUtilizationResponse,
  OverdueStatisticsResponse,
  StatisticsDateQuery,
  StatisticsOverviewResponse,
  TimeSlotStatisticsResponse,
  UserRankingResponse,
} from './types'

export type {
  BorrowStatisticsResponse,
  CategoryUtilizationResponse,
  DeviceRankingResponse,
  DeviceUtilizationResponse,
  OverdueStatisticsResponse,
  StatisticsDateQuery,
  StatisticsOverviewResponse,
  TimeSlotStatisticsResponse,
  UserRankingResponse,
} from './types'

function buildDateParams(params?: StatisticsDateQuery) {
  return { params }
}

/**
 * 查询统计总览。
 * 对应 `GET /api/statistics/overview`，只有系统管理员可访问，且仅支持可选 `date` 参数。
 */
export function getStatisticsOverview(params?: StatisticsDateQuery) {
  return request.get<StatisticsOverviewResponse>('/statistics/overview', buildDateParams(params))
}

/**
 * 查询设备利用率。
 * 对应 `GET /api/statistics/device-utilization`，不追加额外筛选条件，避免偏离后端真实契约。
 */
export function getDeviceUtilization(params?: StatisticsDateQuery) {
  return request.get<DeviceUtilizationResponse[]>(
    '/statistics/device-utilization',
    buildDateParams(params),
  )
}

/**
 * 查询分类利用率。
 * 对应 `GET /api/statistics/category-utilization`，同样只接受可选 `date`。
 */
export function getCategoryUtilization(params?: StatisticsDateQuery) {
  return request.get<CategoryUtilizationResponse[]>(
    '/statistics/category-utilization',
    buildDateParams(params),
  )
}

/**
 * 查询借用统计。
 * 对应 `GET /api/statistics/borrow`，用于借出/归还统计卡片或图表。
 */
export function getBorrowStatistics(params?: StatisticsDateQuery) {
  return request.get<BorrowStatisticsResponse>('/statistics/borrow', buildDateParams(params))
}

/**
 * 查询逾期统计。
 * 对应 `GET /api/statistics/overdue`，只返回逾期聚合信息。
 */
export function getOverdueStatistics(params?: StatisticsDateQuery) {
  return request.get<OverdueStatisticsResponse>('/statistics/overdue', buildDateParams(params))
}

/**
 * 查询热门时段。
 * 对应 `GET /api/statistics/hot-time-slots`，保留后端定义的连字符路径。
 */
export function getHotTimeSlots(params?: StatisticsDateQuery) {
  return request.get<TimeSlotStatisticsResponse[]>(
    '/statistics/hot-time-slots',
    buildDateParams(params),
  )
}

/**
 * 查询设备排行榜。
 * 对应 `GET /api/statistics/device-ranking`，用于热门设备排行展示。
 */
export function getDeviceRanking(params?: StatisticsDateQuery) {
  return request.get<DeviceRankingResponse[]>('/statistics/device-ranking', buildDateParams(params))
}

/**
 * 查询用户排行榜。
 * 对应 `GET /api/statistics/user-ranking`，用于活跃借用用户排行展示。
 */
export function getUserRanking(params?: StatisticsDateQuery) {
  return request.get<UserRankingResponse[]>('/statistics/user-ranking', buildDateParams(params))
}
