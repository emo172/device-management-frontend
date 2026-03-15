import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { chatWithAiMock, getAiHistoryDetailMock, getAiHistoryListMock } = vi.hoisted(() => ({
  chatWithAiMock: vi.fn(),
  getAiHistoryDetailMock: vi.fn(),
  getAiHistoryListMock: vi.fn(),
}))

vi.mock('@/api/ai', () => ({
  chatWithAi: chatWithAiMock,
  getAiHistoryDetail: getAiHistoryDetailMock,
  getAiHistoryList: getAiHistoryListMock,
}))

import { useAiStore } from '../modules/ai'

describe('ai store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    chatWithAiMock.mockReset()
    getAiHistoryDetailMock.mockReset()
    getAiHistoryListMock.mockReset()
  })

  it('loads ai history list and detail', async () => {
    getAiHistoryListMock.mockResolvedValue([
      {
        id: 'history-1',
        sessionId: 'session-1',
        userInput: '帮我预约设备',
        intent: 'RESERVE',
        executeResult: 'SUCCESS',
        createdAt: '2026-03-15T10:00:00',
      },
    ])
    getAiHistoryDetailMock.mockResolvedValue({
      id: 'history-1',
      sessionId: 'session-1',
      userInput: '帮我预约设备',
      aiResponse: '好的',
      intent: 'RESERVE',
      extractedInfo: null,
      executeResult: 'SUCCESS',
      errorMessage: null,
      llmModel: 'mock-model',
      responseTimeMs: 200,
      createdAt: '2026-03-15T10:00:00',
    })

    const store = useAiStore()
    await store.fetchHistoryList()
    await store.fetchHistoryDetail('history-1')

    expect(store.historyList).toHaveLength(1)
    expect(store.currentHistory?.id).toBe('history-1')
  })

  it('stores latest chat result and session id', async () => {
    chatWithAiMock.mockResolvedValue({
      id: 'history-2',
      sessionId: 'session-2',
      intent: 'QUERY',
      executeResult: 'SUCCESS',
      aiResponse: '当前设备空闲',
    })

    const store = useAiStore()
    await store.chat({ message: '当前设备状态如何？' })

    expect(chatWithAiMock).toHaveBeenCalledWith({ message: '当前设备状态如何？' })
    expect(store.currentResult?.sessionId).toBe('session-2')
    expect(store.currentSessionId).toBe('session-2')

    store.resetCurrentResult()
    expect(store.currentResult).toBeNull()
  })
})
