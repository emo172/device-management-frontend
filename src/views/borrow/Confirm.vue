<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import type { LocationQueryValue } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConsoleAsidePanel from '@/components/layout/ConsoleAsidePanel.vue'
import ConsoleDetailLayout from '@/components/layout/ConsoleDetailLayout.vue'
import ConsolePageHero from '@/components/layout/ConsolePageHero.vue'
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
 * 后端当前没有“仅返回已批准且已签到候选预约”的专用接口，
 * 因此前端需要先聚合预约分页结果，再在本地收敛出真实候选池，避免借用确认被分页盲区卡住。
 */
const route = useRoute()
const router = useRouter()
const reservationStore = useReservationStore()
const borrowStore = useBorrowStore()

const selectedReservationId = ref(normalizeQueryValue(route.query.reservationId))
const remark = ref('')
const submitting = ref(false)
const pagination = ref({ page: 1, size: 10 })

const candidateReservations = computed(() => reservationStore.list)

const selectedReservation = computed(() => {
  return candidateReservations.value.find((item) => item.id === selectedReservationId.value) ?? null
})

/**
 * 借用确认候选当前仍复用预约接口聚合结果。
 * 如果后端尚未补齐设备名或借用人姓名，这里必须回退到真实 ID，避免页面渲染出空标题或伪造占位文案。
 */
function resolveReservationDeviceLabel(item: { deviceName?: string | null; deviceId: string }) {
  return item.deviceName?.trim() || item.deviceId
}

function resolveReservationUserLabel(item: { userName?: string | null; userId: string }) {
  return item.userName?.trim() || item.userId
}

function resolveReservationDeviceMeta(item: { deviceNumber?: string | null; deviceId: string }) {
  return item.deviceNumber?.trim() || item.deviceId
}

async function loadCandidateReservations(overrides?: { page: number; size: number }) {
  pagination.value = {
    page: overrides?.page ?? pagination.value.page,
    size: overrides?.size ?? pagination.value.size,
  }

  const result = await reservationStore.fetchBorrowCandidatePage({
    page: pagination.value.page,
    size: pagination.value.size,
  })

  if (!result.records.some((item) => item.id === selectedReservationId.value)) {
    selectedReservationId.value = result.records[0]?.id ?? ''
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
    <ConsolePageHero
      title="借用确认"
      description="统一聚合已批准且已签到的预约候选，再按前端分页展示，避免借用确认被原始预约分页盲区卡住。"
      class="borrow-confirm-view__hero"
    >
      <template #actions>
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
      </template>
    </ConsolePageHero>

    <section class="borrow-confirm-view__notice">
      <strong>候选聚合说明</strong>
      <p>
        页面会先聚合全部已批准且已签到的预约，再在前端做候选分页；因此左侧列表只展示可正式借出的真实候选。
      </p>
    </section>

    <EmptyState
      v-if="!candidateReservations.length && !reservationStore.loading"
      title="暂无可借出的预约"
      description="请先确认预约已处于已批准且已签到状态；若当前仍为空，说明系统里暂时没有符合借用确认条件的记录。"
      action-text="重新加载候选"
      @action="loadCandidateReservations"
    />

    <template v-else>
      <ConsoleDetailLayout class="borrow-confirm-view__layout">
        <template #main>
          <article class="borrow-confirm-view__candidate-panel">
            <div class="borrow-confirm-view__panel-header">
              <p class="borrow-confirm-view__eyebrow">候选记录</p>
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
                <strong>{{ resolveReservationDeviceLabel(item) }}</strong>
                <span>
                  {{ resolveReservationUserLabel(item) }} · {{ resolveReservationDeviceMeta(item) }}
                </span>
                <span
                  >{{ formatDateTime(item.startTime) }} - {{ formatDateTime(item.endTime) }}</span
                >
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
        </template>

        <template #aside>
          <ConsoleAsidePanel
            title="确认说明"
            description="确认借出只针对左侧当前选中的正式候选预约，备注会原样透传给后端借用确认接口。"
          >
            <div class="borrow-confirm-view__panel-header">
              <p class="borrow-confirm-view__eyebrow">当前选择</p>
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
                  <dd>
                    {{ resolveReservationDeviceLabel(selectedReservation) }}（{{
                      selectedReservation.deviceId
                    }}）
                  </dd>
                </div>
                <div>
                  <dt>借用人</dt>
                  <dd>
                    {{ resolveReservationUserLabel(selectedReservation) }}（{{
                      selectedReservation.userId
                    }}）
                  </dd>
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
          </ConsoleAsidePanel>
        </template>
      </ConsoleDetailLayout>
    </template>
  </section>
</template>

<style scoped lang="scss">
.borrow-confirm-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.borrow-confirm-view__hero,
.borrow-confirm-view__notice,
.borrow-confirm-view__candidate-panel,
.borrow-confirm-view__detail-panel {
  border: 1px solid var(--app-border-soft);
  border-radius: 28px;
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
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
  color: var(--app-tone-brand-text);
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
  color: var(--app-text-secondary);
}

.borrow-confirm-view__notice {
  background: linear-gradient(
    135deg,
    var(--app-tone-brand-surface),
    var(--app-tone-warning-surface)
  );
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
  border: 1px solid var(--app-border-soft);
  border-radius: 20px;
  background: var(--app-surface-card-strong);
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
  border-color: var(--app-tone-brand-border);
  box-shadow: var(--app-shadow-card);
  transform: translateY(-1px);
}

.borrow-confirm-view__candidate-card strong,
.borrow-confirm-view__detail-list dd {
  font-family: 'Fira Code', monospace;
}

.borrow-confirm-view__candidate-card span,
.borrow-confirm-view__detail-list dt,
.borrow-confirm-view__remark-field span {
  color: var(--app-text-secondary);
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
  border: 1px solid var(--app-border-strong);
  border-radius: 16px;
  background: var(--app-surface-card-strong);
  color: var(--app-text-primary);
  resize: vertical;
  font: inherit;
}

// 借用确认右侧说明面板承载选中详情与现场备注，页面层补一层 token，避免深色主题下因插槽内容混用而出现阅读断层。
.borrow-confirm-view__layout :deep(.console-aside-panel) {
  border: 1px solid var(--app-border-soft);
  background: var(--app-surface-card);
  box-shadow: var(--app-shadow-card);
}
</style>
