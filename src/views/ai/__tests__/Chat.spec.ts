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
const sendVoiceMessageMock = vi.fn()
const resetConversationMock = vi.fn()
const togglePlaybackMock = vi.fn()
const getPlaybackStateMock = vi.fn(() => 'idle')

class FakeMediaRecorder extends EventTarget {
  static supportedTypes = new Set<string>(['audio/webm;codecs=opus', 'audio/webm'])
  static isTypeSupportedCalls: string[] = []

  static isTypeSupported(type: string) {
    FakeMediaRecorder.isTypeSupportedCalls.push(type)
    return FakeMediaRecorder.supportedTypes.has(type)
  }

  readonly stream: MediaStream
  readonly mimeType: string
  state: RecordingState = 'inactive'
  private readonly chunk: Blob

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    super()
    this.stream = stream
    this.mimeType = options?.mimeType ?? 'audio/webm'
    this.chunk = new Blob(['voice'], { type: this.mimeType })
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    if (this.state === 'inactive') {
      return
    }

    this.state = 'inactive'

    const dataEvent = new Event('dataavailable') as Event & { data: Blob }
    dataEvent.data = this.chunk

    this.dispatchEvent(dataEvent)
    this.dispatchEvent(new Event('stop'))
  }
}

function readAiSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

function createMediaStreamStub() {
  const stopTrackMock = vi.fn()

  return {
    stopTrackMock,
    stream: {
      getTracks: () => [{ stop: stopTrackMock }],
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

function installMediaRecorder(supportedTypes: string[] = ['audio/webm;codecs=opus', 'audio/webm']) {
  FakeMediaRecorder.supportedTypes = new Set(supportedTypes)
  FakeMediaRecorder.isTypeSupportedCalls = []
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
}

vi.mock('@/composables/useAiChat', () => ({
  useAiChat: () => ({
    loading: computed(() => aiChatState.loading),
    sessionId: computed(() => aiChatState.sessionId),
    errorMessage: computed(() => aiChatState.errorMessage),
    messages: computed(() => aiChatState.messages),
    latestResult: computed(() => aiChatState.latestResult),
    sendMessage: sendMessageMock,
    sendVoiceMessage: sendVoiceMessageMock,
    resetConversation: resetConversationMock,
  }),
}))

vi.mock('@/composables/useAiSpeechPlayback', () => ({
  useAiSpeechPlayback: () => ({
    togglePlayback: togglePlaybackMock,
    getPlaybackState: getPlaybackStateMock,
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
      `<span data-testid="${AI_VOICE_STATUS_TEST_ID}" class="voice-status">{{ voiceStatusText }}</span>` +
      `<span data-testid="${AI_VOICE_ERROR_TEST_ID}" class="voice-error">{{ voiceErrorMessage || '' }}</span>` +
      '<button class="type-button" @click="$emit(\'update:modelValue\', \'帮我看明天可借设备\')">输入</button>' +
      '<button class="send-button" @click="$emit(\'submit\', modelValue)">发送</button>' +
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
      props: ['message', 'playbackState'],
      emits: ['toggle-playback'],
      template: '<article class="message-stub">{{ message.content }}</article>',
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

  return mount(module.default, {
    global: {
      stubs: createGlobalStubs(chatBoxStub),
    },
  })
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

    sendMessageMock.mockReset()
    sendVoiceMessageMock.mockReset()
    resetConversationMock.mockReset()
    togglePlaybackMock.mockReset()
    getPlaybackStateMock.mockReset()
    getPlaybackStateMock.mockReturnValue('idle')

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
    expect(wrapper.text()).toContain('自动回退到文字输入与查看路径')
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

  it('浏览器不支持 MediaRecorder 时仍保留文字聊天能力', async () => {
    const wrapper = await mountChatView()

    expect(getVoiceStatus(wrapper).text()).toContain('当前浏览器不支持录音，可继续输入文字消息。')
    expect(getRecordButton(wrapper).attributes('data-disabled')).toBe('true')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')
  })

  it('录音 60 秒后自动停止，并把 blob 交回既有 sendVoiceMessage 链路', async () => {
    vi.useFakeTimers()

    const { stream, stopTrackMock } = createMediaStreamStub()
    const getUserMediaMock = mockMediaDevices(() => Promise.resolve(stream))

    installMediaRecorder(['audio/webm'])
    sendVoiceMessageMock.mockResolvedValueOnce({ id: 'history-voice-1' })

    const wrapper = await mountChatView()

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    expect(getUserMediaMock).toHaveBeenCalledWith({ audio: true })
    expect(getVoiceStatus(wrapper).text()).toContain('正在录音，最多 60 秒后自动提交。')

    vi.advanceTimersByTime(60_000)
    await flushPromises()

    expect(sendVoiceMessageMock).toHaveBeenCalledTimes(1)

    const audioBlob = sendVoiceMessageMock.mock.calls[0]?.[0] as Blob

    expect(audioBlob).toBeInstanceOf(Blob)
    expect(audioBlob.type).toBe('audio/webm')
    expect(FakeMediaRecorder.isTypeSupportedCalls).toEqual(['audio/webm;codecs=opus', 'audio/webm'])
    expect(stopTrackMock).toHaveBeenCalledTimes(1)
    expect(getVoiceStatus(wrapper).text()).toContain('点击开始录音，最长 60 秒；转写成功后会自动发送。')
  })

  it('拒绝麦克风权限后给出中文提示，但不阻塞文字输入', async () => {
    installMediaRecorder()
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
    installMediaRecorder()
    const { stream } = createMediaStreamStub()

    mockMediaDevices(() => Promise.resolve(stream))
    sendVoiceMessageMock.mockImplementationOnce(async () => {
      aiChatState.errorMessage = '语音功能未开启'
      return null
    })

    const wrapper = await mountChatView()

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    await getRecordButton(wrapper).trigger('click')
    await flushPromises()

    expect(sendVoiceMessageMock).toHaveBeenCalledTimes(1)
    expect(getVoiceError(wrapper).text()).toContain('语音功能未开启')
    expect(wrapper.get('.recording-flag').text()).toBe('idle')
    expect(wrapper.get('.transcribing-flag').text()).toBe('stable')

    await wrapper.get('.type-button').trigger('click')
    await wrapper.get('.send-button').trigger('click')
    await flushPromises()

    expect(sendMessageMock).toHaveBeenCalledWith('帮我看明天可借设备')
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
})
