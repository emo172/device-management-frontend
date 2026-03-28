<script setup lang="ts">
import { computed } from 'vue'

import type { ReservationDetailResponse } from '@/api/reservations'
import EmptyState from '@/components/common/EmptyState.vue'
import { buildReservationTimelineItems, formatDateTime } from '@/utils'

/**
 * 预约状态时间线。
 * 组件只消费后端已落库的关键时间字段，确保详情页展示的是“真实发生过的节点”，而不是前端自行推导的伪历史。
 */
const props = defineProps<{
  reservation: ReservationDetailResponse
}>()

const timelineItems = computed(() => buildReservationTimelineItems(props.reservation))
type TimelineTone = 'brand' | 'success' | 'danger'

/**
 * 时间线颜色要跟随后端真实节点与当前流转结果，而不是从标题文案反推。
 * 这样后续即便统一文案或调整术语，节点 tone 仍然和业务结果保持一致。
 */
function resolveTimelineTone(itemKey: string): TimelineTone {
  if (itemKey === 'cancelled') {
    return 'danger'
  }

  if (itemKey === 'checked-in') {
    return 'success'
  }

  if (itemKey === 'device-approved') {
    return props.reservation.status === 'REJECTED' && !props.reservation.systemApprovedAt
      ? 'danger'
      : 'success'
  }

  if (itemKey === 'system-approved') {
    return props.reservation.status === 'REJECTED' ? 'danger' : 'success'
  }

  return 'brand'
}

function resolveTimelineNodeColor(itemKey: string) {
  const colorMap = {
    brand: 'var(--app-tone-brand-solid)',
    success: 'var(--app-tone-success-solid)',
    danger: 'var(--app-tone-danger-solid)',
  } as const

  return colorMap[resolveTimelineTone(itemKey)]
}
</script>

<template>
  <div class="reservation-timeline">
    <EmptyState
      v-if="!timelineItems.length"
      title="暂无状态流转记录"
      description="当前预约还没有生成可展示的审批或签到节点，后续流转会在这里留痕。"
    />

    <el-timeline v-else>
      <el-timeline-item
        v-for="item in timelineItems"
        :key="item.key"
        :timestamp="formatDateTime(item.time)"
        :color="resolveTimelineNodeColor(item.key)"
      >
        <div
          class="reservation-timeline__item"
          :class="`reservation-timeline__item--${resolveTimelineTone(item.key)}`"
        >
          <span>{{ item.title }}</span>
          <p v-if="item.remark">{{ item.remark }}</p>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.reservation-timeline :deep(.el-timeline-item__tail) {
  border-left-color: var(--app-border-soft);
}

.reservation-timeline :deep(.el-timeline-item__timestamp) {
  color: var(--app-text-secondary);
}

.reservation-timeline__item {
  @include shell.console-solid-surface;

  padding: 16px 18px;
  border-radius: 18px;
}

.reservation-timeline__item span {
  font-weight: 600;
  color: var(--app-text-primary);
}

.reservation-timeline__item p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.reservation-timeline__item--brand {
  background: linear-gradient(
    135deg,
    var(--app-tone-brand-surface),
    var(--app-surface-card-strong)
  );
}

.reservation-timeline__item--success {
  background: linear-gradient(
    135deg,
    var(--app-tone-success-surface),
    var(--app-surface-card-strong)
  );
}

.reservation-timeline__item--danger {
  background: linear-gradient(
    135deg,
    var(--app-tone-danger-surface),
    var(--app-surface-card-strong)
  );
}
</style>
