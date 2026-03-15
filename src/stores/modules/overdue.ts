import { defineStore } from 'pinia'

import * as overdueApi from '@/api/overdue'

interface OverdueState {
  list: overdueApi.OverdueRecordResponse[]
  total: number
  query: overdueApi.OverdueRecordListQuery
  currentRecord: overdueApi.OverdueRecordResponse | null
  loading: boolean
}

function createDefaultQuery(): overdueApi.OverdueRecordListQuery {
  return {
    page: 1,
    size: 10,
  }
}

function createDefaultState(): OverdueState {
  return {
    list: [],
    total: 0,
    query: createDefaultQuery(),
    currentRecord: null,
    loading: false,
  }
}

/**
 * 逾期域状态。
 * 统一承接逾期分页、当前详情和处理结果，保证设备管理员处理后列表与详情能立即同步。
 */
export const useOverdueStore = defineStore('overdue', {
  state: (): OverdueState => createDefaultState(),

  actions: {
    /**
     * 逾期筛选字段必须使用后端真实的 `processingStatus`，Store 保留查询参数避免页面回退到旧口径 `status`。
     */
    async fetchOverdueList(query: overdueApi.OverdueRecordListQuery = createDefaultQuery()) {
      this.loading = true
      this.query = { ...query }

      try {
        const result = await overdueApi.getOverdueRecordList(query)
        this.list = result.records
        this.total = result.total
        return result
      } finally {
        this.loading = false
      }
    },

    /**
     * 当前逾期记录缓存供详情查看和处理弹窗共享上下文。
     */
    async fetchOverdueDetail(overdueRecordId: string) {
      const record = await overdueApi.getOverdueRecordDetail(overdueRecordId)
      this.currentRecord = record
      return record
    },

    /**
     * 逾期处理成功后后端会回传正式结果，前端不自行猜测处理状态，直接以回显覆盖本地缓存。
     */
    async processRecord(overdueRecordId: string, payload: overdueApi.ProcessOverdueRequest) {
      const record = await overdueApi.processOverdueRecord(overdueRecordId, payload)
      this.currentRecord = record
      this.replaceRecordInList(record)
      return record
    },

    /**
     * 列表记录统一按主键覆盖，避免处理完成后列表仍停留在待处理状态。
     */
    replaceRecordInList(record: overdueApi.OverdueRecordResponse) {
      const exists = this.list.some((item) => item.id === record.id)
      this.list = exists
        ? this.list.map((item) => (item.id === record.id ? record : item))
        : [record, ...this.list]
    },

    /**
     * 详情关闭时清理上下文，避免下次处理别的逾期单据时混入旧备注。
     */
    resetCurrentRecord() {
      this.currentRecord = null
    },
  },
})
