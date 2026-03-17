<script setup lang="ts">
import { computed, onMounted } from 'vue'

import StatisticsCard from '@/components/business/StatisticsCard.vue'
import SharedChartPanel from './SharedChartPanel.vue'
import { createOverdueSummaryOption } from './chartOptions'
import { useStatisticsStore } from '@/stores/modules/statistics'

/**
 * 逾期统计页。
 * 单独聚合逾期数量与逾期小时数，帮助系统管理员判断逾期风险是“数量多”还是“时长长”。
 */
const statisticsStore = useStatisticsStore()

const overdueCards = computed(() => [
  {
    title: '逾期记录数',
    value: statisticsStore.overdueStatistics?.totalOverdue ?? 0,
    description: '当前统计日期内进入逾期状态的记录数量。',
    trendLabel: '',
    accent: 'rose' as const,
  },
  {
    title: '逾期小时数',
    value: statisticsStore.overdueStatistics?.totalOverdueHours ?? 0,
    description: '所有逾期记录累计形成的小时数。',
    trendLabel: '',
    accent: 'amber' as const,
  },
])

const overdueOption = computed(() => createOverdueSummaryOption(statisticsStore.overdueStatistics))

onMounted(() => {
  if (!statisticsStore.overdueStatistics) {
    void statisticsStore.fetchAll(
      statisticsStore.query.date ? { date: statisticsStore.query.date } : {},
    )
  }
})
</script>

<template>
  <section class="statistics-page-shell">
    <header class="statistics-page-shell__hero">
      <div>
        <p class="statistics-page-shell__eyebrow">Overdue Risk</p>
        <h1>逾期统计分析</h1>
        <p>逾期页专门聚焦逾期风险规模与时长，避免被其他借用指标稀释。</p>
      </div>
      <RouterLink class="statistics-page-shell__back-link" to="/statistics">返回总览</RouterLink>
    </header>

    <section class="statistics-page-shell__card-grid">
      <StatisticsCard
        v-for="card in overdueCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :description="card.description"
        :trend-label="card.trendLabel"
        :accent="card.accent"
      />
    </section>

    <SharedChartPanel
      title="逾期双指标概览"
      description="双轴图分别承接逾期记录数与逾期小时数，避免把不同量纲误解成同一总量占比。"
      :option="overdueOption"
    />
  </section>
</template>

<style scoped lang="scss">
.statistics-page-shell {
  display: grid;
  gap: 24px;
}

.statistics-page-shell__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 22px 56px rgba(15, 23, 42, 0.08);
}

.statistics-page-shell__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #f97316;
}

.statistics-page-shell__hero h1 {
  margin: 0;
  color: var(--app-text-primary);
}

.statistics-page-shell__hero p {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.8;
}

.statistics-page-shell__back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  text-decoration: none;
  color: #0f766e;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 118, 110, 0.14);
}

.statistics-page-shell__card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
</style>
