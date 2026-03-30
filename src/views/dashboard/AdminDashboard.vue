<script setup lang="ts">
import { computed, onMounted } from 'vue'

import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useBorrowStore } from '@/stores/modules/borrow'
import { useDeviceStore } from '@/stores/modules/device'
import { useOverdueStore } from '@/stores/modules/overdue'
import { useReservationStore } from '@/stores/modules/reservation'
import { useStatisticsStore } from '@/stores/modules/statistics'

/**
 * 管理员仪表盘。
 * 该页面同时服务 `DEVICE_ADMIN` 与 `SYSTEM_ADMIN`：系统管理员优先看统计接口汇总的“今日”指标，
 * 设备管理员则基于当前真实存在的设备、预约、借还、逾期列表接口拼出运行态概览。
 */
const DASHBOARD_PAGE_SIZE = 8

const authStore = useAuthStore()
const statisticsStore = useStatisticsStore()
const deviceStore = useDeviceStore()
const reservationStore = useReservationStore()
const borrowStore = useBorrowStore()
const overdueStore = useOverdueStore()

const currentRole = computed(
  () => authStore.userRole ?? authStore.currentUser?.role ?? UserRole.USER,
)
const isSystemAdmin = computed(() => currentRole.value === UserRole.SYSTEM_ADMIN)
const isSystemAdminOverviewPending = computed(() => {
  return isSystemAdmin.value && statisticsStore.loading && !statisticsStore.overview
})
const isSystemAdminOverviewUnavailable = computed(() => {
  return isSystemAdmin.value && !statisticsStore.loading && !statisticsStore.overview
})

const displayName = computed(
  () => authStore.currentUser?.realName || authStore.currentUser?.username || '管理员',
)

/**
 * 管理端待审核提醒当前只能基于已加载记录做近似计算。
 * 原因是后端当前没有单独的待审核计数接口，且预约列表接口只支持 `page` 与 `size`，
 * 因此仪表盘只能利用第一页结果先做运营态提醒，再引导管理员进入正式管理页查看全量列表。
 */
const pendingReservationCount = computed(() => {
  const pendingStatuses = isSystemAdmin.value
    ? ['PENDING_SYSTEM_APPROVAL']
    : ['PENDING_DEVICE_APPROVAL', 'PENDING_MANUAL']

  return reservationStore.list.filter((item) => pendingStatuses.includes(item.status)).length
})

/**
 * 系统管理员可直接复用 `/api/statistics/*` 的按日聚合结果，因此概览卡片尽量贴近“今日预约 / 今日借用 / 今日逾期”口径。
 * 设备管理员当前没有统计接口权限，只能用可访问的列表接口返回结果展示运行态指标，
 * 因此这里明确使用“当前设备数 / 当前页待处理预约 / 当前页借用记录 / 当前页待处理逾期”而不是伪造今日口径。
 */
const overviewCards = computed(() => {
  if (isSystemAdmin.value && statisticsStore.overview) {
    return [
      { title: '今日预约', value: statisticsStore.overview.totalReservations, accent: 'teal' },
      { title: '今日批准', value: statisticsStore.overview.approvedReservations, accent: 'green' },
      { title: '今日借用', value: statisticsStore.overview.totalBorrows, accent: 'amber' },
      { title: '今日逾期', value: statisticsStore.overview.totalOverdue, accent: 'rose' },
    ]
  }

  return [
    { title: '当前设备数', value: deviceStore.total, accent: 'teal' },
    { title: '当前页待处理预约', value: pendingReservationCount.value, accent: 'amber' },
    { title: '当前页借用记录', value: borrowStore.total, accent: 'blue' },
    { title: '当前页待处理逾期', value: overdueStore.total, accent: 'rose' },
  ]
})

const quickActions = computed(() => {
  if (isSystemAdmin.value) {
    return [
      { label: '统计分析', to: '/statistics', description: '查看整体运行数据与趋势' },
      { label: '预约审核', to: '/reservations/manage/pending', description: '处理待系统审批预约' },
      { label: '用户管理', to: '/users', description: '调整用户与角色配置' },
    ]
  }

  return [
    {
      label: '预约审核',
      to: '/reservations/manage/pending',
      description: '处理一审与人工处理预约',
    },
    { label: '借还管理', to: '/borrows', description: '查看借出确认与归还记录' },
    { label: '逾期处理', to: '/overdue', description: '跟进待处理的逾期记录' },
  ]
})

const reminderDescription = computed(() => {
  return isSystemAdmin.value
    ? '基于首页已加载预约近似统计待系统审批数量。'
    : '基于首页已加载预约近似统计待设备审批与待人工处理数量。'
})

onMounted(async () => {
  if (isSystemAdmin.value) {
    try {
      await Promise.all([
        statisticsStore.fetchOverview(),
        reservationStore.fetchReservationList({ page: 1, size: DASHBOARD_PAGE_SIZE }),
      ])
    } catch {
      // 首页只展示概览口径，统计概览失败时保留系统管理员专属异常占位，不回退到设备管理员的运行态数据。
    }
    return
  }

  await Promise.all([
    deviceStore.fetchDeviceList({ page: 1, size: DASHBOARD_PAGE_SIZE }),
    reservationStore.fetchReservationList({ page: 1, size: DASHBOARD_PAGE_SIZE }),
    borrowStore.fetchBorrowList({ page: 1, size: DASHBOARD_PAGE_SIZE }),
    overdueStore.fetchOverdueList({ page: 1, size: DASHBOARD_PAGE_SIZE }),
  ])
})
</script>

<template>
  <div class="dashboard-page admin-dashboard">
    <ConsolePageHero
      :title="`${displayName}，这里是今天的管理概览`"
      :description="
        isSystemAdmin
          ? '系统管理员看全局趋势与审批负载。'
          : '设备管理员看现场处理事项与设备运行状态。'
      "
      class="dashboard-card admin-hero"
    >
      <template #actions>
        <RouterLink
          class="hero-link"
          :to="isSystemAdmin ? '/statistics' : '/reservations/manage/pending'"
        >
          {{ isSystemAdmin ? '进入统计分析' : '进入预约审核' }}
        </RouterLink>
      </template>
    </ConsolePageHero>

    <ConsoleSummaryGrid class="overview-grid">
      <article
        v-if="isSystemAdminOverviewPending"
        class="dashboard-card overview-loading-card"
        data-testid="system-admin-overview-loading"
      >
        <p class="overview-title">今日统计正在加载</p>
        <strong class="overview-value">--</strong>
        <p class="panel-note">
          当前正在等待统计接口回填今日预约、今日借用与今日逾期数据，不回退展示设备管理员运行态口径。
        </p>
      </article>
      <article
        v-else-if="isSystemAdminOverviewUnavailable"
        class="dashboard-card overview-loading-card overview-unavailable-card"
        data-testid="system-admin-overview-unavailable"
      >
        <p class="overview-title">今日统计暂不可用</p>
        <strong class="overview-value">--</strong>
        <p class="panel-note">
          当前无法回填系统管理员首页概览，请稍后重试或进入统计分析页查看更完整的数据状态。
        </p>
      </article>
      <article
        v-else
        v-for="card in overviewCards"
        :key="card.title"
        class="dashboard-card overview-card"
        :class="`accent-${card.accent}`"
      >
        <p class="overview-title">{{ card.title }}</p>
        <strong class="overview-value">{{ card.value }}</strong>
      </article>
    </ConsoleSummaryGrid>

    <section class="dashboard-grid admin-grid">
      <article class="dashboard-card reminder-card">
        <div class="panel-header">
          <div>
            <p class="eyebrow">审批提醒</p>
            <h2>待审核预约提醒</h2>
          </div>
          <span class="badge">{{ pendingReservationCount }} 条</span>
        </div>

        <p class="panel-note">{{ reminderDescription }}</p>
        <p class="panel-note">
          后端当前无独立计数接口，仪表盘提醒仅作为进入正式管理页前的快速信号。
        </p>

        <RouterLink class="action-link" to="/reservations/manage/pending">前往预约审核</RouterLink>
      </article>

      <article class="dashboard-card actions-card">
        <div class="panel-header">
          <div>
            <p class="eyebrow">快捷操作</p>
            <h2>快捷操作入口</h2>
          </div>
        </div>

        <ul class="action-list">
          <li v-for="action in quickActions" :key="action.label">
            <RouterLink class="action-item" :to="action.to">
              <strong>{{ action.label }}</strong>
              <span>{{ action.description }}</span>
            </RouterLink>
          </li>
        </ul>
      </article>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  display: grid;
  gap: 20px;
}

.dashboard-card {
  border: 1px solid var(--app-border-soft);
  border-radius: var(--app-radius-md);
  background:
    linear-gradient(180deg, var(--app-surface-card-strong), var(--app-surface-card)),
    linear-gradient(135deg, var(--app-tone-brand-surface), var(--app-tone-warning-surface));
  box-shadow: var(--app-shadow-card);
  padding: 24px;
}

.admin-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  background:
    radial-gradient(circle at top right, var(--app-tone-brand-surface-strong), transparent 34%),
    linear-gradient(140deg, var(--app-surface-card-strong), var(--app-tone-brand-surface));
}

.eyebrow {
  margin: 0;
  color: var(--app-tone-success-text);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.admin-hero h1,
.panel-header h2 {
  margin: 8px 0 0;
  color: var(--app-text-primary);
}

.admin-hero h1 {
  font-size: 28px;
  line-height: 1.2;
}

.panel-header h2 {
  font-size: 22px;
}

.hero-copy,
.panel-note,
.action-item span {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.hero-link,
.action-link,
.action-item {
  text-decoration: none;
}

.hero-link,
.action-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--app-tone-success-solid), var(--app-tone-brand-solid));
  color: var(--app-surface-card-strong);
  font-weight: 600;
}

.overview-grid,
.dashboard-grid {
  display: grid;
  gap: 20px;
}

.overview-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.overview-loading-card {
  grid-column: 1 / -1;
}

.admin-grid {
  grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.05fr);
}

.overview-card {
  position: relative;
  overflow: hidden;
}

.overview-card::after {
  content: '';
  position: absolute;
  inset: auto -10% -40% auto;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  opacity: 0.18;
  background: var(--overview-accent);
}

.accent-teal::after {
  --overview-accent: var(--app-tone-success-solid);
}

.accent-green::after {
  --overview-accent: var(--app-tone-success-text);
}

.accent-amber::after {
  --overview-accent: var(--app-tone-warning-solid);
}

.accent-rose::after {
  --overview-accent: var(--app-tone-danger-solid);
}

.accent-blue::after {
  --overview-accent: var(--app-tone-brand-solid);
}

.overview-title {
  margin: 0;
  color: var(--app-text-secondary);
}

.overview-value {
  display: block;
  margin-top: 14px;
  color: var(--app-text-primary);
  font-size: 34px;
  line-height: 1;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--app-tone-warning-surface);
  color: var(--app-tone-warning-text-strong);
  font-size: 12px;
  font-weight: 700;
}

.action-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 18px 0 0;
  list-style: none;
}

.action-item {
  display: block;
  padding: 16px 18px;
  border-radius: var(--app-radius-sm);
  color: var(--app-text-primary);
  background: var(--app-surface-card-strong);
  border: 1px solid var(--app-border-soft);
}

.action-item strong {
  display: block;
}

@media (max-width: 1200px) {
  .admin-hero,
  .overview-grid,
  .admin-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
