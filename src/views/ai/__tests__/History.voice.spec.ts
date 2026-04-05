import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiViewModules = import.meta.glob('../*.vue')

const {
  clearCurrentHistoryMock,
  fetchHistoryDetailMock,
  fetchHistoryListMock,
  getAiHistorySpeechMock,
} = vi.hoisted(() => ({
  clearCurrentHistoryMock: vi.fn(),
  fetchHistoryDetailMock: vi.fn(),
  fetchHistoryListMock: vi.fn(),
  getAiHistorySpeechMock: vi.fn(),
}))

const aiStoreState = reactive({
  historyList: [] as Array<Record<string, string | null>>,
  currentHistory: null as Record<string, string | number | null> | null,
  loading: false,
})

vi.mock('@/api/ai', () => ({
  getAiHistorySpeech: getAiHistorySpeechMock,
}))

vi.mock('@/stores/modules/ai', () => ({
  useAiStore: () => ({
    get historyList() {
      return aiStoreState.historyList
    },
    get currentHistory() {
      return aiStoreState.currentHistory
    },
    get loading() {
      return aiStoreState.loading
    },
    clearCurrentHistory: clearCurrentHistoryMock,
    fetchHistoryList: fetchHistoryListMock,
    fetchHistoryDetail: fetchHistoryDetailMock,
  }),
}))

vi.mock('@/stores/modules/app', () => ({
  useAppStore: () => ({
    resolvedTheme: 'light',
  }),
}))

type MockAudioListener = () => void

class MockAudioElement {
  src = ''
  currentTime = 0
  preload = 'auto'
  paused = true

  private listeners = new Map<string, Set<MockAudioListener>>()

  play = vi.fn(async () => {
    this.paused = false
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
}

describe('Ai History voice playback', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>
  let revokeObjectURLMock: ReturnType<typeof vi.fn>
  let audioConstructorMock: ReturnType<typeof vi.fn>
  let createdAudios: MockAudioElement[]

  beforeEach(() => {
    getAiHistorySpeechMock.mockReset()
    fetchHistoryListMock.mockReset()
    fetchHistoryDetailMock.mockReset()
    clearCurrentHistoryMock.mockImplementation(() => {
      aiStoreState.currentHistory = null
    })

    createdAudios = []
    createObjectURLMock = vi.fn((blob: Blob) => `blob:history-${blob.size}-${createObjectURLMock.mock.calls.length + 1}`)
    revokeObjectURLMock = vi.fn()
    audioConstructorMock = vi.fn(function MockAudioFactory() {
      const audio = new MockAudioElement()
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

    aiStoreState.loading = false
    aiStoreState.historyList = [
      {
        id: 'history-1',
        sessionId: 'session-1',
        userInput: '帮我预约明天上午的示波器',
        intent: 'RESERVE',
        executeResult: 'SUCCESS',
        createdAt: '2026-03-17T08:00:00',
      },
      {
        id: 'history-2',
        sessionId: 'session-2',
        userInput: '取消明天下午的热像仪预约',
        intent: 'CANCEL',
        executeResult: 'FAILED',
        createdAt: '2026-03-16T13:00:00',
      },
    ]
    aiStoreState.currentHistory = null

    fetchHistoryListMock.mockResolvedValue(aiStoreState.historyList)
    fetchHistoryDetailMock.mockImplementation(async (historyId: string) => {
      aiStoreState.currentHistory = {
        id: historyId,
        sessionId: historyId === 'history-1' ? 'session-1' : 'session-2',
        userInput: historyId === 'history-1' ? '帮我预约明天上午的示波器' : '取消明天下午的热像仪预约',
        aiResponse: historyId === 'history-1' ? '已为你整理预约建议。' : '该预约已在 24 小时内，无法取消。',
        intent: historyId === 'history-1' ? 'RESERVE' : 'CANCEL',
        extractedInfo: historyId === 'history-1' ? '{"deviceName":"示波器"}' : null,
        executeResult: historyId === 'history-1' ? 'SUCCESS' : 'FAILED',
        errorMessage: historyId === 'history-1' ? null : '开始前 24 小时内不可取消',
        llmModel: 'mock-model',
        responseTimeMs: 120,
        createdAt: '2026-03-17T08:00:00',
      }

      return aiStoreState.currentHistory
    })
  })

  async function loadHistoryView() {
    const loader = aiViewModules['../History.vue']

    if (!loader) {
      throw new Error('History.vue is missing')
    }

    return (await loader()) as { default: object }
  }

  async function mountHistoryView() {
    const module = await loadHistoryView()

    return mount(module.default, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElEmpty: { template: '<div><slot name="description" />空状态</div>' },
          ElScrollbar: { template: '<div><slot /></div>' },
        },
      },
    })
  }

  it('只在右侧历史详情区提供播放入口，并在切换详情时停止旧播放', async () => {
    getAiHistorySpeechMock.mockResolvedValueOnce(new Blob(['history-audio'], { type: 'audio/mpeg' }))

    const wrapper = await mountHistoryView()

    await flushPromises()
    await wrapper.get('[data-history-id="history-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="ai-history-play"]')).toHaveLength(1)
    expect(wrapper.find('.ai-history-view__list [data-testid="ai-history-play"]').exists()).toBe(false)

    await wrapper.get('[data-testid="ai-history-play"]').trigger('click')
    await flushPromises()

    expect(audioConstructorMock).toHaveBeenCalledTimes(1)
    expect(createdAudios[0]!.play).toHaveBeenCalledTimes(1)

    await wrapper.get('[data-history-id="history-2"]').trigger('click')
    await flushPromises()

    expect(revokeObjectURLMock).toHaveBeenCalledWith(createObjectURLMock.mock.results[0]?.value)
    expect(createdAudios[0]!.pause).toHaveBeenCalled()
    expect(wrapper.text()).toContain('该预约已在 24 小时内，无法取消。')
  })

  it('历史语音拉取失败时，在详情区展示请求层返回的中文错误', async () => {
    getAiHistorySpeechMock.mockRejectedValueOnce(new Error('AI 历史语音播放失败，请稍后重试'))

    const wrapper = await mountHistoryView()

    await flushPromises()
    await wrapper.get('[data-history-id="history-1"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="ai-history-play"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('AI 历史语音播放失败，请稍后重试')
  })

  it('鉴权失败时在详情区提示重新登录，而不是暴露英文状态码错误', async () => {
    getAiHistorySpeechMock.mockRejectedValueOnce({
      response: {
        status: 401,
      },
    })

    const wrapper = await mountHistoryView()

    await flushPromises()
    await wrapper.get('[data-history-id="history-1"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="ai-history-play"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('登录已过期，请重新登录后再试')
  })
})
