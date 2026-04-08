<script setup lang="ts">
import { Plus, RefreshRight, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import type { ReservationListItemResponse } from '@/api/reservations'
import ReservationCard from '@/components/business/ReservationCard.vue'
import CheckInStatusTag from '@/components/business/CheckInStatusTag.vue'
import ReservationStatusTag from '@/components/business/ReservationStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConsoleFilterPanel from '@/components/layout/ConsoleFilterPanel.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
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

function getReservationDeviceCount(reservation: ReservationListItemResponse) {
  if (typeof reservation.deviceCount === 'number' && reservation.deviceCount > 0) {
    return reservation.deviceCount
  }

  if (Array.isArray(reservation.devices) && reservation.devices.length > 0) {
    return reservation.devices.length
  }

  return 1
}

function getReservationPrimaryDeviceName(reservation: ReservationListItemResponse) {
  return reservation.primaryDeviceName || reservation.deviceName
}

/**
 * 列表页只展示“主设备 + 数量事实”，避免把完整设备数组直接摊平到表格里撑坏信息密度。
 * 真正的全量设备明细留给详情页展示，这样用户先看清是否为多设备预约，再按需进入详情查看全部设备。
 */
function formatReservationDeviceSummary(reservation: ReservationListItemResponse) {
  const deviceCount = getReservationDeviceCount(reservation)
  const primaryDeviceName = getReservationPrimaryDeviceName(reservation)

  if (deviceCount <= 1) {
    return primaryDeviceName
  }

  return `${primaryDeviceName} 等 ${deviceCount} 台设备`
}

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
      :title="pageTitle"
      :description="pageDescription"
      class="reservation-list-view__hero"
    />

    <!-- 顶部区域只承接刷新与创建入口，审批、签到等流程仍留在详情页和管理页，避免预约列表重新长出第二套流程入口。 -->
    <ConsoleFilterPanel
      class="reservation-list-view__filter-panel"
      title="列表操作"
      description="本页承接预约刷新与创建入口，不在这里混入额外审批流程。"
    >
      <template #actions>
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
      </template>
    </ConsoleFilterPanel>

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
                {{ formatReservationDeviceSummary(scope.row) }}
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
                <!-- 操作列详情入口统一挂共享语义类和显式图标，便于接入全局详情动作样式，同时保持设备名链接与自助动作语义独立。 -->
                <el-button
                  text
                  type="primary"
                  class="app-detail-action"
                  @click="handleDetail(scope.row.id)"
                >
                  <el-icon><View /></el-icon>
                  详情
                </el-button>

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

.reservation-list-view__filter-panel :deep(.console-filter-panel__body) {
  // 当前页顶部只有操作入口，没有筛选字段；改为让 body 交叉轴拉伸，这样空字段容器能跟随动作区高度，不必再写 magic number。
  align-items: stretch;
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

// 预约摘要卡片在极端长设备号场景下也必须允许收缩，避免三列卡片把主内容壳整体撑宽。
.reservation-list-view__card-grid > * {
  min-width: 0;
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
