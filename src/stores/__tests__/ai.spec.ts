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

function createDeferred<T>() {
  let resolve!: (value: T) => void

  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}

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
    expect(store.currentSessionId).toBeNull()
  })

  it('ignores stale history detail responses when users switch records quickly', async () => {
    const firstHistory = {
      id: 'history-1',
      sessionId: 'session-1',
      userInput: '帮我预约设备',
      aiResponse: '第一条详情',
      intent: 'RESERVE',
      extractedInfo: null,
      executeResult: 'SUCCESS',
      errorMessage: null,
      llmModel: 'mock-model',
      responseTimeMs: 100,
      createdAt: '2026-03-15T10:00:00',
    }
    const secondHistory = {
      id: 'history-2',
      sessionId: 'session-2',
      userInput: '取消预约',
      aiResponse: '第二条详情',
      intent: 'CANCEL',
      extractedInfo: null,
      executeResult: 'FAILED',
      errorMessage: '24 小时内不可取消',
      llmModel: 'mock-model',
      responseTimeMs: 120,
      createdAt: '2026-03-15T10:05:00',
    }
    const firstRequest = createDeferred<typeof firstHistory>()
    const secondRequest = createDeferred<typeof secondHistory>()

    getAiHistoryDetailMock
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise)

    const store = useAiStore()
    const firstPromise = store.fetchHistoryDetail('history-1')
    const secondPromise = store.fetchHistoryDetail('history-2')

    secondRequest.resolve(secondHistory)
    await Promise.resolve()
    await secondPromise

    expect(store.currentHistory?.id).toBe('history-2')

    firstRequest.resolve(firstHistory)
    await Promise.resolve()
    await firstPromise

    expect(store.currentHistory?.id).toBe('history-2')
  })

  it('keeps current chat session id untouched when loading history detail', async () => {
    getAiHistoryDetailMock.mockResolvedValue({
      id: 'history-1',
      sessionId: 'session-history',
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
    store.currentSessionId = 'session-chat'

    await store.fetchHistoryDetail('history-1')

    expect(store.currentHistory?.sessionId).toBe('session-history')
    expect(store.currentSessionId).toBe('session-chat')
  })

  it('drops in-flight history detail results after current history is cleared', async () => {
    const pendingHistory = {
      id: 'history-1',
      sessionId: 'session-1',
      userInput: '帮我预约设备',
      aiResponse: '第一条详情',
      intent: 'RESERVE',
      extractedInfo: null,
      executeResult: 'SUCCESS',
      errorMessage: null,
      llmModel: 'mock-model',
      responseTimeMs: 100,
      createdAt: '2026-03-15T10:00:00',
    }
    const pendingRequest = createDeferred<typeof pendingHistory>()

    getAiHistoryDetailMock.mockImplementationOnce(() => pendingRequest.promise)

    const store = useAiStore()
    const detailPromise = store.fetchHistoryDetail('history-1')

    store.clearCurrentHistory()
    pendingRequest.resolve(pendingHistory)
    await detailPromise

    expect(store.currentHistory).toBeNull()
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

  it('resets only current conversation state without clearing history list', () => {
    const store = useAiStore()
    store.historyList = [
      {
        id: 'history-1',
        sessionId: 'session-1',
        userInput: '帮我预约设备',
        intent: 'RESERVE',
        executeResult: 'SUCCESS',
        createdAt: '2026-03-15T10:00:00',
      },
    ]
    store.currentResult = {
      id: 'history-1',
      sessionId: 'session-1',
      intent: 'RESERVE',
      executeResult: 'SUCCESS',
      aiResponse: '好的',
    }
    store.currentSessionId = 'session-1'
    store.currentHistory = {
      id: 'history-1',
      sessionId: 'session-1',
      userInput: '帮我预约设备',
      aiResponse: '好的',
      intent: 'RESERVE',
      extractedInfo: null,
      executeResult: 'SUCCESS',
      errorMessage: null,
      llmModel: 'mock-model',
      responseTimeMs: 120,
      createdAt: '2026-03-15T10:00:00',
    }

    store.resetConversationState()
    store.clearCurrentHistory()

    expect(store.historyList).toHaveLength(1)
    expect(store.currentResult).toBeNull()
    expect(store.currentSessionId).toBeNull()
    expect(store.currentHistory).toBeNull()
  })
})
