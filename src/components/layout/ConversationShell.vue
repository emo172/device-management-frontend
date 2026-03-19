<script setup lang="ts">
import { useSlots } from 'vue'

/**
 * 会话与时间流工作台壳层。
 * AI 对话、通知时间流等页面共用这一层，保证侧栏、主内容和底部输入区的语义一致。
 */
const slots = useSlots()
</script>

<template>
  <section class="conversation-shell">
    <aside v-if="slots.sidebar" class="conversation-shell__sidebar">
      <slot name="sidebar" />
    </aside>

    <div class="conversation-shell__main">
      <slot name="main">
        <slot />
      </slot>
    </div>

    <footer v-if="slots.footer" class="conversation-shell__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.conversation-shell {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 20px;
}

.conversation-shell__sidebar,
.conversation-shell__main,
.conversation-shell__footer {
  min-width: 0;
}

.conversation-shell__sidebar,
.conversation-shell__main {
  @include shell.console-surface();

  padding: 24px;
  border-radius: var(--app-radius-lg);
}

.conversation-shell__footer {
  @include shell.console-solid-surface;

  grid-column: 1 / -1;
  padding: 20px 24px;
  border-radius: var(--app-radius-md);
}

@media (max-width: 1366px) {
  .conversation-shell {
    grid-template-columns: 1fr;
  }
}
</style>
