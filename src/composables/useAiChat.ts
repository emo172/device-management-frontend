import { ref } from 'vue'

import type { AiChatResponse } from '@/api/ai'
import { transcribeAiSpeech } from '@/api/ai'
import { useAiStore } from '@/stores/modules/ai'

export type AiChatMessageRole = 'user' | 'assistant'
export type AiChatMessageStatus = 'sent' | 'failed'

/**
 * 聊天消息视图模型。
 * 后端当前没有“整段会话消息列表”接口，因此页面需要把用户输入和本轮 AI 回复先沉淀到本地消息流，
 * 这样既能保持 IM 式阅读体验，又不会伪造后端并不存在的多轮历史接口。
 */
export interface AiChatMessage {
  id: string
  role: AiChatMessageRole
  content: string
  createdAt: string
  historyId?: string
  intent?: string
  executeResult?: string
  status: AiChatMessageStatus
}

function resolveErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string' &&
    error.response.data.message
  ) {
    return error.response.data.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'AI 回复失败，请稍后重试。'
}

function createMessageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createUserMessage(content: string): AiChatMessage {
  return {
    id: createMessageId('user'),
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
    status: 'sent',
  }
}

function createAssistantMessage(result: AiChatResponse): AiChatMessage {
  return {
    id: createMessageId('assistant'),
    role: 'assistant',
    content: result.aiResponse,
    createdAt: new Date().toISOString(),
    historyId: result.id,
    intent: result.intent,
    executeResult: result.executeResult,
    status: 'sent',
  }
}

/**
 * AI 聊天组合式函数。
 * Store 继续负责真实 API 调用和历史数据，本地组合式函数只补足当前聊天页所需的消息流、会话 ID 和发送态，
 * 避免把页面瞬时交互状态回灌到全局 Store 导致历史页与聊天页职责耦合。
 */
export function useAiChat() {
  const aiStore = useAiStore()

  const messages = ref<AiChatMessage[]>([])
  const sessionId = ref(aiStore.currentSessionId)
  const latestResult = ref<AiChatResponse | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  async function dispatchMessage(message: string) {
    const userMessage = createUserMessage(message)
    messages.value.push(userMessage)

    try {
      const result = await aiStore.chat({
        message,
        ...(sessionId.value ? { sessionId: sessionId.value } : {}),
      })

      sessionId.value = result.sessionId
      latestResult.value = result
      messages.value.push(createAssistantMessage(result))

      return result
    } catch (error) {
      /**
       * 失败态必须回写到本地消息流。
       * 否则页面会残留一条看似“已发送”的消息，用户也无法判断这次请求究竟有没有成功送达后端。
       */
      userMessage.status = 'failed'
      errorMessage.value = resolveErrorMessage(error)
      return null
    }
  }

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()

    if (!message || loading.value) {
      return null
    }

    loading.value = true
    errorMessage.value = null

    try {
      return await dispatchMessage(message)
    } finally {
      loading.value = false
    }
  }

  async function transcribeVoiceMessage(audioFile: Blob | File) {
    if (loading.value) {
      return null
    }

    loading.value = true
    errorMessage.value = null

    try {
      const { transcript } = await transcribeAiSpeech(audioFile)
      const message = transcript.trim()

      if (!message) {
        return null
      }

      return message
    } catch (error) {
      errorMessage.value = resolveErrorMessage(error)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 新会话只清理聊天页本地消息流与最近一次返回结果。
   * 真实历史仍以后端接口为准保留在 Store 中，避免用户误以为“清空当前窗口”会删除服务端历史。
   */
  function resetConversation() {
    messages.value = []
    sessionId.value = null
    latestResult.value = null
    errorMessage.value = null
    aiStore.resetConversationState()
  }

  return {
    messages,
    sessionId,
    latestResult,
    loading,
    errorMessage,
    sendMessage,
    transcribeVoiceMessage,
    resetConversation,
  }
}
