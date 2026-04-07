import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiViewModules = import.meta.glob('../*.vue')

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

const fetchCapabilitiesMock = vi.fn()
const fetchHistoryListMock = vi.fn()
const fetchHistoryDetailMock = vi.fn()
const clearCurrentHistoryMock = vi.fn(() => {
  aiStoreState.currentHistory = null
})

function readAiSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

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

describe('Ai History view', () => {
  beforeEach(() => {
    fetchCapabilitiesMock.mockReset()
    fetchHistoryListMock.mockReset()
    fetchHistoryDetailMock.mockReset()
    clearCurrentHistoryMock.mockClear()
    aiStoreState.capabilities = {
      chatEnabled: false,
      speechEnabled: false,
    }
    aiStoreState.capabilitiesLoaded = false
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
    fetchCapabilitiesMock.mockImplementation(async () => {
      aiStoreState.capabilities = {
        chatEnabled: true,
        speechEnabled: true,
      }
      aiStoreState.capabilitiesLoaded = true
      return aiStoreState.capabilities
    })
    fetchHistoryListMock.mockResolvedValue(aiStoreState.historyList)
    fetchHistoryDetailMock.mockImplementation(async (historyId: string) => {
      aiStoreState.currentHistory = {
        id: historyId,
        sessionId: historyId === 'history-1' ? 'session-1' : 'session-2',
        userInput:
          historyId === 'history-1' ? '帮我预约明天上午的示波器' : '取消明天下午的热像仪预约',
        aiResponse:
          historyId === 'history-1' ? '已为你整理预约建议。' : '该预约已在 24 小时内，无法取消。',
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

  it('加载历史列表后，点击记录可以在页内查看详情', async () => {
    const module = await loadHistoryView()

    const wrapper = mount(module.default, {
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

    await flushPromises()

    expect(wrapper.find('.conversation-shell').exists()).toBe(true)
    expect(wrapper.find('.conversation-shell__sidebar').exists()).toBe(true)
    expect(wrapper.find('.conversation-shell__main').exists()).toBe(true)
    expect(fetchHistoryListMock).toHaveBeenCalledTimes(1)
    expect(clearCurrentHistoryMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('历史会话')
    expect(wrapper.text()).toContain('转写后回填输入框，请确认后发送')
    expect(wrapper.text()).toContain('历史页只保留用户输入、AI 回复、执行结果与错误信息等文字记录。')
    expect(wrapper.text()).toContain('帮我预约明天上午的示波器')

    await wrapper.get('[data-history-id="history-2"]').trigger('click')
    await flushPromises()

    expect(fetchHistoryDetailMock).toHaveBeenCalledWith('history-2')
    expect(wrapper.text()).toContain('该预约已在 24 小时内，无法取消。')
    expect(wrapper.text()).toContain('开始前 24 小时内不可取消')
  })

  it('重新进入历史页时会先清掉旧详情，避免闪出陈旧内容', async () => {
    aiStoreState.currentHistory = {
      id: 'history-stale',
      sessionId: 'session-stale',
      userInput: '旧输入',
      aiResponse: '旧回复',
      intent: 'QUERY',
      extractedInfo: null,
      executeResult: 'SUCCESS',
      errorMessage: null,
      llmModel: 'mock-model',
      responseTimeMs: 120,
      createdAt: '2026-03-16T10:00:00',
    }

    const module = await loadHistoryView()
    const wrapper = mount(module.default, {
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

    await flushPromises()

    expect(clearCurrentHistoryMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('旧回复')
    expect(wrapper.text()).toContain('选择一条历史记录')
  })

  it('详情加载失败时保留上一条成功记录的高亮与详情，避免左右区域错位', async () => {
    const module = await loadHistoryView()
    const wrapper = mount(module.default, {
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

    await flushPromises()
    await wrapper.get('[data-history-id="history-1"]').trigger('click')
    await flushPromises()

    fetchHistoryDetailMock.mockRejectedValueOnce(new Error('detail failed'))

    await wrapper.get('[data-history-id="history-2"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-history-id="history-1"]').classes()).toContain(
      'ai-history-view__history-item--active',
    )
    expect(wrapper.get('[data-history-id="history-2"]').classes()).not.toContain(
      'ai-history-view__history-item--active',
    )
    expect(wrapper.text()).toContain('已为你整理预约建议。')
  })

  it('详情返回与当前点击不一致时，不覆盖最新选中态', async () => {
    fetchHistoryDetailMock.mockResolvedValueOnce({
      id: 'history-2',
      sessionId: 'session-2',
      userInput: '取消明天下午的热像仪预约',
      aiResponse: '该预约已在 24 小时内，无法取消。',
      intent: 'CANCEL',
      extractedInfo: null,
      executeResult: 'FAILED',
      errorMessage: '开始前 24 小时内不可取消',
      llmModel: 'mock-model',
      responseTimeMs: 120,
      createdAt: '2026-03-16T13:00:00',
    })

    const module = await loadHistoryView()
    const wrapper = mount(module.default, {
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

    await flushPromises()
    await wrapper.get('[data-history-id="history-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-history-id="history-1"]').classes()).not.toContain(
      'ai-history-view__history-item--active',
    )
  })

  it('连续点击两条历史时，只保留最后一次点击的高亮与详情', async () => {
    const pendingResolvers = new Map<
      string,
      (value: Record<string, string | number | null>) => void
    >()

    fetchHistoryDetailMock.mockImplementation(
      (historyId: string) =>
        new Promise<Record<string, string | number | null>>((resolve) => {
          pendingResolvers.set(historyId, resolve)
        }),
    )

    const module = await loadHistoryView()
    const wrapper = mount(module.default, {
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

    await flushPromises()
    await wrapper.get('[data-history-id="history-1"]').trigger('click')
    await wrapper.get('[data-history-id="history-2"]').trigger('click')

    const historyTwoDetail = {
      id: 'history-2',
      sessionId: 'session-2',
      userInput: '取消明天下午的热像仪预约',
      aiResponse: '该预约已在 24 小时内，无法取消。',
      intent: 'CANCEL',
      extractedInfo: null,
      executeResult: 'FAILED',
      errorMessage: '开始前 24 小时内不可取消',
      llmModel: 'mock-model',
      responseTimeMs: 120,
      createdAt: '2026-03-16T13:00:00',
    }

    aiStoreState.currentHistory = historyTwoDetail
    pendingResolvers.get('history-2')?.(historyTwoDetail)
    await flushPromises()

    const historyOneDetail = {
      id: 'history-1',
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

    aiStoreState.currentHistory = historyOneDetail
    pendingResolvers.get('history-1')?.(historyOneDetail)
    await flushPromises()

    expect(wrapper.get('[data-history-id="history-2"]').classes()).toContain(
      'ai-history-view__history-item--active',
    )
    expect(wrapper.get('[data-history-id="history-1"]').classes()).not.toContain(
      'ai-history-view__history-item--active',
    )
  })

  it('历史页源码改为消费主题 token，避免时间轴与详情面板写死浅色背景', () => {
    const source = readAiSource('src/views/ai/History.vue')

    // 历史页左侧列表、选中态和右侧详情卡都需要走语义 token，才能跟随全站主题统一切换。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-surface-muted)')
    expect(source).toContain('var(--app-tone-success-surface)')
    expect(source).toContain('var(--app-tone-brand-border)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
