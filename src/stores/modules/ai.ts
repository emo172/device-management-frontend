import { defineStore } from 'pinia'

import * as aiApi from '@/api/ai'

interface AiState {
  historyList: aiApi.AiHistorySummaryResponse[]
  currentHistory: aiApi.AiHistoryDetailResponse | null
  currentResult: aiApi.AiChatResponse | null
  currentSessionId: string | null
  loading: boolean
}

function createDefaultState(): AiState {
  return {
    historyList: [],
    currentHistory: null,
    currentResult: null,
    currentSessionId: null,
    loading: false,
  }
}

/**
 * AI 对话域状态。
 * 只承接真实存在的文本对话、历史列表和历史详情能力，为后续 USER 侧 AI 页面提供最小可用数据层。
 */
export const useAiStore = defineStore('ai', {
  state: (): AiState => createDefaultState(),

  actions: {
    /**
     * 历史列表是 AI 页面左侧会话入口，后端只返回当前登录用户自己的数据，Store 不额外拼管理员能力。
     */
    async fetchHistoryList() {
      this.loading = true

      try {
        const historyList = await aiApi.getAiHistoryList()
        this.historyList = historyList
        return historyList
      } finally {
        this.loading = false
      }
    },

    /**
     * 查看单次对话详情时保留完整结果，便于后续侧边抽屉展示意图识别、执行结果与错误信息。
     */
    async fetchHistoryDetail(historyId: string) {
      const history = await aiApi.getAiHistoryDetail(historyId)
      this.currentHistory = history
      this.currentSessionId = history.sessionId
      return history
    },

    /**
     * 对话成功后以后端返回的 sessionId 为准继续追踪同一会话，避免前端自行生成会话标识与后端脱节。
     */
    async chat(payload: aiApi.AiChatRequest) {
      const result = await aiApi.chatWithAi(payload)
      this.currentResult = result
      this.currentSessionId = result.sessionId
      return result
    },

    /**
     * 切换新会话时清空当前回复结果，避免上一轮 AI 响应在新会话输入框下方残留。
     */
    resetCurrentResult() {
      this.currentResult = null
    },

    /**
     * 需要重新开启新会话时连同 sessionId 一并清理，保证下一次对话走后端新建会话逻辑。
     */
    resetState() {
      Object.assign(this, createDefaultState())
    },
  },
})
