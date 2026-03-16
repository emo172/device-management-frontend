import { defineStore } from 'pinia'

import * as reservationApi from '@/api/reservations'

interface ReservationState {
  list: reservationApi.ReservationListItemResponse[]
  total: number
  query: reservationApi.ReservationListQuery
  currentReservation: reservationApi.ReservationResponse | null
  currentBatch: reservationApi.ReservationBatchResponse | null
  loading: boolean
}

function createDefaultQuery(): reservationApi.ReservationListQuery {
  return {
    page: 1,
    size: 10,
  }
}

function createDefaultState(): ReservationState {
  return {
    list: [],
    total: 0,
    query: createDefaultQuery(),
    currentReservation: null,
    currentBatch: null,
    loading: false,
  }
}

/**
 * 预约域状态。
 * 当前既要承接创建/审批闭环，也要为仪表盘和预约列表提供最小分页读取能力，
 * 因此把分页参数、列表结果与最近一次写操作结果统一收口到同一个 Store。
 */
export const useReservationStore = defineStore('reservation', {
  state: (): ReservationState => createDefaultState(),

  actions: {
    /**
     * 预约列表接口当前只支持 `page` 与 `size`。
     * 仪表盘与列表页都依赖这份最小读取能力，因此在 Store 里保留查询参数和分页结果，避免各页面自行维护口径。
     */
    async fetchReservationList(query: reservationApi.ReservationListQuery = createDefaultQuery()) {
      this.loading = true
      this.query = { ...query }

      try {
        const result = await reservationApi.getReservationList(query)
        this.list = result.records
        this.total = result.total
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 本人预约成功后保留最新结果，供创建成功页、详情抽屉和后续借出流程继续衔接。
     */
    async createReservation(payload: reservationApi.CreateReservationRequest) {
      const reservation = await reservationApi.createReservation(payload)
      this.currentReservation = reservation
      return reservation
    },

    /**
     * 代预约只能复用后端专用接口，避免把目标用户 ID 误塞进本人预约请求体。
     */
    async createProxyReservation(payload: reservationApi.ProxyReservationRequest) {
      const reservation = await reservationApi.createProxyReservation(payload)
      this.currentReservation = reservation
      return reservation
    },

    /**
     * 一审动作由设备管理员触发，Store 只承接结果，不在前端重复推导状态流转。
     */
    async deviceAuditReservation(
      reservationId: string,
      payload: reservationApi.AuditReservationRequest,
    ) {
      const reservation = await reservationApi.deviceAuditReservation(reservationId, payload)
      this.currentReservation = reservation
      return reservation
    },

    /**
     * 二审动作单独保留，避免页面误把系统审批调用到设备审批接口。
     */
    async systemAuditReservation(
      reservationId: string,
      payload: reservationApi.AuditReservationRequest,
    ) {
      const reservation = await reservationApi.systemAuditReservation(reservationId, payload)
      this.currentReservation = reservation
      return reservation
    },

    /**
     * 签到结果直接覆盖当前预约，供页面根据后端真实签到状态展示“正常签到 / 超时签到”等文案。
     */
    async checkInReservation(reservationId: string, payload: reservationApi.CheckInRequest) {
      const reservation = await reservationApi.checkInReservation(reservationId, payload)
      this.currentReservation = reservation
      return reservation
    },

    /**
     * 人工处理只在进入待人工处理状态后使用，Store 通过当前预约结果向页面透传最终裁决。
     */
    async manualProcessReservation(
      reservationId: string,
      payload: reservationApi.ManualProcessRequest,
    ) {
      const reservation = await reservationApi.manualProcessReservation(reservationId, payload)
      this.currentReservation = reservation
      return reservation
    },

    /**
     * 批量预约返回的批次汇总需要独立缓存，便于后续结果页展示成功数与失败数。
     */
    async createReservationBatch(payload: reservationApi.CreateReservationBatchRequest) {
      const batch = await reservationApi.createReservationBatch(payload)
      this.currentBatch = batch
      return batch
    },

    /**
     * 批次详情读取当前是唯一的“详情查询”能力，因此单独维护当前批次结果。
     */
    async fetchReservationBatchDetail(batchId: string) {
      const batch = await reservationApi.getReservationBatchDetail(batchId)
      this.currentBatch = batch
      return batch
    },

    /**
     * 切换预约上下文时清空最近结果，避免创建页与审核页之间互相污染展示。
     */
    resetReservationResult() {
      this.list = []
      this.total = 0
      this.query = createDefaultQuery()
      this.currentReservation = null
      this.currentBatch = null
    },
  },
})
