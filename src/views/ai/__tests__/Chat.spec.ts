import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { computed, defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const aiViewModules = import.meta.glob('../*.vue')

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

function readAiSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

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

vi.mock('@/stores/modules/app', () => ({
  useAppStore: () => ({
    resolvedTheme: 'light',
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

  async function loadChatView() {
    const loader = aiViewModules['../Chat.vue']

    if (!loader) {
      throw new Error('Chat.vue is missing')
    }

    return (await loader()) as { default: object }
  }

  async function loadDefaultLayout() {
    return (await import('@/layouts/DefaultLayout.vue')).default
  }

  it('展示最新意图结果，并允许通过输入框发送消息', async () => {
    const module = await loadChatView()

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

    expect(wrapper.find('.conversation-shell').exists()).toBe(true)
    expect(wrapper.find('.conversation-shell__sidebar').exists()).toBe(true)
    expect(wrapper.find('.conversation-shell__main').exists()).toBe(true)
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

  it('长会话时消息区仍保留局部滚动容器，避免整段消息把页面主滚动完全挤占', async () => {
    const module = await loadChatView()

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

    const messageScrollerStyle = window.getComputedStyle(
      wrapper.get('.ai-chat-view__messages').element,
    )
    const resolvedOverflowY = messageScrollerStyle.overflowY || messageScrollerStyle.overflow

    expect(resolvedOverflowY).toBe('auto')
    expect(messageScrollerStyle.maxHeight).not.toBe('')
    expect(messageScrollerStyle.maxHeight).not.toBe('none')
  })

  it('放进默认布局后仍同时保留主滚动容器与消息局部滚动容器', async () => {
    const chatModule = await loadChatView()
    const DefaultLayout = await loadDefaultLayout()

    const wrapper = mount(
      defineComponent({
        components: {
          ChatView: chatModule.default,
          DefaultLayout,
        },
        template: '<DefaultLayout><ChatView /></DefaultLayout>',
      }),
      {
        global: {
          stubs: {
            // 默认布局只需要稳定保留主滚动骨架，这里把头部和侧栏替换成轻量桩，避免测试关注点被布局依赖干扰。
            AppHeader: { template: '<div class="app-header-stub">头部</div>' },
            AppSidebar: { template: '<aside class="app-sidebar-stub">侧栏</aside>' },
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
      },
    )

    const mainScroll = wrapper.get('.default-layout__main-scroll')
    const messageScroller = wrapper.get('.ai-chat-view__messages')
    const mainScrollStyle = window.getComputedStyle(mainScroll.element)
    const messageScrollerStyle = window.getComputedStyle(messageScroller.element)
    const resolvedMainOverflowY = mainScrollStyle.overflowY || mainScrollStyle.overflow
    const resolvedMessageOverflowY = messageScrollerStyle.overflowY || messageScrollerStyle.overflow

    expect(wrapper.find('.default-layout').exists()).toBe(true)
    expect(mainScroll.find('.ai-chat-view').exists()).toBe(true)
    expect(mainScroll.element.contains(messageScroller.element)).toBe(true)
    expect(resolvedMainOverflowY).toBe('auto')
    expect(resolvedMessageOverflowY).toBe('auto')
    expect(messageScrollerStyle.maxHeight).not.toBe('')
    expect(messageScrollerStyle.maxHeight).not.toBe('none')
  })

  it('尚未收到 AI 返回时，只显示中性占位文案而不伪造意图值', async () => {
    aiChatState.messages = []
    aiChatState.latestResult = null

    const module = await loadChatView()
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

    const module = await loadChatView()
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

  it('聊天页源码改为消费主题 token，避免消息区在深色下残留浅色硬编码', () => {
    const source = readAiSource('src/views/ai/Chat.vue')

    // 这里直接锁定页面层主题 token，避免后续把浅色玻璃底色重新写回消息区与状态提示区域。
    expect(source).toContain('var(--app-surface-card)')
    expect(source).toContain('var(--app-tone-success-surface)')
    expect(source).toContain('var(--app-tone-warning-surface)')
    expect(source).toContain('var(--app-tone-danger-text)')
    expect(source).toContain('var(--app-shadow-card)')

    const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(/

    expect(source).not.toMatch(hardcodedColorPattern)
  })
})
