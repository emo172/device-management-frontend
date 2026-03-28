<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import BorrowStatusTag from '@/components/business/BorrowStatusTag.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleSummaryGrid from '@/components/layout/ConsoleSummaryGrid.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import ConsoleToolbarShell from '@/components/layout/ConsoleToolbarShell.vue'
import { BorrowStatus, BorrowStatusLabel } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useBorrowStore } from '@/stores/modules/borrow'
import { formatDateTime } from '@/utils/date'

interface BorrowStatusOption {
  label: string
  value: BorrowStatus | ''
}

const STATUS_OPTIONS: BorrowStatusOption[] = [
  { label: '全部状态', value: '' },
  { label: BorrowStatusLabel[BorrowStatus.BORROWED], value: BorrowStatus.BORROWED },
  { label: BorrowStatusLabel[BorrowStatus.RETURNED], value: BorrowStatus.RETURNED },
  { label: BorrowStatusLabel[BorrowStatus.OVERDUE], value: BorrowStatus.OVERDUE },
]

/**
 * 借还列表页。
 * 普通用户只查看本人借还闭环，设备管理员则在同一页获得借用确认与归还确认入口，避免在多个页面来回切换。
 */
const router = useRouter()
const authStore = useAuthStore()
const borrowStore = useBorrowStore()

const filters = reactive({
  status: (borrowStore.query.status as BorrowStatus | '') ?? '',
})

const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)
const tableData = computed(() => borrowStore.list)

/**
 * 借还列表优先展示后端已回传的真实名称；
 * 若当前环境仍只有 ID，则回退到 ID 文本，不让页面因为字段缺失出现空白主信息。
 */
function displayIdentityName(name: string | null | undefined, fallbackId: string) {
  return name?.trim() || fallbackId
}

/**
 * 后端正式归还接口同时接受 `BORROWED` 与 `OVERDUE` 两种借还状态。
 * 列表页必须跟随这个真实契约开放入口，避免逾期记录在页面上变成“看得到、却无法完成归还闭环”的死链路。
 */
function isReturnEligibleStatus(status: string) {
  return status === BorrowStatus.BORROWED || status === BorrowStatus.OVERDUE
}

const summaryCards = computed(() => {
  const borrowedCount = borrowStore.list.filter(
    (item) => item.status === BorrowStatus.BORROWED,
  ).length
  const returnedCount = borrowStore.list.filter(
    (item) => item.status === BorrowStatus.RETURNED,
  ).length
  const overdueCount = borrowStore.list.filter(
    (item) => item.status === BorrowStatus.OVERDUE,
  ).length

  return [
    { label: '当前页借用中', value: borrowedCount, accent: 'amber' },
    { label: '当前页已归还', value: returnedCount, accent: 'emerald' },
    { label: '当前页已逾期', value: overdueCount, accent: 'rose' },
  ]
})

function buildQuery(overrides?: Partial<{ page: number; size: number; status?: BorrowStatus }>) {
  return {
    page: overrides?.page ?? borrowStore.query.page ?? 1,
    size: overrides?.size ?? borrowStore.query.size ?? 10,
    status: (overrides?.status ?? filters.status) || undefined,
  }
}

async function loadBorrowList(
  overrides?: Partial<{ page: number; size: number; status?: BorrowStatus }>,
) {
  await borrowStore.fetchBorrowList(buildQuery(overrides))
}

/**
 * 状态筛选切换时必须回到第一页，避免用户停留旧页码后把“当前页没有数据”误读为“当前状态没有记录”。
 */
async function handleSearch() {
  await loadBorrowList({ page: 1 })
}

async function handleReset() {
  filters.status = ''
  await loadBorrowList({ page: 1, status: undefined })
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadBorrowList({ page: payload.currentPage, size: payload.pageSize })
}

function handleDetail(recordId: string) {
  void router.push(`/borrows/${recordId}`)
}

function handleGoConfirm() {
  void router.push('/borrows/confirm')
}

function handleGoReturn(recordId?: string) {
  if (recordId) {
    void router.push(`/borrows/return?recordId=${recordId}`)
    return
  }

  void router.push('/borrows/return')
}

onMounted(() => {
  void loadBorrowList({ page: 1, size: 10 })
})
</script>

<template>
  <section class="borrow-list-view">
    <ConsolePageHero
      eyebrow="Borrow Ledger"
      title="借还台账"
      description="统一查看借用确认、归还闭环与逾期流转。前端优先展示后端已回传的设备名称与借用人姓名；若当前环境仍只返回 ID，则稳定回退到真实 ID，而不是虚构展示字段。"
      class="borrow-list-view__hero"
    >
      <template #actions>
        <!-- 借用确认与归还确认只对设备管理员开放，普通用户在本页只保留记录查看能力。 -->
        <div v-if="isDeviceAdmin" class="borrow-list-view__hero-actions">
          <el-button type="primary" @click="handleGoConfirm">借用确认</el-button>
          <el-button @click="handleGoReturn()">归还确认</el-button>
        </div>
      </template>
    </ConsolePageHero>

    <ConsoleSummaryGrid class="borrow-list-view__summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="borrow-list-view__summary-card"
        :class="`borrow-list-view__summary-card--${card.accent}`"
      >
        <p>{{ card.label }}</p>
        <strong>{{ card.value }}</strong>
      </article>
    </ConsoleSummaryGrid>

    <ConsoleToolbarShell class="borrow-list-view__filter-panel">
      <div>
        <p class="borrow-list-view__filter-eyebrow">Filter</p>
        <h2>状态筛选</h2>
      </div>

      <div class="borrow-list-view__filter-form">
        <label class="borrow-list-view__field">
          <span>借还状态</span>
          <select v-model="filters.status">
            <option v-for="option in STATUS_OPTIONS" :key="option.label" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="borrow-list-view__filter-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>
    </ConsoleToolbarShell>

    <ConsoleTableSection
      title="借还记录列表"
      :count="borrowStore.total"
      class="borrow-list-view__table-shell"
    >
      <EmptyState
        v-if="!tableData.length && !borrowStore.loading"
        title="暂无符合条件的借还记录"
        description="可以尝试切换状态筛选，或等待设备管理员完成借用确认与归还确认。"
        action-text="重新加载"
        @action="loadBorrowList()"
      />

      <template v-else>
        <div v-loading="borrowStore.loading" class="borrow-list-view__table-wrapper">
          <table class="borrow-list-view__table">
            <thead>
              <tr>
                <th>预约编号</th>
                <th>设备</th>
                <th>{{ isDeviceAdmin ? '借用人' : '我的账号' }}</th>
                <th>借用时间</th>
                <th>预计归还时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in tableData" :key="record.id">
                <td>
                  <button
                    class="borrow-list-view__link"
                    type="button"
                    @click="handleDetail(record.id)"
                  >
                    {{ record.reservationId }}
                  </button>
                </td>
                <td>{{ displayIdentityName(record.deviceName, record.deviceId) }}</td>
                <td>{{ displayIdentityName(record.userName, record.userId) }}</td>
                <td>{{ formatDateTime(record.borrowTime) }}</td>
                <td>{{ formatDateTime(record.expectedReturnTime) }}</td>
                <td>
                  <BorrowStatusTag :status="record.status" />
                </td>
                <td>
                  <div class="borrow-list-view__table-actions">
                    <el-button text type="primary" @click="handleDetail(record.id)">详情</el-button>

                    <!-- 归还确认只能由设备管理员发起，且仅对仍处于借用中的正式记录展示。 -->
                    <el-button
                      v-if="isDeviceAdmin && isReturnEligibleStatus(record.status)"
                      text
                      type="warning"
                      @click="handleGoReturn(record.id)"
                    >
                      去归还确认
                    </el-button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template #footer>
        <Pagination
          :current-page="borrowStore.query.page ?? 1"
          :page-size="borrowStore.query.size ?? 10"
          :total="borrowStore.total"
          :disabled="borrowStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </ConsoleTableSection>
  </section>
</template>

<style scoped lang="scss">
.borrow-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.borrow-list-view__summary-card {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

.borrow-list-view__hero {
  border: 1px solid var(--app-border-soft);
  background: linear-gradient(
    135deg,
    var(--app-surface-card-strong),
    var(--app-tone-brand-surface)
  );
  box-shadow: var(--app-shadow-card);
}

.borrow-list-view__hero-actions,
.borrow-list-view__filter-actions,
.borrow-list-view__table-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.borrow-list-view__hero-actions {
  align-self: flex-start;
}

.borrow-list-view__eyebrow,
.borrow-list-view__filter-eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.borrow-list-view__eyebrow {
  color: var(--app-tone-brand-text);
}

.borrow-list-view__filter-eyebrow {
  color: var(--app-tone-warning-text);
}

.borrow-list-view__title,
.borrow-list-view__table-header h2,
.borrow-list-view__filter-panel h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.borrow-list-view__title {
  font-size: clamp(30px, 4vw, 40px);
}

.borrow-list-view__description {
  max-width: 860px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: var(--app-text-secondary);
}

.borrow-list-view__summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.borrow-list-view__summary-card {
  padding: 20px 22px;
}

.borrow-list-view__summary-card p,
.borrow-list-view__table-header span,
.borrow-list-view__field span {
  margin: 0;
  color: var(--app-text-secondary);
}

.borrow-list-view__summary-card strong {
  display: block;
  margin-top: 10px;
  font-family: 'Fira Code', monospace;
  font-size: 30px;
}

.borrow-list-view__summary-card--amber strong {
  color: var(--app-tone-warning-text);
}

.borrow-list-view__summary-card--emerald strong {
  color: var(--app-tone-success-text);
}

.borrow-list-view__summary-card--rose strong {
  color: var(--app-tone-danger-text);
}

.borrow-list-view__filter-panel {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

.borrow-list-view__filter-form {
  display: flex;
  gap: 18px;
  align-items: flex-end;
}

.borrow-list-view__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.borrow-list-view__field select {
  min-width: 220px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--app-border-strong);
  border-radius: 14px;
  background: var(--app-surface-card);
  color: var(--app-text-primary);
}

.borrow-list-view__table-shell {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card-strong);
  box-shadow: var(--app-shadow-card);
}

.borrow-list-view__table-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.borrow-list-view__table-wrapper {
  overflow: auto;
}

// 借还列表在深色模式下同时包住空态、原生表格和分页，页面层显式锁定壳层 token，避免局部区域退回浏览器默认白底。
.borrow-list-view__table-shell :deep(.console-table-section__body),
.borrow-list-view__table-shell :deep(.console-table-section__footer) {
  background: var(--app-surface-card-strong);
}

.borrow-list-view__table {
  width: 100%;
  border-collapse: collapse;
  color: var(--app-text-primary);
}

.borrow-list-view__table th,
.borrow-list-view__table td {
  padding: 16px 12px;
  border-bottom: 1px solid var(--app-border-soft);
  text-align: left;
  vertical-align: middle;
}

.borrow-list-view__table th {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-text-secondary);
}

.borrow-list-view__link {
  padding: 0;
  border: none;
  background: transparent;
  font-family: 'Fira Code', monospace;
  color: var(--app-tone-brand-text);
  cursor: pointer;
}

.borrow-list-view__link:hover,
.borrow-list-view__link:focus-visible {
  color: var(--app-tone-brand-text-strong);
}
</style>
