import { computed, defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiChatState = reactive({
  loading: false,
  sessionId: 'session-1',
  messages: [
    {
      id: 'assistant-1',
      role: 'assistant',
      content: '你好，我可以帮你查询设备与预约。',
      createdAt: '2026-03-17T08:00:00',
      intent: 'HELP',
      executeResult: 'GUIDE',
      historyId: 'history-1',
      status: 'sent',
    },
  ],
  latestResult: {
    id: 'history-1',
    sessionId: 'session-1',
    intent: 'HELP',
    executeResult: 'GUIDE',
    aiResponse: '你好，我可以帮你查询设备与预约。',
  } as {
    id: string
    sessionId: string
    intent: string
    executeResult: string
    aiResponse: string
  } | null,
})

const sendMessageMock = vi.fn()
const resetConversationMock = vi.fn()

vi.mock('@/composables/useAiChat', () => ({
  useAiChat: () => ({
    loading: computed(() => aiChatState.loading),
    sessionId: computed(() => aiChatState.sessionId),
    messages: computed(() => aiChatState.messages),
    latestResult: computed(() => aiChatState.latestResult),
    sendMessage: sendMessageMock,
    resetConversation: resetConversationMock,
  }),
}))

describe('Ai Chat view', () => {
  beforeEach(() => {
    sendMessageMock.mockReset()
    resetConversationMock.mockReset()
    aiChatState.loading = false
    aiChatState.sessionId = 'session-1'
    aiChatState.messages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        content: '你好，我可以帮你查询设备与预约。',
        createdAt: '2026-03-17T08:00:00',
        intent: 'HELP',
        executeResult: 'GUIDE',
        historyId: 'history-1',
        status: 'sent',
      },
    ]
    aiChatState.latestResult = {
      id: 'history-1',
      sessionId: 'session-1',
      intent: 'HELP',
      executeResult: 'GUIDE',
      aiResponse: '你好，我可以帮你查询设备与预约。',
    }
  })

  function createChatBoxStub() {
    return {
      props: ['loading', 'modelValue'],
      emits: ['submit', 'reset', 'update:modelValue'],
      template:
        '<div>' +
        '<span class="draft-value">{{ modelValue }}</span>' +
        '<button class="type-button" @click="$emit(\'update:modelValue\', \'帮我看明天可借设备\')">输入</button>' +
        '<button class="send-button" @click="$emit(\'submit\', modelValue)">发送</button>' +
        '<button class="reset-button" @click="$emit(\'reset\')">重置</button>' +
        '</div>',
    }
  }

  it('展示最新意图结果，并允许通过输入框发送消息', async () => {
    const module = await import('../Chat.vue')

    const wrapper = mount(module.default, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
          AiMessage: {
            props: ['message'],
            template: '<article class="message-stub">{{ message.content }}</article>',
          },
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          AiChatBox: createChatBoxStub(),
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElScrollbar: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
        },
      },
    })

    expect(wrapper.text()).toContain('AI 对话助手')
    expect(wrapper.text()).toContain('HELP')
    expect(wrapper.text()).toContain('GUIDE')
    expect(wrapper.text()).toContain('你好，我可以帮你查询设备与预约。')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')

    await wrapper.get('.reset-button').trigger('click')
    expect(resetConversationMock).toHaveBeenCalledTimes(1)
  })

  it('尚未收到 AI 返回时，只显示中性占位文案而不伪造意图值', async () => {
    aiChatState.messages = []
    aiChatState.latestResult = null

    const module = await import('../Chat.vue')
    const wrapper = mount(module.default, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
          AiMessage: {
            props: ['message'],
            template: '<article class="message-stub">{{ message.content }}</article>',
          },
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          AiChatBox: {
            props: ['loading', 'modelValue'],
            emits: ['submit', 'reset', 'update:modelValue'],
            template: '<div>输入区</div>',
          },
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElScrollbar: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
        },
      },
    })

    expect(wrapper.text()).toContain('等待 AI 返回')
    expect(wrapper.text()).toContain('尚未识别')
    expect(wrapper.text()).not.toContain('HELP')
  })

  it('发送失败时保留当前草稿，避免用户输入丢失', async () => {
    aiChatState.messages = []
    aiChatState.latestResult = null
    sendMessageMock.mockResolvedValueOnce(null)

    const module = await import('../Chat.vue')
    const wrapper = mount(module.default, {
      global: {
        stubs: {
          RouterLink: defineComponent({
            props: { to: { type: [String, Object], default: '' } },
            template: '<a><slot /></a>',
          }),
          AiMessage: {
            props: ['message'],
            template: '<article class="message-stub">{{ message.content }}</article>',
          },
          EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
          AiChatBox: createChatBoxStub(),
          ElButton: {
            emits: ['click'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
          ElTag: { template: '<span><slot /></span>' },
          ElScrollbar: { template: '<div><slot /></div>' },
          ElIcon: { template: '<i><slot /></i>' },
        },
      },
    })

    await wrapper.get('.type-button').trigger('click')
    expect(wrapper.get('.draft-value').text()).toBe('帮我看明天可借设备')

    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')
    expect(wrapper.get('.draft-value').text()).toBe('帮我看明天可借设备')
  })
})
