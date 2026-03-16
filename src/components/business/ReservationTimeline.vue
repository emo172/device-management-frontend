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
      >
        <div class="reservation-timeline__item">
          <span>{{ item.title }}</span>
          <p v-if="item.remark">{{ item.remark }}</p>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<style scoped lang="scss">
.reservation-timeline__item span {
  font-weight: 600;
  color: var(--app-text-primary);
}

.reservation-timeline__item p {
  margin: 6px 0 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}
</style>
