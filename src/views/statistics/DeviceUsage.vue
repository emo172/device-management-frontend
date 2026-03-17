<script setup lang="ts">
import { computed, onMounted } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import SharedChartPanel from './SharedChartPanel.vue'
import { createUtilizationBarOption } from './chartOptions'
import { useStatisticsStore } from '@/stores/modules/statistics'

/**
 * 设备利用率页。
 * 单独拆页后，系统管理员可以把“利用率排行表格”和“利用率柱状图”放在同一视图交叉查看，而不挤占总览页空间。
 */
const statisticsStore = useStatisticsStore()

const deviceOption = computed(() =>
  createUtilizationBarOption('设备利用率', statisticsStore.deviceUtilization.slice(0, 10)),
)
const categoryOption = computed(() =>
  createUtilizationBarOption('分类利用率', statisticsStore.categoryUtilization),
)

onMounted(() => {
  if (!statisticsStore.deviceUtilization.length && !statisticsStore.categoryUtilization.length) {
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
        <p class="statistics-page-shell__eyebrow">Utilization</p>
        <h1>设备利用率分析</h1>
        <p>这里同时展示设备维度和分类维度的利用率，帮助系统管理员判断当前设备投放是否均衡。</p>
      </div>
      <RouterLink class="statistics-page-shell__back-link" to="/statistics">返回总览</RouterLink>
    </header>

    <section
      v-if="statisticsStore.deviceUtilization.length"
      class="statistics-page-shell__table-card"
    >
      <div class="statistics-page-shell__panel-header">
        <div>
          <h2>设备利用率排行</h2>
          <p>按后端返回结果展示，不在前端再次计算排序规则。</p>
        </div>
      </div>

      <el-table :data="statisticsStore.deviceUtilization" stripe>
        <el-table-column prop="deviceName" label="设备名称" min-width="180" />
        <el-table-column prop="categoryName" label="分类" min-width="160" />
        <el-table-column prop="totalReservations" label="预约总数" min-width="120" />
        <el-table-column prop="totalBorrows" label="借出总数" min-width="120" />
        <el-table-column label="利用率" min-width="140">
          <template #default="scope">{{ Number(scope.row.utilizationRate).toFixed(1) }}%</template>
        </el-table-column>
      </el-table>
    </section>

    <EmptyState
      v-else
      title="暂无设备利用率数据"
      description="当前日期尚未生成设备利用率统计，可切回总览页更换统计日期。"
    />

    <section class="statistics-page-shell__chart-grid">
      <SharedChartPanel
        title="设备利用率柱状图"
        description="展示利用率最高的设备，帮助快速识别热门设备。"
        :option="deviceOption"
      />
      <SharedChartPanel
        title="分类利用率柱状图"
        description="分类视角更适合判断设备投放结构是否失衡。"
        :option="categoryOption"
      />
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

.statistics-page-shell__chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
</style>
