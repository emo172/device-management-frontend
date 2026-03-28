<script setup lang="ts">
import { computed } from 'vue'

/**
 * AI 输入框组件。
 * 单独抽离输入区后，聊天页可以专注处理消息流与滚动，而输入草稿、禁用态和提交文案统一由该组件兜底。
 */
const props = defineProps<{
  modelValue: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [message: string]
  reset: []
}>()

const canSubmit = computed(() => props.modelValue.trim().length > 0 && !props.loading)

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}

function handleSubmit() {
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
  if (props.loading) {
    return
  }

  emit('reset')
}
</script>

<template>
  <div class="ai-chat-box ai-chat-box__surface">
    <textarea
      :value="modelValue"
      class="ai-chat-box__textarea"
      :disabled="loading"
      placeholder="输入你的设备查询、预约建议或取消问题，AI 会先识别意图再返回结果。"
      rows="4"
      @input="handleInput"
      @keydown.enter.exact.prevent="handleSubmit"
    />

    <div class="ai-chat-box__footer">
      <p class="ai-chat-box__tip">回车发送，Shift + Enter 换行</p>
      <div class="ai-chat-box__actions">
        <el-button :disabled="loading" @click="handleReset">开启新会话</el-button>
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
.ai-chat-box__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ai-chat-box__footer {
  margin-top: 16px;
}

.ai-chat-box__tip {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 13px;
}
</style>
