<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import OverdueAlert from '@/components/business/OverdueAlert.vue'
import OverdueHandleTypeTag from '@/components/business/OverdueHandleTypeTag.vue'
import OverdueProcessingStatusTag from '@/components/business/OverdueProcessingStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import ConsoleTableSection from '@/components/layout/ConsoleTableSection.vue'
import ConsoleToolbarShell from '@/components/layout/ConsoleToolbarShell.vue'
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

/**
 * 逾期列表优先展示后端已回传的真实名称；
 * 若当前环境仍只返回 ID，则回退到 ID 文本，不在前端虚构不存在的展示字段。
 */
function displayIdentityName(name: string | null | undefined, fallbackId: string) {
  return name?.trim() || fallbackId
}

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
    <ConsolePageHero
      eyebrow="Overdue Board"
      title="逾期看板"
      description="聚合查看当前页逾期单据、当前页累计逾期时长与处理结果。当前后端逾期接口仍以设备 ID、用户 ID、借还记录 ID 为主，不在前端虚构设备名与借用人姓名字段。"
      class="overdue-list-view__hero"
    >
      <template #actions>
        <!-- 逾期处理动作仅对设备管理员开放，普通用户在该页只查看本人逾期记录与处理结果。 -->
        <div v-if="isDeviceAdmin" class="overdue-list-view__hero-actions">
          <el-button
            class="overdue-list-view__hero-handle"
            type="primary"
            @click="handleGoHandle()"
          >
            处理逾期
          </el-button>
        </div>
      </template>
    </ConsolePageHero>

    <OverdueAlert
      :pending-count="pendingCount"
      :total-overdue-hours="totalOverdueHours"
      :is-admin="isDeviceAdmin"
    />

    <ConsoleToolbarShell class="overdue-list-view__filter-panel">
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
    </ConsoleToolbarShell>

    <ConsoleTableSection
      title="逾期记录列表"
      :count="overdueStore.total"
      class="overdue-list-view__table-shell"
    >
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
                <th>设备</th>
                <th>用户</th>
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
                <td>{{ displayIdentityName(record.deviceName, record.deviceId) }}</td>
                <td>{{ displayIdentityName(record.userName, record.userId) }}</td>
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
      </template>

      <template #footer>
        <Pagination
          :current-page="overdueStore.query.page ?? 1"
          :page-size="overdueStore.query.size ?? 10"
          :total="overdueStore.total"
          :disabled="overdueStore.loading"
          @change="handlePaginationChange"
        />
      </template>
    </ConsoleTableSection>
  </section>
</template>

<style scoped lang="scss">
.overdue-list-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.overdue-list-view__hero,
.overdue-list-view__filter-panel,
.overdue-list-view__table-shell {
  border: 1px solid var(--app-border-soft);
  box-shadow: var(--app-shadow-card);
}

.overdue-list-view__hero {
  background: linear-gradient(
    135deg,
    var(--app-surface-card-strong),
    var(--app-tone-danger-surface)
  );
}

.overdue-list-view__filter-panel,
.overdue-list-view__table-shell {
  background: var(--app-surface-card-strong);
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

.overdue-list-view__filter-eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.overdue-list-view__hero :deep(.console-page-hero__eyebrow) {
  color: var(--app-tone-danger-text);
}

.overdue-list-view__filter-eyebrow {
  color: var(--app-tone-brand-text);
}

.overdue-list-view__hero :deep(.console-page-hero__title),
.overdue-list-view__filter-panel h2,
.overdue-list-view__table-header h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.overdue-list-view__hero :deep(.console-page-hero__title) {
  color: var(--app-tone-danger-text-strong);
}

.overdue-list-view__hero :deep(.console-page-hero__description) {
  max-width: 860px;
  margin: 14px 0 0;
  line-height: 1.8;
  color: var(--app-tone-danger-text);
}

.overdue-list-view__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overdue-list-view__field span,
.overdue-list-view__table-header span {
  color: var(--app-text-secondary);
}

.overdue-list-view__field select {
  min-width: 220px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--app-border-strong);
  border-radius: 14px;
  background: var(--app-surface-card);
  color: var(--app-text-primary);
}

.overdue-list-view__table-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 18px;
}

.overdue-list-view__table-wrapper {
  // 逾期记录可能出现超长主键与设备名称，横向预算必须留在表格区内，不能把主内容壳整体撑宽。
  width: 100%;
  max-width: 100%;
  overflow: auto;
}

// 逾期列表同一块壳层里同时承载空态、原生表格和分页，页面层继续锁定主题 token，避免深色模式下局部区域退回浏览器默认白底。
.overdue-list-view__table-shell :deep(.console-table-section__body),
.overdue-list-view__table-shell :deep(.console-table-section__footer) {
  background: var(--app-surface-card-strong);
}

.overdue-list-view__table {
  width: 100%;
  border-collapse: collapse;
  color: var(--app-text-primary);
}

.overdue-list-view__table th,
.overdue-list-view__table td {
  padding: 16px 12px;
  border-bottom: 1px solid var(--app-border-soft);
  text-align: left;
  vertical-align: middle;
}

.overdue-list-view__table th {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-text-secondary);
}

.overdue-list-view__link {
  padding: 0;
  border: none;
  background: transparent;
  font-family: 'Fira Code', monospace;
  color: var(--app-tone-brand-text);
  cursor: pointer;
}

.overdue-list-view__link:hover,
.overdue-list-view__link:focus-visible {
  color: var(--app-tone-brand-text-strong);
}
</style>
