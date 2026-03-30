<script setup lang="ts">
import { RefreshRight } from '@element-plus/icons-vue'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import type { ReservationListItemResponse } from '@/api/reservations'
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
 * 审批历史页。
 * 管理员需要回看已审批/已处理结果，用于核对预约最终流转，因此历史口径至少覆盖 APPROVED/REJECTED/CANCELLED/EXPIRED。
 */
const router = useRouter()
const authStore = useAuthStore()
const reservationStore = useReservationStore()

const pageSize = 10
const currentRole = computed(() => authStore.userRole)
const currentPage = computed(() => reservationStore.query.page ?? 1)
const tableData = computed(() => reservationStore.list)

async function loadHistoryPage(page = 1) {
  if (!currentRole.value) {
    return
  }

  await reservationStore.fetchManagedReservationPage({
    role: currentRole.value,
    view: 'history',
    page,
    size: pageSize,
  })
}

function formatReservationWindow(reservation: ReservationListItemResponse) {
  return `${formatDateTime(reservation.startTime)} - ${formatDateTime(reservation.endTime)}`
}

function goToPending() {
  void router.push('/reservations/manage/pending')
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadHistoryPage(payload.currentPage)
}

onMounted(() => {
  reservationStore.resetListState()
  void loadHistoryPage(1)
})
</script>

<template>
  <section class="reservation-manage-view">
    <ConsolePageHero
      title="审批历史"
      description="查看管理员已审批、已拒绝、已取消或已过期的预约结果，便于追溯审核结论与人工处理落点。"
      class="reservation-manage-view__hero"
    >
      <template #actions>
        <div class="reservation-manage-view__hero-actions">
          <el-button @click="loadHistoryPage(currentPage)">
            <el-icon><RefreshRight /></el-icon>
            刷新
          </el-button>
          <el-button type="primary" @click="goToPending">返回待审</el-button>
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleTableSection
      title="历史记录"
      :count="reservationStore.total"
      class="reservation-manage-view__table-shell"
    >
      <EmptyState
        v-if="!tableData.length && !reservationStore.loading"
        title="暂无审批历史"
        description="当前还没有可追溯的审批记录，可以稍后刷新再看。"
        action-text="重新加载"
        @action="loadHistoryPage(currentPage)"
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
          <el-table-column label="最终状态" min-width="150">
            <template #default="scope">
              <ReservationStatusTag :status="scope.row.status" />
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

.reservation-manage-view__hero-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
}

.reservation-manage-view__table-shell {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

// 历史表格要长时间承载结果核对，页面层锁定表格壳层和单元格底色后，深色模式下才不会出现阅读断层。
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
