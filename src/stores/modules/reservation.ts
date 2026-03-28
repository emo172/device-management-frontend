import { defineStore } from 'pinia'

import * as reservationApi from '@/api/reservations'
import { UserRole } from '@/enums'

let reservationDetailRequestToken = 0
const ADMIN_MANAGED_FETCH_SIZE = 50
/**
 * 管理端历史页使用本地终态集合做二次分组。
 * 这些状态都是后端已明确进入终态的预约，前端不再把待审批记录混进历史视图。
 */
const RESERVATION_HISTORY_STATUSES = ['APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'] as const
const BORROW_CANDIDATE_SIGN_STATUSES = ['CHECKED_IN', 'CHECKED_IN_TIMEOUT'] as const

/**
 * 管理端待处理页按角色拆分待办状态。
 * 设备管理员只看一审与人工处理，系统管理员只看二审，避免页面层再手工拼状态条件。
 */
const RESERVATION_PENDING_STATUS_BY_ROLE: Record<
  UserRole.DEVICE_ADMIN | UserRole.SYSTEM_ADMIN,
  string[]
> = {
  [UserRole.DEVICE_ADMIN]: ['PENDING_DEVICE_APPROVAL', 'PENDING_MANUAL'],
  [UserRole.SYSTEM_ADMIN]: ['PENDING_SYSTEM_APPROVAL'],
}

interface ReservationState {
  /** 当前列表页展示的数据片段。 */
  list: reservationApi.ReservationListItemResponse[]
  /** 当前视图对应的记录总数。 */
  total: number
  /** 最近一次列表查询参数。 */
  query: reservationApi.ReservationListQuery
  /** 当前正在查看或刚执行动作的预约详情/动作结果。 */
  currentReservation:
    | reservationApi.ReservationResponse
    | reservationApi.ReservationDetailResponse
    | null
  /** 最近一次批量预约结果。 */
  currentBatch: reservationApi.ReservationBatchResponse | null
  /** 通用加载态，供列表与管理页复用。 */
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

function isBorrowCandidateReservation(reservation: reservationApi.ReservationListItemResponse) {
  return (
    reservation.status === 'APPROVED' &&
    BORROW_CANDIDATE_SIGN_STATUSES.includes(
      reservation.signStatus as (typeof BORROW_CANDIDATE_SIGN_STATUSES)[number],
    )
  )
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
   * 理想情况下后端审批/签到响应已经足够支撑页面继续渲染；
   * 这里仍保留最小合并，是为了兼容测试桩或旧联调环境仍只返回轻量字段时，不让签到页立刻退化成只剩状态码。
   */
  return {
    ...currentReservation,
    ...nextReservation,
    checkedInAt:
      'checkedInAt' in nextReservation && nextReservation.checkedInAt
        ? nextReservation.checkedInAt
        : nextReservation.signStatus === 'CHECKED_IN' ||
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
     * 仪表盘与列表页都依赖这份最小读取能力，因此在 Store 里保留查询参数和分页结果。
     * 枚举别名归一化已经在 API 层完成，这里只缓存 API 真正返回的标准化结果，避免重复包一层对象。
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
     * 先把 API 已标准化的详情结果直接缓存到 `currentReservation`，后续详情页接入时即可复用同一份真实契约。
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
     * 列表型页面在重新进入前先清空共享列表上下文。
     * 这样不同预约页面共用同一个 Store 时，不会先短暂渲染上一页面残留的列表结果。
     */
    resetListState() {
      this.list = []
      this.total = 0
      this.query = createDefaultQuery()
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

          /**
           * 一旦已经拿齐后端声明的总量，就不再继续翻页。
           * 这里刻意去掉“最多 20 页”的静态上限，避免待审批/历史页在记录超过 1000 条时被静默截断。
           */
          if (records.length >= total) {
            break
          }

          currentPage += 1
        } while (true)

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
     * 借用确认页需要拿到全部“已批准且已签到”的候选预约，不能被当前分页盲区卡住正式借出闭环。
     * 这里沿用本地聚合分页方式，先顺序拿全量预约，再在前端收敛出真实候选池。
     */
    async fetchBorrowCandidatePage(payload: { page: number; size: number }) {
      this.loading = true

      try {
        const records: reservationApi.ReservationListItemResponse[] = []
        const recordIds = new Set<string>()
        let currentPage = 1
        let total = 0

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

          if (result.records.length === 0 || appendedCount === 0) {
            break
          }

          if (records.length >= total) {
            break
          }

          currentPage += 1
        } while (true)

        const filteredRecords = records.filter((reservation) =>
          isBorrowCandidateReservation(reservation),
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
      this.resetListState()
      this.resetCurrentReservation()
      this.currentBatch = null
    },
  },
})
