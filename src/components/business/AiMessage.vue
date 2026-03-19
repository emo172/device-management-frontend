<script setup lang="ts">
import { computed } from 'vue'

import type { AiChatMessage } from '@/composables/useAiChat'
import { AiIntentType, AiIntentTypeLabel, AiIntentTypeTagType } from '@/enums'
import { formatDateTime } from '@/utils/date'

/**
 * AI 单条消息组件。
 * 把消息气泡、角色区分和意图/执行结果元信息收敛到独立组件，便于聊天页与历史详情页以后复用同一套视觉表达。
 */
const props = defineProps<{
  message: AiChatMessage
}>()

const isAssistant = computed(() => props.message.role === 'assistant')

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
      </div>
      <div v-else-if="message.status === 'failed'" class="ai-message__meta">
        <el-tag size="small" type="danger" effect="light">发送失败</el-tag>
      </div>
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
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(255, 255, 255, 0.98));
  border: 1px solid rgba(15, 118, 110, 0.16);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
}

.ai-message--failed .ai-message__bubble {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(255, 255, 255, 0.98));
  border-color: rgba(239, 68, 68, 0.2);
}

.ai-message--assistant .ai-message__bubble {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(255, 255, 255, 0.98));
  border-color: rgba(245, 158, 11, 0.18);
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
</style>
