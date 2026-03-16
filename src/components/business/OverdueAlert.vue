<script setup lang="ts">
import { computed } from 'vue'

/**
 * 逾期摘要告警卡。
 * 列表页顶部需要一个能同时服务普通用户与设备管理员的统一提醒组件，用来突出待处理数量和累计逾期时长，避免用户必须先扫完整张表才能感知风险级别。
 */
const props = defineProps<{
  pendingCount: number
  totalOverdueHours: number
  isAdmin?: boolean
}>()

const title = computed(() => {
  if (!props.pendingCount) {
    return props.isAdmin ? '当前没有待处理逾期' : '当前没有逾期记录'
  }

  return props.isAdmin
    ? `还有 ${props.pendingCount} 条待处理逾期`
    : `你有 ${props.pendingCount} 条逾期记录待关注`
})

const description = computed(() => {
  if (!props.pendingCount) {
    return props.isAdmin
      ? '当前页没有需要设备管理员继续跟进的逾期单据。'
      : '当前没有需要你额外跟进的逾期借用记录。'
  }

  return props.isAdmin
    ? `累计逾期 ${props.totalOverdueHours} 小时，建议优先处理时间最长或已发送通知的记录。`
    : `累计逾期 ${props.totalOverdueHours} 小时，请尽快联系设备管理员完成归还或处理说明。`
})
</script>

<template>
  <section class="overdue-alert" :class="{ 'overdue-alert--quiet': !pendingCount }">
    <div>
      <p class="overdue-alert__eyebrow">Overdue Radar</p>
      <h2>{{ title }}</h2>
      <p class="overdue-alert__description">{{ description }}</p>
    </div>

    <div class="overdue-alert__meta">
      <strong>{{ pendingCount }}</strong>
      <span>待跟进</span>
      <RouterLink class="overdue-alert__link" to="/overdue">查看逾期列表</RouterLink>
    </div>
  </section>
</template>

<style scoped lang="scss">
.overdue-alert {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px;
  border: 1px solid rgba(244, 63, 94, 0.22);
  border-radius: 26px;
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.96), rgba(255, 255, 255, 0.98));
  box-shadow: 0 18px 48px rgba(225, 29, 72, 0.08);
}

.overdue-alert--quiet {
  border-color: rgba(148, 163, 184, 0.22);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98));
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
}

.overdue-alert__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #e11d48;
}

.overdue-alert h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
  color: #0f172a;
}

.overdue-alert__description {
  margin: 12px 0 0;
  max-width: 720px;
  line-height: 1.7;
  color: #475569;
}

.overdue-alert__meta {
  display: grid;
  justify-items: end;
  align-content: center;
  gap: 6px;
}

.overdue-alert__meta strong {
  font-family: 'Fira Code', monospace;
  font-size: 32px;
  color: #e11d48;
}

.overdue-alert__meta span {
  color: #64748b;
}

.overdue-alert__link {
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}
</style>
