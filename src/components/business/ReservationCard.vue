<script setup lang="ts">
import { View } from '@element-plus/icons-vue'
import { computed } from 'vue'

import type { ReservationListItemResponse } from '@/api/reservations'
import CheckInStatusTag from '@/components/business/CheckInStatusTag.vue'
import ReservationStatusTag from '@/components/business/ReservationStatusTag.vue'
import { formatDateTime } from '@/utils'
import {
  canCancelReservation,
  canCheckInReservation,
  shouldShowCancelWindowHint,
} from '@/utils/reservation'

/**
 * 预约摘要卡片。
 * 列表页需要在表格之外突出展示“设备 + 时间 + 当前动作”，方便用户快速识别哪些预约可以签到、哪些预约仍可取消。
 */
const props = defineProps<{
  reservation: ReservationListItemResponse
  allowUserActions?: boolean
}>()

const emit = defineEmits<{
  (event: 'detail', reservationId: string): void
  (event: 'cancel', reservationId: string): void
  (event: 'check-in', reservationId: string): void
}>()

const timeRangeText = computed(
  () =>
    `${formatDateTime(props.reservation.startTime)} - ${formatDateTime(props.reservation.endTime)}`,
)
const showCancelAction = computed(
  () => props.allowUserActions && canCancelReservation(props.reservation),
)
const showCheckInAction = computed(
  () => props.allowUserActions && canCheckInReservation(props.reservation),
)
const showCancelHint = computed(
  () => props.allowUserActions && shouldShowCancelWindowHint(props.reservation),
)
</script>

<template>
  <article class="reservation-card">
    <div class="reservation-card__top">
      <div>
        <p class="reservation-card__eyebrow">{{ reservation.deviceNumber }}</p>
        <h3 class="reservation-card__title">{{ reservation.deviceName }}</h3>
      </div>
      <ReservationStatusTag :status="reservation.status" />
    </div>

    <p class="reservation-card__time">{{ timeRangeText }}</p>
    <p class="reservation-card__purpose">{{ reservation.purpose }}</p>

    <div class="reservation-card__meta">
      <CheckInStatusTag :status="reservation.signStatus" />
    </div>

    <div class="reservation-card__actions">
      <!-- 卡片详情入口统一强调为共享只读查看动作，用户自助签到/取消继续保留各自业务语义与色彩层级。 -->
      <el-button
        class="reservation-card__detail app-detail-action"
        text
        type="primary"
        @click="emit('detail', reservation.id)"
      >
        <el-icon><View /></el-icon>
        详情
      </el-button>

      <!-- 取消与签到都属于用户自助动作，管理员在列表页只保留只读查看入口，避免越权代操作。 -->
      <template v-if="allowUserActions">
        <el-button
          v-if="showCheckInAction"
          class="reservation-card__check-in"
          text
          type="primary"
          @click="emit('check-in', reservation.id)"
        >
          签到
        </el-button>
        <el-button
          v-if="showCancelAction"
          class="reservation-card__cancel"
          text
          type="danger"
          @click="emit('cancel', reservation.id)"
        >
          取消预约
        </el-button>
      </template>
    </div>

    <p v-if="showCancelHint" class="reservation-card__hint">24 小时内请联系管理员处理</p>
  </article>
</template>

<style scoped lang="scss">
@use '@/assets/styles/console-shell' as shell;

.reservation-card {
  @include shell.console-solid-surface;

  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, var(--app-surface-card), var(--app-surface-card-strong)),
    radial-gradient(circle at top right, var(--app-tone-brand-surface), transparent 38%);
}

.reservation-card__top,
.reservation-card__meta,
.reservation-card__actions {
  display: flex;
  align-items: center;
}

.reservation-card__top,
.reservation-card__actions {
  justify-content: space-between;
}

.reservation-card__top {
  align-items: flex-start;
  gap: 12px;
}

.reservation-card__top > div {
  min-width: 0;
  flex: 1;
}

.reservation-card__meta,
.reservation-card__actions {
  gap: 8px;
  flex-wrap: wrap;
}

.reservation-card__eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-tone-brand-text);
}

.reservation-card__title {
  margin: 0;
  font-size: 20px;
  color: var(--app-text-primary);
}

.reservation-card__eyebrow,
.reservation-card__title,
.reservation-card__time,
.reservation-card__purpose {
  overflow-wrap: anywhere;
}

.reservation-card__time,
.reservation-card__purpose,
.reservation-card__hint {
  margin: 0;
  color: var(--app-text-secondary);
}

.reservation-card__time {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.reservation-card__purpose,
.reservation-card__hint {
  font-size: 13px;
  line-height: 1.7;
}

.reservation-card__hint {
  color: var(--app-tone-warning-text);
}
</style>
