<script setup lang="ts">
import { computed } from 'vue'

/**
 * 统计卡片。
 * 统一承接管理端总览指标的标题、数值与说明，避免每个统计页面都重新拼装相似的卡片骨架和强调色逻辑。
 */
type StatisticsCardTone = 'brand' | 'info' | 'success' | 'warning' | 'danger'
type StatisticsCardLegacyAccent = 'teal' | 'amber' | 'blue' | 'rose' | 'green' | 'emerald'

const props = withDefaults(
  defineProps<{
    title: string
    value: string | number
    description: string
    trendLabel?: string
    accent?: StatisticsCardTone | StatisticsCardLegacyAccent
  }>(),
  {
    trendLabel: '',
    accent: 'brand',
  },
)

/**
 * 业务页还残留旧 accent 命名，这里先收口到统一 tone 家族。
 * 这样 Task 7 只改组件自身语义，不会提前扩散到 Task 8+ 页面改造。
 */
const resolvedAccent = computed<StatisticsCardTone>(() => {
  const legacyToneMap: Record<StatisticsCardLegacyAccent, StatisticsCardTone> = {
    teal: 'brand',
    amber: 'warning',
    blue: 'info',
    rose: 'danger',
    green: 'success',
    emerald: 'success',
  }

  return (
    legacyToneMap[props.accent as StatisticsCardLegacyAccent] ??
    (props.accent as StatisticsCardTone)
  )
})
</script>

<template>
  <article
    class="statistics-card statistics-card__surface"
    :class="`statistics-card--${resolvedAccent}`"
  >
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
  background: var(--app-surface-solid);
}

.statistics-card::after {
  content: '';
  position: absolute;
  inset: auto -30px -36px auto;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.16;
  background: var(--statistics-card-accent-surface);
}

.statistics-card--brand {
  --statistics-card-accent-surface: var(--app-tone-brand-surface-strong);
}

.statistics-card--info {
  --statistics-card-accent-surface: var(--app-tone-info-surface-strong);
}

.statistics-card--success {
  --statistics-card-accent-surface: var(--app-tone-success-surface-strong);
}

.statistics-card--warning {
  --statistics-card-accent-surface: var(--app-tone-warning-surface-strong);
}

.statistics-card--danger {
  --statistics-card-accent-surface: var(--app-tone-danger-surface-strong);
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
