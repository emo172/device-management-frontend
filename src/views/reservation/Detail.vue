<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { ReservationDetailResponse } from '@/api/reservations'
import CheckInStatusTag from '@/components/business/CheckInStatusTag.vue'
import ReservationStatusTag from '@/components/business/ReservationStatusTag.vue'
import ReservationTimeline from '@/components/business/ReservationTimeline.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { ApprovalModeLabel, ReservationModeLabel, UserRole } from '@/enums'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'
import {
  canCheckInReservation,
  formatDateTime,
  formatEmptyValue,
  normalizeApprovalMode,
  normalizeReservationMode,
} from '@/utils'

/**
 * 预约详情页。
 * 页面需要把审批模式快照、审批人信息和状态时间线集中展示，帮助用户与管理员对齐同一条预约的完整流转上下文。
 */
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const reservationStore = useReservationStore()

const reservationId = computed(() => String(route.params.id || ''))
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
const approvalModeLabelMap = ApprovalModeLabel as Record<string, string>
const reservationModeLabelMap = ReservationModeLabel as Record<string, string>
const canGoToCheckIn = computed(() => {
  if (!reservationDetail.value) {
    return false
  }

  return (
    authStore.userRole === UserRole.USER &&
    authStore.currentUser?.userId === reservationDetail.value.userId &&
    canCheckInReservation(reservationDetail.value)
  )
})

function formatApprovalMode(mode: string) {
  const normalizedMode = normalizeApprovalMode(mode)
  return approvalModeLabelMap[normalizedMode] || mode
}

function formatReservationMode(mode: string) {
  const normalizedMode = normalizeReservationMode(mode)
  return reservationModeLabelMap[normalizedMode] || mode
}

function handleGoToCheckIn() {
  void router.push(`/reservations/${reservationId.value}/check-in`)
}

watch(
  reservationId,
  (value) => {
    void reservationStore.fetchReservationDetail(value)
  },
  { immediate: true },
)

onUnmounted(() => {
  reservationStore.resetCurrentReservation()
})
</script>

<template>
  <section class="reservation-detail-view">
    <ConsolePageHero
      eyebrow="Reservation Detail"
      title="预约详情"
      description="聚合展示预约基本信息、审批流与签到进度，避免用户在列表、审核结果和通知之间来回切换确认状态。"
      class="reservation-detail-view__hero"
    >
      <template #actions>
        <!-- 只有 USER 且为本人预约时才允许从详情页继续进入签到，管理员保持只读视角。 -->
        <el-button v-if="canGoToCheckIn" type="primary" @click="handleGoToCheckIn"
          >前往签到</el-button
        >
      </template>
    </ConsolePageHero>

    <EmptyState
      v-if="!reservationDetail"
      title="暂无预约详情"
      description="当前预约详情尚未加载完成，请稍后刷新后重试。"
    />

    <template v-else>
      <ConsoleDetailLayout class="reservation-detail-view__grid">
        <template #main>
          <el-card class="reservation-detail-view__card">
            <template #header>
              <div class="reservation-detail-view__card-header">
                <span>基础信息</span>
              </div>
            </template>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="设备名称">{{
                reservationDetail.deviceName
              }}</el-descriptions-item>
              <el-descriptions-item label="设备编号">{{
                reservationDetail.deviceNumber
              }}</el-descriptions-item>
              <el-descriptions-item label="预约人">{{
                reservationDetail.userName
              }}</el-descriptions-item>
              <el-descriptions-item label="创建人">{{
                reservationDetail.createdByName
              }}</el-descriptions-item>
              <el-descriptions-item label="预约模式">
                {{ formatReservationMode(reservationDetail.reservationMode) }}
              </el-descriptions-item>
              <el-descriptions-item label="审批模式">
                {{ formatApprovalMode(reservationDetail.approvalModeSnapshot) }}
              </el-descriptions-item>
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
              <el-descriptions-item label="预约用途" :span="2">
                {{ formatEmptyValue(reservationDetail.purpose) }}
              </el-descriptions-item>
              <el-descriptions-item label="预约备注" :span="2">
                {{ formatEmptyValue(reservationDetail.remark, '暂无备注') }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card class="reservation-detail-view__card reservation-detail-view__card--full">
            <template #header>
              <div class="reservation-detail-view__card-header">
                <span>状态时间线</span>
              </div>
            </template>

            <ReservationTimeline :reservation="reservationDetail" />
          </el-card>
        </template>

        <template #aside>
          <ConsoleAsidePanel
            title="审批信息"
            description="审批模式快照与审批人备注必须跟详情主信息并排展示，避免用户把流程口径和最终状态分开理解。"
          >
            <el-descriptions :column="1" border>
              <el-descriptions-item label="设备审批人">
                {{ formatEmptyValue(reservationDetail.deviceApproverName, '待设备审批') }}
              </el-descriptions-item>
              <el-descriptions-item label="设备审批时间">
                {{ formatDateTime(reservationDetail.deviceApprovedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="设备审批备注">
                {{ formatEmptyValue(reservationDetail.deviceApprovalRemark, '暂无备注') }}
              </el-descriptions-item>
              <el-descriptions-item label="系统审批人">
                {{
                  formatEmptyValue(reservationDetail.systemApproverName, '无需系统审批或尚未审批')
                }}
              </el-descriptions-item>
              <el-descriptions-item label="系统审批时间">
                {{ formatDateTime(reservationDetail.systemApprovedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="系统审批备注">
                {{ formatEmptyValue(reservationDetail.systemApprovalRemark, '暂无备注') }}
              </el-descriptions-item>
            </el-descriptions>
          </ConsoleAsidePanel>
        </template>
      </ConsoleDetailLayout>
    </template>
  </section>
</template>

<style scoped lang="scss">
.reservation-detail-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reservation-detail-view__card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.reservation-detail-view__hero {
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
}
.reservation-detail-view__card-header span {
  margin: 0;
  color: var(--app-text-primary);
}

.reservation-detail-view__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reservation-detail-view__card--full {
  grid-column: 1 / -1;
}
</style>
