<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import ConsoleToolbarShell from '@/components/layout/ConsoleToolbarShell.vue'
import { useAppStore } from '@/stores/modules/app'
import { useStatisticsStore } from '@/stores/modules/statistics'
import SharedChartPanel from './SharedChartPanel.vue'
import { createHotTimeSlotHeatmapOption, formatTimeSlotLabel } from './chartOptions'

/**
 * 热门时段页。
 * 热力图只表达当前统计日期各时段热度，不额外捏造周/月趋势维度，保证前端展示与后端真实契约一致。
 */
const statisticsStore = useStatisticsStore()
const appStore = useAppStore()

function resolveAppliedDate() {
  /**
   * 热门时段接口没有单独返回 `statDate`，因此要沿用同批次总览接口返回的成功日期。
   * 这样默认加载完成后，热门时段页也能展示真实日期，而不是继续保留错误的占位口径。
   */
  return statisticsStore.overview?.statDate || statisticsStore.query.date || ''
}

const pendingDate = ref(resolveAppliedDate())
const appliedDate = ref(resolveAppliedDate())

const sortedHotTimeSlots = computed(() => {
  /**
   * 热门时段接口没有声明返回顺序，因此页面层必须按预约总数显式排序后再取“最热门时段”。
   * 这样即使后端返回无序数组，也不会把首项误展示成高峰时段。
   */
  return [...statisticsStore.hotTimeSlots].sort(
    (left, right) => Number(right.totalReservations) - Number(left.totalReservations),
  )
})

const heatmapOption = computed(() =>
  createHotTimeSlotHeatmapOption(statisticsStore.hotTimeSlots, appStore.resolvedTheme),
)
const effectiveDateLabel = computed(() => appliedDate.value || '沿用总览默认日期')
const hottestSlot = computed(() => sortedHotTimeSlots.value[0] ?? null)

async function loadStatistics(queryDate = pendingDate.value || undefined) {
  try {
    await statisticsStore.fetchAll(queryDate ? { date: queryDate } : {})

    /**
     * 热力图刷新期间仍沿用上一版时段分布，因此日期标签必须等到新数据写入后再切换。
     * 热门时段页需要借助总览成功返回的日期锚定口径，避免默认加载后继续显示错误占位文案。
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
  if (!statisticsStore.hotTimeSlots.length) {
    void loadStatistics()
  }
})
</script>

<template>
  <section class="statistics-detail-view statistics-detail-view--heatmap">
    <ConsolePageHero
      eyebrow="Hot Time Slots"
      title="热门时段分析"
      description="用单轴热力图表达每个预约时段的热度，帮助管理端快速识别高峰时段。"
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
        <div class="statistics-detail-view__meta-pill">
          <span>时段条目</span>
          <strong>{{ statisticsStore.hotTimeSlots.length }}</strong>
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleToolbarShell class="statistics-detail-view__toolbar">
      <div>
        <p class="statistics-detail-view__toolbar-eyebrow">Date Scope</p>
        <h2>统计日期筛选</h2>
        <p>热门时段页与总览共用同一日期口径，避免热度图与其他子页不一致。</p>
      </div>

      <div class="statistics-detail-view__toolbar-actions">
        <el-date-picker
          :model-value="pendingDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择统计日期"
          @update:modelValue="handleDateChange"
        />
        <el-button @click="handleRefresh">刷新数据</el-button>
      </div>
    </ConsoleToolbarShell>

    <div class="statistics-detail-view__layout">
      <div class="statistics-detail-view__main">
        <ConsoleFeedbackSurface
          v-if="statisticsStore.loading && !statisticsStore.hotTimeSlots.length"
          state="loading"
        >
          <p class="statistics-detail-view__feedback-title">热门时段加载中</p>
          <p class="statistics-detail-view__feedback-description">正在同步热力图与时段明细。</p>
        </ConsoleFeedbackSurface>

        <SharedChartPanel
          v-else
          title="预约热力图"
          description="色块越深表示预约总数越高，tooltip 同时保留通过数。"
          :option="heatmapOption"
        />

        <ConsoleTableSection title="时段明细" :count="statisticsStore.hotTimeSlots.length">
          <EmptyState
            v-if="!statisticsStore.hotTimeSlots.length"
            title="暂无热门时段数据"
            description="当前日期还没有可展示的时段热度统计。"
          />

          <el-table v-else :data="sortedHotTimeSlots" stripe>
            <el-table-column prop="timeSlot" label="时段" min-width="120">
              <template #default="scope">{{ formatTimeSlotLabel(scope.row.timeSlot) }}</template>
            </el-table-column>
            <el-table-column prop="totalReservations" label="预约总数" min-width="140" />
            <el-table-column prop="approvedReservations" label="通过数" min-width="140" />
          </el-table>
        </ConsoleTableSection>
      </div>

      <ConsoleAsidePanel
        title="高峰摘要"
        description="热门时段页既要看热力图，也要保留原始明细供管理端快速核对。"
      >
        <div class="statistics-detail-view__aside-stack">
          <section class="statistics-detail-view__aside-card">
            <p class="statistics-detail-view__aside-label">最热门时段</p>
            <h3>
              {{ hottestSlot ? formatTimeSlotLabel(hottestSlot.timeSlot as string) : '暂无' }}
            </h3>
            <p>
              {{
                hottestSlot
                  ? `预约 ${hottestSlot.totalReservations} 次，通过 ${hottestSlot.approvedReservations} 次。`
                  : '当前日期还没有时段热度统计结果。'
              }}
            </p>
          </section>

          <section class="statistics-detail-view__aside-card">
            <h4>判读提醒</h4>
            <ul class="statistics-detail-view__rule-list">
              <li>热力图用于看峰值分布，表格用于核对原始预约总数与通过数。</li>
              <li>当前页面不生成周/月趋势，只表达当前日期单日热度。</li>
              <li>切换日期会整页刷新统计缓存，确保与总览页一致。</li>
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
  --statistics-tone-surface: var(--app-tone-success-surface);
  --statistics-tone-text: var(--app-tone-success-text);
  --statistics-tone-text-strong: var(--app-tone-success-text-strong);
  --statistics-tone-border: var(--app-tone-success-border);
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
.statistics-detail-view__toolbar-eyebrow,
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
.statistics-detail-view__toolbar h2,
.statistics-detail-view__aside-card h3,
.statistics-detail-view__aside-card h4 {
  margin: 0;
  color: var(--app-text-primary);
}

.statistics-detail-view__toolbar p,
.statistics-detail-view__aside-card p,
.statistics-detail-view__feedback-description,
.statistics-detail-view__rule-list {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.statistics-detail-view__toolbar {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.statistics-detail-view__toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: flex-start;
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

.statistics-detail-view__feedback-title {
  margin: 0;
  color: var(--app-text-primary);
}

// 热门时段页右侧摘要主要承担峰值结论与判读说明，改成实体 token 后能避免热力图旁边再出现一块浅色孤岛。
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
  .statistics-detail-view__layout {
    grid-template-columns: 1fr;
  }

  .statistics-detail-view__toolbar {
    flex-direction: column;
  }

  .statistics-detail-view__toolbar-actions {
    flex-wrap: wrap;
  }
}
</style>
