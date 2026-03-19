<script setup lang="ts">
import { useSlots } from 'vue'

/**
 * 详情与表单双栏壳层。
 * 主区承载核心表单/详情，侧栏承载规则说明与次操作，便于后续详情页统一收口。
 */
const slots = useSlots()
</script>

<template>
  <section class="console-detail-layout">
    <div class="console-detail-layout__main">
      <slot name="main">
        <slot />
      </slot>
    </div>

    <aside v-if="slots.aside" class="console-detail-layout__aside">
      <slot name="aside" />
    </aside>
  </section>
</template>

<style scoped lang="scss">
.console-detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
  gap: 24px;
  align-items: start;
}

.console-detail-layout__main,
.console-detail-layout__aside {
  min-width: 0;
}

@media (max-width: 1366px) {
  .console-detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>
