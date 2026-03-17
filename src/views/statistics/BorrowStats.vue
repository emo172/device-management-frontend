<script setup lang="ts">
import { computed, onMounted } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import SharedChartPanel from './SharedChartPanel.vue'
import {
  createBorrowComparisonOption,
  createDeviceRankingOption,
  createUserRankingOption,
} from './chartOptions'
import { useStatisticsStore } from '@/stores/modules/statistics'

/**
 * 借用统计页。
 * 当前真实接口只提供单日借出/归还聚合与排行榜，因此页面明确展示“当日对比 + TOP10”，不伪造多日趋势线。
 */
const statisticsStore = useStatisticsStore()

const borrowOption = computed(() => createBorrowComparisonOption(statisticsStore.borrowStatistics))
const deviceRankingOption = computed(() =>
  createDeviceRankingOption(statisticsStore.deviceRanking.slice(0, 10)),
)
const userRankingOption = computed(() =>
  createUserRankingOption(statisticsStore.userRanking.slice(0, 10)),
)

onMounted(() => {
  if (!statisticsStore.borrowStatistics && !statisticsStore.deviceRanking.length) {
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
        <p class="statistics-page-shell__eyebrow">Borrow Analytics</p>
        <h1>借用统计分析</h1>
        <p>当前图表基于单日聚合结果展示借出与归还对比，并结合设备、用户排行榜呈现当天活跃度。</p>
      </div>
      <RouterLink class="statistics-page-shell__back-link" to="/statistics">返回总览</RouterLink>
    </header>

    <SharedChartPanel
      title="当日借用/归还对比"
      description="后端只返回单日聚合，所以图表明确表达当天借出与归还数量。"
      :option="borrowOption"
    />

    <section class="statistics-page-shell__chart-grid">
      <SharedChartPanel
        v-if="statisticsStore.deviceRanking.length"
        title="设备借用 TOP10"
        description="按照借用次数排序，识别最热门设备。"
        :option="deviceRankingOption"
      />
      <EmptyState v-else title="暂无设备排行数据" description="当前日期还没有形成设备借用排行。" />

      <SharedChartPanel
        v-if="statisticsStore.userRanking.length"
        title="用户借用 TOP10"
        description="活跃借用用户排行帮助判断资源集中度。"
        :option="userRankingOption"
      />
      <EmptyState v-else title="暂无用户排行数据" description="当前日期还没有形成用户借用排行。" />
    </section>
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
  color: #0f766e;
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

.statistics-page-shell__chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
</style>
