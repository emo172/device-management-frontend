<script setup lang="ts">
/**
 * 统计卡片。
 * 统一承接管理端总览指标的标题、数值与说明，避免每个统计页面都重新拼装相似的卡片骨架和强调色逻辑。
 */
withDefaults(
  defineProps<{
    title: string
    value: string | number
    description: string
    trendLabel?: string
    accent?: 'teal' | 'amber' | 'blue' | 'rose' | 'green'
  }>(),
  {
    trendLabel: '',
    accent: 'teal',
  },
)
</script>

<template>
  <article class="statistics-card statistics-card__surface" :class="`statistics-card--${accent}`">
    <p class="statistics-card__title">{{ title }}</p>
    <strong class="statistics-card__value">{{ value }}</strong>
    <p class="statistics-card__description">{{ description }}</p>
    <small v-if="trendLabel" class="statistics-card__trend">{{ trendLabel }}</small>
  </article>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.statistics-card {
  @include shell.console-solid-surface;

  position: relative;
  overflow: hidden;
  display: grid;
  gap: 10px;
  padding: 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
}

.statistics-card::after {
  content: '';
  position: absolute;
  inset: auto -30px -36px auto;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.16;
}

.statistics-card--teal::after {
  background: #14b8a6;
}

.statistics-card--amber::after {
  background: #f59e0b;
}

.statistics-card--blue::after {
  background: #3b82f6;
}

.statistics-card--rose::after {
  background: #f43f5e;
}

.statistics-card--green::after {
  background: #22c55e;
}

.statistics-card__title,
.statistics-card__description,
.statistics-card__trend {
  margin: 0;
}

.statistics-card__title,
.statistics-card__trend {
  color: var(--app-text-secondary);
}

.statistics-card__title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.statistics-card__value {
  color: var(--app-text-primary);
  font-size: 32px;
  line-height: 1.1;
}

.statistics-card__description {
  color: var(--app-text-secondary);
  line-height: 1.7;
}
</style>
