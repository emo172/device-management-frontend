import { defineStore } from 'pinia'

import * as aiApi from '@/api/ai'

function createDefaultCapabilities(): aiApi.AiCapabilitiesResponse {
  return {
    chatEnabled: false,
    speechEnabled: false,
  }
}

interface AiState {
  capabilities: aiApi.AiCapabilitiesResponse
  capabilitiesLoaded: boolean
  capabilitiesRequestToken: number
  historyList: aiApi.AiHistorySummaryResponse[]
  currentHistory: aiApi.AiHistoryDetailResponse | null
  currentResult: aiApi.AiChatResponse | null
  currentSessionId: string | null
  detailRequestToken: number
  loading: boolean
}

function createDefaultState(): AiState {
  return {
    capabilities: createDefaultCapabilities(),
    capabilitiesLoaded: false,
    capabilitiesRequestToken: 0,
    historyList: [],
    currentHistory: null,
    currentResult: null,
    currentSessionId: null,
    detailRequestToken: 0,
    loading: false,
  }
}

/**
 * AI 对话域状态。
 * 只承接真实存在的对话、历史列表和历史详情能力。
 * `speechEnabled` 在 Store 内只代表语音输入转写入口，避免把“语音能力”泛化成额外的混合状态。
 */
export const useAiStore = defineStore('ai', {
  state: (): AiState => createDefaultState(),

  actions: {
    /**
     * AI 页面进入时先拉取当前用户能力开关，避免前端把“尚未拿到后端结果”误判成默认可用。
     * 刷新前先主动回落到 fail-closed 默认值，避免用户二次进入聊天页时短暂沿用上一轮成功结果。
     * 若上层触发了并发 refresh，只允许最后一次请求落库，避免慢请求把更新后的能力结果覆盖回旧值。
     * 一旦请求失败，Store 会继续保持 fail-closed 默认值，并把异常抛给上层决定是否提示用户重试。
     */
    async fetchCapabilities() {
      const requestToken = this.capabilitiesRequestToken + 1
      this.capabilitiesRequestToken = requestToken
      this.capabilities = createDefaultCapabilities()
      this.capabilitiesLoaded = false

      try {
        const capabilities = await aiApi.getAiCapabilities()

        if (requestToken !== this.capabilitiesRequestToken) {
          return this.capabilities
        }

        this.capabilities = capabilities
        this.capabilitiesLoaded = true
        return capabilities
      } catch (error) {
        if (requestToken !== this.capabilitiesRequestToken) {
          return this.capabilities
        }

        this.capabilities = createDefaultCapabilities()
        this.capabilitiesLoaded = false
        throw error
      }
    },

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
     * 查看单次对话详情时只更新历史详情本身，不能顺手改写聊天页的当前会话 ID。
     * 否则用户从历史页回到聊天页时，会在空白消息流里悄悄续接旧会话上下文，造成前后端会话状态错位。
     * 这里还要屏蔽乱序返回的旧请求，避免用户连续切换两条历史后，慢请求把右侧详情覆盖回旧记录。
     */
    async fetchHistoryDetail(historyId: string) {
      const requestToken = this.detailRequestToken + 1
      this.detailRequestToken = requestToken

      const history = await aiApi.getAiHistoryDetail(historyId)

      if (requestToken !== this.detailRequestToken) {
        return this.currentHistory
      }

      this.currentHistory = history
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
     * 聊天页点击“开启新会话”时只重置当前会话标识与最近一次回复。
     * 历史列表仍应保留，否则用户会误以为清空当前窗口等于删除服务端历史。
     */
    resetConversationState() {
      this.currentSessionId = null
      this.currentResult = null
    },

    /**
     * 历史页重新进入时主动清掉旧详情，避免右侧先闪出上一轮遗留内容再等待用户重新选择。
     * 同时提升请求令牌，确保离开页面前发出的旧详情请求即使稍后返回，也不会再把脏数据写回 Store。
     */
    clearCurrentHistory() {
      this.detailRequestToken += 1
      this.currentHistory = null
    },

    /**
     * 需要重新开启新会话时连同 sessionId 一并清理，保证下一次对话走后端新建会话逻辑。
     */
    resetState() {
      Object.assign(this, createDefaultState())
    },
  },
})
