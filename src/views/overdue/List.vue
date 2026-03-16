<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import OverdueAlert from '@/components/business/OverdueAlert.vue'
import OverdueHandleTypeTag from '@/components/business/OverdueHandleTypeTag.vue'
import OverdueProcessingStatusTag from '@/components/business/OverdueProcessingStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import { OverdueProcessingStatus, OverdueProcessingStatusLabel } from '@/enums'
import { UserRole } from '@/enums/UserRole'
import { useAuthStore } from '@/stores/modules/auth'
import { useOverdueStore } from '@/stores/modules/overdue'
import { formatDateTime } from '@/utils/date'

interface OverdueStatusOption {
  label: string
  value: OverdueProcessingStatus | ''
}

const STATUS_OPTIONS: OverdueStatusOption[] = [
  { label: '全部状态', value: '' },
  {
    label: OverdueProcessingStatusLabel[OverdueProcessingStatus.PENDING],
    value: OverdueProcessingStatus.PENDING,
  },
  {
    label: OverdueProcessingStatusLabel[OverdueProcessingStatus.PROCESSED],
    value: OverdueProcessingStatus.PROCESSED,
  },
]

/**
 * 逾期列表页。
 * 普通用户与设备管理员共用同一路由，但管理员在这里继续承担处理职责，因此页面需要在统一数据视图上再叠加处理入口与风险提醒。
 */
const router = useRouter()
const authStore = useAuthStore()
const overdueStore = useOverdueStore()

const filters = reactive({
  processingStatus: (overdueStore.query.processingStatus as OverdueProcessingStatus | '') ?? '',
})

const isDeviceAdmin = computed(() => authStore.userRole === UserRole.DEVICE_ADMIN)
const tableData = computed(() => overdueStore.list)

const pendingCount = computed(() => {
  return overdueStore.list.filter(
    (item) => item.processingStatus === OverdueProcessingStatus.PENDING,
  ).length
})

const totalOverdueHours = computed(() => {
  return overdueStore.list.reduce((sum, item) => sum + item.overdueHours, 0)
})

function buildQuery(
  overrides?: Partial<{ page: number; size: number; processingStatus?: OverdueProcessingStatus }>,
) {
  return {
    page: overrides?.page ?? overdueStore.query.page ?? 1,
    size: overrides?.size ?? overdueStore.query.size ?? 10,
    processingStatus: (overrides?.processingStatus ?? filters.processingStatus) || undefined,
  }
}

async function loadOverdueList(
  overrides?: Partial<{ page: number; size: number; processingStatus?: OverdueProcessingStatus }>,
) {
  return overdueStore.fetchOverdueList(buildQuery(overrides))
}

async function handleSearch() {
  await loadOverdueList({ page: 1 })
}

async function handleReset() {
  filters.processingStatus = ''
  await loadOverdueList({ page: 1, processingStatus: undefined })
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadOverdueList({ page: payload.currentPage, size: payload.pageSize })
}

function handleDetail(recordId: string) {
  void router.push(`/overdue/${recordId}`)
}

function handleGoHandle(recordId?: string) {
  if (recordId) {
    void router.push(`/overdue/${recordId}/handle`)
    return
  }

  const currentPageTarget = tableData.value.find(
    (item) => item.processingStatus === OverdueProcessingStatus.PENDING,
  )

  if (currentPageTarget) {
    void router.push(`/overdue/${currentPageTarget.id}/handle`)
    return
  }

  filters.processingStatus = OverdueProcessingStatus.PENDING
  void loadOverdueList({ page: 1, processingStatus: OverdueProcessingStatus.PENDING }).then(
    (result) => {
      const nextTarget = result.records[0]

      if (!nextTarget) {
        ElMessage.success('当前没有待处理逾期记录')
        return
      }

      void router.push(`/overdue/${nextTarget.id}/handle`)
    },
  )
}

onMounted(() => {
  void loadOverdueList({ page: 1, size: 10 })
})
</script>

<template>
  <section class="overdue-list-view">
    <header class="overdue-list-view__hero">
      <div>
        <p class="overdue-list-view__eyebrow">Overdue Board</p>
        <h1>逾期看板</h1>
        <p>
          聚合查看逾期单据、累计逾期时长与处理结果。当前后端逾期接口仍以设备 ID、用户 ID、借还记录
          ID 为主，不在前端虚构设备名与借用人姓名字段。
        </p>
      </div>

      <!-- 逾期处理动作仅对设备管理员开放，普通用户在该页只查看本人逾期记录与处理结果。 -->
      <div v-if="isDeviceAdmin" class="overdue-list-view__hero-actions">
        <el-button class="overdue-list-view__hero-handle" type="primary" @click="handleGoHandle()">
          处理逾期
        </el-button>
      </div>
    </header>

    <OverdueAlert
      :pending-count="pendingCount"
      :total-overdue-hours="totalOverdueHours"
      :is-admin="isDeviceAdmin"
    />

    <section class="overdue-list-view__filter-panel">
      <div>
        <p class="overdue-list-view__filter-eyebrow">Filter</p>
        <h2>处理状态筛选</h2>
      </div>

      <div class="overdue-list-view__filter-form">
        <label class="overdue-list-view__field">
          <span>处理状态</span>
          <select v-model="filters.processingStatus">
            <option v-for="option in STATUS_OPTIONS" :key="option.label" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <div class="overdue-list-view__filter-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </div>
      </div>
    </section>

    <section class="overdue-list-view__table-shell">
      <div class="overdue-list-view__table-header">
        <div>
          <p class="overdue-list-view__filter-eyebrow">Records</p>
          <h2>逾期记录列表</h2>
        </div>
        <span>共 {{ overdueStore.total }} 条</span>
      </div>

      <EmptyState
        v-if="!tableData.length && !overdueStore.loading"
        title="暂无符合条件的逾期记录"
        description="可以尝试切换处理状态筛选，或等待后端同步新的逾期单据。"
        action-text="重新加载"
        @action="loadOverdueList()"
      />

      <template v-else>
        <div v-loading="overdueStore.loading" class="overdue-list-view__table-wrapper">
          <table class="overdue-list-view__table">
            <thead>
              <tr>
                <th>逾期记录 ID</th>
                <th>借还记录 ID</th>
                <th>设备 ID</th>
                <th>用户 ID</th>
                <th>逾期时长</th>
                <th>处理状态</th>
                <th>处理方式</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in tableData" :key="record.id">
                <td>
                  <button
                    class="overdue-list-view__link"
                    type="button"
                    @click="handleDetail(record.id)"
                  >
                    {{ record.id }}
                  </button>
                </td>
                <td>{{ record.borrowRecordId }}</td>
                <td>{{ record.deviceId }}</td>
                <td>{{ record.userId }}</td>
                <td>{{ record.overdueHours }} 小时 / {{ record.overdueDays }} 天</td>
                <td>
                  <OverdueProcessingStatusTag :status="record.processingStatus" />
                </td>
                <td>
                  <OverdueHandleTypeTag :type="record.processingMethod" />
                </td>
                <td>
                  <div class="overdue-list-view__table-actions">
                    <el-button text type="primary" @click="handleDetail(record.id)">详情</el-button>

                    <!-- 设备管理员只处理仍处于待处理状态的逾期单据，已处理记录不再重复开放处理按钮。 -->
                    <el-button
                      v-if="
                        isDeviceAdmin && record.processingStatus === OverdueProcessingStatus.PENDING
                      "
                      text
                      type="danger"
                      @click="handleGoHandle(record.id)"
                    >
                      处理逾期
                    </el-button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Pagination
          :current-page="overdueStore.query.page ?? 1"
          :page-size="overdueStore.query.size ?? 10"
          :total="overdueStore.total"
          :disabled="overdueStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </section>
  </section>
</template>

<style scoped lang="scss">
.overdue-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #1e293b;
}

.overdue-list-view__hero,
.overdue-list-view__filter-panel,
.overdue-list-view__table-shell {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.overdue-list-view__hero,
.overdue-list-view__filter-panel,
.overdue-list-view__table-shell {
  padding: 24px 28px;
}

.overdue-list-view__hero,
.overdue-list-view__hero-actions,
.overdue-list-view__filter-form,
.overdue-list-view__filter-actions,
.overdue-list-view__table-actions {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.overdue-list-view__hero-actions {
  align-self: flex-start;
}

.overdue-list-view__eyebrow,
.overdue-list-view__filter-eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.overdue-list-view__eyebrow {
  color: #e11d48;
}

.overdue-list-view__filter-eyebrow {
  color: #2563eb;
}

.overdue-list-view__hero h1,
.overdue-list-view__filter-panel h2,
.overdue-list-view__table-header h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.overdue-list-view__hero p:not(.overdue-list-view__eyebrow) {
  max-width: 860px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.overdue-list-view__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overdue-list-view__field span,
.overdue-list-view__table-header span {
  color: #64748b;
}

.overdue-list-view__field select {
  min-width: 220px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 14px;
  background: #fff;
  color: #1e293b;
}

.overdue-list-view__table-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.overdue-list-view__table-wrapper {
  overflow: auto;
}

.overdue-list-view__table {
  width: 100%;
  border-collapse: collapse;
}

.overdue-list-view__table th,
.overdue-list-view__table td {
  padding: 16px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
  vertical-align: middle;
}

.overdue-list-view__table th {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.overdue-list-view__link {
  padding: 0;
  border: none;
  background: transparent;
  font-family: 'Fira Code', monospace;
  color: #2563eb;
  cursor: pointer;
}
</style>
