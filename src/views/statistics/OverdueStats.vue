<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import StatisticsCard from '@/components/business/StatisticsCard.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsoleFilterPanel from '@/components/layout/ConsoleFilterPanel.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import { useAppStore } from '@/stores/modules/app'
import { useStatisticsStore } from '@/stores/modules/statistics'
import SharedChartPanel from './SharedChartPanel.vue'
import { createOverdueSummaryOption } from './chartOptions'

/**
 * 逾期统计页。
 * 单独聚合逾期数量与逾期小时数，帮助系统管理员判断逾期风险是“数量多”还是“时长长”。
 */
const statisticsStore = useStatisticsStore()
const appStore = useAppStore()

function resolveAppliedDate() {
  /**
   * 逾期统计接口会返回 `statDate`，因此页面日期必须优先使用最后一次成功结果。
   * 这样系统管理员在默认加载成功后也能看到真实统计日期，而不是继续背着旧的占位文案。
   */
  return (
    statisticsStore.overdueStatistics?.statDate ||
    statisticsStore.overview?.statDate ||
    statisticsStore.query.date ||
    ''
  )
}

const pendingDate = ref(resolveAppliedDate())
const appliedDate = ref(resolveAppliedDate())

const overdueCards = computed(() => {
  const overdueStatistics = statisticsStore.overdueStatistics

  /**
   * 加载态且还没有拿到成功聚合时，不能把占位 0 值渲染成真实统计卡片。
   * 逾期页只有在拿到有效结果后才展示摘要卡片，避免系统管理员误判当天风险已经清零。
   */
  if (!overdueStatistics) {
    return []
  }

  return [
    {
      title: '逾期记录数',
      value: overdueStatistics.totalOverdue,
      description: '当前统计日期内进入逾期状态的记录数量。',
      trendLabel: '',
      accent: 'rose' as const,
    },
    {
      title: '逾期小时数',
      value: overdueStatistics.totalOverdueHours,
      description: '所有逾期记录累计形成的小时数。',
      trendLabel: '',
      accent: 'amber' as const,
    },
  ]
})
const overdueOption = computed(() =>
  createOverdueSummaryOption(statisticsStore.overdueStatistics, appStore.resolvedTheme),
)
const effectiveDateLabel = computed(() => appliedDate.value || '沿用总览默认日期')

async function loadStatistics(queryDate = pendingDate.value || undefined) {
  try {
    await statisticsStore.fetchAll(queryDate ? { date: queryDate } : {})

    /**
     * 逾期统计页允许旧卡片在刷新期间继续可见，因此必须把页面日期口径锚定在最后一次成功数据。
     * 只有新请求成功后才更新展示日期，才能避免失败场景下把旧逾期数据误标成新日期。
     */
    appliedDate.value = resolveAppliedDate()
    pendingDate.value = appliedDate.value
  } catch {
    // 请求层已经负责提示错误，这里只阻止统计子页交互链路出现未处理拒绝。
    pendingDate.value = appliedDate.value
  }
}

async function handleDateChange(value: string | null) {
  pendingDate.value = value ?? ''
  await loadStatistics(value ?? undefined)
}

function handleRefresh() {
  void loadStatistics()
}

onMounted(() => {
  if (!statisticsStore.overdueStatistics) {
    void loadStatistics()
  }
})
</script>

<template>
  <section class="statistics-detail-view statistics-detail-view--overdue">
    <ConsolePageHero
      title="逾期统计分析"
      description="逾期页专门聚焦逾期风险规模与时长，避免被其他借用指标稀释。"
      class="statistics-detail-view__hero"
    >
      <template #actions>
        <RouterLink class="statistics-detail-view__back-link" to="/statistics">返回总览</RouterLink>
      </template>

      <template #meta>
        <div class="statistics-detail-view__meta-pill">
          <span>统计日期</span>
          <strong>{{ effectiveDateLabel }}</strong>
        </div>
        <!-- 还没拿到有效聚合结果时，页头摘要只保留统计日期，避免把占位 0 值误读成真实风险已清零。 -->
        <div v-if="statisticsStore.overdueStatistics" class="statistics-detail-view__meta-pill">
          <span>逾期记录</span>
          <strong>{{ statisticsStore.overdueStatistics.totalOverdue }}</strong>
        </div>
        <div v-if="statisticsStore.overdueStatistics" class="statistics-detail-view__meta-pill">
          <span>逾期小时</span>
          <strong>{{ statisticsStore.overdueStatistics.totalOverdueHours }}</strong>
        </div>
      </template>
    </ConsolePageHero>

    <!-- 统计详情子页统一复用同一日期筛选壳层，确保图表、摘要与总览页始终使用同一统计口径。 -->
    <ConsoleFilterPanel
      eyebrow="筛选与操作"
      title="统计日期筛选"
      description="所有统计子页共用同一日期口径，避免图表与总览页口径漂移。"
    >
      <div class="statistics-detail-view__filter-fields">
        <el-date-picker
          :model-value="pendingDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择统计日期"
          @update:modelValue="handleDateChange"
        />
      </div>

      <template #actions>
        <div class="statistics-detail-view__toolbar-actions">
          <el-button @click="handleRefresh">刷新数据</el-button>
        </div>
      </template>
    </ConsoleFilterPanel>

    <div class="statistics-detail-view__layout">
      <div class="statistics-detail-view__main">
        <ConsoleSummaryGrid class="statistics-detail-view__summary-grid">
          <StatisticsCard
            v-for="card in overdueCards"
            :key="card.title"
            :title="card.title"
            :value="card.value"
            :description="card.description"
            :trend-label="card.trendLabel"
            :accent="card.accent"
          />
        </ConsoleSummaryGrid>

        <ConsoleFeedbackSurface
          v-if="statisticsStore.loading && !statisticsStore.overdueStatistics"
          state="loading"
        >
          <p class="statistics-detail-view__feedback-title">逾期统计加载中</p>
          <p class="statistics-detail-view__feedback-description">
            正在同步逾期记录数与逾期小时数。
          </p>
        </ConsoleFeedbackSurface>

        <SharedChartPanel
          v-else
          title="逾期双指标概览"
          description="双轴图分别承接逾期记录数与逾期小时数，避免把不同量纲误解成同一总量占比。"
          :option="overdueOption"
        />
      </div>

      <ConsoleAsidePanel
        title="风险摘要"
        description="逾期统计页强调数量与时长的组合观察，避免只凭单一指标判断风险严重程度。"
      >
        <div class="statistics-detail-view__aside-stack">
          <section class="statistics-detail-view__aside-card">
            <p class="statistics-detail-view__aside-label">风险判读</p>
            <h3>数量 + 时长</h3>
            <p>逾期记录数反映问题覆盖面，逾期小时数反映问题严重度，两者必须配合判断。</p>
          </section>

          <section class="statistics-detail-view__aside-card">
            <h4>操作提醒</h4>
            <ul class="statistics-detail-view__rule-list">
              <li>当前图表只使用后端聚合结果，不在前端额外换算权重。</li>
              <li>若数量高但小时数低，通常表示大量轻度逾期；反之则是少量重度逾期。</li>
              <li>切换日期会整页刷新统计缓存，确保与总览和借用页保持同一口径。</li>
            </ul>
          </section>
        </div>
      </ConsoleAsidePanel>
    </div>
  </section>
</template>

<style scoped lang="scss">
.statistics-detail-view {
  display: grid;
  gap: 20px;
  --statistics-tone-surface: var(--app-tone-danger-surface);
  --statistics-tone-text: var(--app-tone-danger-text);
  --statistics-tone-text-strong: var(--app-tone-danger-text-strong);
  --statistics-tone-border: var(--app-tone-danger-border);
}

.statistics-detail-view__hero {
  border-radius: 28px;
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
  background: var(--app-surface-card);
}

.statistics-detail-view__back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  text-decoration: none;
  color: var(--statistics-tone-text-strong);
  background: var(--app-surface-card-strong);
  border: 1px solid var(--statistics-tone-border);
  box-shadow: var(--app-shadow-card);
}

.statistics-detail-view__meta-pill {
  min-width: 136px;
  padding: 12px 16px;
  border: 1px solid var(--app-border-soft);
  border-radius: 18px;
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

.statistics-detail-view__hero :deep(.console-page-hero__eyebrow),
.statistics-detail-view__hero :deep(.console-page-hero__description) {
  color: var(--app-text-secondary);
}

.statistics-detail-view__meta-pill span,
.statistics-detail-view__aside-label {
  display: block;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--statistics-tone-text);
}

.statistics-detail-view__meta-pill strong,
.statistics-detail-view__aside-card h3,
.statistics-detail-view__aside-card h4 {
  margin: 0;
  color: var(--app-text-primary);
}

.statistics-detail-view__aside-card p,
.statistics-detail-view__feedback-description,
.statistics-detail-view__rule-list {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.statistics-detail-view__filter-fields,
.statistics-detail-view__toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.statistics-detail-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.statistics-detail-view__main,
.statistics-detail-view__aside-stack {
  display: grid;
  gap: 20px;
}

.statistics-detail-view__summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.statistics-detail-view__feedback-title {
  margin: 0;
  color: var(--app-text-primary);
}

// 逾期页右侧面板承担风险判读结论，切到实体 token 后能避免危险提示在浅色玻璃底上失焦。
.statistics-detail-view__layout :deep(.console-aside-panel) {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.statistics-detail-view__aside-card {
  padding: 18px 20px;
  border-radius: 20px;
  background: var(--app-surface-card-strong);
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
}

.statistics-detail-view__rule-list {
  padding-left: 18px;
}

@media (max-width: 1366px) {
  .statistics-detail-view__layout,
  .statistics-detail-view__summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
