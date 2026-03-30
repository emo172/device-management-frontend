<script setup lang="ts">
/**
 * 列表页顶部筛选/操作壳层。
 * 该组件只统一承接标题区、筛选字段区和操作区的稳定 DOM 结构，方便后续各业务列表迁移时复用同一布局语义，
 * 同时避免每个页面各自维护不同的筛选栏层级，影响样式统一和自动化测试稳定性。
 */
interface ConsoleFilterPanelProps {
  /** 眉标文案，默认提示该区域承接筛选与操作。 */
  eyebrow?: string
  /** 区块标题，直接对应当前列表页的筛选区名称。 */
  title: string
  /** 区块说明，用于解释筛选范围、批量操作边界或列表口径。 */
  description?: string
}

const props = withDefaults(defineProps<ConsoleFilterPanelProps>(), {
  eyebrow: '筛选与操作',
})
</script>

<template>
  <section class="console-filter-panel">
    <header class="console-filter-panel__header">
      <p class="console-filter-panel__eyebrow">{{ props.eyebrow }}</p>
      <h2 class="console-filter-panel__title">{{ props.title }}</h2>
      <p v-if="props.description" class="console-filter-panel__description">
        {{ props.description }}
      </p>
    </header>

    <div class="console-filter-panel__body">
      <div class="console-filter-panel__fields">
        <slot />
      </div>

      <div class="console-filter-panel__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.console-filter-panel {
  @include shell.console-surface();

  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border-radius: var(--app-radius-lg);
}

.console-filter-panel__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.console-filter-panel__eyebrow,
.console-filter-panel__title,
.console-filter-panel__description {
  margin: 0;
}

.console-filter-panel__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--app-accent-amber);
}

.console-filter-panel__title {
  font-size: 20px;
  color: var(--app-text-primary);
}

.console-filter-panel__description {
  font-size: 14px;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.console-filter-panel__body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.console-filter-panel__fields {
  // 字段区需要优先占满剩余空间，后续各业务页挂表单项时才不会把操作按钮挤出容器。
  flex: 1 1 480px;
  min-width: 0;
}

.console-filter-panel__fields,
.console-filter-panel__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.console-filter-panel__actions {
  justify-content: flex-end;
}
</style>
