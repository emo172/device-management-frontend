<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import StatisticsCard from '@/components/business/StatisticsCard.vue'
import ConsoleFeedbackSurface from '@/components/layout/ConsoleFeedbackSurface.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import { useStatisticsStore } from '@/stores/modules/statistics'
import { formatDate } from '@/utils'

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

/**
 * 统计总览页。
 * 总览页承担系统管理员进入统计模块后的第一屏，统一控制日期口径并把子模块入口集中在同一页，避免各统计页各自维护一套查询状态。
 */
const statisticsStore = useStatisticsStore()

function resolveInitialDate() {
  if (statisticsStore.query.date) {
    return statisticsStore.query.date
  }

  return statisticsStore.overview?.statDate ? formatDate(statisticsStore.overview.statDate) : ''
}

const selectedDate = ref(resolveInitialDate())

const isOverviewLoading = computed(() => {
  if (!statisticsStore.loading) {
    return false
  }

  if (!statisticsStore.overview) {
    return true
  }

  return statisticsStore.query.date === selectedDate.value
})

const overviewCards = computed(() => {
  const overview = statisticsStore.overview

  return [
    {
      title: '今日预约数',
      value: overview?.totalReservations ?? 0,
      description: '统一使用统计总览接口返回的单日预约总数。',
      trendLabel: `已批准 ${overview?.approvedReservations ?? 0} 条`,
      accent: 'teal' as const,
    },
    {
      title: '今日借用数',
      value: overview?.totalBorrows ?? 0,
      description: '借出数量和归还数量都以后端聚合结果为准。',
      trendLabel: `归还 ${overview?.totalReturns ?? 0} 条`,
      accent: 'amber' as const,
    },
    {
      title: '今日归还数',
      value: overview?.totalReturns ?? 0,
      description: '帮助系统管理员评估当天设备流转闭环。',
      trendLabel: `取消 ${overview?.cancelledReservations ?? 0} 条预约`,
      accent: 'blue' as const,
    },
    {
      title: '今日逾期数',
      value: overview?.totalOverdue ?? 0,
      description: '逾期记录数与逾期小时数需要联动观察。',
      trendLabel: `累计 ${overview?.totalOverdueHours ?? 0} 小时`,
      accent: 'rose' as const,
    },
    {
      title: '设备利用率',
      value: formatPercent(overview?.utilizationRate),
      description: '利用率来自统计总览接口，不在前端自行估算。',
      trendLabel: `拒绝 ${overview?.rejectedReservations ?? 0} 条`,
      accent: 'green' as const,
    },
  ]
})

const navigationItems = [
  {
    title: '设备利用率',
    description: '查看设备与分类的利用率排行与柱状对比。',
    to: '/statistics/device-usage',
  },
  {
    title: '借用统计',
    description: '查看当日借出/归还对比以及设备、用户 TOP10。',
    to: '/statistics/borrow',
  },
  {
    title: '逾期统计',
    description: '聚合查看逾期记录数与逾期时长。',
    to: '/statistics/overdue',
  },
  {
    title: '热门时段',
    description: '查看当前日期各预约时段的热度分布。',
    to: '/statistics/hot-time-slots',
  },
]

async function loadOverview(queryDate = statisticsStore.query.date) {
  await statisticsStore.fetchAll(queryDate ? { date: queryDate } : {})
}

async function handleDateChange(value: string | null) {
  selectedDate.value = value ?? ''
  await loadOverview(value ?? undefined)
}

onMounted(() => {
  if (!statisticsStore.overview) {
    void loadOverview(selectedDate.value || undefined)
  }
})
</script>

<template>
  <section class="statistics-overview-view">
    <ConsolePageHero
      title="统计分析总览"
      description="系统管理员在这里统一选择统计日期，并快速跳转到利用率、借用、逾期和热门时段等分析页。"
      class="statistics-overview-view__hero"
    >
      <template #actions>
        <div class="statistics-overview-view__controls">
          <!-- 日期筛选统一写在总览页，确保统计模块所有子页共享同一日口径。 -->
          <el-date-picker
            v-model="selectedDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择统计日期"
            @update:modelValue="handleDateChange"
          />
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleFeedbackSurface
      v-if="isOverviewLoading"
      state="loading"
      class="statistics-overview-view__loading"
    >
      <template #loading>
        <p class="statistics-overview-view__loading-text">统计总览加载中</p>
        <p class="statistics-overview-view__loading-desc">
          正在同步当前日期的预约、借还与逾期口径。
        </p>
      </template>
    </ConsoleFeedbackSurface>

    <ConsoleSummaryGrid v-else class="statistics-overview-view__card-grid">
      <StatisticsCard
        v-for="card in overviewCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :description="card.description"
        :trend-label="card.trendLabel"
        :accent="card.accent"
      />
    </ConsoleSummaryGrid>

    <section class="statistics-overview-view__nav-grid">
      <RouterLink
        v-for="item in navigationItems"
        :key="item.to"
        :to="item.to"
        class="statistics-overview-view__nav-card"
      >
        <strong>{{ item.title }}</strong>
        <p>{{ item.description }}</p>
      </RouterLink>
    </section>
  </section>
</template>

<style scoped lang="scss">
.statistics-overview-view {
  display: grid;
  gap: 24px;
}

.statistics-overview-view__hero,
.statistics-overview-view__nav-card {
  border-radius: 28px;
}

.statistics-overview-view__hero {
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
  background: var(--app-surface-card-strong);
}

.statistics-overview-view__hero :deep(.console-page-hero__eyebrow) {
  color: var(--app-text-secondary);
}

.statistics-overview-view__hero :deep(.console-page-hero__title) {
  color: var(--app-text-primary);
}

.statistics-overview-view__hero :deep(.console-page-hero__description) {
  color: var(--app-text-secondary);
}

.statistics-overview-view__controls {
  align-self: flex-start;
}

.statistics-overview-view__loading-text,
.statistics-overview-view__loading-desc {
  margin: 0;
}

.statistics-overview-view__loading-desc {
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.statistics-overview-view__card-grid,
.statistics-overview-view__nav-grid {
  display: grid;
  gap: 20px;
}

.statistics-overview-view__card-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.statistics-overview-view__nav-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.statistics-overview-view__nav-card {
  display: grid;
  gap: 10px;
  padding: 22px;
  border: 1px solid var(--app-border-soft);
  text-decoration: none;
  color: inherit;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}

.statistics-overview-view__nav-card strong {
  color: var(--app-text-primary);
}

.statistics-overview-view__nav-card p {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}
</style>
