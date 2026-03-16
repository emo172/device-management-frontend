<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import BorrowStatusTag from '@/components/business/BorrowStatusTag.vue'
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
    <header class="borrow-list-view__hero">
      <div>
        <p class="borrow-list-view__eyebrow">Borrow Ledger</p>
        <h1 class="borrow-list-view__title">借还台账</h1>
        <p class="borrow-list-view__description">
          统一查看借用确认、归还闭环与逾期流转。当前后端借还记录接口未直接返回设备名称与借用人姓名，因此本页优先展示真实可用的设备
          ID、用户 ID 与预约编号。
        </p>
      </div>

      <!-- 借用确认与归还确认只对设备管理员开放，普通用户在本页只保留记录查看能力。 -->
      <div v-if="isDeviceAdmin" class="borrow-list-view__hero-actions">
        <el-button type="primary" @click="handleGoConfirm">借用确认</el-button>
        <el-button @click="handleGoReturn()">归还确认</el-button>
      </div>
    </header>

    <section class="borrow-list-view__summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="borrow-list-view__summary-card"
        :class="`borrow-list-view__summary-card--${card.accent}`"
      >
        <p>{{ card.label }}</p>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <section class="borrow-list-view__filter-panel">
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
    </section>

    <section class="borrow-list-view__table-shell">
      <div class="borrow-list-view__table-header">
        <div>
          <p class="borrow-list-view__filter-eyebrow">Records</p>
          <h2>借还记录列表</h2>
        </div>
        <span>共 {{ borrowStore.total }} 条</span>
      </div>

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
                <th>设备 ID</th>
                <th>{{ isDeviceAdmin ? '借用人 ID' : '我的用户 ID' }}</th>
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
                <td>{{ record.deviceId }}</td>
                <td>{{ record.userId }}</td>
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
                      v-if="isDeviceAdmin && record.status === BorrowStatus.BORROWED"
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

        <Pagination
          :current-page="borrowStore.query.page ?? 1"
          :page-size="borrowStore.query.size ?? 10"
          :total="borrowStore.total"
          :disabled="borrowStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </section>
  </section>
</template>

<style scoped lang="scss">
.borrow-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #1e293b;
}

.borrow-list-view__hero,
.borrow-list-view__filter-panel,
.borrow-list-view__table-shell,
.borrow-list-view__summary-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.borrow-list-view__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.16), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.96));
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
  color: #2563eb;
}

.borrow-list-view__filter-eyebrow {
  color: #f97316;
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
  color: #475569;
}

.borrow-list-view__summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.borrow-list-view__summary-card {
  padding: 20px 22px;
}

.borrow-list-view__summary-card p,
.borrow-list-view__table-header span,
.borrow-list-view__field span {
  margin: 0;
  color: #64748b;
}

.borrow-list-view__summary-card strong {
  display: block;
  margin-top: 10px;
  font-family: 'Fira Code', monospace;
  font-size: 30px;
}

.borrow-list-view__summary-card--amber strong {
  color: #d97706;
}

.borrow-list-view__summary-card--emerald strong {
  color: #059669;
}

.borrow-list-view__summary-card--rose strong {
  color: #e11d48;
}

.borrow-list-view__filter-panel,
.borrow-list-view__table-shell {
  padding: 24px;
}

.borrow-list-view__filter-panel {
  display: flex;
  justify-content: space-between;
  gap: 24px;
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
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 14px;
  background: #fff;
  color: #1e293b;
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

.borrow-list-view__table {
  width: 100%;
  border-collapse: collapse;
}

.borrow-list-view__table th,
.borrow-list-view__table td {
  padding: 16px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
  vertical-align: middle;
}

.borrow-list-view__table th {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.borrow-list-view__link {
  padding: 0;
  border: none;
  background: transparent;
  font-family: 'Fira Code', monospace;
  color: #2563eb;
  cursor: pointer;
}
</style>
