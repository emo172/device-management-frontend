<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import type { LocationQueryValue } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import BorrowStatusTag from '@/components/business/BorrowStatusTag.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
import { BorrowStatus } from '@/enums'
import { useBorrowStore } from '@/stores/modules/borrow'
import { formatDateTime } from '@/utils/date'

function normalizeQueryValue(value: LocationQueryValue | LocationQueryValue[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

/**
 * 归还确认页。
 * 设备管理员只应操作仍处于借用中的正式借还记录，因此页面在查询层直接固定 `BORROWED` 状态，避免把已归还记录再次送回后端确认。
 */
const route = useRoute()
const router = useRouter()
const borrowStore = useBorrowStore()

const selectedRecordId = ref(normalizeQueryValue(route.query.recordId))
const remark = ref('')
const submitting = ref(false)
const pagination = ref({ page: 1, size: 10 })

/**
 * 正式归还接口允许借用中和已逾期两类记录继续闭环。
 * 页面默认仍以借用中分页作为主候选池，但如果用户从逾期记录带着 `recordId` 进入，也要把该条记录补拉进来并允许提交归还。
 */
function isReturnEligibleStatus(status: string) {
  return status === BorrowStatus.BORROWED || status === BorrowStatus.OVERDUE
}

const borrowedCandidates = computed(() => {
  return borrowStore.list.filter((item) => isReturnEligibleStatus(item.status))
})

const selectedRecord = computed(() => {
  return borrowedCandidates.value.find((item) => item.id === selectedRecordId.value) ?? null
})

/**
 * 归还确认页优先展示后端已回传的真实名称；
 * 若当前环境仍缺少名称字段，则继续回退到 ID，保证管理员在联调环境里仍能定位记录。
 */
function displayIdentityName(name: string | null | undefined, fallbackId: string) {
  return name?.trim() || fallbackId
}

async function loadBorrowedRecords(overrides?: { page: number; size: number }) {
  pagination.value = {
    page: overrides?.page ?? pagination.value.page,
    size: overrides?.size ?? pagination.value.size,
  }

  const result = await borrowStore.fetchBorrowList({
    page: pagination.value.page,
    size: pagination.value.size,
    status: BorrowStatus.BORROWED,
  })

  if (
    selectedRecordId.value &&
    !result.records.some((item) => item.id === selectedRecordId.value)
  ) {
    const record = await borrowStore.fetchBorrowDetail(selectedRecordId.value).catch(() => null)

    if (record && isReturnEligibleStatus(record.status)) {
      borrowStore.replaceRecordInList(record)
    }
  }

  if (!borrowedCandidates.value.some((item) => item.id === selectedRecordId.value)) {
    selectedRecordId.value =
      result.records.find((item) => item.status === BorrowStatus.BORROWED)?.id ?? ''
  }
}

function handleSelectRecord(recordId: string) {
  selectedRecordId.value = recordId
}

async function handleSubmit() {
  if (!selectedRecord.value) {
    return
  }

  submitting.value = true

  try {
    const payload = remark.value.trim() ? { remark: remark.value.trim() } : undefined
    const record = await borrowStore.confirmReturn(selectedRecord.value.id, payload)
    ElMessage.success('归还确认完成')
    await router.push(`/borrows/${record.id}`)
  } finally {
    submitting.value = false
  }
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadBorrowedRecords({ page: payload.currentPage, size: payload.pageSize })
}

function handleBack() {
  void router.push('/borrows')
}

onMounted(() => {
  void loadBorrowedRecords()
})
</script>

<template>
  <section class="borrow-return-view">
    <ConsolePageHero
      eyebrow="Confirm Return"
      title="归还确认"
      description="统一处理仍处于借用中或已逾期的正式借还记录。确认完成后，设备状态应由后端同步恢复为可用，不在前端直接改设备主数据。"
      class="borrow-return-view__hero"
    >
      <template #actions>
        <div class="borrow-return-view__actions">
          <el-button @click="handleBack">返回台账</el-button>
          <el-button
            class="borrow-return-view__submit"
            type="primary"
            :disabled="!selectedRecord"
            :loading="submitting"
            @click="handleSubmit"
          >
            确认归还
          </el-button>
        </div>
      </template>
    </ConsolePageHero>

    <EmptyState
      v-if="!borrowedCandidates.length && !borrowStore.loading"
        title="当前没有待归还记录"
        description="所有正式借还记录都已归还，或者后端当前分页结果里没有处于借用中 / 已逾期的可归还记录。"
        action-text="重新加载"
        @action="loadBorrowedRecords"
      />

    <template v-else>
      <ConsoleDetailLayout class="borrow-return-view__layout">
        <template #main>
          <article class="borrow-return-view__candidate-panel">
            <div class="borrow-return-view__panel-header">
              <p class="borrow-return-view__eyebrow">Borrowed</p>
              <h2>可归还闭环记录</h2>
            </div>

            <div class="borrow-return-view__candidate-list">
              <button
                v-for="item in borrowedCandidates"
                :key="item.id"
                class="borrow-return-view__candidate-card"
                :class="{
                  'borrow-return-view__candidate-card--active': selectedRecordId === item.id,
                }"
                type="button"
                @click="handleSelectRecord(item.id)"
              >
                <div class="borrow-return-view__candidate-title">
                  <strong>{{ displayIdentityName(item.deviceName, item.deviceId) }}</strong>
                  <BorrowStatusTag :status="item.status" />
                </div>
                <span>借还记录：{{ item.id }}</span>
                <span>借用人：{{ displayIdentityName(item.userName, item.userId) }}</span>
                <span>预计归还：{{ formatDateTime(item.expectedReturnTime) }}</span>
              </button>
            </div>

            <Pagination
              :current-page="borrowStore.query.page ?? pagination.page"
              :page-size="borrowStore.query.size ?? pagination.size"
              :total="borrowStore.total"
              :disabled="borrowStore.loading"
              @change="handlePaginationChange"
            />
          </article>
        </template>

        <template #aside>
          <ConsoleAsidePanel
            title="归还说明"
            description="归还确认只针对借用中的正式借还记录，备注会跟归还结果一起留在现场处理链路里。"
          >
            <div class="borrow-return-view__panel-header">
              <p class="borrow-return-view__eyebrow">Selection</p>
              <h2>归还说明</h2>
            </div>

            <template v-if="selectedRecord">
              <dl class="borrow-return-view__detail-list">
                <div>
                  <dt>借还记录 ID</dt>
                  <dd>{{ selectedRecord.id }}</dd>
                </div>
                <div>
                  <dt>预约 ID</dt>
                  <dd>{{ selectedRecord.reservationId }}</dd>
                </div>
                <div>
                  <dt>设备</dt>
                  <dd>{{ displayIdentityName(selectedRecord.deviceName, selectedRecord.deviceId) }}</dd>
                </div>
                <div>
                  <dt>借用人</dt>
                  <dd>{{ displayIdentityName(selectedRecord.userName, selectedRecord.userId) }}</dd>
                </div>
                <div>
                  <dt>借用时间</dt>
                  <dd>{{ formatDateTime(selectedRecord.borrowTime) }}</dd>
                </div>
              </dl>

              <label class="borrow-return-view__remark-field">
                <span>归还备注（可选）</span>
                <textarea
                  v-model="remark"
                  rows="5"
                  placeholder="例如：设备检查完好，配件数量已核对。"
                />
              </label>
            </template>

            <p v-else class="borrow-return-view__empty-tip">请先选择一条待归还记录。</p>
          </ConsoleAsidePanel>
        </template>
      </ConsoleDetailLayout>
    </template>
  </section>
</template>

<style scoped lang="scss">
.borrow-return-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #1e293b;
}

.borrow-return-view__hero,
.borrow-return-view__candidate-panel,
.borrow-return-view__detail-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
  padding: 24px 28px;
}

.borrow-return-view__hero,
.borrow-return-view__actions,
.borrow-return-view__layout,
.borrow-return-view__candidate-title {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.borrow-return-view__candidate-panel,
.borrow-return-view__detail-panel {
  flex: 1;
}

.borrow-return-view__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #f97316;
}

.borrow-return-view__hero h1,
.borrow-return-view__panel-header h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.borrow-return-view__hero p:not(.borrow-return-view__eyebrow),
.borrow-return-view__empty-tip {
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.borrow-return-view__candidate-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.borrow-return-view__candidate-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.borrow-return-view__candidate-card--active {
  border-color: rgba(249, 115, 22, 0.45);
  box-shadow: 0 16px 36px rgba(249, 115, 22, 0.14);
}

.borrow-return-view__candidate-card strong,
.borrow-return-view__detail-list dd {
  font-family: 'Fira Code', monospace;
}

.borrow-return-view__candidate-card span,
.borrow-return-view__detail-list dt,
.borrow-return-view__remark-field span {
  color: #64748b;
}

.borrow-return-view__detail-list {
  display: grid;
  gap: 14px;
  margin: 18px 0 0;
}

.borrow-return-view__detail-list dd {
  margin: 6px 0 0;
}

.borrow-return-view__remark-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.borrow-return-view__remark-field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 16px;
  resize: vertical;
  font: inherit;
}
</style>
