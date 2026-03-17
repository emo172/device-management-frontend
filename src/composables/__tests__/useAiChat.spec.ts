import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiStoreState = reactive({
  currentSessionId: null as string | null,
})

const chatMock = vi.fn()
const resetConversationStateMock = vi.fn(() => {
  aiStoreState.currentSessionId = null
})

vi.mock('@/stores/modules/ai', () => ({
  useAiStore: () => ({
    get currentSessionId() {
      return aiStoreState.currentSessionId
    },
    chat: chatMock,
    resetConversationState: resetConversationStateMock,
  }),
}))

describe('useAiChat', () => {
  beforeEach(() => {
    chatMock.mockReset()
    resetConversationStateMock.mockClear()
    aiStoreState.currentSessionId = null
  })

  it('发送消息后会把用户消息和 AI 回复写入本地消息流，并继承后端会话 ID', async () => {
    const { useAiChat } = await import('../useAiChat')

    chatMock.mockResolvedValueOnce({
      id: 'history-1',
      sessionId: 'session-1',
      intent: 'QUERY',
      executeResult: 'SUCCESS',
      aiResponse: '当前空闲设备有 3 台。',
    })

    const chat = useAiChat()

    const sendingPromise = chat.sendMessage('  查询今天空闲设备  ')

    expect(chat.loading.value).toBe(true)
    expect(chat.messages.value).toHaveLength(1)
    expect(chat.messages.value[0]).toMatchObject({
      role: 'user',
      content: '查询今天空闲设备',
      status: 'sent',
    })

    await sendingPromise
    await nextTick()

    expect(chatMock).toHaveBeenCalledWith({ message: '查询今天空闲设备' })
    expect(chat.loading.value).toBe(false)
    expect(chat.sessionId.value).toBe('session-1')
    expect(chat.messages.value).toHaveLength(2)
    expect(chat.messages.value[1]).toMatchObject({
      role: 'assistant',
      content: '当前空闲设备有 3 台。',
      intent: 'QUERY',
      executeResult: 'SUCCESS',
    })
  })

  it('开启新会话时会同步清理本地会话与 store 中的当前会话标识', async () => {
    aiStoreState.currentSessionId = 'session-legacy'

    const { useAiChat } = await import('../useAiChat')
    const chat = useAiChat()

    chat.resetConversation()

    expect(chat.sessionId.value).toBeNull()
    expect(chat.latestResult.value).toBeNull()
    expect(resetConversationStateMock).toHaveBeenCalledTimes(1)
    expect(aiStoreState.currentSessionId).toBeNull()
  })

  it('发送失败时会把用户消息标记为失败并暴露错误文案', async () => {
    const { useAiChat } = await import('../useAiChat')

    chatMock.mockRejectedValueOnce(new Error('network error'))

    const chat = useAiChat()
    const result = await chat.sendMessage('取消今天下午的预约')

    expect(result).toBeNull()
    expect(chat.loading.value).toBe(false)
    expect(chat.messages.value).toHaveLength(1)
    expect(chat.messages.value[0]).toMatchObject({
      role: 'user',
      content: '取消今天下午的预约',
      status: 'failed',
    })
    expect(chat.errorMessage.value).toBe('network error')
  })
})
