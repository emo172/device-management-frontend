<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import AiChatBox from '@/components/business/AiChatBox.vue'
import AiMessage from '@/components/business/AiMessage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useAiChat } from '@/composables/useAiChat'
import { useAiVoiceRecorder } from '@/composables/useAiVoiceRecorder'
import ConversationShell from '@/components/layout/ConversationShell.vue'
import { AiIntentType, AiIntentTypeLabel } from '@/enums'
import { useAiStore } from '@/stores/modules/ai'

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
  transcribeVoiceMessage,
  sessionId,
} = useAiChat()
const aiStore = useAiStore()

const draftMessage = ref('')
const messageScroller = ref<HTMLElement | null>(null)
const voiceTranscriptionErrorMessage = ref<string | null>(null)
const capabilityLoadFailed = ref(false)
const transcribingVoice = ref(false)
const voiceDraftReady = ref(false)

/**
 * 转写成功后只把 transcript 回填到草稿框。
 * 若用户已经手动输入了待发送内容，这里按“原草稿 + 换行 + transcript”合并，避免录音覆盖掉尚未发送的文字。
 */
function fillDraftWithTranscript(transcript: string) {
  draftMessage.value =
    draftMessage.value.trim().length === 0 ? transcript : `${draftMessage.value}\n${transcript}`
}

const chatEnabled = computed(() => aiStore.capabilities.chatEnabled)
const speechEnabled = computed(() => aiStore.capabilities.speechEnabled)
const {
  clearError: clearRecorderError,
  errorMessage: recorderErrorMessage,
  isRecording,
  isSupported: browserSupportsVoiceRecording,
  permissionDenied: voicePermissionDenied,
  startRecording,
  stopRecording,
} = useAiVoiceRecorder({
  async onRecorded(audioBlob) {
    transcribingVoice.value = true
    voiceTranscriptionErrorMessage.value = null
    voiceDraftReady.value = false

    try {
      const transcript = await transcribeVoiceMessage(audioBlob)

      if (!transcript) {
        voiceTranscriptionErrorMessage.value = errorMessage.value || '未识别到语音内容，请重试或直接输入文字。'
        return
      }

      fillDraftWithTranscript(transcript)
      voiceDraftReady.value = true
    } finally {
      transcribingVoice.value = false
    }
  },
})

const isTranscribing = computed(() => transcribingVoice.value)
const voiceErrorMessage = computed(
  () => voiceTranscriptionErrorMessage.value || recorderErrorMessage.value,
)
const chatInputDisabled = computed(
  () => capabilityLoadFailed.value || !aiStore.capabilitiesLoaded || !chatEnabled.value,
)
const voiceCapabilityDisabled = computed(
  () =>
    capabilityLoadFailed.value ||
    !aiStore.capabilitiesLoaded ||
    !chatEnabled.value ||
    !speechEnabled.value ||
    !browserSupportsVoiceRecording.value,
)

const voiceToggleDisabled = computed(
  () => !isRecording.value && (loading.value || isTranscribing.value || voiceCapabilityDisabled.value),
)

/**
 * 聊天页必须先消费后端能力真相源，再决定是否开放输入区。
 * 这里把“加载中 / 加载失败 / 后端显式关闭”都转成可见文案，避免 fail-closed 直接退化成空白页。
 */
const chatStatusText = computed(() => {
  if (capabilityLoadFailed.value) {
    return 'AI 能力加载失败，当前已关闭文字发送与语音录音，可先查看历史会话。'
  }

  if (!aiStore.capabilitiesLoaded) {
    return '正在校验 AI 能力，暂时关闭文字发送与语音录音，可先查看历史会话。'
  }

  if (!chatEnabled.value) {
    return 'AI 对话暂未开启，当前仅支持查看历史会话。'
  }

  return '回车发送，Shift + Enter 换行'
})

const voiceStatusText = computed(() => {
  if (isRecording.value) {
    return '正在录音，最多 60 秒后自动停止并转写。'
  }

  if (isTranscribing.value) {
    return '正在转写语音，请稍候。转写后回填输入框，请确认后发送。'
  }

  if (voiceDraftReady.value) {
    return '转写后回填输入框，请确认后发送。'
  }

  if (capabilityLoadFailed.value) {
    return 'AI 能力加载失败，当前语音录音暂不可用，可先查看历史会话。'
  }

  if (!aiStore.capabilitiesLoaded) {
    return '正在校验 AI 能力，暂时不能开启录音。'
  }

  if (!chatEnabled.value) {
    return 'AI 对话暂未开启，当前仅支持查看历史会话。'
  }

  if (!speechEnabled.value) {
    return '语音功能暂未开启，可继续输入文字消息。'
  }

  if (!browserSupportsVoiceRecording.value) {
    return '当前浏览器不支持录音，可继续输入文字消息。'
  }

  if (voicePermissionDenied.value) {
    return '麦克风权限未开启，可继续输入文字消息。'
  }

  return '点击开始录音，最长 60 秒；转写后回填输入框，请确认后发送。'
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
  if (chatInputDisabled.value || loading.value || isRecording.value || isTranscribing.value) {
    return
  }

  voiceTranscriptionErrorMessage.value = null

  try {
    const result = await sendMessage(message)

    if (result) {
      draftMessage.value = ''
      voiceDraftReady.value = false
    }
  } catch {
    // 发送失败提示由组合式函数统一处理，这里只阻止输入提交链路出现未处理拒绝。
  }
}

async function loadCapabilities() {
  capabilityLoadFailed.value = false

  try {
    await aiStore.fetchCapabilities()
  } catch {
    capabilityLoadFailed.value = true
  }
}

function handleResetConversation() {
  draftMessage.value = ''
  voiceTranscriptionErrorMessage.value = null
  voiceDraftReady.value = false
  clearRecorderError()
  resetConversation()
}

async function handleToggleRecording() {
  if (!isRecording.value && voiceToggleDisabled.value) {
    return
  }

  if (isRecording.value) {
    await stopRecording()
    return
  }

  voiceTranscriptionErrorMessage.value = null
  voiceDraftReady.value = false
  clearRecorderError()
  await startRecording()
}

onMounted(() => {
  void loadCapabilities()
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
          AI 为普通用户提供文字对话，并在桌面版 Chrome / Edge 开放语音录音转写；
          语音只做转写，转写后回填输入框，请确认后发送，若语音未开启或浏览器不支持，会自动回退到文字输入与历史查看路径。
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
            <AiMessage v-for="message in messages" :key="message.id" :message="message" />
          </div>
        </div>

        <p v-if="errorMessage" class="ai-chat-view__error">{{ errorMessage }}</p>
      </template>

      <template #footer>
        <AiChatBox
          v-model="draftMessage"
          :chat-disabled="chatInputDisabled"
          :chat-status-text="chatStatusText"
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
