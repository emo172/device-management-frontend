<script setup lang="ts">
/**
 * 控制台摘要网格壳层。
 * 仪表盘 KPI、快捷入口和摘要卡共用这一层，保证卡片间距与列数策略一致。
 */
withDefaults(
  defineProps<{
    /** 稠密模式用于窄桌面，避免摘要卡在 1280px 下拥挤重叠。 */
    dense?: boolean
  }>(),
  {
    dense: false,
  },
)
</script>

<template>
  <section :class="['console-summary-grid', { 'console-summary-grid--dense': dense }]">
    <slot />
  </section>
</template>

<style scoped lang="scss">
.console-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.console-summary-grid--dense {
  gap: 16px;
}
</style>
