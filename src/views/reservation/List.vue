<script setup lang="ts">
import { Plus, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import type { ReservationListItemResponse } from '@/api/reservations'
import ReservationCard from '@/components/business/ReservationCard.vue'
import CheckInStatusTag from '@/components/business/CheckInStatusTag.vue'
import ReservationStatusTag from '@/components/business/ReservationStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import ConsoleToolbarShell from '@/components/layout/ConsoleToolbarShell.vue'
import { UserRole } from '@/enums'
import { useAuthStore } from '@/stores/modules/auth'
import { useReservationStore } from '@/stores/modules/reservation'
import { formatDateTime } from '@/utils'
import {
  canCancelReservation,
  canCheckInReservation,
  shouldShowCancelWindowHint,
} from '@/utils/reservation'

/**
 * 预约列表页。
 * 普通用户只看自己的预约并可执行自助签到/取消；管理员看全量预约但保持只读，避免本任务提前侵入审核与签到页面职责。
 */
const router = useRouter()
const authStore = useAuthStore()
const reservationStore = useReservationStore()

const isUser = computed(() => authStore.userRole === UserRole.USER)
const canCreateReservation = computed(() => {
  return authStore.userRole === UserRole.USER || authStore.userRole === UserRole.SYSTEM_ADMIN
})
const pageTitle = computed(() => (isUser.value ? '我的预约' : '全部预约'))
const pageDescription = computed(() =>
  isUser.value
    ? '查看本人预约状态，并在符合业务窗口时直接完成签到或取消。'
    : '统一查看系统内全部预约记录，本页仅承接总览与详情跳转，不在此提前混入审核流程。 ',
)
const reservationCards = computed(() => reservationStore.list.slice(0, 3))
const tableData = computed(() => reservationStore.list)

function buildQuery(overrides?: Partial<{ page: number; size: number }>) {
  return {
    page: overrides?.page ?? reservationStore.query.page ?? 1,
    size: overrides?.size ?? reservationStore.query.size ?? 10,
  }
}

async function loadReservationList(overrides?: Partial<{ page: number; size: number }>) {
  await reservationStore.fetchReservationList(buildQuery(overrides))
}

function formatReservationWindow(reservation: ReservationListItemResponse) {
  return `${formatDateTime(reservation.startTime)} - ${formatDateTime(reservation.endTime)}`
}

function handleDetail(reservationId: string) {
  void router.push(`/reservations/${reservationId}`)
}

function handleCheckIn(reservationId: string) {
  void router.push(`/reservations/${reservationId}/check-in`)
}

function handleCreate() {
  void router.push('/reservations/create')
}

/**
 * 列表页取消动作需要收集取消原因后再发请求，避免直接点按就落库，且满足后端 `/cancel` 接口的必填契约。
 */
async function handleCancel(reservationId: string) {
  try {
    const result = await ElMessageBox.prompt('请输入取消原因', '取消预约', {
      confirmButtonText: '确认取消',
      cancelButtonText: '返回',
      inputPlaceholder: '例如：课程调整、时间冲突',
      inputValidator: (value) => value.trim().length > 0 || '取消原因不能为空',
    })

    await reservationStore.cancelReservation(reservationId, { reason: result.value.trim() })
    ElMessage.success('预约已取消')
  } catch (error) {
    /**
     * 用户在确认框里点“返回”或右上角关闭，属于主动放弃取消，不应把正常交互抛成未处理异常。
     */
    if (error === 'cancel' || error === 'close') {
      return
    }

    throw error
  }
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadReservationList({ page: payload.currentPage, size: payload.pageSize })
}

function canShowCancelAction(reservation: ReservationListItemResponse) {
  return isUser.value && canCancelReservation(reservation)
}

function canShowCheckInAction(reservation: ReservationListItemResponse) {
  return isUser.value && canCheckInReservation(reservation)
}

function canShowCancelHint(reservation: ReservationListItemResponse) {
  return isUser.value && shouldShowCancelWindowHint(reservation)
}

onMounted(() => {
  reservationStore.resetListState()
  void loadReservationList({ page: 1, size: 10 })
})
</script>

<template>
  <section class="reservation-list-view">
    <ConsolePageHero
      eyebrow="Reservation Console"
      :title="pageTitle"
      :description="pageDescription"
      class="reservation-list-view__hero"
    />

    <ConsoleToolbarShell class="reservation-list-view__toolbar">
      <p class="reservation-list-view__toolbar-copy">
        {{
          isUser
            ? '列表页仅承接本人预约的刷新、创建与后续动作入口。'
            : '管理员在本页只做总览与详情跳转，审核流程统一进入管理页。'
        }}
      </p>
      <div class="reservation-list-view__hero-actions">
        <el-button @click="loadReservationList()">
          <el-icon><RefreshRight /></el-icon>
          刷新
        </el-button>
        <el-button v-if="canCreateReservation" type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          创建预约
        </el-button>
      </div>
    </ConsoleToolbarShell>

    <ConsoleSummaryGrid v-if="reservationCards.length" class="reservation-list-view__card-grid">
      <ReservationCard
        v-for="reservation in reservationCards"
        :key="reservation.id"
        :reservation="reservation"
        :allow-user-actions="isUser"
        @detail="handleDetail"
        @cancel="handleCancel"
        @check-in="handleCheckIn"
      />
    </ConsoleSummaryGrid>

    <ConsoleTableSection
      title="预约列表"
      :count="reservationStore.total"
      class="reservation-list-view__table-shell"
    >
      <EmptyState
        v-if="!tableData.length && !reservationStore.loading"
        title="暂无预约记录"
        description="当前没有可展示的预约数据，可以稍后刷新或等待后续预约创建完成。"
        action-text="重新加载"
        @action="loadReservationList()"
      />

      <template v-else>
        <el-table v-loading="reservationStore.loading" :data="tableData" stripe>
          <el-table-column label="设备名称" min-width="180">
            <template #default="scope">
              <button
                class="reservation-list-view__link"
                type="button"
                @click="handleDetail(scope.row.id)"
              >
                {{ scope.row.deviceName }}
              </button>
            </template>
          </el-table-column>
          <el-table-column label="预约时间" min-width="280">
            <template #default="scope">
              <span>{{ formatReservationWindow(scope.row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="预约状态" min-width="140">
            <template #default="scope">
              <ReservationStatusTag :status="scope.row.status" />
            </template>
          </el-table-column>
          <el-table-column label="签到状态" min-width="140">
            <template #default="scope">
              <CheckInStatusTag :status="scope.row.signStatus" />
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="300" fixed="right">
            <template #default="scope">
              <div class="reservation-list-view__table-actions">
                <el-button text type="primary" @click="handleDetail(scope.row.id)">详情</el-button>

                <!-- 只有 USER 可以在列表页直接发起签到/取消；管理员只做浏览与后续审核入口分流。 -->
                <template v-if="isUser">
                  <el-button
                    v-if="canShowCheckInAction(scope.row)"
                    text
                    type="primary"
                    @click="handleCheckIn(scope.row.id)"
                  >
                    签到
                  </el-button>
                  <el-button
                    v-if="canShowCancelAction(scope.row)"
                    text
                    type="danger"
                    @click="handleCancel(scope.row.id)"
                  >
                    取消预约
                  </el-button>
                  <span
                    v-else-if="canShowCancelHint(scope.row)"
                    class="reservation-list-view__hint"
                  >
                    24 小时内请联系管理员处理
                  </span>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template #footer>
        <Pagination
          :current-page="reservationStore.query.page ?? 1"
          :page-size="reservationStore.query.size ?? 10"
          :total="reservationStore.total"
          :disabled="reservationStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </ConsoleTableSection>
  </section>
</template>

<style scoped lang="scss">
.reservation-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.reservation-list-view__hero {
  border: 1px solid var(--app-border-soft);
  background: linear-gradient(
    135deg,
    var(--app-surface-card-strong),
    var(--app-tone-brand-surface)
  );
  box-shadow: var(--app-shadow-card);
}

.reservation-list-view__hero-actions,
.reservation-list-view__table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reservation-list-view__toolbar {
  justify-content: space-between;
}

.reservation-list-view__toolbar-copy {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.reservation-list-view__table-shell {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

// 预约列表同时承载表格、空态和操作入口，页面层要再锁一次表面 token，避免深色下回退到组件库默认浅底。
.reservation-list-view__table-shell :deep(.console-table-section__body),
.reservation-list-view__table-shell :deep(.el-table),
.reservation-list-view__table-shell :deep(.el-table__inner-wrapper),
.reservation-list-view__table-shell :deep(.el-table th.el-table__cell),
.reservation-list-view__table-shell :deep(.el-table tr),
.reservation-list-view__table-shell :deep(.el-table td.el-table__cell) {
  background: var(--app-surface-card-strong);
}

.reservation-list-view__hero-actions {
  align-self: flex-start;
}

.reservation-list-view__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-tone-brand-text);
}

.reservation-list-view__title,
.reservation-list-view__table-header h2 {
  margin: 0;
  color: var(--app-text-primary);
}

.reservation-list-view__title {
  font-size: clamp(30px, 4vw, 40px);
}

.reservation-list-view__description {
  max-width: 760px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.reservation-list-view__card-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.reservation-list-view__hint {
  font-size: 13px;
  color: var(--app-tone-warning-text);
}

.reservation-list-view__link {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-tone-brand-text);
  cursor: pointer;
}

.reservation-list-view__link:hover,
.reservation-list-view__link:focus-visible {
  color: var(--app-tone-brand-text-strong);
}
</style>
