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
  getAiCapabilities,
  getAiHistoryDetail,
  getAiHistoryList,
  transcribeAiSpeech,
} from '../ai'

describe('ai api', () => {
  beforeEach(() => {
    getMock.mockReset()
    postMock.mockReset()
  })

  it('loads ai capabilities from the dedicated capabilities endpoint', async () => {
    const response = {
      chatEnabled: true,
      speechEnabled: false,
    }
    getMock.mockResolvedValue(response)

    await expect(getAiCapabilities()).resolves.toBe(response)
    expect(getMock).toHaveBeenCalledWith('/ai/capabilities')
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
      provider: 'iflytek',
    }
    postMock.mockResolvedValue(response)

    const audioBlob = new Blob(['voice'], { type: 'audio/wav' })

    await expect(transcribeAiSpeech(audioBlob)).resolves.toBe(response)

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledWith('/ai/speech/transcriptions', expect.any(FormData))

    const [, formData] = postMock.mock.calls[0] as [string, FormData]
    const fileField = formData.get('file')

    expect(fileField).toBeInstanceOf(File)
    expect((fileField as File).name).toBe('voice.wav')
  })

  it('keeps wav fallback filename even when blob metadata is stale webm', async () => {
    const response = {
      transcript: '帮我查询明天可用设备',
      locale: 'zh-CN',
      provider: 'iflytek',
    }
    postMock.mockResolvedValue(response)

    const audioBlob = new Blob(['voice'], { type: 'audio/webm' })

    await expect(transcribeAiSpeech(audioBlob)).resolves.toBe(response)

    const [, formData] = postMock.mock.calls[0] as [string, FormData]
    const fileField = formData.get('file')

    expect(fileField).toBeInstanceOf(File)
    expect((fileField as File).name).toBe('voice.wav')
  })

  it('preserves transcription api failures for upper layers to surface', async () => {
    const transcriptionError = new Error('语音功能未开启')
    postMock.mockRejectedValueOnce(transcriptionError)

    await expect(transcribeAiSpeech(new Blob(['voice'], { type: 'audio/wav' }))).rejects.toThrow(
      '语音功能未开启',
    )
  })
})
