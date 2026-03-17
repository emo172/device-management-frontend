import { defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiStoreState = reactive({
  historyList: [] as Array<Record<string, string | null>>,
  currentHistory: null as Record<string, string | number | null> | null,
  loading: false,
})

const fetchHistoryListMock = vi.fn()
const fetchHistoryDetailMock = vi.fn()
const clearCurrentHistoryMock = vi.fn(() => {
  aiStoreState.currentHistory = null
})

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

describe('Ai History view', () => {
  beforeEach(() => {
    fetchHistoryListMock.mockReset()
    fetchHistoryDetailMock.mockReset()
    clearCurrentHistoryMock.mockClear()
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

  it('加载历史列表后，点击记录可以在页内查看详情', async () => {
    const module = await import('../History.vue')

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

    expect(fetchHistoryListMock).toHaveBeenCalledTimes(1)
    expect(clearCurrentHistoryMock).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('历史会话')
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

    const module = await import('../History.vue')
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
})
