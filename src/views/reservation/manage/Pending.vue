<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { ManualProcessRequest, ReservationListItemResponse } from '@/api/reservations'
import ManualProcessDialog from '@/components/business/ManualProcessDialog.vue'
import ReservationStatusTag from '@/components/business/ReservationStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import { UserRole } from '@/enums'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'
import { formatDateTime } from '@/utils'

/**
 * 管理员待审核页面。
 * 设备管理员负责一审和待人工处理记录，系统管理员只处理二审，页面必须按角色分流展示，避免出现越权审核入口。
 */
const router = useRouter()
const authStore = useAuthStore()
const reservationStore = useReservationStore()

const pageSize = 10
const currentRole = computed(() => authStore.userRole)
const pageTitle = computed(() =>
  currentRole.value === UserRole.SYSTEM_ADMIN ? '系统审批待办' : '预约审核待办',
)
const pageDescription = computed(() =>
  currentRole.value === UserRole.SYSTEM_ADMIN
    ? '聚焦待系统审批的预约记录，统一完成二审结论。'
    : '集中处理待设备审批与待人工处理预约，避免一审结果与现场交接记录分散在不同页面。',
)
const currentPage = computed(() => reservationStore.query.page ?? 1)
const tableData = computed(() => reservationStore.list)
const canHandleManualProcess = computed(() => currentRole.value === UserRole.DEVICE_ADMIN)
const manualDialogVisible = ref(false)
const manualProcessing = ref(false)
const currentManualReservation = ref<ReservationListItemResponse | null>(null)

async function loadPendingPage(page = 1) {
  if (!currentRole.value) {
    return
  }

  await reservationStore.fetchManagedReservationPage({
    role: currentRole.value,
    view: 'pending',
    page,
    size: pageSize,
  })
}

function formatReservationWindow(reservation: ReservationListItemResponse) {
  return `${formatDateTime(reservation.startTime)} - ${formatDateTime(reservation.endTime)}`
}

function goToHistory() {
  void router.push('/reservations/manage/history')
}

function openManualDialog(reservation: ReservationListItemResponse) {
  currentManualReservation.value = reservation
  manualDialogVisible.value = true
}

async function handleAudit(reservation: ReservationListItemResponse, approved: boolean) {
  const actionLabel = approved ? '通过' : '拒绝'

  try {
    const result = await ElMessageBox.prompt(`请输入${actionLabel}原因`, `${actionLabel}预约`, {
      confirmButtonText: `确认${actionLabel}`,
      cancelButtonText: '返回',
      inputPlaceholder: approved ? '例如：设备条件满足' : '例如：用途不符合要求',
      inputValidator: (value) => value.trim().length > 0 || `${actionLabel}原因不能为空`,
    })

    const payload = {
      approved,
      remark: result.value.trim(),
    }

    if (currentRole.value === UserRole.SYSTEM_ADMIN) {
      await reservationStore.systemAuditReservation(reservation.id, payload)
    } else {
      await reservationStore.deviceAuditReservation(reservation.id, payload)
    }

    ElMessage.success('审批操作已完成')
    await loadPendingPage(currentPage.value)
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }

    throw error
  }
}

/**
 * 人工处理只对 `PENDING_MANUAL` 记录开放。
 * 后端使用 `approved=true/false` 区分“确认借用”与“取消预约”，前端只负责把现场结论透传出去。
 */
async function handleManualSubmit(payload: ManualProcessRequest) {
  if (
    currentRole.value !== UserRole.DEVICE_ADMIN ||
    !currentManualReservation.value ||
    currentManualReservation.value.status !== 'PENDING_MANUAL'
  ) {
    return
  }

  manualProcessing.value = true

  try {
    await reservationStore.manualProcessReservation(currentManualReservation.value.id, payload)
    ElMessage.success('审批操作已完成')
    manualDialogVisible.value = false
    currentManualReservation.value = null
    await loadPendingPage(currentPage.value)
  } finally {
    manualProcessing.value = false
  }
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadPendingPage(payload.currentPage)
}

onMounted(() => {
  reservationStore.resetListState()
  void loadPendingPage(1)
})
</script>

<template>
  <section class="reservation-manage-view">
    <ConsolePageHero
      :title="pageTitle"
      :description="pageDescription"
      class="reservation-manage-view__hero"
    >
      <template #actions>
        <div class="reservation-manage-view__hero-actions">
          <el-button @click="loadPendingPage(currentPage)">
            <el-icon><RefreshRight /></el-icon>
            刷新
          </el-button>
          <el-button type="primary" @click="goToHistory">审批历史</el-button>
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleTableSection
      title="待处理列表"
      :count="reservationStore.total"
      class="reservation-manage-view__table-shell"
    >
      <EmptyState
        v-if="!tableData.length && !reservationStore.loading"
        title="暂无待处理预约"
        description="当前角色下没有待审核或待人工处理记录，可以稍后刷新再看。"
        action-text="重新加载"
        @action="loadPendingPage(currentPage)"
      />

      <template v-else>
        <el-table v-loading="reservationStore.loading" :data="tableData" stripe>
          <el-table-column label="设备名称" min-width="180">
            <template #default="scope">
              <span class="reservation-manage-view__device">{{ scope.row.deviceName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="预约人" min-width="120">
            <template #default="scope">
              <span>{{ scope.row.userName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="预约时间" min-width="280">
            <template #default="scope">
              <span>{{ formatReservationWindow(scope.row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="150">
            <template #default="scope">
              <ReservationStatusTag :status="scope.row.status" />
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="280" fixed="right">
            <template #default="scope">
              <div class="reservation-manage-view__actions">
                <!-- 只有待人工处理记录才允许打开人工处理弹窗，其余状态统一走一审/二审接口。 -->
                <el-button
                  v-if="canHandleManualProcess && scope.row.status === 'PENDING_MANUAL'"
                  type="warning"
                  text
                  @click="openManualDialog(scope.row)"
                >
                  人工处理
                </el-button>
                <template v-else>
                  <el-button type="success" text @click="handleAudit(scope.row, true)"
                    >通过</el-button
                  >
                  <el-button type="danger" text @click="handleAudit(scope.row, false)"
                    >拒绝</el-button
                  >
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template #footer>
        <Pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="reservationStore.total"
          :disabled="reservationStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </ConsoleTableSection>

    <ManualProcessDialog
      v-model="manualDialogVisible"
      :reservation="currentManualReservation"
      :loading="manualProcessing"
      @submit="handleManualSubmit"
    />
  </section>
</template>

<style scoped lang="scss">
.reservation-manage-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reservation-manage-view__hero {
  border: 1px solid var(--app-border-soft);
  background: linear-gradient(135deg, var(--app-surface-card-strong), var(--app-tone-info-surface));
  box-shadow: var(--app-shadow-card);
}

.reservation-manage-view__hero-actions,
.reservation-manage-view__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reservation-manage-view__hero-actions {
  align-self: flex-start;
}

.reservation-manage-view__table-shell {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

// 审核表格需要稳定区分待审记录与操作区，页面层锁定壳层后才能避免深色下按钮附近重新冒出默认浅底。
.reservation-manage-view__table-shell :deep(.console-table-section__body),
.reservation-manage-view__table-shell :deep(.el-table),
.reservation-manage-view__table-shell :deep(.el-table__inner-wrapper),
.reservation-manage-view__table-shell :deep(.el-table th.el-table__cell),
.reservation-manage-view__table-shell :deep(.el-table tr),
.reservation-manage-view__table-shell :deep(.el-table td.el-table__cell) {
  background: var(--app-surface-card-strong);
}

.reservation-manage-view__hero h1 {
  margin: 0;
  color: var(--app-text-primary);
}

.reservation-manage-view__description {
  max-width: 760px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.reservation-manage-view__device {
  font-weight: 600;
  color: var(--app-text-primary);
}
</style>
