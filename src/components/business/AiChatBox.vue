<script setup lang="ts">
import { computed } from 'vue'

import {
  AI_VOICE_ERROR_TEST_ID,
  AI_VOICE_RECORD_TOGGLE_TEST_ID,
  AI_VOICE_STATUS_TEST_ID,
} from '@/constants'

/**
 * AI 输入框组件。
 * 单独抽离输入区后，聊天页可以专注处理消息流与滚动，而输入草稿、禁用态和提交文案统一由该组件兜底。
 */
const props = withDefaults(
  defineProps<{
    modelValue: string
    chatDisabled?: boolean
    chatStatusText?: string
    loading?: boolean
    recording?: boolean
    transcribing?: boolean
    voiceStatusText?: string
    voiceErrorMessage?: string | null
    voiceToggleDisabled?: boolean
  }>(),
  {
    chatDisabled: false,
    chatStatusText: '回车发送，Shift + Enter 换行',
    loading: false,
    recording: false,
    transcribing: false,
    voiceStatusText: '点击开始录音，最长 60 秒；转写后回填输入框，请确认后发送。',
    voiceErrorMessage: null,
    voiceToggleDisabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [message: string]
  reset: []
  'toggle-recording': []
}>()

/**
 * 输入区是否可用只消费页面基于 Store 下发的集中能力结论。
 * 组件本身不再推测后端能力，避免出现与 `/api/ai/capabilities` 脱节的本地影子状态。
 */
const isInputDisabled = computed(
  () => props.chatDisabled || props.loading || props.recording || props.transcribing,
)
const canSubmit = computed(() => props.modelValue.trim().length > 0 && !isInputDisabled.value)
const textareaPlaceholder = computed(() =>
  props.chatDisabled
    ? '当前 AI 对话暂不可用，可先查看历史会话。'
    : '输入你的设备查询、预约建议或取消问题，AI 会先识别意图再返回结果。',
)

const voiceToggleLabel = computed(() => {
  if (props.recording) {
    return '停止录音'
  }

  if (props.transcribing) {
    return '转写中'
  }

  return '开始录音'
})

const voiceStatusClassName = computed(() => ({
  'ai-chat-box__voice-status--recording': props.recording,
  'ai-chat-box__voice-status--transcribing': props.transcribing,
}))

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function handleSubmit() {
  if (isInputDisabled.value) {
    return
  }

  const message = props.modelValue.trim()

  if (!message) {
    return
  }

  emit('submit', message)
}

/**
 * 新会话重置必须避开进行中的请求。
 * 否则旧请求返回时可能把结果写回已经清空的会话，造成消息列表与会话意图串话。
 */
function handleReset() {
  if (isInputDisabled.value) {
    return
  }

  emit('reset')
}

function handleToggleRecording() {
  if (!props.recording && (props.transcribing || props.voiceToggleDisabled)) {
    return
  }

  emit('toggle-recording')
}
</script>

<template>
  <div class="ai-chat-box ai-chat-box__surface">
    <textarea
      :value="modelValue"
      class="ai-chat-box__textarea"
      :disabled="isInputDisabled"
      :placeholder="textareaPlaceholder"
      rows="4"
      @input="handleInput"
      @keydown.enter.exact.prevent="handleSubmit"
    />

    <div class="ai-chat-box__footer">
      <div class="ai-chat-box__meta">
        <p class="ai-chat-box__tip">{{ chatStatusText }}</p>
        <p
          :data-testid="AI_VOICE_STATUS_TEST_ID"
          :class="['ai-chat-box__voice-status', voiceStatusClassName]"
          aria-live="polite"
        >
          {{ voiceStatusText }}
        </p>
        <p :data-testid="AI_VOICE_ERROR_TEST_ID" class="ai-chat-box__voice-error" aria-live="polite">
          {{ voiceErrorMessage || '' }}
        </p>
      </div>
      <div class="ai-chat-box__actions">
        <div class="ai-chat-box__voice-entry">
          <el-button
            :data-testid="AI_VOICE_RECORD_TOGGLE_TEST_ID"
            type="warning"
            plain
            :disabled="!recording && voiceToggleDisabled"
            :loading="transcribing"
            @click="handleToggleRecording"
          >
            {{ voiceToggleLabel }}
          </el-button>
          <!-- 录音入口附近必须稳定显示隐私边界，避免用户误以为浏览器录音会在本地或服务端长期留存。 -->
          <p class="ai-chat-box__privacy-hint">
            语音会先在浏览器内整理为 WAV，再交由第三方云语音服务处理，原始录音不做持久化存储。
          </p>
        </div>
        <el-button :disabled="isInputDisabled" @click="handleReset">开启新会话</el-button>
        <el-button type="primary" :disabled="!canSubmit" :loading="loading" @click="handleSubmit">
          发送消息
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.ai-chat-box {
  @include shell.console-surface(12px);

  padding: 22px;
  border-radius: 24px;
  background: var(--app-surface-card);
}

.ai-chat-box__textarea {
  width: 100%;
  resize: vertical;
  min-height: 120px;
  padding: 16px 18px;
  border: 1px solid var(--app-border-soft);
  border-radius: 18px;
  outline: none;
  font: inherit;
  line-height: 1.7;
  color: var(--app-text-primary);
  background: var(--app-surface-muted);
}

.ai-chat-box__textarea:focus {
  border-color: var(--app-tone-brand-border);
  box-shadow: var(--app-focus-ring);
}

.ai-chat-box__footer,
.ai-chat-box__actions,
.ai-chat-box__voice-entry {
  display: flex;
  gap: 12px;
}

.ai-chat-box__footer {
  margin-top: 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.ai-chat-box__meta {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.ai-chat-box__actions {
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.ai-chat-box__voice-entry {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.ai-chat-box__tip {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 13px;
}

.ai-chat-box__voice-status,
.ai-chat-box__voice-error {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.ai-chat-box__voice-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 6px 10px;
  border: 1px solid var(--app-tone-info-border);
  border-radius: 999px;
  color: var(--app-tone-info-text);
  background: var(--app-tone-info-surface);
}

.ai-chat-box__voice-status--recording {
  border-color: var(--app-tone-warning-border);
  color: var(--app-tone-warning-text);
  background: var(--app-tone-warning-surface);
}

.ai-chat-box__voice-status--transcribing {
  border-color: var(--app-tone-brand-border);
  color: var(--app-tone-brand-text);
  background: var(--app-tone-brand-surface);
}

.ai-chat-box__voice-error {
  color: var(--app-tone-danger-text);
}

.ai-chat-box__privacy-hint {
  max-width: 240px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--app-text-secondary);
}

.ai-chat-box__voice-error:empty {
  display: none;
}
</style>
