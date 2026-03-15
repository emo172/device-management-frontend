import { defineStore } from 'pinia'

import * as borrowApi from '@/api/borrow-records'

interface BorrowState {
  list: borrowApi.BorrowRecordResponse[]
  total: number
  query: borrowApi.BorrowRecordListQuery
  currentRecord: borrowApi.BorrowRecordResponse | null
  loading: boolean
}

function createDefaultQuery(): borrowApi.BorrowRecordListQuery {
  return {
    page: 1,
    size: 10,
  }
}

function createDefaultState(): BorrowState {
  return {
    list: [],
    total: 0,
    query: createDefaultQuery(),
    currentRecord: null,
    loading: false,
  }
}

/**
 * 借还记录域状态。
 * 负责借还列表、当前详情和确认借出/归还后的最新回显，供设备管理员和普通用户共用同一数据承载层。
 */
export const useBorrowStore = defineStore('borrow', {
  state: (): BorrowState => createDefaultState(),

  actions: {
    /**
     * 列表查询由后端根据当前角色裁剪可见范围，Store 只保存分页结果与当前筛选参数。
     */
    async fetchBorrowList(query: borrowApi.BorrowRecordListQuery = createDefaultQuery()) {
      this.loading = true
      this.query = { ...query }

      try {
        const result = await borrowApi.getBorrowRecordList(query)
        this.list = result.records
        this.total = result.total
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 当前借还记录缓存用于确认弹窗、详情抽屉和归还页共享。
     */
    async fetchBorrowDetail(borrowRecordId: string) {
      const record = await borrowApi.getBorrowRecordDetail(borrowRecordId)
      this.currentRecord = record
      return record
    },

    /**
     * 借出确认传入的是预约 ID 而不是借还记录 ID，Store 在这里统一收口，避免页面误传主键。
     */
    async confirmBorrow(reservationId: string, payload?: borrowApi.ConfirmBorrowRequest) {
      const record = await borrowApi.confirmBorrow(reservationId, payload)
      this.currentRecord = record
      this.replaceRecordInList(record)
      return record
    },

    /**
     * 归还确认以正式借还记录为主键，成功后同步回写列表和详情。
     */
    async confirmReturn(borrowRecordId: string, payload?: borrowApi.ConfirmReturnRequest) {
      const record = await borrowApi.confirmReturn(borrowRecordId, payload)
      this.currentRecord = record
      this.replaceRecordInList(record)
      return record
    },

    /**
     * 列表回写逻辑集中维护，避免借出和归还两个动作各自复制相同更新代码。
     */
    replaceRecordInList(record: borrowApi.BorrowRecordResponse) {
      const exists = this.list.some((item) => item.id === record.id)
      this.list = exists
        ? this.list.map((item) => (item.id === record.id ? record : item))
        : [record, ...this.list]
    },

    /**
     * 详情离场后清空当前记录，避免后续切换到另一条记录时先闪现旧数据。
     */
    resetCurrentRecord() {
      this.currentRecord = null
    },
  },
})
