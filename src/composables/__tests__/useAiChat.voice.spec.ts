import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AI_HISTORY_PLAY_TEST_ID,
  AI_MESSAGE_PLAY_TEST_ID,
  AI_VOICE_ERROR_TEST_ID,
  AI_VOICE_RECORD_TOGGLE_TEST_ID,
  AI_VOICE_STATUS_TEST_ID,
} from '@/constants'

const transcribeAiSpeechMock = vi.fn()

const aiStoreState = reactive({
  currentSessionId: null as string | null,
})

const chatMock = vi.fn()
const resetConversationStateMock = vi.fn(() => {
  aiStoreState.currentSessionId = null
})

vi.mock('@/api/ai', () => ({
  transcribeAiSpeech: transcribeAiSpeechMock,
}))

vi.mock('@/stores/modules/ai', () => ({
  useAiStore: () => ({
    get currentSessionId() {
      return aiStoreState.currentSessionId
    },
    chat: chatMock,
    resetConversationState: resetConversationStateMock,
  }),
}))

describe('useAiChat voice flow', () => {
  beforeEach(() => {
    transcribeAiSpeechMock.mockReset()
    chatMock.mockReset()
    resetConversationStateMock.mockClear()
    aiStoreState.currentSessionId = null
  })

  it('exports stable voice data-testid constants for later UI tasks', () => {
    expect(AI_VOICE_RECORD_TOGGLE_TEST_ID).toBe('ai-voice-record-toggle')
    expect(AI_VOICE_STATUS_TEST_ID).toBe('ai-voice-status')
    expect(AI_VOICE_ERROR_TEST_ID).toBe('ai-voice-error')
    expect(AI_MESSAGE_PLAY_TEST_ID).toBe('ai-message-play')
    expect(AI_HISTORY_PLAY_TEST_ID).toBe('ai-history-play')
  })

  it('transcribes recording then reuses the existing text send pipeline', async () => {
    aiStoreState.currentSessionId = 'session-legacy'

    const { useAiChat } = await import('../useAiChat')

    let resolveTranscription!: (value: {
      transcript: string
      locale: string
      provider: string
    }) => void

    transcribeAiSpeechMock.mockImplementation(
      () =>
        new Promise<{ transcript: string; locale: string; provider: string }>((resolve) => {
          resolveTranscription = resolve
        }),
    )
    chatMock.mockResolvedValueOnce({
      id: 'history-voice-1',
      sessionId: 'session-2',
      intent: 'QUERY',
      executeResult: 'SUCCESS',
      aiResponse: '当前空闲设备有 2 台。',
    })

    const chat = useAiChat()
    const audioBlob = new Blob(['voice'], { type: 'audio/webm' })
    const sendingPromise = chat.sendVoiceMessage(audioBlob)

    expect(transcribeAiSpeechMock).toHaveBeenCalledWith(audioBlob)
    expect(chat.loading.value).toBe(true)
    expect(chat.messages.value).toHaveLength(0)

    resolveTranscription({
      transcript: '  查询今天空闲设备  ',
      locale: 'zh-CN',
      provider: 'azure',
    })

    await sendingPromise

    expect(chatMock).toHaveBeenCalledWith({
      sessionId: 'session-legacy',
      message: '查询今天空闲设备',
    })
    expect(chat.loading.value).toBe(false)
    expect(chat.errorMessage.value).toBeNull()
    expect(chat.sessionId.value).toBe('session-2')
    expect(chat.messages.value).toHaveLength(2)
    expect(chat.messages.value[0]).toMatchObject({
      role: 'user',
      content: '查询今天空闲设备',
      status: 'sent',
    })
    expect(chat.messages.value[1]).toMatchObject({
      role: 'assistant',
      content: '当前空闲设备有 2 台。',
      intent: 'QUERY',
      executeResult: 'SUCCESS',
      historyId: 'history-voice-1',
      status: 'sent',
    })
  })

  it('surfaces transcription failure cleanly without polluting the existing message list', async () => {
    const { useAiChat } = await import('../useAiChat')

    transcribeAiSpeechMock.mockRejectedValueOnce({
      response: {
        data: {
          message: '语音功能未开启',
        },
      },
    })

    const chat = useAiChat()
    const result = await chat.sendVoiceMessage(new Blob(['voice'], { type: 'audio/webm' }))

    expect(result).toBeNull()
    expect(chatMock).not.toHaveBeenCalled()
    expect(chat.loading.value).toBe(false)
    expect(chat.messages.value).toHaveLength(0)
    expect(chat.errorMessage.value).toBe('语音功能未开启')
  })
})
