<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import ConsoleToolbarShell from '@/components/layout/ConsoleToolbarShell.vue'
import { useStatisticsStore } from '@/stores/modules/statistics'
import SharedChartPanel from './SharedChartPanel.vue'
import { createUtilizationBarOption } from './chartOptions'

/**
 * 设备利用率页。
 * 单独拆页后，系统管理员可以把“利用率排行表格”和“利用率柱状图”放在同一视图交叉查看，而不挤占总览页空间。
 */
const statisticsStore = useStatisticsStore()

const pendingDate = ref(statisticsStore.query.date || '')
const appliedDate = ref(statisticsStore.query.date || '')

const deviceOption = computed(() =>
  createUtilizationBarOption('设备利用率', statisticsStore.deviceUtilization.slice(0, 10)),
)
const categoryOption = computed(() =>
  createUtilizationBarOption('分类利用率', statisticsStore.categoryUtilization),
)
const effectiveDateLabel = computed(() => appliedDate.value || '沿用总览默认日期')
const topDevice = computed(() => statisticsStore.deviceUtilization[0] ?? null)
const topCategory = computed(() => statisticsStore.categoryUtilization[0] ?? null)
const tableCountText = computed(() => `设备 ${statisticsStore.deviceUtilization.length} 条`)

async function loadStatistics(queryDate = pendingDate.value || undefined) {
  try {
    await statisticsStore.fetchAll(queryDate ? { date: queryDate } : {})

    /**
     * 子页刷新期间仍会沿用上一版排行与图表，因此日期标签只能在新数据回写成功后再切换。
     * 否则会出现“旧排行 + 新日期”的错位展示，误导系统管理员判断当天利用率。
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
  if (!statisticsStore.deviceUtilization.length && !statisticsStore.categoryUtilization.length) {
    void loadStatistics()
  }
})
</script>

<template>
  <section class="statistics-detail-view statistics-detail-view--utilization">
    <ConsolePageHero
      eyebrow="Utilization"
      title="设备利用率分析"
      description="这里同时展示设备维度和分类维度的利用率，帮助系统管理员判断当前设备投放是否均衡。"
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
          <span>设备条目</span>
          <strong>{{ statisticsStore.deviceUtilization.length }}</strong>
        </div>
        <div class="statistics-detail-view__meta-pill">
          <span>分类条目</span>
          <strong>{{ statisticsStore.categoryUtilization.length }}</strong>
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleToolbarShell class="statistics-detail-view__toolbar">
      <div>
        <p class="statistics-detail-view__toolbar-eyebrow">Date Scope</p>
        <h2>统计日期筛选</h2>
        <p>所有统计子页都沿用同一份日期查询，避免子页与总览页图表口径不一致。</p>
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
        <ConsoleTableSection title="设备利用率排行" :count="tableCountText">
          <ConsoleFeedbackSurface
            v-if="statisticsStore.loading && !statisticsStore.deviceUtilization.length"
            state="loading"
          >
            <p class="statistics-detail-view__feedback-title">设备利用率加载中</p>
            <p class="statistics-detail-view__feedback-description">
              正在同步设备与分类利用率排行，请稍候。
            </p>
          </ConsoleFeedbackSurface>

          <EmptyState
            v-else-if="!statisticsStore.deviceUtilization.length"
            title="暂无设备利用率数据"
            description="当前日期尚未生成设备利用率统计，可切回总览页更换统计日期。"
          />

          <el-table v-else :data="statisticsStore.deviceUtilization" stripe>
            <el-table-column prop="deviceName" label="设备名称" min-width="180" />
            <el-table-column prop="categoryName" label="分类" min-width="160" />
            <el-table-column prop="totalReservations" label="预约总数" min-width="120" />
            <el-table-column prop="totalBorrows" label="借出总数" min-width="120" />
            <el-table-column label="利用率" min-width="140">
              <template #default="scope"
                >{{ Number(scope.row.utilizationRate).toFixed(1) }}%</template
              >
            </el-table-column>
          </el-table>
        </ConsoleTableSection>

        <div class="statistics-detail-view__chart-grid">
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
        </div>
      </div>

      <ConsoleAsidePanel
        title="分析摘要"
        description="利用率页需要同时确认排行榜、图表和分类分布，避免只看单一榜单做投放决策。"
      >
        <div class="statistics-detail-view__aside-stack">
          <section class="statistics-detail-view__aside-card">
            <p class="statistics-detail-view__aside-label">最活跃设备</p>
            <h3>{{ topDevice?.deviceName || '暂无' }}</h3>
            <p>
              {{
                topDevice
                  ? `利用率 ${Number(topDevice.utilizationRate).toFixed(1)}%，借出 ${topDevice.totalBorrows} 次。`
                  : '当前日期还没有设备利用率排行结果。'
              }}
            </p>
          </section>

          <section class="statistics-detail-view__aside-card">
            <p class="statistics-detail-view__aside-label">最活跃分类</p>
            <h3>{{ topCategory?.categoryName || '暂无' }}</h3>
            <p>
              {{
                topCategory
                  ? `分类利用率 ${Number(topCategory.utilizationRate).toFixed(1)}%，共 ${topCategory.totalBorrows} 次借出。`
                  : '当前日期还没有分类利用率聚合结果。'
              }}
            </p>
          </section>

          <section class="statistics-detail-view__aside-card">
            <h4>判读提醒</h4>
            <ul class="statistics-detail-view__rule-list">
              <li>设备排行只展示后端真实返回的前端可见字段，不额外推导隐藏规则。</li>
              <li>分类利用率用于判断投放结构是否失衡，不能替代具体设备排行。</li>
              <li>切换日期后会整页刷新统计缓存，确保所有图表口径一致。</li>
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

.statistics-detail-view--utilization .statistics-detail-view__hero {
  background:
    radial-gradient(circle at top right, rgba(20, 184, 166, 0.18), transparent 34%),
    radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.14), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 253, 250, 0.94));
}

.statistics-detail-view__back-link {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  text-decoration: none;
  color: #0f766e;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(15, 118, 110, 0.18);
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
  color: #0f766e;
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
