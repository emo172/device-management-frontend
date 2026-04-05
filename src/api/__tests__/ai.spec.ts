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

import {
  chatWithAi,
  getAiHistoryDetail,
  getAiHistoryList,
  getAiHistorySpeech,
  transcribeAiSpeech,
} from '../ai'

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

  it('uploads speech recording as multipart form data for transcription', async () => {
    const response = {
      transcript: '帮我查询明天可用设备',
      locale: 'zh-CN',
      provider: 'azure',
    }
    postMock.mockResolvedValue(response)

    const audioBlob = new Blob(['voice'], { type: 'audio/webm' })

    await expect(transcribeAiSpeech(audioBlob)).resolves.toBe(response)

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/ai/speech/transcriptions', expect.any(FormData))

    const [, formData] = postMock.mock.calls[0] as [string, FormData]
    const fileField = formData.get('file')

    expect(fileField).toBeInstanceOf(File)
    expect((fileField as File).name).toBe('voice.webm')
  })

  it('loads history speech as blob instead of exposing a public audio url', async () => {
    const audioBlob = new Blob(['audio'], { type: 'audio/mpeg' })
    getMock.mockResolvedValue(audioBlob)

    await expect(getAiHistorySpeech('history-1')).resolves.toBe(audioBlob)
    expect(getMock).toHaveBeenCalledWith('/ai/history/history-1/speech', {
      responseType: 'blob',
    })
  })

  it('preserves speech api failures for upper layers to surface', async () => {
    const transcriptionError = new Error('语音功能未开启')
    const playbackError = new Error('AI 历史语音播放失败，请稍后重试')
    postMock.mockRejectedValueOnce(transcriptionError)
    getMock.mockRejectedValueOnce(playbackError)

    await expect(transcribeAiSpeech(new Blob(['voice'], { type: 'audio/webm' }))).rejects.toThrow(
      '语音功能未开启',
    )
    await expect(getAiHistorySpeech('history-2')).rejects.toThrow(
      'AI 历史语音播放失败，请稍后重试',
    )
  })
})
