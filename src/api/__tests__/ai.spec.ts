import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}))

vi.mock('@/api/request', () => ({
  default: {
    get: getMock,
    post: postMock,
  },
}))

import { chatWithAi, getAiHistoryDetail, getAiHistoryList } from '../ai'

describe('ai api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('uses the dedicated ai chat endpoint', async () => {
    const response = { id: 'history-1', aiResponse: '可以帮你预约设备。' }
    postMock.mockResolvedValue(response)

    const payload = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      message: '帮我查询明天可用设备',
    }

    await expect(chatWithAi(payload)).resolves.toBe(response)
    expect(postMock).toHaveBeenCalledWith('/ai/chat', payload)
  })

  it('loads ai history list and history detail', async () => {
    const listResponse = [{ id: 'history-1', intent: 'QUERY' }]
    const detailResponse = { id: 'history-1', extractedInfo: '{}' }
    getMock.mockResolvedValueOnce(listResponse)
    getMock.mockResolvedValueOnce(detailResponse)

    await expect(getAiHistoryList()).resolves.toBe(listResponse)
    await expect(getAiHistoryDetail('history-1')).resolves.toBe(detailResponse)

    expect(getMock).toHaveBeenNthCalledWith(1, '/ai/history')
    expect(getMock).toHaveBeenNthCalledWith(2, '/ai/history/history-1')
  })
})
