<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

import type { ReservationDetailResponse } from '@/api/reservations'
import CheckInStatusTag from '@/components/business/CheckInStatusTag.vue'
import ReservationStatusTag from '@/components/business/ReservationStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { UserRole } from '@/enums'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'
import { formatDateTime, getReservationCheckInStage, toLocalDateTime } from '@/utils'

/**
 * 预约签到页。
 * 页面只允许 USER 对本人预约在签到窗口内发起签到，并把正常签到、超时签到、已过期三种结果明确反馈出来。
 */
const route = useRoute()
const authStore = useAuthStore()
const reservationStore = useReservationStore()

const reservationId = computed(() => String(route.params.id || ''))
const completedTone = ref<'normal' | 'late' | null>(null)
const submitting = ref(false)

const reservationDetail = computed<ReservationDetailResponse | null>(() => {
  const currentReservation = reservationStore.currentReservation

  if (
    !currentReservation ||
    !('deviceName' in currentReservation) ||
    currentReservation.id !== reservationId.value
  ) {
    return null
  }

  return currentReservation
})
const isOwnerUser = computed(() => {
  if (!reservationDetail.value) {
    return false
  }

  return (
    authStore.userRole === UserRole.USER &&
    authStore.currentUser?.userId === reservationDetail.value.userId
  )
})
const currentStage = computed(() => {
  if (!reservationDetail.value) {
    return 'unavailable'
  }

  if (completedTone.value) {
    return 'completed'
  }

  return getReservationCheckInStage(reservationDetail.value)
})
const canSubmitCheckIn = computed(() => {
  return (
    !completedTone.value &&
    isOwnerUser.value &&
    (currentStage.value === 'normal' || currentStage.value === 'late')
  )
})
const feedbackTitle = computed(() => {
  if (completedTone.value === 'late') {
    return '超时签到成功'
  }

  if (completedTone.value === 'normal') {
    return '签到成功'
  }

  if (currentStage.value === 'late') {
    return '超时签到'
  }

  if (currentStage.value === 'expired') {
    return '已过期'
  }

  if (currentStage.value === 'completed') {
    return '已完成签到'
  }

  if (currentStage.value === 'unavailable') {
    return '当前不可签到'
  }

  return '正常签到'
})
const feedbackDescription = computed(() => {
  if (completedTone.value === 'late') {
    return '本次签到已完成，并按开始后 30~60 分钟窗口记录为超时签到。'
  }

  if (completedTone.value === 'normal') {
    return '本次签到已完成，并按正常签到记录当前时点。'
  }

  if (currentStage.value === 'late') {
    return '当前处于开始后 30~60 分钟窗口，本次将记录为超时签到。'
  }

  if (currentStage.value === 'expired') {
    return '已经超过开始后 60 分钟，当前预约应视为已过期，无法继续签到。'
  }

  if (currentStage.value === 'completed') {
    return '本次预约已经完成签到，无需重复操作。'
  }

  if (currentStage.value === 'unavailable') {
    return '只有普通用户本人预约，且处于开始前 30 分钟到开始后 60 分钟内，才允许签到。'
  }

  return '当前处于正常签到窗口，提交后会记录为正常签到。'
})

async function handleCheckIn() {
  if (!reservationDetail.value || !canSubmitCheckIn.value) {
    return
  }

  submitting.value = true

  try {
    const checkInTime = toLocalDateTime(new Date())
    const result = await reservationStore.checkInReservation(reservationId.value, { checkInTime })
    completedTone.value = result.signStatus === 'CHECKED_IN_TIMEOUT' ? 'late' : 'normal'
    ElMessage.success(completedTone.value === 'late' ? '超时签到成功' : '签到成功')
  } finally {
    submitting.value = false
  }
}

watch(
  reservationId,
  (value) => {
    completedTone.value = null
    void reservationStore.fetchReservationDetail(value)
  },
  { immediate: true },
)

onUnmounted(() => {
  reservationStore.resetCurrentReservation()
})
</script>

<template>
  <section class="reservation-check-in-view">
    <header class="reservation-check-in-view__hero">
      <div>
        <p class="reservation-check-in-view__eyebrow">Reservation Check In</p>
        <h1>预约签到</h1>
        <p class="reservation-check-in-view__description">
          在预约开始前 30 分钟到开始后 60 分钟内完成签到，并根据实际签到时点反馈正常或超时结果。
        </p>
      </div>
    </header>

    <EmptyState
      v-if="!reservationDetail"
      title="暂无签到数据"
      description="当前预约详情尚未加载完成，请稍后刷新后重试。"
    />

    <template v-else>
      <div class="reservation-check-in-view__grid">
        <el-card class="reservation-check-in-view__card">
          <template #header>
            <div class="reservation-check-in-view__card-header">
              <span>预约信息</span>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="设备名称">{{
              reservationDetail.deviceName
            }}</el-descriptions-item>
            <el-descriptions-item label="预约人">{{
              reservationDetail.userName
            }}</el-descriptions-item>
            <el-descriptions-item label="预约状态">
              <ReservationStatusTag :status="reservationDetail.status" />
            </el-descriptions-item>
            <el-descriptions-item label="签到状态">
              <CheckInStatusTag :status="reservationDetail.signStatus" />
            </el-descriptions-item>
            <el-descriptions-item label="预约时间" :span="2">
              {{ formatDateTime(reservationDetail.startTime) }} -
              {{ formatDateTime(reservationDetail.endTime) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="reservation-check-in-view__card">
          <template #header>
            <div class="reservation-check-in-view__card-header">
              <span>签到反馈</span>
            </div>
          </template>

          <el-alert :title="feedbackTitle" type="info" :closable="false">
            {{ feedbackDescription }}
          </el-alert>

          <!-- 只有 USER 且为本人预约时才渲染签到按钮；管理员与非本人都只能查看结果。 -->
          <el-button
            v-if="canSubmitCheckIn"
            class="reservation-check-in-view__submit"
            type="primary"
            :loading="submitting"
            @click="handleCheckIn"
          >
            一键签到
          </el-button>
        </el-card>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.reservation-check-in-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reservation-check-in-view__hero,
.reservation-check-in-view__card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.reservation-check-in-view__hero {
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
}

.reservation-check-in-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0369a1;
}

.reservation-check-in-view__hero h1,
.reservation-check-in-view__card-header span {
  margin: 0;
  color: var(--app-text-primary);
}

.reservation-check-in-view__description {
  max-width: 760px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.reservation-check-in-view__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.reservation-check-in-view__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reservation-check-in-view__submit {
  margin-top: 20px;
}
</style>
