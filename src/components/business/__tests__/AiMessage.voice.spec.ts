import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAiSpeechPlayback } from '@/composables/useAiSpeechPlayback'

const businessComponentModules = import.meta.glob('../*.vue')

const { getAiHistorySpeechMock } = vi.hoisted(() => ({
  getAiHistorySpeechMock: vi.fn(),
}))

vi.mock('@/api/ai', () => ({
  getAiHistorySpeech: getAiHistorySpeechMock,
}))

type MockAudioListener = () => void

class MockAudioElement {
  src = ''
  currentTime = 0
  preload = 'auto'
  paused = true

  private listeners = new Map<string, Set<MockAudioListener>>()
  private queuedPlayError: Error | null = null

  play = vi.fn(async () => {
    this.paused = false

    if (this.queuedPlayError) {
      const error = this.queuedPlayError
      this.queuedPlayError = null
      this.paused = true
      throw error
    }
  })

  pause = vi.fn(() => {
    this.paused = true
  })

  load = vi.fn()

  addEventListener(eventName: string, listener: MockAudioListener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set())
    }

    this.listeners.get(eventName)?.add(listener)
  }

  removeEventListener(eventName: string, listener: MockAudioListener) {
    this.listeners.get(eventName)?.delete(listener)
  }

  queuePlayError(error: Error) {
    this.queuedPlayError = error
  }

  dispatchEnded() {
    this.listeners.get('ended')?.forEach((listener) => listener())
  }
}

describe('AiMessage voice playback', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let audioConstructorMock: ReturnType<typeof vi.fn>
  let createdAudios: MockAudioElement[]
  let nextAudioPlayError: Error | null

  beforeEach(() => {
    getAiHistorySpeechMock.mockReset()

    createdAudios = []
    nextAudioPlayError = null
    createObjectURLMock = vi.fn((blob: Blob) => `blob:mock-${blob.size}-${createObjectURLMock.mock.calls.length + 1}`)
    revokeObjectURLMock = vi.fn()
    audioConstructorMock = vi.fn(function MockAudioFactory() {
      const audio = new MockAudioElement()

      if (nextAudioPlayError) {
        audio.queuePlayError(nextAudioPlayError)
        nextAudioPlayError = null
      }

      createdAudios.push(audio)
      return audio as unknown as HTMLAudioElement
    })

    vi.stubGlobal('Audio', audioConstructorMock)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    })
  })

  async function loadAiMessageComponent() {
    const loader = businessComponentModules['../AiMessage.vue']

    if (!loader) {
      throw new Error('AiMessage.vue is missing')
    }

    return (await loader()) as { default: object }
  }

  async function mountVoiceHarness() {
    const module = await loadAiMessageComponent()

    const VoiceHarness = defineComponent({
      components: {
        AiMessage: module.default,
      },
      setup() {
        const speechPlayback = useAiSpeechPlayback()
        const messages = [
          {
            id: 'assistant-1',
            role: 'assistant',
            content: '第一条语音回复',
            createdAt: '2026-03-18T08:00:00',
            historyId: 'history-1',
            intent: 'QUERY',
            executeResult: 'SUCCESS',
            status: 'sent',
          },
          {
            id: 'assistant-2',
            role: 'assistant',
            content: '第二条语音回复',
            createdAt: '2026-03-18T08:05:00',
            historyId: 'history-2',
            intent: 'HELP',
            executeResult: 'GUIDE',
            status: 'sent',
          },
          {
            id: 'user-1',
            role: 'user',
            content: '这是一条用户消息',
            createdAt: '2026-03-18T08:06:00',
            status: 'sent',
          },
        ]

        function handleTogglePlayback(historyId: string) {
          void speechPlayback.togglePlayback(historyId)
        }

        function resolvePlaybackState(historyId?: string) {
          return speechPlayback.getPlaybackState(historyId)
        }

        return {
          handleTogglePlayback,
          messages,
          resolvePlaybackState,
        }
      },
      template: `
        <div>
          <AiMessage
            v-for="message in messages"
            :key="message.id"
            :message="message"
            :playback-state="resolvePlaybackState(message.historyId)"
            @toggle-playback="handleTogglePlayback"
          />
        </div>
      `,
    })

    return mount(VoiceHarness, {
      global: {
        stubs: {
          ElTag: { template: '<span><slot /></span>' },
        },
      },
    })
  }

  it('在同一聊天页内复用单个音频实例，并在切换或停止时回收旧 object URL', async () => {
    getAiHistorySpeechMock
      .mockResolvedValueOnce(new Blob(['first-audio'], { type: 'audio/mpeg' }))
      .mockResolvedValueOnce(new Blob(['second-audio'], { type: 'audio/mpeg' }))

    const wrapper = await mountVoiceHarness()
    const playButtons = wrapper.findAll('[data-testid="ai-message-play"]')
    const firstPlayButton = playButtons[0]!
    const secondPlayButton = playButtons[1]!

    expect(playButtons).toHaveLength(2)

    await firstPlayButton.trigger('click')
    await flushPromises()

    expect(getAiHistorySpeechMock).toHaveBeenNthCalledWith(1, 'history-1')
    expect(audioConstructorMock).toHaveBeenCalledTimes(1)
    expect(createdAudios[0]!.play).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLMock).not.toHaveBeenCalled()
    expect(firstPlayButton.text()).toContain('停止播放')

    await secondPlayButton.trigger('click')
    await flushPromises()

    expect(getAiHistorySpeechMock).toHaveBeenNthCalledWith(2, 'history-2')
    expect(audioConstructorMock).toHaveBeenCalledTimes(1)
    expect(createdAudios[0]!.pause).toHaveBeenCalled()
    expect(revokeObjectURLMock).toHaveBeenCalledWith(createObjectURLMock.mock.results[0]?.value)
    expect(secondPlayButton.text()).toContain('停止播放')

    await secondPlayButton.trigger('click')
    await flushPromises()

    expect(revokeObjectURLMock).toHaveBeenCalledWith(createObjectURLMock.mock.results[1]?.value)
    expect(secondPlayButton.text()).toContain('播放语音')
  })

  it('浏览器拒绝播放时，在对应 AI 回复下展示中文错误', async () => {
    nextAudioPlayError = new Error('NotAllowedError')
    getAiHistorySpeechMock.mockResolvedValueOnce(new Blob(['blocked'], { type: 'audio/mpeg' }))

    const wrapper = await mountVoiceHarness()

    await wrapper.get('[data-testid="ai-message-play"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('浏览器拒绝播放语音，请检查播放权限后重试')
    expect(revokeObjectURLMock).toHaveBeenCalledWith(createObjectURLMock.mock.results[0]?.value)
    expect(createdAudios[0]!.pause).toHaveBeenCalled()
  })

  it('播放结束后自动清理 object URL，避免留下孤儿 blob 引用', async () => {
    getAiHistorySpeechMock.mockResolvedValueOnce(new Blob(['ended-audio'], { type: 'audio/mpeg' }))

    const wrapper = await mountVoiceHarness()

    await wrapper.get('[data-testid="ai-message-play"]').trigger('click')
    await flushPromises()

    createdAudios[0]!.dispatchEnded()
    await flushPromises()

    expect(revokeObjectURLMock).toHaveBeenCalledWith(createObjectURLMock.mock.results[0]?.value)
    expect(wrapper.get('[data-testid="ai-message-play"]').text()).toContain('播放语音')
  })
})
