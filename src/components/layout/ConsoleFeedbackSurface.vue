<script setup lang="ts">
import { computed, useSlots } from 'vue'

/**
 * 反馈面板壳层。
 * 空状态、错误态、确认态和加载态共用这一层，避免每个页面重复搭建相似反馈结构。
 */
type FeedbackState = 'empty' | 'error' | 'confirm' | 'loading' | 'skeleton'

const props = withDefaults(
  defineProps<{
    /** 当前反馈态，决定展示哪一类插槽结构。 */
    state?: FeedbackState
  }>(),
  {
    state: 'empty',
  },
)

const slots = useSlots()

const activeSlotName = computed<FeedbackState>(() => props.state)
</script>

<template>
  <section :class="['console-feedback-surface', `console-feedback-surface--${state}`]">
    <slot :name="activeSlotName">
      <slot />
    </slot>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.console-feedback-surface {
  @include shell.console-surface(10px);

  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 28px;
  border-radius: var(--app-radius-lg);
  text-align: center;
}

.console-feedback-surface--loading,
.console-feedback-surface--skeleton {
  border-style: dashed;
}

.console-feedback-surface--error {
  background: rgba(255, 255, 255, 0.8);
}
</style>
