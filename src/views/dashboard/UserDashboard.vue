<script setup lang="ts">
import { computed, onMounted } from 'vue'

import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'

/**
 * 用户仪表盘。
 * 该页面服务 `USER` 角色，聚合欢迎信息、近期预约、待签到提醒与 AI 快捷入口，
 * 目的是让普通用户在登录后优先看到“我接下来要做什么”。
 */
const DASHBOARD_PAGE_SIZE = 5

const authStore = useAuthStore()
const reservationStore = useReservationStore()

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getReservationStatusText(status: string) {
  const labelMap: Record<string, string> = {
    PENDING_DEVICE_APPROVAL: '待设备审批',
    PENDING_SYSTEM_APPROVAL: '待系统审批',
    PENDING_MANUAL: '待人工处理',
    APPROVED: '已批准',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    EXPIRED: '已过期',
  }

  return labelMap[status] ?? status
}

function getSignStatusText(signStatus: string) {
  const labelMap: Record<string, string> = {
    NOT_CHECKED_IN: '待签到',
    NOT_SIGNED: '待签到',
    CHECKED_IN: '已签到',
    SIGNED_IN: '已签到',
    CHECKED_IN_TIMEOUT: '签到超时',
    TIMEOUT: '签到超时',
  }

  return labelMap[signStatus] ?? signStatus
}

/**
 * 终审已经确认当前真实签到口径为 `NOT_CHECKED_IN / CHECKED_IN / CHECKED_IN_TIMEOUT`。
 * 仪表盘提醒只应把“尚未签到”的预约视为待办，避免继续沿用旧字符串导致提醒区漏算或误算。
 */
function isPendingCheckIn(signStatus: string) {
  return signStatus === 'NOT_CHECKED_IN' || signStatus === 'NOT_SIGNED'
}

function isCheckInWindow(startTime: string) {
  const start = new Date(startTime)

  if (Number.isNaN(start.getTime())) {
    return false
  }

  const now = Date.now()
  const startTimestamp = start.getTime()
  const earliest = startTimestamp - 30 * 60 * 1000
  const latest = startTimestamp + 60 * 60 * 1000

  return now >= earliest && now <= latest
}

/**
 * 用户仪表盘只需要最近 5 条预约。
 * 后端当前没有单独的“近期预约摘要”或“待签到提醒”接口，因此这里复用最小分页读取能力，
 * 用已加载的最近预约近似推导提醒区，保证实现贴合现有真实接口边界。
 */
const recentReservations = computed(() => reservationStore.list.slice(0, DASHBOARD_PAGE_SIZE))

const pendingCheckIns = computed(() => {
  return recentReservations.value.filter((item) => {
    return (
      item.status === 'APPROVED' &&
      isPendingCheckIn(item.signStatus) &&
      isCheckInWindow(item.startTime)
    )
  })
})

const welcomeName = computed(
  () => authStore.currentUser?.realName || authStore.currentUser?.username || '同学',
)

onMounted(async () => {
  await reservationStore.fetchReservationList({ page: 1, size: DASHBOARD_PAGE_SIZE })
})
</script>

<template>
  <div class="dashboard-page user-dashboard">
    <ConsolePageHero
      :title="`欢迎回来，${welcomeName}`"
      description="今天的仪表盘会优先提醒你最近的预约与签到窗口，减少在多个页面来回切换。"
      class="hero-card dashboard-card"
    >
      <template #actions>
        <div class="hero-actions">
          <RouterLink class="primary-link" to="/reservations">查看我的预约</RouterLink>
          <RouterLink class="secondary-link" to="/ai">AI 对话</RouterLink>
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleSummaryGrid class="dashboard-grid user-grid">
      <article class="dashboard-card reminder-card">
        <div class="panel-header">
          <div>
            <p class="eyebrow">签到关注</p>
            <h2>待签到提醒</h2>
          </div>
          <span class="badge">{{ pendingCheckIns.length }} 条</span>
        </div>

        <p class="panel-note">
          基于当前已加载的最近 5 条预约近似计算；后端暂未提供独立的待签到计数接口。
        </p>

        <ul v-if="pendingCheckIns.length" class="compact-list">
          <li v-for="item in pendingCheckIns" :key="item.id">
            <strong>{{ item.deviceName }}</strong>
            <span>{{ formatDateTime(item.startTime) }} 开始</span>
          </li>
        </ul>
        <p v-else class="empty-text">当前没有需要立即签到的预约，祝你今天顺利。</p>
      </article>

      <article class="dashboard-card shortcut-card">
        <div class="panel-header">
          <div>
            <p class="eyebrow">AI 助手</p>
            <h2>AI 对话快捷入口</h2>
          </div>
        </div>

        <p class="panel-note">
          当你需要快速查询设备、预约建议或取消流程时，可以直接进入 AI 对话页。
        </p>

        <RouterLink class="feature-link" to="/ai">打开 AI 对话</RouterLink>
      </article>
    </ConsoleSummaryGrid>

    <section class="dashboard-card list-card">
      <div class="panel-header">
        <div>
          <p class="eyebrow">近期预约</p>
          <h2>我的近期预约列表</h2>
        </div>
        <span class="badge">最近 {{ recentReservations.length }} 条</span>
      </div>

      <div v-if="reservationStore.loading" class="empty-text">正在加载近期预约...</div>
      <ul v-else-if="recentReservations.length" class="reservation-list">
        <li v-for="item in recentReservations" :key="item.id" class="reservation-item">
          <div>
            <strong>{{ item.deviceName }}</strong>
            <p>{{ formatDateTime(item.startTime) }} - {{ formatDateTime(item.endTime) }}</p>
          </div>
          <div class="reservation-meta">
            <span class="status-chip">{{ getReservationStatusText(item.status) }}</span>
            <span class="sign-chip">{{ getSignStatusText(item.signStatus) }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="empty-text">最近还没有预约记录，可以先去设备页看看可用设备。</p>
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

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  background:
    radial-gradient(circle at top right, var(--app-tone-brand-surface-strong), transparent 34%),
    linear-gradient(140deg, var(--app-surface-card-strong), var(--app-tone-brand-surface));
}

.hero-card h1,
.panel-header h2 {
  margin: 8px 0 0;
  color: var(--app-text-primary);
  font-size: 28px;
  line-height: 1.2;
}

.panel-header h2 {
  font-size: 22px;
}

.eyebrow {
  margin: 0;
  color: var(--app-tone-success-text);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-copy,
.panel-note,
.reservation-item p,
.empty-text,
.compact-list span {
  margin: 12px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.primary-link,
.secondary-link,
.feature-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 600;
}

.primary-link,
.feature-link {
  background: linear-gradient(135deg, var(--app-tone-success-solid), var(--app-tone-brand-solid));
  color: var(--app-surface-card-strong);
}

.secondary-link {
  border: 1px solid var(--app-tone-brand-border);
  color: var(--app-tone-brand-text-strong);
  background: var(--app-tone-brand-surface);
}

.dashboard-grid {
  display: grid;
  gap: 20px;
}

.user-grid {
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.badge,
.status-chip,
.sign-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.badge {
  background: var(--app-tone-success-surface);
  color: var(--app-tone-success-text-strong);
}

.reservation-list,
.compact-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 18px 0 0;
  list-style: none;
}

.reservation-item,
.compact-list li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px 18px;
  border-radius: var(--app-radius-sm);
  background: var(--app-surface-card-strong);
  border: 1px solid var(--app-border-soft);
}

.reservation-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-chip {
  background: var(--app-tone-warning-surface);
  color: var(--app-tone-warning-text-strong);
}

.sign-chip {
  background: var(--app-tone-brand-surface);
  color: var(--app-tone-brand-text-strong);
}

@media (max-width: 1200px) {
  .hero-card,
  .user-grid,
  .reservation-item,
  .compact-list li {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-actions,
  .reservation-meta {
    width: 100%;
  }
}
</style>
