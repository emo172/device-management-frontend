import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiViewModules = import.meta.glob('../*.vue')

const {
  clearCurrentHistoryMock,
  fetchCapabilitiesMock,
  fetchHistoryDetailMock,
  fetchHistoryListMock,
} = vi.hoisted(() => ({
  clearCurrentHistoryMock: vi.fn(),
  fetchCapabilitiesMock: vi.fn(),
  fetchHistoryDetailMock: vi.fn(),
  fetchHistoryListMock: vi.fn(),
}))

const aiStoreState = reactive({
  capabilities: {
    chatEnabled: false,
    speechEnabled: false,
  },
  capabilitiesLoaded: false,
  historyList: [] as Array<Record<string, string | null>>,
  currentHistory: null as Record<string, string | number | null> | null,
  loading: false,
})

vi.mock('@/stores/modules/ai', () => ({
  useAiStore: () => ({
    get capabilities() {
      return aiStoreState.capabilities
    },
    get capabilitiesLoaded() {
      return aiStoreState.capabilitiesLoaded
    },
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
    fetchCapabilities: fetchCapabilitiesMock,
    fetchHistoryList: fetchHistoryListMock,
    fetchHistoryDetail: fetchHistoryDetailMock,
  }),
}))

vi.mock('@/stores/modules/app', () => ({
  useAppStore: () => ({
    resolvedTheme: 'light',
  }),
}))

describe('Ai History voice cleanup', () => {
  beforeEach(() => {
    fetchCapabilitiesMock.mockReset()
    fetchHistoryListMock.mockReset()
    fetchHistoryDetailMock.mockReset()
    clearCurrentHistoryMock.mockImplementation(() => {
      aiStoreState.currentHistory = null
    })

    aiStoreState.capabilities = {
      chatEnabled: true,
      speechEnabled: true,
    }
    aiStoreState.capabilitiesLoaded = true
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
    ]
    aiStoreState.currentHistory = null

    fetchHistoryListMock.mockResolvedValue(aiStoreState.historyList)
    fetchHistoryDetailMock.mockImplementation(async (historyId: string) => {
      aiStoreState.currentHistory = {
        id: historyId,
        sessionId: 'session-1',
        userInput: '帮我预约明天上午的示波器',
        aiResponse: '已为你整理预约建议。',
        intent: 'RESERVE',
        extractedInfo: '{"deviceName":"示波器"}',
        executeResult: 'SUCCESS',
        errorMessage: null,
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

  it('历史详情只保留文字内容，不再请求能力或渲染播放入口', async () => {
    const wrapper = await mountHistoryView()

    await flushPromises()
    await wrapper.get('[data-history-id="history-1"]').trigger('click')
    await flushPromises()

    expect(fetchCapabilitiesMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('已为你整理预约建议。')
    expect(wrapper.findAll('.ai-history-view__detail-list dd button')).toHaveLength(0)
    expect(wrapper.find('.ai-history-view__play-button').exists()).toBe(false)
    expect(wrapper.find('.ai-history-view__playback-note').exists()).toBe(false)
    expect(wrapper.find('.ai-history-view__playback-error').exists()).toBe(false)
  })
})
