import { defineStore } from 'pinia'

import * as statisticsApi from '@/api/statistics'

interface StatisticsState {
  query: statisticsApi.StatisticsDateQuery
  overview: statisticsApi.StatisticsOverviewResponse | null
  deviceUtilization: statisticsApi.DeviceUtilizationResponse[]
  categoryUtilization: statisticsApi.CategoryUtilizationResponse[]
  borrowStatistics: statisticsApi.BorrowStatisticsResponse | null
  overdueStatistics: statisticsApi.OverdueStatisticsResponse | null
  hotTimeSlots: statisticsApi.TimeSlotStatisticsResponse[]
  deviceRanking: statisticsApi.DeviceRankingResponse[]
  userRanking: statisticsApi.UserRankingResponse[]
  requestToken: number
  loading: boolean
}

function createDefaultState(): StatisticsState {
  return {
    query: {},
    overview: null,
    deviceUtilization: [],
    categoryUtilization: [],
    borrowStatistics: null,
    overdueStatistics: null,
    hotTimeSlots: [],
    deviceRanking: [],
    userRanking: [],
    requestToken: 0,
    loading: false,
  }
}

/**
 * 统计域状态。
 * 系统管理员统计页需要同时消费 8 个真实接口，这里集中维护共享日期查询与各图表数据，避免页面并行请求时参数口径不一致。
 */
export const useStatisticsStore = defineStore('statistics', {
  state: (): StatisticsState => createDefaultState(),

  actions: {
    /**
     * 统计接口当前都只接受可选 `date` 参数，因此统一使用同一份查询条件发起批量加载。
     */
    async fetchAll(query: statisticsApi.StatisticsDateQuery = {}) {
      const requestToken = this.requestToken + 1
      this.requestToken = requestToken
      this.loading = true
      this.query = { ...query }

      try {
        const [
          overview,
          deviceUtilization,
          categoryUtilization,
          borrowStatistics,
          overdueStatistics,
          hotTimeSlots,
          deviceRanking,
          userRanking,
        ] = await Promise.all([
          statisticsApi.getStatisticsOverview(query),
          statisticsApi.getDeviceUtilization(query),
          statisticsApi.getCategoryUtilization(query),
          statisticsApi.getBorrowStatistics(query),
          statisticsApi.getOverdueStatistics(query),
          statisticsApi.getHotTimeSlots(query),
          statisticsApi.getDeviceRanking(query),
          statisticsApi.getUserRanking(query),
        ])

        /**
         * 日期切换时可能出现前一次请求慢于后一次返回的情况。
         * 只有当前最新请求才允许回写 Store，避免页面选中的日期与图表数据口径错位。
         */
        if (requestToken === this.requestToken) {
          this.overview = overview
          this.deviceUtilization = deviceUtilization
          this.categoryUtilization = categoryUtilization
          this.borrowStatistics = borrowStatistics
          this.overdueStatistics = overdueStatistics
          this.hotTimeSlots = hotTimeSlots
          this.deviceRanking = deviceRanking
          this.userRanking = userRanking
        }

        return {
          overview,
          deviceUtilization,
          categoryUtilization,
          borrowStatistics,
          overdueStatistics,
          hotTimeSlots,
          deviceRanking,
          userRanking,
        }
      } finally {
        if (requestToken === this.requestToken) {
          this.loading = false
        }
      }
    },

    /**
     * 切换统计日期或退出管理页时恢复空状态，避免旧图表数据短暂污染新日期查询结果。
     */
    resetState() {
      Object.assign(this, createDefaultState())
    },
  },
})
