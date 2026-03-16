<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import type { LocationQueryValue } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useBorrowStore } from '@/stores/modules/borrow'
import { useReservationStore } from '@/stores/modules/reservation'
import { formatDateTime } from '@/utils/date'

function normalizeQueryValue(value: LocationQueryValue | LocationQueryValue[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }

  return value ?? ''
}

/**
 * 借用确认页。
 * 后端当前没有“仅返回已批准且已签到候选预约”的专用接口，因此这里先复用预约分页接口，并在当前页内按真实状态字段本地筛选候选项。
 */
const route = useRoute()
const router = useRouter()
const reservationStore = useReservationStore()
const borrowStore = useBorrowStore()

const selectedReservationId = ref(normalizeQueryValue(route.query.reservationId))
const remark = ref('')
const submitting = ref(false)
const pagination = ref({ page: 1, size: 10 })

const candidateReservations = computed(() => {
  return reservationStore.list.filter((item) => {
    return (
      item.status === 'APPROVED' &&
      (item.signStatus === 'CHECKED_IN' || item.signStatus === 'CHECKED_IN_TIMEOUT')
    )
  })
})

const selectedReservation = computed(() => {
  return candidateReservations.value.find((item) => item.id === selectedReservationId.value) ?? null
})

async function loadCandidateReservations(overrides?: { page: number; size: number }) {
  pagination.value = {
    page: overrides?.page ?? pagination.value.page,
    size: overrides?.size ?? pagination.value.size,
  }

  const result = await reservationStore.fetchReservationList({
    page: pagination.value.page,
    size: pagination.value.size,
  })

  const currentPageCandidates = result.records.filter((item) => {
    return (
      item.status === 'APPROVED' &&
      (item.signStatus === 'CHECKED_IN' || item.signStatus === 'CHECKED_IN_TIMEOUT')
    )
  })

  if (!currentPageCandidates.some((item) => item.id === selectedReservationId.value)) {
    selectedReservationId.value = currentPageCandidates[0]?.id ?? ''
  }
}

function handleSelectReservation(reservationId: string) {
  selectedReservationId.value = reservationId
}

async function handleSubmit() {
  if (!selectedReservation.value) {
    return
  }

  submitting.value = true

  try {
    const payload = remark.value.trim() ? { remark: remark.value.trim() } : undefined
    const record = await borrowStore.confirmBorrow(selectedReservation.value.id, payload)
    ElMessage.success('借用确认完成')
    await router.push(`/borrows/${record.id}`)
  } finally {
    submitting.value = false
  }
}

async function handlePaginationChange(payload: { currentPage: number; pageSize: number }) {
  await loadCandidateReservations({ page: payload.currentPage, size: payload.pageSize })
}

function handleBack() {
  void router.push('/borrows')
}

onMounted(() => {
  void loadCandidateReservations()
})
</script>

<template>
  <section class="borrow-confirm-view">
    <header class="borrow-confirm-view__hero">
      <div>
        <p class="borrow-confirm-view__eyebrow">Confirm Borrow</p>
        <h1>借用确认</h1>
        <p>
          从当前已加载的预约分页结果中筛选“已批准且已签到”的候选预约。等后端补齐专用筛选接口后，这里可以无缝切换为真实候选池。
        </p>
      </div>

      <div class="borrow-confirm-view__actions">
        <el-button @click="handleBack">返回台账</el-button>
        <el-button
          class="borrow-confirm-view__submit"
          type="primary"
          :disabled="!selectedReservation"
          :loading="submitting"
          @click="handleSubmit"
        >
          确认借出
        </el-button>
      </div>
    </header>

    <section class="borrow-confirm-view__notice">
      <strong>当前页候选筛选说明</strong>
      <p>
        当前仅筛选已加载页面中的预约记录；如果候选预约不在这一页，需要后端提供专用筛选接口后才能彻底消除分页盲区。
      </p>
    </section>

    <EmptyState
      v-if="!candidateReservations.length && !reservationStore.loading"
      title="当前页没有可借出的预约"
      description="请先确认候选预约已处于已批准且已签到状态；若数据不在当前分页，需要切换后端接口后再补齐精确筛选。"
      action-text="重新加载候选"
      @action="loadCandidateReservations"
    />

    <template v-else>
      <section class="borrow-confirm-view__layout">
        <article class="borrow-confirm-view__candidate-panel">
          <div class="borrow-confirm-view__panel-header">
            <p class="borrow-confirm-view__eyebrow">Candidates</p>
            <h2>可确认借出的预约</h2>
          </div>

          <div class="borrow-confirm-view__candidate-list">
            <button
              v-for="item in candidateReservations"
              :key="item.id"
              class="borrow-confirm-view__candidate-card"
              :class="{
                'borrow-confirm-view__candidate-card--active': selectedReservationId === item.id,
              }"
              type="button"
              @click="handleSelectReservation(item.id)"
            >
              <strong>{{ item.deviceName }}</strong>
              <span>{{ item.userName }} · {{ item.deviceNumber }}</span>
              <span>{{ formatDateTime(item.startTime) }} - {{ formatDateTime(item.endTime) }}</span>
              <span>{{ item.purpose }}</span>
            </button>
          </div>

          <Pagination
            :current-page="reservationStore.query.page ?? pagination.page"
            :page-size="reservationStore.query.size ?? pagination.size"
            :total="reservationStore.total"
            :disabled="reservationStore.loading"
            @change="handlePaginationChange"
          />
        </article>

        <article class="borrow-confirm-view__detail-panel">
          <div class="borrow-confirm-view__panel-header">
            <p class="borrow-confirm-view__eyebrow">Selection</p>
            <h2>确认说明</h2>
          </div>

          <template v-if="selectedReservation">
            <dl class="borrow-confirm-view__detail-list">
              <div>
                <dt>预约编号</dt>
                <dd>{{ selectedReservation.id }}</dd>
              </div>
              <div>
                <dt>设备</dt>
                <dd>{{ selectedReservation.deviceName }}（{{ selectedReservation.deviceId }}）</dd>
              </div>
              <div>
                <dt>借用人</dt>
                <dd>{{ selectedReservation.userName }}（{{ selectedReservation.userId }}）</dd>
              </div>
            </dl>

            <label class="borrow-confirm-view__remark-field">
              <span>现场备注（可选）</span>
              <textarea
                v-model="remark"
                rows="5"
                placeholder="例如：设备外观检查正常，现场已交接。"
              />
            </label>
          </template>

          <p v-else class="borrow-confirm-view__empty-tip">请先从左侧选择一条候选预约。</p>
        </article>
      </section>
    </template>
  </section>
</template>

<style scoped lang="scss">
.borrow-confirm-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #1e293b;
}

.borrow-confirm-view__hero,
.borrow-confirm-view__notice,
.borrow-confirm-view__candidate-panel,
.borrow-confirm-view__detail-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.borrow-confirm-view__hero,
.borrow-confirm-view__notice,
.borrow-confirm-view__candidate-panel,
.borrow-confirm-view__detail-panel {
  padding: 24px 28px;
}

.borrow-confirm-view__hero,
.borrow-confirm-view__actions,
.borrow-confirm-view__layout {
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.borrow-confirm-view__layout {
  align-items: stretch;
}

.borrow-confirm-view__candidate-panel,
.borrow-confirm-view__detail-panel {
  flex: 1;
}

.borrow-confirm-view__eyebrow {
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #2563eb;
}

.borrow-confirm-view__hero h1,
.borrow-confirm-view__panel-header h2 {
  margin: 10px 0 0;
  font-family: 'Fira Code', monospace;
}

.borrow-confirm-view__hero p:not(.borrow-confirm-view__eyebrow),
.borrow-confirm-view__notice p,
.borrow-confirm-view__empty-tip {
  margin: 14px 0 0;
  line-height: 1.8;
  color: #475569;
}

.borrow-confirm-view__notice {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(249, 115, 22, 0.08));
}

.borrow-confirm-view__candidate-list {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.borrow-confirm-view__candidate-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 20px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.borrow-confirm-view__candidate-card:hover,
.borrow-confirm-view__candidate-card--active {
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 16px 36px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.borrow-confirm-view__candidate-card strong,
.borrow-confirm-view__detail-list dd {
  font-family: 'Fira Code', monospace;
}

.borrow-confirm-view__candidate-card span,
.borrow-confirm-view__detail-list dt,
.borrow-confirm-view__remark-field span {
  color: #64748b;
}

.borrow-confirm-view__detail-list {
  display: grid;
  gap: 14px;
  margin: 18px 0 0;
}

.borrow-confirm-view__detail-list dd {
  margin: 6px 0 0;
}

.borrow-confirm-view__remark-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 18px;
}

.borrow-confirm-view__remark-field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 16px;
  resize: vertical;
  font: inherit;
}
</style>
