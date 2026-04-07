import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { computed, defineComponent, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AI_VOICE_ERROR_TEST_ID,
  AI_VOICE_RECORD_TOGGLE_TEST_ID,
  AI_VOICE_STATUS_TEST_ID,
} from '@/constants'

const aiViewModules = import.meta.glob('../*.vue')

const aiChatState = reactive({
  loading: false,
  sessionId: 'session-1',
  errorMessage: null as string | null,
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
const transcribeVoiceMessageMock = vi.fn()
const resetConversationMock = vi.fn()
const fetchCapabilitiesMock = vi.fn()

const aiStoreState = reactive({
  capabilities: {
    chatEnabled: false,
    speechEnabled: false,
  },
  capabilitiesLoaded: false,
})

class FakeAudioBuffer {
  readonly numberOfChannels: number

  constructor(private readonly channels: Float32Array[]) {
    this.numberOfChannels = channels.length
  }

  getChannelData(index: number) {
    return this.channels[index] ?? new Float32Array()
  }
}

class FakeAudioNode {
  connect(_target?: unknown) {
    return undefined
  }

  disconnect() {
    return undefined
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = { value: 1 }
}

class FakeScriptProcessorNode extends FakeAudioNode {
  onaudioprocess: ((event: { inputBuffer: FakeAudioBuffer }) => void) | null = null

  emitChunk() {
    this.onaudioprocess?.({
      inputBuffer: new FakeAudioBuffer([
        new Float32Array([0, 0.25, -0.25, 0.5]),
        new Float32Array([0, -0.25, 0.25, -0.5]),
      ]),
    })
  }
}

class FakeMediaStreamAudioSourceNode extends FakeAudioNode {
  override connect(target?: unknown) {
    if (target instanceof FakeScriptProcessorNode) {
      target.emitChunk()
    }

    return undefined
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = []

  readonly sampleRate = 48_000
  readonly destination = new FakeAudioNode()

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  async resume() {
    return undefined
  }

  createMediaStreamSource(_stream: MediaStream) {
    return new FakeMediaStreamAudioSourceNode() as unknown as MediaStreamAudioSourceNode
  }

  createScriptProcessor() {
    return new FakeScriptProcessorNode() as unknown as ScriptProcessorNode
  }

  createGain() {
    return new FakeGainNode() as unknown as GainNode
  }

  async close() {
    return undefined
  }
}

function readAiSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

function createMediaStreamStub() {
  const stopTrackMock = vi.fn()
  const track = {
    stop: stopTrackMock,
    getSettings: () => ({ sampleRate: 48_000 }),
  }

  return {
    stopTrackMock,
    stream: {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream,
  }
}

function mockMediaDevices(implementation: () => Promise<MediaStream>) {
  const getUserMedia = vi.fn(implementation)

  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia,
    },
  })

  return getUserMedia
}

function installAudioContext() {
  FakeAudioContext.instances = []
  vi.stubGlobal('AudioContext', FakeAudioContext)
  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: FakeAudioContext,
  })
}

vi.mock('@/composables/useAiChat', () => ({
  useAiChat: () => ({
    loading: computed(() => aiChatState.loading),
    sessionId: computed(() => aiChatState.sessionId),
    errorMessage: computed(() => aiChatState.errorMessage),
    messages: computed(() => aiChatState.messages),
    latestResult: computed(() => aiChatState.latestResult),
    sendMessage: sendMessageMock,
    transcribeVoiceMessage: transcribeVoiceMessageMock,
    resetConversation: resetConversationMock,
  }),
}))

vi.mock('@/stores/modules/ai', () => ({
  useAiStore: () => ({
    get capabilities() {
      return aiStoreState.capabilities
    },
    get capabilitiesLoaded() {
      return aiStoreState.capabilitiesLoaded
    },
    fetchCapabilities: fetchCapabilitiesMock,
  }),
}))

vi.mock('@/stores/modules/app', () => ({
  useAppStore: () => ({
    resolvedTheme: 'light',
  }),
}))

function createChatBoxStub() {
  return {
    props: [
      'loading',
      'modelValue',
      'chatDisabled',
      'chatStatusText',
      'recording',
      'transcribing',
      'voiceStatusText',
      'voiceErrorMessage',
      'voiceToggleDisabled',
    ],
    emits: ['submit', 'reset', 'update:modelValue', 'toggle-recording'],
    template:
      '<div>' +
      '<span class="draft-value">{{ modelValue }}</span>' +
      '<span class="chat-status">{{ chatStatusText }}</span>' +
      `<span data-testid="${AI_VOICE_STATUS_TEST_ID}" class="voice-status">{{ voiceStatusText }}</span>` +
      `<span data-testid="${AI_VOICE_ERROR_TEST_ID}" class="voice-error">{{ voiceErrorMessage || '' }}</span>` +
      '<button class="type-button" @click="$emit(\'update:modelValue\', \'帮我看明天可借设备\')">输入</button>' +
      '<button class="send-button" :data-chat-disabled="chatDisabled ? \'true\' : \'false\'" @click="$emit(\'submit\', modelValue)">发送</button>' +
      '<button class="reset-button" @click="$emit(\'reset\')">重置</button>' +
      `<button class="record-button" data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}" :data-disabled="voiceToggleDisabled ? 'true' : 'false'" @click="$emit('toggle-recording')">{{ recording ? '停止录音' : transcribing ? '转写中' : '开始录音' }}</button>` +
      '<span class="recording-flag">{{ recording ? \'recording\' : \'idle\' }}</span>' +
      '<span class="transcribing-flag">{{ transcribing ? \'transcribing\' : \'stable\' }}</span>' +
      '</div>',
  }
}

function createGlobalStubs(chatBoxStub = createChatBoxStub()) {
  return {
    RouterLink: defineComponent({
      props: { to: { type: [String, Object], default: '' } },
      template: '<a><slot /></a>',
    }),
    AiMessage: {
      props: ['message'],
      template:
        '<article class="message-stub">' +
        '<span class="message-content">{{ message.content }}</span>' +
        '</article>',
    },
    EmptyState: { template: '<div class="empty-state-stub"><slot /></div>' },
    AiChatBox: chatBoxStub,
    ElButton: {
      emits: ['click'],
      template: '<button @click="$emit(\'click\')"><slot /></button>',
    },
    ElTag: { template: '<span><slot /></span>' },
    ElScrollbar: { template: '<div><slot /></div>' },
    ElIcon: { template: '<i><slot /></i>' },
  }
}

async function loadChatView() {
  const loader = aiViewModules['../Chat.vue']

  if (!loader) {
    throw new Error('Chat.vue is missing')
  }

  return (await loader()) as { default: object }
}

async function mountChatView(chatBoxStub = createChatBoxStub()) {
  const module = await loadChatView()

  const wrapper = mount(module.default, {
    global: {
      stubs: createGlobalStubs(chatBoxStub),
    },
  })

  await flushPromises()

  return wrapper
}

async function loadDefaultLayout() {
  return (await import('@/layouts/DefaultLayout.vue')).default
}

function getVoiceStatus(wrapper: ReturnType<typeof mount>) {
  return wrapper.get(`[data-testid="${AI_VOICE_STATUS_TEST_ID}"]`)
}

function getVoiceError(wrapper: ReturnType<typeof mount>) {
  return wrapper.get(`[data-testid="${AI_VOICE_ERROR_TEST_ID}"]`)
}

function getRecordButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.get(`[data-testid="${AI_VOICE_RECORD_TOGGLE_TEST_ID}"]`)
}

describe('Ai Chat view', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: undefined,
    })

    sendMessageMock.mockReset()
    transcribeVoiceMessageMock.mockReset()
    resetConversationMock.mockReset()
    fetchCapabilitiesMock.mockReset()

    aiStoreState.capabilities = {
      chatEnabled: false,
      speechEnabled: false,
    }
    aiStoreState.capabilitiesLoaded = false

    fetchCapabilitiesMock.mockImplementation(async () => {
      aiStoreState.capabilities = {
        chatEnabled: true,
        speechEnabled: true,
      }
      aiStoreState.capabilitiesLoaded = true

      return aiStoreState.capabilities
    })

    aiChatState.loading = false
    aiChatState.sessionId = 'session-1'
    aiChatState.errorMessage = null
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

    mockMediaDevices(() => Promise.resolve(createMediaStreamStub().stream))
  })

  it('展示最新意图结果，并允许通过输入框发送消息', async () => {
    const wrapper = await mountChatView()

    expect(wrapper.find('.conversation-shell').exists()).toBe(true)
    expect(wrapper.find('.conversation-shell__sidebar').exists()).toBe(true)
    expect(wrapper.find('.conversation-shell__main').exists()).toBe(true)
    expect(wrapper.text()).toContain('AI 对话助手')
    expect(wrapper.text()).toContain('桌面版 Chrome / Edge')
    expect(wrapper.text()).toContain('自动回退到文字输入与历史查看路径')
    expect(wrapper.text()).toContain('HELP')
    expect(wrapper.text()).toContain('GUIDE')
    expect(wrapper.text()).toContain('你好，我可以帮你查询设备与预约。')
    expect(wrapper.findAll('.message-stub button')).toHaveLength(0)

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')

    await wrapper.get('.reset-button').trigger('click')
    expect(resetConversationMock).toHaveBeenCalledTimes(1)
  })

  it('后端关闭聊天能力时，仍保留页面与历史入口但阻断文字发送链路', async () => {
    fetchCapabilitiesMock.mockImplementation(async () => {
      aiStoreState.capabilities = {
        chatEnabled: false,
        speechEnabled: true,
      }
      aiStoreState.capabilitiesLoaded = true

      return aiStoreState.capabilities
    })

    const wrapper = await mountChatView()

    expect(wrapper.find('.conversation-shell').exists()).toBe(true)
    expect(wrapper.find('.ai-chat-view__history-link').exists()).toBe(true)
    expect(wrapper.get('.chat-status').text()).toContain('AI 对话暂未开启，当前仅支持查看历史会话。')
    expect(wrapper.get('.send-button').attributes('data-chat-disabled')).toBe('true')
    expect(getRecordButton(wrapper).attributes('data-disabled')).toBe('true')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it('后端关闭语音能力时给出中文降级提示，但仍允许继续发送文字消息', async () => {
    fetchCapabilitiesMock.mockImplementation(async () => {
      aiStoreState.capabilities = {
        chatEnabled: true,
        speechEnabled: false,
      }
      aiStoreState.capabilitiesLoaded = true

      return aiStoreState.capabilities
    })

    const wrapper = await mountChatView()

    expect(getVoiceStatus(wrapper).text()).toContain('语音功能暂未开启，可继续输入文字消息。')
    expect(getRecordButton(wrapper).attributes('data-disabled')).toBe('true')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')
  })

  it('能力加载失败时保持页面与历史入口可见，并按 fail-closed 阻断聊天与录音', async () => {
    const getUserMediaMock = mockMediaDevices(() => Promise.resolve(createMediaStreamStub().stream))

    fetchCapabilitiesMock.mockRejectedValueOnce(new Error('能力接口加载失败'))

    const wrapper = await mountChatView()

    expect(wrapper.find('.conversation-shell').exists()).toBe(true)
    expect(wrapper.find('.ai-chat-view__history-link').exists()).toBe(true)
    expect(wrapper.get('.chat-status').text()).toContain(
      'AI 能力加载失败，当前已关闭文字发送与语音录音，可先查看历史会话。',
    )
    expect(getVoiceStatus(wrapper).text()).toContain(
      'AI 能力加载失败，当前语音录音暂不可用，可先查看历史会话。',
    )
    expect(getRecordButton(wrapper).attributes('data-disabled')).toBe('true')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    expect(sendMessageMock).not.toHaveBeenCalled()
    expect(getUserMediaMock).not.toHaveBeenCalled()
  })

  it('浏览器不支持 Web Audio 录音时仍保留文字聊天能力', async () => {
    const wrapper = await mountChatView()

    expect(getVoiceStatus(wrapper).text()).toContain('当前浏览器不支持录音，可继续输入文字消息。')
    expect(getRecordButton(wrapper).attributes('data-disabled')).toBe('true')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')
  })

  it('录音 60 秒后自动停止，只把 transcript 回填到空草稿并等待手动发送', async () => {
    vi.useFakeTimers()

    const { stream, stopTrackMock } = createMediaStreamStub()
    const getUserMediaMock = mockMediaDevices(() => Promise.resolve(stream))

    installAudioContext()
    transcribeVoiceMessageMock.mockResolvedValueOnce('查询今天空闲设备')

    const wrapper = await mountChatView()

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true })
    expect(getVoiceStatus(wrapper).text()).toContain('正在录音，最多 60 秒后自动停止并转写。')

    vi.advanceTimersByTime(60_000)
    await flushPromises()

    expect(transcribeVoiceMessageMock).toHaveBeenCalledTimes(1)

    const audioBlob = transcribeVoiceMessageMock.mock.calls[0]?.[0] as Blob

    expect(audioBlob).toBeInstanceOf(Blob)
    expect(audioBlob.type).toBe('audio/wav')
    expect(stopTrackMock).toHaveBeenCalledTimes(1)
    expect(sendMessageMock).not.toHaveBeenCalled()
    expect(wrapper.get('.draft-value').element.textContent).toBe('查询今天空闲设备')
    expect(getVoiceStatus(wrapper).text()).toContain('转写后回填输入框，请确认后发送。')
  })

  it('拒绝麦克风权限后给出中文提示，但不阻塞文字输入', async () => {
    installAudioContext()
    const getUserMediaMock = mockMediaDevices(() =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
    )

    const wrapper = await mountChatView()

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true })
    expect(getVoiceStatus(wrapper).text()).toContain('麦克风权限未开启，可继续输入文字消息。')
    expect(getVoiceError(wrapper).text()).toContain('麦克风权限被拒绝，请在浏览器设置中允许访问后重试。')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')
  })

  it('语音转写失败时展示错误文案，并恢复到可继续文字输入的状态', async () => {
    installAudioContext()
    const { stream } = createMediaStreamStub()

    mockMediaDevices(() => Promise.resolve(stream))
    transcribeVoiceMessageMock.mockImplementationOnce(async () => {
      aiChatState.errorMessage = '语音功能未开启'
      return null
    })

    const wrapper = await mountChatView()

    await wrapper.get('.type-button').trigger('click')
    expect(wrapper.get('.draft-value').element.textContent).toBe('帮我看明天可借设备')

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    expect(transcribeVoiceMessageMock).toHaveBeenCalledTimes(1)
    expect(getVoiceError(wrapper).text()).toContain('语音功能未开启')
    expect(wrapper.get('.recording-flag').text()).toBe('idle')
    expect(wrapper.get('.transcribing-flag').text()).toBe('stable')
    expect(wrapper.get('.draft-value').element.textContent).toBe('帮我看明天可借设备')

    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')
  })

  it('草稿非空时会按换行追加 transcript，并继续等待用户手动发送', async () => {
    installAudioContext()
    const { stream } = createMediaStreamStub()

    mockMediaDevices(() => Promise.resolve(stream))
    transcribeVoiceMessageMock.mockResolvedValueOnce('再补一句语音内容')

    const wrapper = await mountChatView()

    await wrapper.get('.type-button').trigger('click')
    expect(wrapper.get('.draft-value').element.textContent).toBe('帮我看明天可借设备')

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    expect(transcribeVoiceMessageMock).toHaveBeenCalledTimes(1)
    expect(sendMessageMock).not.toHaveBeenCalled()
    expect(wrapper.get('.draft-value').element.textContent).toBe('帮我看明天可借设备\n再补一句语音内容')
    expect(getVoiceStatus(wrapper).text()).toContain('转写后回填输入框，请确认后发送。')
  })

  it('长会话时消息区仍保留局部滚动容器，避免整段消息把页面主滚动完全挤占', async () => {
    const wrapper = await mountChatView()

    const messageScrollerStyle = window.getComputedStyle(wrapper.get('.ai-chat-view__messages').element)
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
            AppHeader: { template: '<div class="app-header-stub">头部</div>' },
            AppSidebar: { template: '<aside class="app-sidebar-stub">侧栏</aside>' },
            ...createGlobalStubs(),
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

    const wrapper = await mountChatView({
      props: ['loading', 'modelValue'],
      emits: ['submit', 'reset', 'update:modelValue'],
      template: '<div>输入区</div>',
    })

    expect(wrapper.text()).toContain('等待 AI 返回')
    expect(wrapper.text()).toContain('尚未识别')
    expect(wrapper.text()).not.toContain('HELP')
  })

  it('发送失败时保留当前草稿，避免用户输入丢失', async () => {
    aiChatState.messages = []
    aiChatState.latestResult = null
    sendMessageMock.mockResolvedValueOnce(null)

    const wrapper = await mountChatView()

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

  it('聊天页源码已移除 MediaRecorder 与 audio/webm 录音契约', () => {
    const source = readAiSource('src/views/ai/Chat.vue')

    expect(source).toContain('useAiVoiceRecorder')
    expect(source).not.toContain('MediaRecorder')
    expect(source).not.toContain('audio/webm')
  })

  it('聊天页源码已移除播放组合式函数与播放提示文案', () => {
    const source = readAiSource('src/views/ai/Chat.vue')

    expect(source).not.toContain('toggle-playback')
    expect(source).not.toContain('playback-state')
    expect(source).not.toContain('speech-playback-available')
    expect(source).not.toContain('speech-playback-unavailable-message')
  })
})
