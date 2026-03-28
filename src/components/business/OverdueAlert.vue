<script setup lang="ts">
import { computed } from 'vue'

/**
 * 逾期摘要告警卡。
 * 列表页顶部需要一个能同时服务普通用户与设备管理员的统一提醒组件，用来突出待处理数量和当前页累计逾期时长，避免用户必须先扫完整张表才能感知风险级别。
 */
const props = defineProps<{
  pendingCount: number
  totalOverdueHours: number
  isAdmin?: boolean
}>()

const title = computed(() => {
  if (!props.pendingCount) {
    return props.isAdmin ? '当前页没有待处理逾期' : '当前页没有逾期记录'
  }

  return props.isAdmin
    ? `当前页还有 ${props.pendingCount} 条待处理逾期`
    : `当前页有 ${props.pendingCount} 条逾期记录待关注`
})

const description = computed(() => {
  if (!props.pendingCount) {
    return props.isAdmin
      ? '当前页没有需要设备管理员继续跟进的逾期单据。'
      : '当前页没有需要你额外跟进的逾期借用记录。'
  }

  return props.isAdmin
    ? `当前页累计逾期 ${props.totalOverdueHours} 小时，建议优先处理时间最长或已发送通知的记录。`
    : `当前页累计逾期 ${props.totalOverdueHours} 小时，请尽快联系设备管理员完成归还或处理说明。`
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
      <span>{{ isAdmin ? '当前页待跟进' : '当前页待关注' }}</span>
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
  border: 1px solid var(--app-tone-danger-border);
  border-radius: 26px;
  background: linear-gradient(
    135deg,
    var(--app-tone-danger-surface),
    var(--app-surface-card-strong)
  );
  box-shadow: var(--app-shadow-card);
}

.overdue-alert--quiet {
  border-color: var(--app-tone-info-border);
  background: linear-gradient(135deg, var(--app-tone-info-surface), var(--app-surface-card-strong));
  box-shadow: var(--app-shadow-solid);
}

.overdue-alert__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--app-tone-danger-text);
}

.overdue-alert--quiet .overdue-alert__eyebrow {
  color: var(--app-tone-info-text);
}

.overdue-alert h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
  color: var(--app-text-primary);
}

.overdue-alert__description {
  margin: 12px 0 0;
  max-width: 720px;
  line-height: 1.7;
  color: var(--app-text-secondary);
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
  color: var(--app-tone-danger-text-strong);
}

.overdue-alert--quiet .overdue-alert__meta strong {
  color: var(--app-tone-info-text-strong);
}

.overdue-alert__meta span {
  color: var(--app-text-secondary);
}

.overdue-alert__link {
  color: var(--app-tone-brand-text);
  text-decoration: none;
  font-weight: 600;
}
</style>
