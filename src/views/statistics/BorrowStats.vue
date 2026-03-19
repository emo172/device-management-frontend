<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleToolbarShell from '@/components/layout/ConsoleToolbarShell.vue'
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

const pendingDate = ref(statisticsStore.query.date || '')
const appliedDate = ref(statisticsStore.query.date || '')

const borrowOption = computed(() => createBorrowComparisonOption(statisticsStore.borrowStatistics))
const deviceRankingOption = computed(() =>
  createDeviceRankingOption(statisticsStore.deviceRanking.slice(0, 10)),
)
const userRankingOption = computed(() =>
  createUserRankingOption(statisticsStore.userRanking.slice(0, 10)),
)
const effectiveDateLabel = computed(() => appliedDate.value || '沿用总览默认日期')
const topDevice = computed(() => statisticsStore.deviceRanking[0] ?? null)
const topUser = computed(() => statisticsStore.userRanking[0] ?? null)

async function loadStatistics(queryDate = pendingDate.value || undefined) {
  try {
    await statisticsStore.fetchAll(queryDate ? { date: queryDate } : {})

    /**
     * 统计子页允许在请求期间继续展示上一版图表，避免切换日期时整页闪空。
     * 因此只有新日期的数据真正落地后，才提交到页面口径与筛选器，避免旧图表挂上新日期标签。
     */
    appliedDate.value = queryDate ?? ''
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
      eyebrow="Borrow Analytics"
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

    <ConsoleToolbarShell class="statistics-detail-view__toolbar">
      <div>
        <p class="statistics-detail-view__toolbar-eyebrow">Date Scope</p>
        <h2>统计日期筛选</h2>
        <p>借用统计页与总览共用同一日期口径，保证借出、归还和排行榜来自同一批次聚合。</p>
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
}

.statistics-detail-view__hero {
  border-radius: 28px;
}

.statistics-detail-view--borrow .statistics-detail-view__hero {
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 34%),
    radial-gradient(circle at bottom left, rgba(249, 115, 22, 0.14), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.94));
}

.statistics-detail-view__back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  text-decoration: none;
  color: #1d4ed8;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(29, 78, 216, 0.16);
}

.statistics-detail-view__meta-pill {
  min-width: 136px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.64);
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
  color: #1d4ed8;
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

.statistics-detail-view__chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.statistics-detail-view__feedback-title {
  margin: 0;
  color: var(--app-text-primary);
}

.statistics-detail-view__aside-card {
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.statistics-detail-view__rule-list {
  padding-left: 18px;
}

@media (max-width: 1366px) {
  .statistics-detail-view__layout,
  .statistics-detail-view__chart-grid {
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
