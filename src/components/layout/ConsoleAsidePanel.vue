<script setup lang="ts">
import { useSlots } from 'vue'

/**
 * 详情页侧栏信息面板。
 * 用于放规则提示、状态摘要和次级操作，避免这些信息散落到主表单里影响主流程可读性。
 */
interface ConsoleAsidePanelProps {
  /** 侧栏标题，帮助用户快速识别当前辅助区的用途。 */
  title: string
  /** 标题补充说明，解释规则来源或使用边界。 */
  description?: string
}

defineProps<ConsoleAsidePanelProps>()

const slots = useSlots()
</script>

<template>
  <section class="console-aside-panel">
    <header class="console-aside-panel__header">
      <h3 class="console-aside-panel__title">{{ title }}</h3>
      <p v-if="description" class="console-aside-panel__description">{{ description }}</p>
    </header>

    <div class="console-aside-panel__body">
      <slot />
    </div>

    <footer v-if="slots.footer" class="console-aside-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.console-aside-panel {
  @include shell.console-surface();

  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: var(--app-radius-lg);
}

.console-aside-panel__title,
.console-aside-panel__description {
  margin: 0;
}

.console-aside-panel__title {
  font-size: 18px;
  color: var(--app-text-primary);
}

.console-aside-panel__description {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}
</style>
