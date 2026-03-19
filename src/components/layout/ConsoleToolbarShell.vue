<script setup lang="ts">
/**
 * 搜索筛选和批量操作工具条壳层。
 * 只提供统一容器，不吞并具体表单语义，保证不同业务页可以自由组合控件。
 */
</script>

<template>
  <section class="console-toolbar-shell">
    <slot />
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.console-toolbar-shell {
  @include shell.console-surface(12px);

  display: flex;
  gap: 16px;
  padding: 18px 20px;
  border-radius: var(--app-radius-md);
  flex-wrap: wrap;
}
</style>
