<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import StatisticsCard from '@/components/business/StatisticsCard.vue'
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
    <header class="statistics-overview-view__hero">
      <div>
        <p class="statistics-overview-view__eyebrow">Statistics Console</p>
        <h1 class="statistics-overview-view__title">统计分析总览</h1>
        <p class="statistics-overview-view__description">
          系统管理员在这里统一选择统计日期，并快速跳转到利用率、借用、逾期和热门时段等分析页。
        </p>
      </div>

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
    </header>

    <section class="statistics-overview-view__card-grid">
      <StatisticsCard
        v-for="card in overviewCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :description="card.description"
        :trend-label="card.trendLabel"
        :accent="card.accent"
      />
    </section>

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
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 22px 56px rgba(15, 23, 42, 0.08);
}

.statistics-overview-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(13, 148, 136, 0.18), transparent 34%),
    radial-gradient(circle at bottom left, rgba(245, 158, 11, 0.14), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
}

.statistics-overview-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0f766e;
}

.statistics-overview-view__title {
  margin: 0;
  color: var(--app-text-primary);
  font-size: clamp(30px, 4vw, 40px);
}

.statistics-overview-view__description {
  max-width: 780px;
  margin: 14px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.8;
}

.statistics-overview-view__controls {
  align-self: flex-start;
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
  text-decoration: none;
  color: inherit;
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
