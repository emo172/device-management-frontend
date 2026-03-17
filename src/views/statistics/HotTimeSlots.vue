<script setup lang="ts">
import { computed, onMounted } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import SharedChartPanel from './SharedChartPanel.vue'
import { createHotTimeSlotHeatmapOption, formatTimeSlotLabel } from './chartOptions'
import { useStatisticsStore } from '@/stores/modules/statistics'

/**
 * 热门时段页。
 * 热力图只表达当前统计日期各时段热度，不额外捏造周/月趋势维度，保证前端展示与后端真实契约一致。
 */
const statisticsStore = useStatisticsStore()
const heatmapOption = computed(() => createHotTimeSlotHeatmapOption(statisticsStore.hotTimeSlots))

onMounted(() => {
  if (!statisticsStore.hotTimeSlots.length) {
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
        <p class="statistics-page-shell__eyebrow">Hot Time Slots</p>
        <h1>热门时段分析</h1>
        <p>用单轴热力图表达每个预约时段的热度，帮助管理端快速识别高峰时段。</p>
      </div>
      <RouterLink class="statistics-page-shell__back-link" to="/statistics">返回总览</RouterLink>
    </header>

    <SharedChartPanel
      v-if="statisticsStore.hotTimeSlots.length"
      title="预约热力图"
      description="色块越深表示预约总数越高，tooltip 同时保留通过数。"
      :option="heatmapOption"
    />
    <EmptyState
      v-else
      title="暂无热门时段数据"
      description="当前日期还没有可展示的时段热度统计。"
    />

    <section v-if="statisticsStore.hotTimeSlots.length" class="statistics-page-shell__table-card">
      <div class="statistics-page-shell__panel-header">
        <div>
          <h2>时段明细</h2>
          <p>保留原始接口返回的预约总数与通过数，便于图表外核对。</p>
        </div>
      </div>

      <el-table :data="statisticsStore.hotTimeSlots" stripe>
        <el-table-column prop="timeSlot" label="时段" min-width="120">
          <template #default="scope">{{ formatTimeSlotLabel(scope.row.timeSlot) }}</template>
        </el-table-column>
        <el-table-column prop="totalReservations" label="预约总数" min-width="140" />
        <el-table-column prop="approvedReservations" label="通过数" min-width="140" />
      </el-table>
    </section>
  </section>
</template>

<style scoped lang="scss">
.statistics-page-shell {
  display: grid;
  gap: 24px;
}

.statistics-page-shell__hero,
.statistics-page-shell__table-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 22px 56px rgba(15, 23, 42, 0.08);
}

.statistics-page-shell__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
}

.statistics-page-shell__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0f766e;
}

.statistics-page-shell__hero h1,
.statistics-page-shell__panel-header h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.statistics-page-shell__hero p,
.statistics-page-shell__panel-header p {
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

.statistics-page-shell__table-card {
  padding: 22px;
}
</style>
