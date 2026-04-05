<script setup lang="ts">
import { computed } from 'vue'

import type { AiChatMessage } from '@/composables/useAiChat'
import { AI_MESSAGE_PLAY_TEST_ID } from '@/constants/ai'
import { AiIntentType, AiIntentTypeLabel, AiIntentTypeTagType } from '@/enums'
import { formatDateTime } from '@/utils/date'

interface AiMessagePlaybackState {
  isLoading: boolean
  isPlaying: boolean
  errorMessage: string | null
}

/**
 * AI 单条消息组件。
 * 把消息气泡、角色区分和意图/执行结果元信息收敛到独立组件，便于聊天页与历史详情页以后复用同一套视觉表达。
 */
const props = defineProps<{
  message: AiChatMessage
  playbackState?: AiMessagePlaybackState | null
}>()

const emit = defineEmits<{
  'toggle-playback': [historyId: string]
}>()

const isAssistant = computed(() => props.message.role === 'assistant')
const canPlayVoice = computed(() => isAssistant.value && Boolean(props.message.historyId))
const playbackButtonLabel = computed(() => {
  if (props.playbackState?.isLoading) {
    return '加载语音中...'
  }

  return props.playbackState?.isPlaying ? '停止播放' : '播放语音'
})

function resolveIntentLabel(intent?: string) {
  if (!intent) {
    return '未识别'
  }

  return AiIntentTypeLabel[intent as AiIntentType] ?? intent
}

function resolveIntentTagType(intent?: string): StatusTagType {
  if (!intent) {
    return 'info'
  }

  return AiIntentTypeTagType[intent as AiIntentType] ?? 'info'
}

function handleTogglePlayback() {
  if (!props.message.historyId) {
    return
  }

  emit('toggle-playback', props.message.historyId)
}
</script>

<template>
  <article
    class="ai-message"
    :class="{
      'ai-message--assistant': isAssistant,
      'ai-message--failed': message.status === 'failed',
    }"
  >
    <div class="ai-message__bubble">
      <div class="ai-message__header">
        <strong>{{ isAssistant ? 'AI 助手' : '我' }}</strong>
        <time>{{ formatDateTime(message.createdAt) }}</time>
      </div>

      <p class="ai-message__content">{{ message.content }}</p>

      <!-- 只有 AI 回复才展示意图与执行结果，避免把用户输入错误地渲染成系统判定结果。 -->
      <div v-if="isAssistant" class="ai-message__meta">
        <el-tag size="small" :type="resolveIntentTagType(message.intent)" effect="light">
          意图：{{ resolveIntentLabel(message.intent) }}
        </el-tag>
        <el-tag size="small" type="warning" effect="plain">
          执行：{{ message.executeResult || '未返回' }}
        </el-tag>
        <!-- 只有落库后的 AI 回复才有 historyId，可安全走受保护语音接口；用户消息和失败消息都不展示播放入口。 -->
        <button
          v-if="canPlayVoice"
          :data-testid="AI_MESSAGE_PLAY_TEST_ID"
          class="ai-message__play-button"
          type="button"
          @click="handleTogglePlayback"
        >
          {{ playbackButtonLabel }}
        </button>
      </div>
      <div v-else-if="message.status === 'failed'" class="ai-message__meta">
        <el-tag size="small" type="danger" effect="light">发送失败</el-tag>
      </div>

      <p v-if="playbackState?.errorMessage" class="ai-message__playback-error">
        {{ playbackState.errorMessage }}
      </p>
    </div>
  </article>
</template>

<style scoped lang="scss">
.ai-message {
  display: flex;
  justify-content: flex-end;
}

.ai-message--assistant {
  justify-content: flex-start;
}

.ai-message__bubble {
  width: min(720px, 78%);
  padding: 18px 20px;
  border-radius: 24px;
  background: linear-gradient(
    135deg,
    var(--app-tone-success-surface),
    var(--app-surface-card-strong)
  );
  border: 1px solid var(--app-tone-success-border);
  box-shadow: var(--app-shadow-solid);
}

.ai-message--failed .ai-message__bubble {
  background: linear-gradient(
    135deg,
    var(--app-tone-danger-surface),
    var(--app-surface-card-strong)
  );
  border-color: var(--app-tone-danger-border);
}

.ai-message--assistant .ai-message__bubble {
  background: linear-gradient(
    135deg,
    var(--app-tone-warning-surface),
    var(--app-surface-card-strong)
  );
  border-color: var(--app-tone-warning-border);
}

.ai-message__header,
.ai-message__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ai-message__header {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.ai-message__content {
  margin: 12px 0 0;
  color: var(--app-text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
}

.ai-message__meta {
  margin-top: 14px;
}

.ai-message__play-button {
  border: 1px solid var(--app-detail-action-border);
  border-radius: var(--app-radius-sm);
  background: var(--app-detail-action-surface);
  color: var(--app-detail-action-text);
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  padding: 6px 10px;
  cursor: pointer;
}

.ai-message__play-button:hover {
  background: var(--app-detail-action-surface-strong);
  color: var(--app-detail-action-text-strong);
}

.ai-message__play-button:focus-visible {
  outline: none;
  box-shadow: var(--app-detail-action-focus-ring);
}

.ai-message__playback-error {
  margin: 12px 0 0;
  color: var(--app-tone-danger-text);
  font-size: 13px;
  line-height: 1.6;
}
</style>
