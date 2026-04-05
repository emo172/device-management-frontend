<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import AiChatBox from '@/components/business/AiChatBox.vue'
import AiMessage from '@/components/business/AiMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAiSpeechPlayback } from '@/composables/useAiSpeechPlayback'
import ConversationShell from '@/components/layout/ConversationShell.vue'
import { AiIntentType, AiIntentTypeLabel } from '@/enums'
import { useAiChat } from '@/composables/useAiChat'

/**
 * AI 对话页。
 * 该页仅对 `USER` 开放，承担“即时提问 + 立即看到意图识别与执行结果”的主入口；历史列表另拆页面，避免把不存在的后端多轮会话接口硬塞进一个视图。
 */
const {
  errorMessage,
  loading,
  latestResult,
  messages,
  resetConversation,
  sendMessage,
  sendVoiceMessage,
  sessionId,
} = useAiChat()
const speechPlayback = useAiSpeechPlayback()

type VoiceInputState = 'idle' | 'recording' | 'transcribing'

const draftMessage = ref('')
const messageScroller = ref<HTMLElement | null>(null)
const voiceState = ref<VoiceInputState>('idle')
const voiceErrorMessage = ref<string | null>(null)
const voicePermissionDenied = ref(false)
const recordedChunks = ref<Blob[]>([])
const mediaRecorder = ref<MediaRecorder | null>(null)
const mediaStream = ref<MediaStream | null>(null)
const recordingMimeType = ref('audio/webm')
const skipRecordedSubmission = ref(false)

let recordingTimer: number | null = null

const isRecording = computed(() => voiceState.value === 'recording')
const isTranscribing = computed(() => voiceState.value === 'transcribing')

const supportedVoiceMimeType = computed(() => resolveSupportedVoiceMimeType())

const canRecordVoice = computed(() => {
  if (typeof navigator === 'undefined') {
    return false
  }

  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof supportedVoiceMimeType.value === 'string'
  )
})

const voiceToggleDisabled = computed(
  () => !isRecording.value && (loading.value || isTranscribing.value || !canRecordVoice.value),
)

const voiceStatusText = computed(() => {
  if (isRecording.value) {
    return '正在录音，最多 60 秒后自动提交。'
  }

  if (isTranscribing.value) {
    return '正在转写语音并发送，请稍候。'
  }

  if (!canRecordVoice.value) {
    return '当前浏览器不支持录音，可继续输入文字消息。'
  }

  if (voicePermissionDenied.value) {
    return '麦克风权限未开启，可继续输入文字消息。'
  }

  return '点击开始录音，最长 60 秒；转写成功后会自动发送。'
})

const latestIntentText = computed(() => {
  const intent = latestResult.value?.intent

  if (!intent) {
    return '尚未识别'
  }

  return AiIntentTypeLabel[intent as AiIntentType] ?? intent
})

/**
 * 只有后端真实返回意图后才展示意图码。
 * 在首屏或尚未发送消息时使用中性占位文案，避免前端默认写死 `HELP` 造成“后端已识别”的假象。
 */
const latestIntentCode = computed(() => latestResult.value?.intent || '等待 AI 返回')

async function handleSubmitMessage(message: string) {
  voiceErrorMessage.value = null

  try {
    const result = await sendMessage(message)

    if (result) {
      draftMessage.value = ''
    }
  } catch {
    // 发送失败提示由组合式函数统一处理，这里只阻止输入提交链路出现未处理拒绝。
  }
}

function handleResetConversation() {
  draftMessage.value = ''
  voiceErrorMessage.value = null
  voicePermissionDenied.value = false

  /**
   * 新会话会清空当前消息列表。
   * 这里要同步停掉旧语音播放，避免页面已经没有停止入口时仍继续播报上一轮回复。
   */
  speechPlayback.stopPlayback()
  resetConversation()
}

function resolveSupportedVoiceMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null
  }

  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return 'audio/webm;codecs=opus'
  }

  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm'
  }

  return null
}

function clearRecordingTimer() {
  if (recordingTimer !== null) {
    window.clearTimeout(recordingTimer)
    recordingTimer = null
  }
}

function stopMediaTracks() {
  mediaStream.value?.getTracks().forEach((track) => track.stop())
  mediaStream.value = null
}

function clearRecorderResources() {
  clearRecordingTimer()
  mediaRecorder.value = null
  stopMediaTracks()
}

async function submitRecordedAudio() {
  if (skipRecordedSubmission.value) {
    skipRecordedSubmission.value = false
    recordedChunks.value = []
    recordingMimeType.value = 'audio/webm'
    clearRecorderResources()
    return
  }

  const audioBlob =
    recordedChunks.value.length > 0
      ? new Blob(recordedChunks.value, { type: recordingMimeType.value })
      : null

  recordedChunks.value = []
  recordingMimeType.value = 'audio/webm'
  clearRecorderResources()

  if (!audioBlob || audioBlob.size === 0) {
    voiceState.value = 'idle'
    voiceErrorMessage.value = '未采集到有效录音，请重试或直接输入文字。'
    return
  }

  voiceState.value = 'transcribing'

  const result = await sendVoiceMessage(audioBlob)

  if (!result) {
    voiceErrorMessage.value = errorMessage.value || '未识别到语音内容，请重试或直接输入文字。'
  }

  voiceState.value = 'idle'
}

async function startRecording() {
  if (voiceToggleDisabled.value) {
    return
  }

  const mimeType = supportedVoiceMimeType.value

  voiceErrorMessage.value = null
  voicePermissionDenied.value = false

  if (!canRecordVoice.value || !mimeType) {
    voiceErrorMessage.value = '当前浏览器不支持 MediaRecorder 录音，请继续使用文字输入。'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType })

    mediaStream.value = stream
    mediaRecorder.value = recorder
    recordingMimeType.value = mimeType
    recordedChunks.value = []
    skipRecordedSubmission.value = false

    recorder.addEventListener('dataavailable', (event) => {
      const chunk = (event as Event & { data?: Blob }).data

      if (chunk && chunk.size > 0) {
        recordedChunks.value.push(chunk)
      }
    })
    recorder.addEventListener('stop', () => {
      void submitRecordedAudio()
    })
    recorder.addEventListener('error', () => {
      skipRecordedSubmission.value = true
      voiceState.value = 'idle'
      voiceErrorMessage.value = '录音失败，请重试或直接输入文字。'
      recordedChunks.value = []
      clearRecorderResources()
    })

    recorder.start()
    voiceState.value = 'recording'
    recordingTimer = window.setTimeout(() => {
      stopRecording()
    }, 60_000)
  } catch (error) {
    voiceState.value = 'idle'
    stopMediaTracks()

    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      voicePermissionDenied.value = true
      voiceErrorMessage.value = '麦克风权限被拒绝，请在浏览器设置中允许访问后重试。'
      return
    }

    voiceErrorMessage.value = '无法启动录音，请稍后重试或直接输入文字。'
  }
}

function stopRecording() {
  const recorder = mediaRecorder.value

  clearRecordingTimer()

  if (!recorder || recorder.state === 'inactive') {
    return
  }

  recorder.stop()
}

function handleToggleRecording() {
  if (isRecording.value) {
    stopRecording()
    return
  }

  void startRecording()
}

function handleToggleMessagePlayback(historyId: string) {
  void speechPlayback.togglePlayback(historyId)
}

function resolveMessagePlaybackState(historyId?: string) {
  return speechPlayback.getPlaybackState(historyId)
}

onBeforeUnmount(() => {
  const recorder = mediaRecorder.value

  clearRecordingTimer()

  if (recorder && recorder.state !== 'inactive') {
    skipRecordedSubmission.value = true
    recorder.stop()
  }

  clearRecorderResources()
})

watch(
  () => messages.value.length,
  async () => {
    await nextTick()

    if (messageScroller.value) {
      messageScroller.value.scrollTop = messageScroller.value.scrollHeight
    }
  },
)
</script>

<template>
  <section class="ai-chat-view">
    <header class="ai-chat-view__hero">
      <div>
        <p class="ai-chat-view__eyebrow">AI 助手</p>
        <h1 class="ai-chat-view__title">AI 对话助手</h1>
        <p class="ai-chat-view__description">
          AI 为普通用户提供文字对话，并在桌面版 Chrome / Edge 开放语音录音与历史播报；
          若语音未开启或浏览器不支持，会自动回退到文字输入与查看路径。
        </p>
      </div>

      <div class="ai-chat-view__hero-actions">
        <el-tag type="success" effect="light">会话：{{ sessionId || '新会话' }}</el-tag>
      </div>
    </header>

    <ConversationShell class="ai-chat-view__shell">
      <template #sidebar>
        <div class="ai-chat-view__sidebar-stack">
          <article class="ai-chat-view__summary-card">
            <p>最新意图</p>
            <strong>{{ latestIntentCode }}</strong>
            <span>{{ latestIntentText }}</span>
          </article>
          <article class="ai-chat-view__summary-card summary-card--amber">
            <p>执行结果</p>
            <strong>{{ latestResult?.executeResult || '等待发送' }}</strong>
            <span>发送后立即回显当前一轮执行状态</span>
          </article>

          <!-- AI 历史页与即时对话页共用会话工作台语义，入口固定放在侧栏，避免主消息流被跳转操作打断。 -->
          <RouterLink class="ai-chat-view__history-link" to="/ai/history">查看历史会话</RouterLink>
        </div>
      </template>

      <template #main>
        <div ref="messageScroller" class="ai-chat-view__messages">
          <EmptyState
            v-if="!messages.length"
            title="开始第一轮 AI 对话"
            description="你可以询问空闲设备、预约建议或取消限制；页面会在当前窗口保留本轮消息流。"
          />

          <div v-else class="ai-chat-view__message-list">
            <AiMessage
              v-for="message in messages"
              :key="message.id"
              :message="message"
              :playback-state="resolveMessagePlaybackState(message.historyId)"
              @toggle-playback="handleToggleMessagePlayback"
            />
          </div>
        </div>

        <p v-if="errorMessage" class="ai-chat-view__error">{{ errorMessage }}</p>
      </template>

      <template #footer>
        <AiChatBox
          v-model="draftMessage"
          :loading="loading"
          :recording="isRecording"
          :transcribing="isTranscribing"
          :voice-status-text="voiceStatusText"
          :voice-error-message="voiceErrorMessage"
          :voice-toggle-disabled="voiceToggleDisabled"
          @submit="handleSubmitMessage"
          @reset="handleResetConversation"
          @toggle-recording="handleToggleRecording"
        />
      </template>
    </ConversationShell>
  </section>
</template>

<style scoped lang="scss">
.ai-chat-view {
  display: grid;
  gap: 24px;
}

.ai-chat-view__hero,
.ai-chat-view__summary-card {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.ai-chat-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, var(--app-tone-success-surface-strong), transparent 34%),
    radial-gradient(circle at bottom left, var(--app-tone-warning-surface), transparent 28%),
    linear-gradient(135deg, var(--app-surface-card-strong), var(--app-surface-card));
}

.ai-chat-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-tone-success-text);
}

.ai-chat-view__title {
  margin: 0;
  color: var(--app-text-primary);
  font-size: clamp(30px, 4vw, 40px);
}

.ai-chat-view__description {
  max-width: 780px;
  margin: 14px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.8;
}

.ai-chat-view__hero-actions {
  display: flex;
  gap: 12px;
  align-self: flex-start;
  align-items: center;
}

.ai-chat-view__history-link {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  text-decoration: none;
  color: var(--app-tone-success-text);
  background: var(--app-surface-overlay);
  border: 1px solid var(--app-tone-success-border);
  box-shadow: var(--app-shadow-solid);
}

.ai-chat-view__shell,
.ai-chat-view__sidebar-stack {
  display: grid;
  gap: 20px;
}

.ai-chat-view__summary-card {
  display: grid;
  gap: 8px;
  padding: 20px 22px;
  // 摘要卡直接消费 tone token，才能让深色主题下的状态层级继续可读，而不是残留浅色玻璃底。
  background: linear-gradient(
    135deg,
    var(--app-tone-success-surface),
    var(--app-surface-card-strong)
  );
  border-color: var(--app-tone-success-border);
}

.summary-card--amber {
  background: linear-gradient(
    135deg,
    var(--app-tone-warning-surface),
    var(--app-surface-card-strong)
  );
  border-color: var(--app-tone-warning-border);
}

.ai-chat-view__summary-card p,
.ai-chat-view__summary-card span {
  margin: 0;
  color: var(--app-text-secondary);
}

.ai-chat-view__summary-card strong {
  color: var(--app-text-primary);
  font-size: 22px;
}

.ai-chat-view__messages {
  min-height: 420px;
  // AI 长会话需要在消息区内部保留滚动，否则整段消息会把页面主滚动完全挤占，破坏默认布局的滚动边界分工。
  max-height: min(72vh, 720px);
  overflow-y: auto;
  padding: 18px;
  padding-right: 6px;
  border: 1px solid var(--app-border-soft);
  border-radius: var(--app-radius-md);
  background:
    linear-gradient(180deg, var(--app-tone-info-surface), transparent), var(--app-surface-card);
}

.ai-chat-view__message-list {
  display: grid;
  gap: 16px;
}

.ai-chat-view__error {
  margin: 0;
  color: var(--app-tone-danger-text);
  font-size: 14px;
}
</style>
