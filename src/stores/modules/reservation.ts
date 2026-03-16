import { defineStore } from 'pinia'

import * as reservationApi from '@/api/reservations'
import { UserRole } from '@/enums'

let reservationDetailRequestToken = 0
const ADMIN_MANAGED_FETCH_SIZE = 50
const ADMIN_MANAGED_FETCH_MAX_PAGES = 20
const RESERVATION_HISTORY_STATUSES = ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const
const RESERVATION_PENDING_STATUS_BY_ROLE: Record<
  UserRole.DEVICE_ADMIN | UserRole.SYSTEM_ADMIN,
  string[]
> = {
  [UserRole.DEVICE_ADMIN]: ['PENDING_DEVICE_APPROVAL', 'PENDING_MANUAL'],
  [UserRole.SYSTEM_ADMIN]: ['PENDING_SYSTEM_APPROVAL'],
}

interface ReservationState {
  list: reservationApi.ReservationListItemResponse[]
  total: number
  query: reservationApi.ReservationListQuery
  currentReservation:
    | reservationApi.ReservationResponse
    | reservationApi.ReservationDetailResponse
    | null
  currentBatch: reservationApi.ReservationBatchResponse | null
  loading: boolean
}

function replaceReservationInList(
  list: reservationApi.ReservationListItemResponse[],
  reservation:
    | reservationApi.ReservationListItemResponse
    | reservationApi.ReservationDetailResponse,
) {
  return list.map((item) => (item.id === reservation.id ? { ...item, ...reservation } : item))
}

function replaceReservationStatusInList(
  list: reservationApi.ReservationListItemResponse[],
  reservation: reservationApi.ReservationResponse,
) {
  return list.map((item) => (item.id === reservation.id ? { ...item, ...reservation } : item))
}

function sliceReservationPage(
  list: reservationApi.ReservationListItemResponse[],
  page: number,
  size: number,
) {
  const start = Math.max(page - 1, 0) * size
  return list.slice(start, start + size)
}

function isManagedReservationMatched(
  reservation: reservationApi.ReservationListItemResponse,
  role: UserRole.DEVICE_ADMIN | UserRole.SYSTEM_ADMIN,
  view: 'pending' | 'history',
) {
  if (view === 'history') {
    return RESERVATION_HISTORY_STATUSES.includes(
      reservation.status as (typeof RESERVATION_HISTORY_STATUSES)[number],
    )
  }

  return RESERVATION_PENDING_STATUS_BY_ROLE[role].includes(reservation.status)
}

function mergeCurrentReservationResult(
  currentReservation:
    | reservationApi.ReservationResponse
    | reservationApi.ReservationDetailResponse
    | null,
  nextReservation: reservationApi.ReservationResponse,
  checkInTime: string | null,
) {
  if (!currentReservation || !('deviceName' in currentReservation)) {
    return nextReservation
  }

  /**
   * 签到接口返回的是轻量 `ReservationResponse`，但签到页仍需要保留设备名称、审批人和时间线字段继续渲染结果反馈。
   * 因此当当前上下文已持有详情对象时，要在前端做最小合并，避免按钮点击后页面退化成只剩基础状态码。
   */
  return {
    ...currentReservation,
    ...nextReservation,
    checkedInAt:
      nextReservation.signStatus === 'CHECKED_IN' ||
      nextReservation.signStatus === 'CHECKED_IN_TIMEOUT'
        ? checkInTime || currentReservation.checkedInAt
        : currentReservation.checkedInAt,
  }
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
     * 列表页详情跳转当前只预留数据承接，不提前展开完整详情页状态。
     * 先把详情结果缓存到 `currentReservation`，后续详情页接入时即可直接复用这份真实契约。
     */
    async fetchReservationDetail(reservationId: string) {
      const currentRequestToken = ++reservationDetailRequestToken
      const reservation = await reservationApi.getReservationDetail(reservationId)

      if (currentRequestToken !== reservationDetailRequestToken) {
        return reservation
      }

      this.currentReservation = reservation
      this.list = replaceReservationInList(this.list, reservation)
      return reservation
    },

    /**
     * 详情页与签到页退出时只清当前详情上下文。
     * 不能直接复用 `resetReservationResult()`，否则会把列表页分页结果一并清掉，导致用户返回列表后丢失当前浏览上下文。
     */
    resetCurrentReservation() {
      this.currentReservation = null
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
      this.list = replaceReservationStatusInList(this.list, reservation)
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
      this.list = replaceReservationStatusInList(this.list, reservation)
      return reservation
    },

    /**
     * 签到结果直接覆盖当前预约，供页面根据后端真实签到状态展示“正常签到 / 超时签到”等文案。
     */
    async checkInReservation(reservationId: string, payload: reservationApi.CheckInRequest) {
      const reservation = await reservationApi.checkInReservation(reservationId, payload)
      this.currentReservation = mergeCurrentReservationResult(
        this.currentReservation,
        reservation,
        payload.checkInTime,
      )
      return reservation
    },

    /**
     * 用户自助取消成功后要立即回写列表，避免页面仍显示旧状态导致用户重复点击。
     * Task 22 不做额外重查，直接使用后端返回的详情结果覆盖当前缓存即可满足列表页回显。
     */
    async cancelReservation(
      reservationId: string,
      payload: reservationApi.CancelReservationRequest,
    ) {
      const reservation = await reservationApi.cancelReservation(reservationId, payload)
      this.currentReservation = reservation
      this.list = replaceReservationInList(this.list, reservation)
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
      this.list = replaceReservationStatusInList(this.list, reservation)
      return reservation
    },

    /**
     * 管理员待审/历史页只能拿到后端“全量分页”接口。
     * 因此这里统一拉取足量记录后在前端按角色分组，避免伪造不存在的状态筛选 query 参数。
     */
    async fetchManagedReservationPage(payload: {
      role: UserRole
      view: 'pending' | 'history'
      page: number
      size: number
    }) {
      if (payload.role !== UserRole.DEVICE_ADMIN && payload.role !== UserRole.SYSTEM_ADMIN) {
        this.list = []
        this.total = 0
        this.query = { page: payload.page, size: payload.size }
        return { total: 0, records: [] }
      }

      const adminRole = payload.role

      this.loading = true

      try {
        const records: reservationApi.ReservationListItemResponse[] = []
        const recordIds = new Set<string>()
        let currentPage = 1
        let total = 0
        let fetchedPages = 0

        do {
          const result = await reservationApi.getReservationList({
            page: currentPage,
            size: ADMIN_MANAGED_FETCH_SIZE,
          })

          total = result.total
          let appendedCount = 0

          for (const record of result.records) {
            if (recordIds.has(record.id)) {
              continue
            }

            recordIds.add(record.id)
            records.push(record)
            appendedCount += 1
          }

          /**
           * 管理端本地分组建立在“顺序翻页拿全量数据”的后端能力上，
           * 一旦某页返回空数组或重复数据，就说明继续翻页已经无法再获得稳定增量，必须及时终止，避免无意义请求循环。
           */
          if (result.records.length === 0 || appendedCount === 0) {
            break
          }

          currentPage += 1
          fetchedPages += 1
        } while (records.length < total && fetchedPages < ADMIN_MANAGED_FETCH_MAX_PAGES)

        const filteredRecords = records.filter((reservation) =>
          isManagedReservationMatched(reservation, adminRole, payload.view),
        )
        const pageRecords = sliceReservationPage(filteredRecords, payload.page, payload.size)

        this.list = pageRecords
        this.total = filteredRecords.length
        this.query = { page: payload.page, size: payload.size }

        return {
          total: filteredRecords.length,
          records: pageRecords,
        }
      } finally {
        this.loading = false
      }
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
      this.resetCurrentReservation()
      this.currentBatch = null
    },
  },
})
