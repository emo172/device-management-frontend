<script setup lang="ts">
import { computed, useSlots } from 'vue'

/**
 * 列表表格区壳层。
 * 统一承接标题、总数、内容区和分页区，让列表页后续迁移时只关注数据与操作本身。
 */
interface ConsoleTableSectionProps {
  /** 区块标题，直接对应当前列表的业务名称。 */
  title: string
  /** 总数展示，保留字符串能力以兼容“12 条 / 3 批”等口径。 */
  count?: number | string
}

const props = defineProps<ConsoleTableSectionProps>()

const slots = useSlots()

const countText = computed(() => {
  if (props.count === undefined) {
    return undefined
  }

  return typeof props.count === 'number' ? `共 ${props.count} 条` : props.count
})
</script>

<template>
  <section class="console-table-section">
    <header class="console-table-section__header">
      <div>
        <h2 class="console-table-section__title">{{ title }}</h2>
        <p v-if="countText" class="console-table-section__count">{{ countText }}</p>
      </div>
    </header>

    <div class="console-table-section__body">
      <slot />
    </div>

    <footer v-if="slots.footer" class="console-table-section__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.console-table-section {
  @include shell.console-solid-surface;

  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  border-radius: var(--app-radius-lg);
}

.console-table-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.console-table-section__title,
.console-table-section__count {
  margin: 0;
}

.console-table-section__title {
  font-size: 20px;
  color: var(--app-ink-950);
}

.console-table-section__count {
  margin-top: 6px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.console-table-section__footer {
  display: flex;
  justify-content: flex-end;
}
</style>
