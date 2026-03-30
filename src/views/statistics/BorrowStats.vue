<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsoleFilterPanel from '@/components/layout/ConsoleFilterPanel.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { useAppStore } from '@/stores/modules/app'
import { useStatisticsStore } from '@/stores/modules/statistics'
import SharedChartPanel from './SharedChartPanel.vue'
import {
  createBorrowComparisonOption,
  createDeviceRankingOption,
  createUserRankingOption,
} from './chartOptions'

/**
 * 借用统计页。
 * 当前真实接口只提供单日借出/归还聚合与排行榜，因此页面明确展示“当日对比 + TOP10”，不伪造多日趋势线。
 */
const statisticsStore = useStatisticsStore()
const appStore = useAppStore()

function resolveAppliedDate() {
  /**
   * 借用统计接口会直接返回 `statDate`，页面要优先使用成功数据的真实日期。
   * 这样默认加载成功后，即使没有显式点选日期，也不会继续挂着“沿用总览默认日期”的旧口径。
   */
  return (
    statisticsStore.borrowStatistics?.statDate ||
    statisticsStore.overview?.statDate ||
    statisticsStore.query.date ||
    ''
  )
}

const pendingDate = ref(resolveAppliedDate())
const appliedDate = ref(resolveAppliedDate())

const sortedDeviceRanking = computed(() => {
  /**
   * 借用排行榜页需要显式排序后再取 TOP1 和图表前十，避免接口顺序变化时误判最热门设备。
   */
  return [...statisticsStore.deviceRanking].sort(
    (left, right) => right.totalBorrows - left.totalBorrows,
  )
})

const sortedUserRanking = computed(() => {
  return [...statisticsStore.userRanking].sort(
    (left, right) => right.totalBorrows - left.totalBorrows,
  )
})

const borrowOption = computed(() =>
  createBorrowComparisonOption(statisticsStore.borrowStatistics, appStore.resolvedTheme),
)
const deviceRankingOption = computed(() =>
  createDeviceRankingOption(sortedDeviceRanking.value.slice(0, 10), appStore.resolvedTheme),
)
const userRankingOption = computed(() =>
  createUserRankingOption(sortedUserRanking.value.slice(0, 10), appStore.resolvedTheme),
)
const effectiveDateLabel = computed(() => appliedDate.value || '沿用总览默认日期')
const topDevice = computed(() => sortedDeviceRanking.value[0] ?? null)
const topUser = computed(() => sortedUserRanking.value[0] ?? null)

async function loadStatistics(queryDate = pendingDate.value || undefined) {
  try {
    await statisticsStore.fetchAll(queryDate ? { date: queryDate } : {})

    /**
     * 统计子页允许在请求期间继续展示上一版图表，避免切换日期时整页闪空。
     * 借用统计要优先采用成功返回的 `statDate`，否则默认加载场景会把已成功的数据误标成默认文案。
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
  if (!statisticsStore.borrowStatistics && !statisticsStore.deviceRanking.length) {
    void loadStatistics()
  }
})
</script>

<template>
  <section class="statistics-detail-view statistics-detail-view--borrow">
    <ConsolePageHero
      title="借用统计分析"
      description="当前图表基于单日聚合结果展示借出与归还对比，并结合设备、用户排行榜呈现当天活跃度。"
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
          <span>设备排行</span>
          <strong>{{ statisticsStore.deviceRanking.length }}</strong>
        </div>
        <div class="statistics-detail-view__meta-pill">
          <span>用户排行</span>
          <strong>{{ statisticsStore.userRanking.length }}</strong>
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
        <ConsoleFeedbackSurface
          v-if="statisticsStore.loading && !statisticsStore.borrowStatistics"
          state="loading"
        >
          <p class="statistics-detail-view__feedback-title">借用统计加载中</p>
          <p class="statistics-detail-view__feedback-description">
            正在同步借出/归还对比与排行榜数据。
          </p>
        </ConsoleFeedbackSurface>

        <SharedChartPanel
          v-else
          title="当日借用/归还对比"
          description="后端只返回单日聚合，所以图表明确表达当天借出与归还数量。"
          :option="borrowOption"
        />

        <div class="statistics-detail-view__chart-grid">
          <SharedChartPanel
            title="设备借用 TOP10"
            description="按照借用次数排序，识别最热门设备。"
            :option="deviceRankingOption"
          />

          <SharedChartPanel
            title="用户借用 TOP10"
            description="活跃借用用户排行帮助判断资源集中度。"
            :option="userRankingOption"
          />
        </div>

        <EmptyState
          v-if="!statisticsStore.deviceRanking.length && !statisticsStore.userRanking.length"
          title="暂无排行榜数据"
          description="当前日期还没有形成设备或用户借用排行。"
        />
      </div>

      <ConsoleAsidePanel
        title="排行榜摘要"
        description="借用统计页同时关注借出归还对比和活跃榜单，避免只看单一指标得出错误结论。"
      >
        <div class="statistics-detail-view__aside-stack">
          <section class="statistics-detail-view__aside-card">
            <p class="statistics-detail-view__aside-label">最热门设备</p>
            <h3>{{ topDevice?.deviceName || '暂无' }}</h3>
            <p>
              {{
                topDevice
                  ? `借用 ${topDevice.totalBorrows} 次。`
                  : '当前日期还没有设备借用排行结果。'
              }}
            </p>
          </section>

          <section class="statistics-detail-view__aside-card">
            <p class="statistics-detail-view__aside-label">最活跃用户</p>
            <h3>{{ topUser?.username || '暂无' }}</h3>
            <p>
              {{
                topUser ? `借用 ${topUser.totalBorrows} 次。` : '当前日期还没有用户借用排行结果。'
              }}
            </p>
          </section>

          <section class="statistics-detail-view__aside-card">
            <h4>判读提醒</h4>
            <ul class="statistics-detail-view__rule-list">
              <li>借出/归还图只表达单日聚合，不应被解读为趋势图。</li>
              <li>设备排行与用户排行共同使用当前日期，避免跨口径比较。</li>
              <li>排行榜只展示 TOP10，完整原始数据需以后端统计接口为准。</li>
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
  --statistics-tone-surface: var(--app-tone-info-surface);
  --statistics-tone-text: var(--app-tone-info-text);
  --statistics-tone-text-strong: var(--app-tone-info-text-strong);
  --statistics-tone-border: var(--app-tone-info-border);
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

.statistics-detail-view__chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.statistics-detail-view__feedback-title {
  margin: 0;
  color: var(--app-text-primary);
}

// 借用统计右侧摘要承接榜单结论，页面层改成实体 token 后可以避免玻璃壳层把图表与结论分成两套视觉系统。
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
  .statistics-detail-view__chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
